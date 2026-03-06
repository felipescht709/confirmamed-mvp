// backend/src/controllers/vinculoController.js
const repo = require("../repositories/vinculoRepository");

const store = async (req, res) => {
    try {
        const { profissional_id, unidade_id } = req.body;
        if (!profissional_id || !unidade_id) {
            return res.status(400).json({ error: "IDs de profissional e unidade são obrigatórios." });
        }
        await repo.vincular(profissional_id, unidade_id);
        return res.status(201).json({ message: "Vínculo criado." });
    } catch (error) {
        return res.status(500).json({ error: "Erro ao criar vínculo." });
    }
};

const index = async (req, res) => {
    try {
        const { unidade_id } = req.query;
        let data;
        if (unidade_id) {
            data = await repo.getProfissionaisPorUnidade(unidade_id);
        } else {
            data = await repo.getAllVinculos();
        }
        return res.json(data);
    } catch (error) {
        return res.status(500).json({ error: "Erro ao listar vínculos." });
    }
};

const destroy = async (req, res) => {
    try {
        const { profissional_id, unidade_id } = req.params;
        await repo.desvincular(profissional_id, unidade_id);
        return res.status(204).send();
    } catch (error) {
        return res.status(500).json({ error: "Erro ao remover vínculo." });
    }
};

module.exports = { store, index, destroy };