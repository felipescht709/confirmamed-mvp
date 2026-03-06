// backend/src/controllers/agendaConfigController.js
const repo = require("../repositories/agendaConfigRepository");
const agendaConfigService = require("../services/core/agendaConfigService");

const store = async (req, res) => {
  try {
    const {
      profissional_id,
      unidade_id,
      dia_semana,
      hora_inicio,
      hora_fim,
      duracao_slot_minutos,
    } = req.body;

    // 1. Validação de conflito usando o seu service
    // Se houver conflito, o service lança um Error que cairá no catch
    await agendaConfigService.validarConflitoUnidades(
      profissional_id,
      dia_semana,
      hora_inicio,
      hora_fim,
      unidade_id,
    );

    // 2. Persistência
    const id = await repo.create({
      profissional_id,
      unidade_id,
      dia_semana,
      hora_inicio,
      hora_fim,
      duracao_slot_minutos,
    });

    return res.status(201).json({ id_config_agenda: id });
  } catch (error) {
    // Tratamento específico para o erro de conflito lançado pelo Service
    if (error.message.includes("Conflito:")) {
      return res.status(409).json({ error: error.message });
    }

    console.error(`[AgendaConfigController Error]: ${error.message}`);
    return res
      .status(500)
      .json({ error: "Erro ao configurar horário da agenda." });
  }
};

const index = async (req, res) => {
  try {
    const { profissional_id, unidade_id } = req.query;
    const configs = await repo.getByProfissionalEUnidade(
      profissional_id,
      unidade_id,
    );
    return res.json(configs);
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Erro ao buscar configurações de agenda." });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const configAtual = await repo.getById(id);

    if (!configAtual) {
      return res
        .status(404)
        .json({ error: "Configuração de agenda não encontrada." });
    }

    await repo.update(id, req.body);
    return res.json({
      message: "Grade horária atualizada.",
      aviso:
        "Lembre-se: esta alteração afeta apenas novos agendamentos. Consultas já marcadas permanecem inalteradas.",
    });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao atualizar grade horária." });
  }
};

const destroy = async (req, res) => {
  try {
    const { id } = req.params;
    const config = await repo.getById(id);

    if (!config) {
      return res.status(404).json({ error: "Configuração não encontrada." });
    }

    // Regra de Negócio: Opcionalmente, verificar se existem consultas futuras
    // vinculadas a este horário antes de permitir o delete.

    await repo.remove(id);
    return res.status(204).send();
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Erro ao excluir configuração de agenda." });
  }
};

module.exports = { store, index, update, destroy };
