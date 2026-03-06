// backend/src/controllers/agendaBloqueioController.js
const repo = require("../repositories/agendaBloqueioRepository");
const knex = require("../database/db");

const store = async (req, res) => {
  try {
    const { profissional_id, unidade_id, data_inicio, data_fim } = req.body;

    if (!profissional_id || !unidade_id || !data_inicio || !data_fim) {
      return res
        .status(400)
        .json({ error: "Intervalo de datas e IDs são obrigatórios." });
    }

    const id = await repo.create(req.body);
    return res.status(201).json({ id_bloqueio: id });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao criar bloqueio de agenda." });
  }
};

const index = async (req, res) => {
  try {
    const { unidade_id, profissional_id } = req.query;

    let query = knex("agenda_bloqueios").where("unidade_id", unidade_id);

    if (profissional_id && profissional_id !== "null") {
      query.where("profissional_id", profissional_id);
    }

    const bloqueios = await query;
    return res.json(bloqueios);
  } catch (error) {
    // Se a tabela não existir, retornamos um array vazio para não quebrar o front
    console.error("Erro ao listar bloqueios:", error.message);
    return res.json([]);
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const bloqueioExistente = await repo.getById(id);

    if (!bloqueioExistente) {
      return res.status(404).json({ error: "Bloqueio não encontrado." });
    }

    // Validação básica de datas se forem enviadas no update
    if (req.body.data_inicio && req.body.data_fim) {
      if (new Date(req.body.data_inicio) >= new Date(req.body.data_fim)) {
        return res
          .status(400)
          .json({ error: "A data de início deve ser anterior à data de fim." });
      }
    }

    await repo.update(id, req.body);
    return res.json({ message: "Bloqueio de agenda atualizado com sucesso." });
  } catch (error) {
    console.error(`[BloqueioUpdate Error]: ${error.message}`);
    return res.status(500).json({ error: "Erro ao atualizar bloqueio." });
  }
};

const destroy = async (req, res) => {
  try {
    const { id } = req.params;
    const bloqueio = await repo.getById(id);

    if (!bloqueio)
      return res.status(404).json({ error: "Bloqueio não encontrado." });

    await repo.remove(id);
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: "Erro ao remover bloqueio." });
  }
};

module.exports = { store, index, update, destroy };
