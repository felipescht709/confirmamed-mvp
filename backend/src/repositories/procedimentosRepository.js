// repositories/procedimentosRepository.js
const knex = require("../database/db.js");

const create = async (data) => {
  const [id] = await knex("procedimentos")
    .insert({
      ...data,
      ativo: true,
    })
    .returning("id_procedimento");

  return typeof id === "object" ? id.id_procedimento : id;
};

const listByUnidade = (unidade_id) =>
  knex("procedimentos")
    .where({ unidade_id })
    .whereNull("deleted_at")
    .orderBy("nome_procedimento", "asc");

const update = (id, data) =>
  knex("procedimentos")
    .where({ id_procedimento: id })
    .update({ ...data, atualizado_em: knex.fn.now() });

const softDelete = (id) =>
  knex("procedimentos")
    .where({ id_procedimento: id })
    .update({ deleted_at: knex.fn.now(), ativo: false });

module.exports = { create, listByUnidade, update, softDelete };
