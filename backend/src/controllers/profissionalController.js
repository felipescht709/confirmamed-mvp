// backend/src/controllers/profissionalController.js
const repo = require("../repositories/profissionalRepository");
const knex = require("../database/db");

const store = async (req, res) => {
  try {
    console.log("--- TENTATIVA DE CADASTRO DE PROFISSIONAL ---");
    console.log("DADOS RECEBIDOS:", req.body);

    const { nome_completo, cpf } = req.body;
    const unidade_id = req.usuario?.unidade_id; // G2: fonte confiável

    if (!nome_completo || !cpf) {
      return res.status(400).json({ error: "Nome e CPF são obrigatórios." });
    }
    if (!unidade_id) {
      return res.status(401).json({ error: "Sessão inválida." });
    }

    const id = await repo.create(req.body);

    // G2: Cria vínculo profissional <-> unidade automaticamente
    await knex('profissional_unidade_vinculo').insert({
      profissional_id: id,
      unidade_id,
    });

    console.log("SUCESSO: Profissional cadastrado com ID:", id, "e vinculado à unidade", unidade_id);
    return res.status(201).json({ id_profissional_saude: id });
  } catch (error) {
    console.error("ERRO DETALHADO NO BANCO:", error.message);
    console.error("STACK TRACE:", error.stack);
    return res.status(500).json({
      error: "Erro ao cadastrar profissional.",
      details: error.message,
    });
  }
};

const index = async (req, res) => {
  try {
    // G6: unidade_id OBRIGATORIAMENTE do JWT (nunca do query param — vetor de IDOR)
    const unidade_id = req.usuario?.unidade_id;
    if (!unidade_id) return res.status(401).json({ error: "Sessão inválida." });
    const profissionais = await repo.getAll(unidade_id);
    return res.json(profissionais);
  } catch (error) {
    console.error("Erro no index de profissionais:", error);
    return res.status(500).json({ error: "Erro ao listar profissionais." });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const unidade_id = req.usuario?.unidade_id;
    const data = req.body;

    // G11: valida que o profissional pertence à unidade do usuário logado
    const vinculo = await knex('profissional_unidade_vinculo')
      .where({ profissional_id: id, unidade_id })
      .first();
    if (!vinculo) {
      return res.status(404).json({ error: "Profissional não encontrado nesta unidade." });
    }

    await repo.update(id, data);
    return res.json({ message: "Dados do profissional atualizados com sucesso." });
  } catch (error) {
    console.error("ERRO AO ATUALIZAR:", error.message);
    return res.status(500).json({ error: "Erro ao atualizar profissional." });
  }
};

const remove = async (req, res) => {
  try {
    const unidade_id = req.usuario?.unidade_id;
    // G11: valida posse antes de deletar
    const vinculo = await knex('profissional_unidade_vinculo')
      .where({ profissional_id: req.params.id, unidade_id })
      .first();
    if (!vinculo) {
      return res.status(404).json({ error: "Profissional não encontrado nesta unidade." });
    }
    await repo.softDelete(req.params.id);
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: "Erro ao desativar profissional." });
  }
};

const getByUnidade = async (req, res) => {
  try {
    // CORREÇÃO 1: Captura flexível do ID (seja :id ou :unidade_id na rota)
    const unidadeId = req.params.id || req.params.unidade_id;

    if (!unidadeId) {
      return res.status(400).json({ error: "ID da unidade é obrigatório." });
    }

    // CORREÇÃO 2: Uso do Repository (Arquitetura limpa)
    const profissionais = await repo.listByUnidade(unidadeId);

    return res.json(profissionais);
  } catch (error) {
    console.error("Erro ao buscar profissionais da unidade:", error); // Log limpo
    return res.status(500).json({ error: "Erro interno ao buscar equipe." });
  }
};

module.exports = { store, index, update, remove, getByUnidade };
