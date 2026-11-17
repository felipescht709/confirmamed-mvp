//backend/src/controllers/convenioController.js
const repo = require("../repositories/convenioRepository");
const unidadeRepo = require("../repositories/unidadeRepository");

const getMatrizId = async (unidade_id) => {
  const unidade = await unidadeRepo.getById(unidade_id);
  return unidade?.matriz_id || unidade?.id_unidade || unidade_id;
};

// --- OPERAÇÕES DE CONVÊNIOS ---

const storeConvenio = async (req, res) => {
    try {
        const unidade_id = req.usuario?.unidade_id;
        if (!unidade_id) return res.status(401).json({ error: "Sessão inválida" });

        const { nome } = req.body;
        if (!nome) return res.status(400).json({ error: "Nome do convênio é obrigatório." });

        const matrizId = await getMatrizId(unidade_id);
        const novoConvenio = await repo.createConvenio({ ...req.body, unidade_id: matrizId });
        return res.status(201).json(novoConvenio);
    } catch (error) {
        return res.status(500).json({ error: "Erro ao cadastrar convênio." });
    }
};

const indexConvenios = async (req, res) => {
    try {
        const unidade_id = req.usuario?.unidade_id;
        if (!unidade_id) return res.status(401).json({ error: "Sessão inválida" });

        const matrizId = await getMatrizId(unidade_id);
        const data = await repo.getConvenios(matrizId);
        return res.json(data);
    } catch (error) {
        return res.status(500).json({ error: "Erro ao listar convênios." });
    }
};

const updateConvenio = async (req, res) => {
    try {
        const { id } = req.params;
        const unidade_id = req.usuario?.unidade_id;
        const matrizId = await getMatrizId(unidade_id);

        const conv = await repo.getConvenioById(id);
        if (!conv || conv.unidade_id !== matrizId) return res.status(404).json({ error: "Convênio não encontrado" });

        await repo.updateConvenio(id, req.body);
        return res.json({ message: "Convênio atualizado com sucesso." });
    } catch (error) {
        return res.status(500).json({ error: "Erro ao atualizar convênio." });
    }
};

const destroyConvenio = async (req, res) => {
    try {
        const { id } = req.params;
        const unidade_id = req.usuario?.unidade_id;
        const matrizId = await getMatrizId(unidade_id);

        const conv = await repo.getConvenioById(id);
        if (!conv || conv.unidade_id !== matrizId) return res.status(404).json({ error: "Convênio não encontrado" });

        await repo.softDeleteConvenio(id);
        return res.status(204).send();
    } catch (error) {
        return res.status(500).json({ error: "Erro ao desativar convênio." });
    }
};

// --- OPERAÇÕES DE PLANOS ---

const storePlano = async (req, res) => {
    try {
        const unidade_id = req.usuario?.unidade_id;
        const { convenio_id, nome_plano } = req.body;
        if (!convenio_id || !nome_plano) {
            return res.status(400).json({ error: "Convênio ID e nome do plano são obrigatórios." });
        }

        const matrizId = await getMatrizId(unidade_id);
        const conv = await repo.getConvenioById(convenio_id);
        if (!conv || conv.unidade_id !== matrizId) return res.status(404).json({ error: "Convênio inválido" });

        const plano = await repo.createPlano({ ...req.body, unidade_id: matrizId });
        return res.status(201).json(plano);
    } catch (error) {
        return res.status(500).json({ error: "Erro ao cadastrar plano." });
    }
};

const indexPlanos = async (req, res) => {
    try {
        const { convenio_id } = req.params;
        const unidade_id = req.usuario?.unidade_id;
        const matrizId = await getMatrizId(unidade_id);

        const data = await repo.getPlanosPorConvenio(convenio_id, matrizId);
        return res.json(data);
    } catch (error) {
        return res.status(500).json({ error: "Erro ao listar planos." });
    }
};

const updatePlano = async (req, res) => {
    try {
        const { id } = req.params;
        const unidade_id = req.usuario?.unidade_id;
        const matrizId = await getMatrizId(unidade_id);

        const plano = await repo.getPlanoById(id);
        if (!plano || plano.unidade_id !== matrizId) return res.status(404).json({ error: "Plano não encontrado" });

        await repo.updatePlano(id, req.body);
        return res.json({ message: "Plano atualizado com sucesso." });
    } catch (error) {
        return res.status(500).json({ error: "Erro ao atualizar plano." });
    }
};

const destroyPlano = async (req, res) => {
    try {
        const { id } = req.params;
        const unidade_id = req.usuario?.unidade_id;
        const matrizId = await getMatrizId(unidade_id);

        const plano = await repo.getPlanoById(id);
        if (!plano || plano.unidade_id !== matrizId) return res.status(404).json({ error: "Plano não encontrado" });

        await repo.softDeletePlano(id);
        return res.status(204).send();
    } catch (error) {
        return res.status(500).json({ error: "Erro ao desativar plano." });
    }
};

module.exports = { 
    storeConvenio, 
    indexConvenios, 
    updateConvenio, 
    destroyConvenio,
    storePlano, 
    indexPlanos, 
    updatePlano, 
    destroyPlano 
};