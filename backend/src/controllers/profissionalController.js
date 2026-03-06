// backend/src/controllers/profissionalController.js
const repo = require("../repositories/profissionalRepository");
const knex = require("../database/db");

const store = async (req, res) => {
  try {
    console.log("--- TENTATIVA DE CADASTRO DE PROFISSIONAL ---");
    console.log("DADOS RECEBIDOS:", req.body);

    const { nome_completo, cpf } = req.body;

    if (!nome_completo || !cpf) {
      return res.status(400).json({ error: "Nome e CPF são obrigatórios." });
    }

    const id = await repo.create(req.body);

    console.log("SUCESSO: Profissional cadastrado com ID:", id);
    return res.status(201).json({ id_profissional_saude: id });
  } catch (error) {
    // ESTE LOG É O MAIS IMPORTANTE:
    console.error("ERRO DETALHADO NO BANCO:", error.message);
    console.error("STACK TRACE:", error.stack);

    return res.status(500).json({
      error: "Erro ao cadastrar profissional.",
      details: error.message, // Temporário para debug
    });
  }
};

const index = async (req, res) => {
  try {
    const { unidade_id } = req.query; // Pega o ID enviado pelo useAgenda.js
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
    const data = req.body;
    await repo.update(id, data);
    return res.json({
      message: "Dados do profissional atualizados com sucesso.",
    });
  } catch (error) {
    console.error("ERRO AO ATUALIZAR:", error.message);
    return res.status(500).json({ error: "Erro ao atualizar profissional." });
  }
};

const remove = async (req, res) => {
  try {
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
