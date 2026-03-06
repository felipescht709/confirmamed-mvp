//backend/src/controllers/convenioController.js
const repo = require("../repositories/convenioRepository");

// --- OPERAÇÕES DE CONVÊNIOS ---

const storeConvenio = async (req, res) => {
    try {
        const { nome } = req.body;
        if (!nome) return res.status(400).json({ error: "Nome do convênio é obrigatório." });

        const novoConvenio = await repo.createConvenio(req.body);
        return res.status(201).json(novoConvenio);
    } catch (error) {
        return res.status(500).json({ error: "Erro ao cadastrar convênio." });
    }
};

const indexConvenios = async (req, res) => {
    try {
        const data = await repo.getConvenios();
        return res.json(data);
    } catch (error) {
        return res.status(500).json({ error: "Erro ao listar convênios." });
    }
};

const updateConvenio = async (req, res) => {
    try {
        const { id } = req.params;
        await repo.updateConvenio(id, req.body);
        return res.json({ message: "Convênio atualizado com sucesso." });
    } catch (error) {
        return res.status(500).json({ error: "Erro ao atualizar convênio." });
    }
};

const destroyConvenio = async (req, res) => {
    try {
        const { id } = req.params;
        // Soft delete no convênio
        await repo.softDeleteConvenio(id);
        return res.status(204).send();
    } catch (error) {
        return res.status(500).json({ error: "Erro ao desativar convênio." });
    }
};

// --- OPERAÇÕES DE PLANOS ---

const storePlano = async (req, res) => {
    try {
        const { convenio_id, nome_plano } = req.body;
        if (!convenio_id || !nome_plano) {
            return res.status(400).json({ error: "Convênio ID e nome do plano são obrigatórios." });
        }

        const plano = await repo.createPlano(req.body);
        return res.status(201).json(plano);
    } catch (error) {
        return res.status(500).json({ error: "Erro ao cadastrar plano." });
    }
};

const indexPlanos = async (req, res) => {
    try {
        const { convenio_id } = req.params;
        const data = await repo.getPlanosPorConvenio(convenio_id);
        return res.json(data);
    } catch (error) {
        return res.status(500).json({ error: "Erro ao listar planos." });
    }
};

const updatePlano = async (req, res) => {
    try {
        const { id } = req.params;
        await repo.updatePlano(id, req.body);
        return res.json({ message: "Plano atualizado com sucesso." });
    } catch (error) {
        return res.status(500).json({ error: "Erro ao atualizar plano." });
    }
};

const destroyPlano = async (req, res) => {
    try {
        const { id } = req.params;
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