// backend/src/controllers/unidadeController.js
const repo = require("../repositories/unidadeRepository");
const knex = require("../database/db");

const store = async (req, res) => {
  try {
    const { nome_fantasia, telefone_principal } = req.body;

    if (!nome_fantasia || !telefone_principal) {
      return res
        .status(400)
        .json({
          error: "Campos obrigatórios: nome_fantasia e telefone_principal.",
        });
    }

    const id = await repo.create(req.body);
    return res
      .status(201)
      .json({ id_unidade: id, message: "Unidade cadastrada com sucesso." });
  } catch (error) {
    console.error(`[UnidadeController.store] ${error.message}`);
    return res
      .status(500)
      .json({ error: "Erro interno ao cadastrar unidade." });
  }
};

const index = async (req, res) => {
  try {
    const unidades = await repo.getAllDaRede(req.usuario.unidade_id);
    return res.json(unidades);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao listar unidades." });
  }
};

const show = async (req, res) => {
  try {
    const unidade = await repo.getById(req.params.id);
    if (!unidade)
      return res.status(404).json({ error: "Unidade não encontrada." });
    return res.json(unidade);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar unidade." });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;

    // G8: Garante que o usuário só pode editar a SUA própria unidade
    const unidade_id = req.usuario?.unidade_id;
    if (String(unidade_id) !== String(id)) {
      return res.status(403).json({ error: "Acesso negado: você não tem permissão para editar esta unidade." });
    }

    const updateData = { ...req.body };

    if (updateData.configuracoes_ia) {
      updateData.configuracoes_ia = typeof updateData.configuracoes_ia === "object" ? JSON.stringify(updateData.configuracoes_ia) : updateData.configuracoes_ia;
    }

    delete updateData.id_unidade;

    await repo.update(id, updateData);
    return res.json({ message: "Configurações atualizadas com sucesso." });
  } catch (error) {
    console.error(`[UnidadeController.update] Erro: ${error.message}`);
    return res.status(500).json({ error: "Erro ao atualizar unidade." });
  }
};

const destroy = async (req, res) => {
  try {
    await repo.softDelete(req.params.id);
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: "Erro ao remover unidade." });
  }
};

const updateConfigIA = async (req, res) => {
    try {
        const { id } = req.params;
        const { config_ia } = req.body;

        if (!config_ia) {
            return res.status(400).json({ error: "O objeto config_ia é obrigatório." });
        }

        // Atualização direta e isolada na tabela
        await knex('unidades_atendimento')
            .where('id_unidade', id)
            .update({ 
                configuracoes_ia: JSON.stringify(config_ia),
                atualizado_em: knex.fn.now() 
            });

        return res.json({ message: "Inteligência Artificial atualizada com sucesso." });
    } catch (error) {
        console.error(`[UnidadeController.updateConfigIA] ${error.message}`);
        return res.status(500).json({ error: "Erro interno ao atualizar a IA." });
    }
};

module.exports = { store, index, show, update, destroy, updateConfigIA };
