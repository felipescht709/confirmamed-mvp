// backend/src/controllers/googleAuthController.js
const knex = require("../database/db");
const googleCalendarService = require("../services/googleCalendarService");

// Inicia o fluxo de autorização
const auth = async (req, res) => {
  try {
    const { profissional_id } = req.query;
    if (!profissional_id) {
      return res.status(400).json({ error: "profissional_id é obrigatório." });
    }

    // Pega a unidade_id do usuário logado (Quem está acessando o painel)
    const unidade_id = req.usuario.unidade_id;

    // Gera o link mágico do Google pedindo permissão pro calendário
    const authUrl = googleCalendarService.getAuthUrl(profissional_id, unidade_id);
    
    return res.json({ authUrl });
  } catch (error) {
    console.error("Erro no Auth Google:", error);
    return res.status(500).json({ error: "Erro ao iniciar autenticação do Google" });
  }
};

// Recebe o callback do Google com o código de autorização
const callback = async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state) {
      return res.status(400).send("Faltando parâmetros de autorização.");
    }

    // Desempacotamos o estado (que passamos na hora de chamar a API)
    const { profissional_id, unidade_id } = JSON.parse(state);

    // Trocamos o código temporário pelos tokens definitivos
    const tokens = await googleCalendarService.getTokens(code);

    if (tokens.refresh_token) {
      // Salva o refresh token no profissional
      await knex("profissionais_da_saude")
        .where({ id_profissional_saude: profissional_id })
        .update({ google_refresh_token: tokens.refresh_token });
    }

    // Redireciona o usuário de volta para o painel de configurações na mesma tela que ele estava
    // (Ajuste o frontend URL se necessário)
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/config`);
  } catch (error) {
    console.error("Erro no Callback Google:", error);
    return res.status(500).send("Falha ao autorizar Google Calendar.");
  }
};

module.exports = {
  auth,
  callback
};
