const bcrypt = require("bcryptjs");
const apiKeyRepo = require("../repositories/apiKeyRepository");

/**
 * Middleware para validar a API Key enviada pelas integrações.
 * Ele espera um header `x-api-key` ou `Authorization: Bearer <key>`
 */
const apiKeyAuth = async (req, res, next) => {
  try {
    let apiKey = req.headers["x-api-key"];

    // Se não encontrou no header x-api-key, tenta no Authorization Bearer
    if (!apiKey && req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") {
        apiKey = parts[1];
      }
    }

    if (!apiKey) {
      return res.status(401).json({ error: "API Key não fornecida. Acesso Negado." });
    }

    // Busca todas as chaves ativas do banco e compara (por questões de segurança, fazemos o compare)
    // OBS: Em altíssima escala, recomenda-se salvar a chave com prefixos e buscar pelo prefixo.
    // Mas para o MVP de integrações B2B (poucas chaves), iterar é seguro.
    const chaves = await apiKeyRepo.getActiveKeys();
    let chaveAutenticada = null;

    for (let chave of chaves) {
      const match = await bcrypt.compare(apiKey, chave.key_hash);
      if (match) {
        chaveAutenticada = chave;
        break;
      }
    }

    if (!chaveAutenticada) {
      return res.status(403).json({ error: "API Key inválida." });
    }

    // Injeta os dados da unidade logada na requisição, simulando o mesmo fluxo da UI
    req.usuario = {
      unidade_id: chaveAutenticada.unidade_id,
      role: "INTEGRACAO_API",
      integracao_nome: chaveAutenticada.nome_integracao
    };

    // Atualiza estatística de uso (Async/Não bloqueante)
    apiKeyRepo.updateLastUse(chaveAutenticada.id_key).catch(console.error);

    next();
  } catch (error) {
    console.error("[API_KEY_AUTH ERROR]", error);
    return res.status(500).json({ error: "Erro interno de autenticação de API." });
  }
};

module.exports = apiKeyAuth;
