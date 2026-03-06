//backend/src/repositories/convenioRepository.js
const knex = require("../database/db.js");

// --- CONVÊNIOS ---
const createConvenio = (data) => knex('convenios').insert(data).returning("*");
const getConvenios = () => knex('convenios').where({ ativo: true });
const updateConvenio = (id, data) =>
  knex('convenios').where({ id_convenio: id }).update(data);

const softDeleteConvenio = (id) =>
  knex('convenios').where({ id_convenio: id }).update({ ativo: false });

const getConvenioById = (id) =>
  knex('convenios').where({ id_convenio: id }).first();

// --- PLANOS ---
const createPlano = (data) =>
  knex('convenio_planos').insert(data).returning("*");
const getPlanosPorConvenio = (convenio_id) =>
  knex('convenio_planos').where({ convenio_id, ativo: true });

const updatePlano = (id, data) =>
  knex('convenio_planos').where({ id_plano: id }).update(data);

const getPlanoById = (id) =>
  knex('convenio_planos').where({ id_plano: id }).first();

const softDeletePlano = (id) =>
  knex('convenio_planos').where({ id_plano: id }).update({ ativo: false });

module.exports = {
  createConvenio,
  getConvenios,
  updateConvenio,
  softDeleteConvenio,
  getConvenioById,
  createPlano,
  getPlanosPorConvenio,
  updatePlano,
  getPlanoById,
  softDeletePlano,
};
