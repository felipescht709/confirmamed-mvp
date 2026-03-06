// controllers/procedimentoController.js
const repo = require("../repositories/procedimentosRepository");

const store = async (req, res) => {
  try {
    const { unidade_id, nome_procedimento, duracao_minutos, tipo } = req.body;

    if (!unidade_id || !nome_procedimento || !duracao_minutos || !tipo) {
      return res
        .status(400)
        .json({ error: "Faltam informações obrigatórias do procedimento." });
    }

    const id = await repo.create(req.body);
    return res.status(201).json({ id_procedimento: id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao criar procedimento." });
  }
};

const getByUnidade = async (req, res) => {
  try {
    // CORREÇÃO: Pega o ID independente se a rota chamou de :unidade_id ou :id
    const unidadeId = req.params.unidade_id || req.params.id;

    if (!unidadeId) {
      return res.status(400).json({ error: "ID da unidade não fornecido." });
    }

    // Agora o repositório tem essa função com esse nome
    const procedimentos = await repo.listByUnidade(unidadeId);
    return res.json(procedimentos);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao buscar procedimentos da unidade." });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.body.unidade_id) delete req.body.unidade_id;

    await repo.update(id, req.body);
    return res.json({ message: "Procedimento atualizado." });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao atualizar procedimento." });
  }
};

const destroy = async (req, res) => {
  try {
    await repo.softDelete(req.params.id);
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: "Erro ao excluir procedimento." });
  }
};

module.exports = { store, getByUnidade, update, destroy };
