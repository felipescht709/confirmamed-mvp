const bcrypt = require("bcryptjs");
const repo = require("../repositories/usuarioRepository");
const ROLES = require("../constants/roles");

const store = async (req, res) => {
  try {
    const { nome, email, senha, role, profissional_id, unidade_id } = req.body;

    // 1. Validação básica
    if (!nome || !email || !senha || !unidade_id) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    }

    // Valida se o cargo enviado existe na nossa lista oficial
    if (role && !Object.values(ROLES).includes(role)) {
      return res.status(400).json({ error: "Nível de acesso inválido." });
    }

    // 2. Verifica se e-mail já existe
    const usuarioExistente = await repo.findByEmail(email);
    if (usuarioExistente) {
      return res.status(409).json({ error: "Este e-mail já está em uso." });
    }

    // 3. Regra de Negócio (Ajustada): Usando a constante PROFISSIONAL_SAUDE
    if (role === ROLES.PROFISSIONAL_SAUDE && !profissional_id) {
      return res.status(400).json({
        error:
          "Utilizadores com perfil de Profissional de Saúde devem estar vinculados a um cadastro profissional.",
      });
    }

    // 4. Hash da senha (Segurança LGPD)
    const salt = await bcrypt.genSalt(10);
    const senha_hash = await bcrypt.hash(senha, salt);

    // 5. Salva no banco (O default do banco já é RECEPCAO, mas passamos aqui por clareza)
    const id = await repo.create({
      nome,
      email,
      senha_hash,
      role: role || ROLES.RECEPCAO,
      unidade_id,
      profissional_id:
        role === ROLES.PROFISSIONAL_SAUDE ? profissional_id : null,
    });

    return res.status(201).json({
      id_usuario: id,
      message: "Utilizador criado com sucesso.",
    });
  } catch (error) {
    console.error(`[UserStore Error]: ${error.message}`);
    return res.status(500).json({ error: "Erro interno ao criar utilizador." });
  }
};

const index = async (req, res) => {
  try {
    const usuarios = await repo.getAll();
    return res.json(usuarios);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao listar utilizadores." });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, senha, role, profissional_id, unidade_id } = req.body;

    const usuarioExistente = await repo.getById(id);
    if (!usuarioExistente) {
      return res.status(404).json({ error: "Utilizador não encontrado." });
    }

    const dadosParaAtualizar = {};
    if (nome) dadosParaAtualizar.nome = nome;
    if (email) dadosParaAtualizar.email = email;
    if (role) dadosParaAtualizar.role = role;
    if (unidade_id) dadosParaAtualizar.unidade_id = unidade_id;
    if (profissional_id) dadosParaAtualizar.profissional_id = profissional_id;

    // LÓGICA DE SENHA: Se enviou senha nova, faz o hash
    if (senha) {
      const salt = await bcrypt.genSalt(10);
      dadosParaAtualizar.senha_hash = await bcrypt.hash(senha, salt);
    }

    await repo.update(id, dadosParaAtualizar);

    return res.json({ message: "Utilizador atualizado com sucesso." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao atualizar utilizador." });
  }
};

const alterarSenhaLogado = async (req, res) => {
  const { senhaAntiga, senhaNova } = req.body;
  const id = req.usuarioId; // Pego do Middleware de Auth (JWT)

  const usuario = await knex("USUARIOS_SISTEMA")
    .where({ id_usuario: id })
    .first();

  // Valida se a senha atual está correta antes de trocar
  const senhaValida = await bcrypt.compare(senhaAntiga, usuario.senha_hash);
  if (!senhaValida)
    return res.status(401).json({ error: "Senha atual incorreta." });

  const salt = await bcrypt.genSalt(10);
  const nova_hash = await bcrypt.hash(senhaNova, salt);

  await repo.update(id, { senha_hash: nova_hash });
  return res.json({ message: "Senha alterada com sucesso!" });
};

module.exports = { store, index, update, alterarSenhaLogado };
