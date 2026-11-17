// profissionalRepository.js
const knex = require("../database/db.js");

const create = async (data) => {
  const [result] = await knex("profissionais_da_saude")
    .insert({
      nome_completo: data.nome_completo,
      cpf: data.cpf,
      data_nascimento: data.data_nascimento,
      especialidade: data.especialidade,
      rqe: data.rqe || null,
      conselho: data.conselho,
      numero_conselho: data.numero_conselho,
      uf_conselho: data.uf_conselho,
      telefone: data.telefone,
      email: data.email,
      permite_telemedicina: data.permite_telemedicina || false,
    })
    .returning("id_profissional_saude");

  return result.id_profissional_saude;
};

const listByUnidade = (unidadeId) => {
  return knex("profissionais_da_saude as p")
    .join(
      "profissional_unidade_vinculo as pu",
      "p.id_profissional_saude",
      "pu.profissional_id",
    )
    .where("pu.unidade_id", unidadeId)
    .whereNull("p.deleted_at")
    .select(
      "p.id_profissional_saude",
      "p.nome_completo",
      "p.especialidade",
      "p.permite_telemedicina",
      "p.conselho",
      "p.numero_conselho",
      knex.raw("CASE WHEN p.google_refresh_token IS NOT NULL THEN true ELSE false END as google_sync_active")
    );
};

const getAll = (unidade_id = null) => {
  let query = knex("profissionais_da_saude as p").whereNull("p.deleted_at");

  if (unidade_id) {
    query
      .join(
        "profissional_unidade_vinculo as pu",
        "p.id_profissional_saude",
        "pu.profissional_id",
      )
      .where("pu.unidade_id", unidade_id);
  }

  // SEMPRE limite os campos retornados para segurança e performance
  return query.select(
    "p.id_profissional_saude",
    "p.nome_completo",
    "p.especialidade",
    "p.conselho",
    "p.numero_conselho",
    "p.permite_telemedicina",
    knex.raw("CASE WHEN p.google_refresh_token IS NOT NULL THEN true ELSE false END as google_sync_active")
  );
};

const update = (id, data) =>
  knex("profissionais_da_saude")
    .where({ id_profissional_saude: id })
    .update(data);

const softDelete = (id) =>
  knex("profissionais_da_saude")
    .where({ id_profissional_saude: id })
    .update({ deleted_at: knex.fn.now(), ativo: false });

module.exports = { create, getAll, update, softDelete, listByUnidade };
