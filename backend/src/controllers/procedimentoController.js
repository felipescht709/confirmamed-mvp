// controllers/procedimentoController.js
const repo = require("../repositories/procedimentosRepository");
const unidadeRepo = require("../repositories/unidadeRepository");

const getMatrizId = async (unidade_id) => {
  const unidade = await unidadeRepo.getById(unidade_id);
  return unidade?.matriz_id || unidade?.id_unidade || unidade_id;
};

const store = async (req, res) => {
  try {
    const unidade_id = req.usuario?.unidade_id; 
    const { nome_procedimento, duracao_minutos, tipo } = req.body;

    if (!unidade_id) {
      return res.status(401).json({ error: "Sessão inválida." });
    }
    if (!nome_procedimento || !duracao_minutos || !tipo) {
      return res.status(400).json({ error: "Faltam informações obrigatórias do procedimento." });
    }

    const matrizId = await getMatrizId(unidade_id);
    const id = await repo.create({ ...req.body, unidade_id: matrizId }); 
    return res.status(201).json({ id_procedimento: id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao criar procedimento." });
  }
};

const getByUnidade = async (req, res) => {
  try {
    const unidade_id = req.usuario?.unidade_id;
    if (!unidade_id) return res.status(401).json({ error: "Sessão inválida." });

    const matrizId = await getMatrizId(unidade_id);
    const procedimentos = await repo.listByUnidade(matrizId);
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
    const unidade_id = req.usuario?.unidade_id;
    if (req.body.unidade_id) delete req.body.unidade_id;

    // G4: verifica propriedade antes de atualizar
    const matrizId = await getMatrizId(unidade_id);
    const proc = await repo.getById(id);
    if (!proc || proc.unidade_id !== matrizId) {
      return res.status(404).json({ error: "Procedimento não encontrado nesta unidade." });
    }

    await repo.update(id, req.body);
    return res.json({ message: "Procedimento atualizado." });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao atualizar procedimento." });
  }
};

const destroy = async (req, res) => {
  try {
    const unidade_id = req.usuario?.unidade_id;
    // G4: trava de tenant antes de deletar
    const matrizId = await getMatrizId(unidade_id);
    const proc = await repo.getById(req.params.id);
    if (!proc || proc.unidade_id !== matrizId) {
      return res.status(404).json({ error: "Procedimento não encontrado nesta unidade." });
    }
    await repo.softDelete(req.params.id);
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: "Erro ao excluir procedimento." });
  }
};

module.exports = { store, getByUnidade, update, destroy };
