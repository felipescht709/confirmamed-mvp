// backend/src/controllers/unidadeController.js
const repo = require("../repositories/unidadeRepository");

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
    const unidades = await repo.getAll();
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
    const updateData = { ...req.body };

    // Mapeia o nome do Frontend para a coluna real do Banco de Dados
    if (updateData.configuracoes_ia) {
      // O Knex lidará com o JSON/JSONB automaticamente se estiver configurado,
      // mas JSON.stringify garante segurança extra no insert/update.
      updateData.config_ia = JSON.stringify(updateData.configuracoes_ia);
      delete updateData.configuracoes_ia; // Remove a chave fantasma
    }

    // Previne atualização acidental do ID
    delete updateData.id_unidade;

    await repo.update(req.params.id, updateData);
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
                config_ia: JSON.stringify(config_ia),
                atualizado_em: knex.fn.now() 
            });

        return res.json({ message: "Inteligência Artificial atualizada com sucesso." });
    } catch (error) {
        console.error(`[UnidadeController.updateConfigIA] ${error.message}`);
        return res.status(500).json({ error: "Erro interno ao atualizar a IA." });
    }
};

module.exports = { store, index, show, update, destroy, updateConfigIA };
