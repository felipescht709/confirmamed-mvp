// backend/src/repositories/agendaBloqueioRepository.js
const knex = require("../database/db.js");

const create = async (data) => {
  const [id] = await knex("agenda_bloqueios")
    .insert({
      profissional_id: data.profissional_id,
      unidade_id: data.unidade_id,
      data_inicio: data.data_inicio,
      data_fim: data.data_fim,
      motivo: data.motivo,
      bloqueio_dia_inteiro: data.bloqueio_dia_inteiro || false,
    })
    .returning("id_bloqueio");
  return id;
};

const getByFiltros = (profissional_id, unidade_id) => {
  return knex("agenda_bloqueios")
    .where({ profissional_id, unidade_id })
    .where("data_fim", ">=", knex.fn.now()) // A IA só precisa saber de bloqueios futuros
    .orderBy("data_inicio", "asc");
};

const remove = (id) =>
  knex("agenda_bloqueios").where({ id_bloqueio: id }).delete();

const getById = (id) =>
  knex("agenda_bloqueios").where({ id_bloqueio: id }).first();

const update = (id, data) =>
  knex("agenda_bloqueios")
    .where({ id_bloqueio: id })
    .update({
      ...data,
      // O id_bloqueio é PK e não deve ser alterado
      id_bloqueio: id,
    });

module.exports = {
  create,
  getByFiltros,
  getById,
  update,
  remove,
};
