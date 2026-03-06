// backend/src/repositories/vinculoRepository.js
const knex = require("../database/db.js");

const vincular = async (profissional_id, unidade_id) => {
  return knex('profissional_unidade_vinculo')
    .insert({
      profissional_id,
      unidade_id,
    })
    .onConflict(["profissional_id", "unidade_id"])
    .ignore(); // Evita erro se já estiver vinculado
};

const desvincular = (profissional_id, unidade_id) => {
  return knex('profissional_unidade_vinculo')
    .where({ profissional_id, unidade_id })
    .delete();
};

const getProfissionaisPorUnidade = (unidade_id) => {
  return knex("profissionais_da_saude as p")
    .join(
      "profissional_unidade_vinculo as v",
      "p.id_profissional_saude",
      "v.profissional_id",
    )
    .where("v.unidade_id", unidade_id)
    .whereNull("p.deleted_at");
};

const getVincularPorId = (profissional_id, unidade_id) => {
  return knex('profissional_unidade_vinculo')
    .where({ profissional_id, unidade_id })
    .first();
};

const getAllVinculos = () => {
  return knex("profissional_unidade_vinculo as v")
    .join(
      "profissionais_da_saude as p",
      "v.profissional_id",
      "p.id_profissional_saude",
    )
    .join("unidades_atendimento as u", "v.unidade_id", "u.id_unidade")
    .select("p.nome_completo", "u.nome_fantasia", "v.*");
};

module.exports = { vincular, desvincular, getVincularPorId, getAllVinculos, getProfissionaisPorUnidade };
