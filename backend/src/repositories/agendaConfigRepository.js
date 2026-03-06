// backend/src/repositories/agendaConfigRepository.js
const knex = require("../database/db.js");

const create = async (data) => {
  const [id] = await knex('agenda_configuracao_horario')
    .insert({
      profissional_id: data.profissional_id,
      unidade_id: data.unidade_id,
      dia_semana: data.dia_semana, // 0-6 (Domingo a Sábado)
      hora_inicio: data.hora_inicio,
      hora_fim: data.hora_fim,
      duracao_slot_minutos: data.duracao_slot_minutos || 30,
      ativo: true,
    })
    .returning("id_config_agenda");
  return id;
};

const getByProfissionalEUnidade = (profissional_id, unidade_id) => {
  return knex('agenda_configuracao_horario')
    .where({ profissional_id, unidade_id, ativo: true })
    .orderBy(["dia_semana", "hora_inicio"]);
};

const getById = (id) =>
  knex('agenda_configuracao_horario').where({ id_config_agenda: id }).first();

const update = (id, data) =>
  knex('agenda_configuracao_horario')
    .where({ id_config_agenda: id })
    .update({
      ...data,
      // Garantimos que campos automáticos não sejam sobrescritos manualmente
      id_config_agenda: id,
    });

const remove = (id) =>
  knex('agenda_configuracao_horario').where({ id_config_agenda: id }).delete();

module.exports = {
  create,
  getByProfissionalEUnidade,
  getById,
  update,
  remove,
};
