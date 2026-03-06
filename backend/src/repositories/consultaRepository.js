//consultaRepository.js
const knex = require("../database/db.js");

const create = async (data) => {
  const [id] = await knex("consultas")
    .insert({
      paciente_id: data.paciente_id,
      profissional_id: data.profissional_id,
      unidade_id: data.unidade_id,
      data_hora_inicio: data.data_hora_inicio,
      data_hora_fim: data.data_hora_fim,
      valor_consulta: data.valor_consulta,
      telemedicina: data.telemedicina || false,
      status: "AGENDADO",
      //observacoes: data.observacoes,
      id_convenio_plano: data.id_convenio_plano,
      tipo_pagamento: data.tipo_pagamento,
    })
    .returning("id_consulta");
  return id;
};

// src/repositories/consultaRepository.js
const getAll = (filters = {}) => {
  let query = knex("consultas as c")
    .join("pacientes as p", "c.paciente_id", "p.id_paciente")
    .join(
      "profissionais_da_saude as pro",
      "c.profissional_id",
      "pro.id_profissional_saude",
    )
    .select(
      // Especifique as colunas da consulta explicitamente para evitar colisão
      "c.id_consulta",
      "c.data_hora_inicio",
      "c.data_hora_fim",
      "c.status",
      "c.valor_consulta",
      "c.telemedicina",
      "c.tipo_pagamento",
      // Aliases para evitar que 'nome' de paciente e profissional se misturem
      "p.id_paciente",
      "p.nome as paciente_nome",
      "pro.id_profissional_saude",
      "pro.nome_completo as profissional_nome",
      "pro.especialidade as profissional_especialidade",
    )
    .whereNull("c.deleted_at");

  if (filters.unidade_id) query.where("c.unidade_id", filters.unidade_id);
  if (filters.data)
    query.whereRaw("DATE(c.data_hora_inicio) = ?", [filters.data]);
  if (filters.profissional_id)
    query.where("c.profissional_id", filters.profissional_id);
  if (filters.start && filters.end)
    query.whereBetween("c.data_hora_inicio", [filters.start, filters.end]);

  return query;
};

const update = (id, data) =>
  knex("consultas")
    .where({ id_consulta: id })
    .update({ ...data, updated_at: knex.fn.now() });

const softDelete = (id) =>
  knex("consultas").where({ id_consulta: id }).update({
    deleted_at: knex.fn.now(),
    status: "CANCELADO",
  });

module.exports = { create, getAll, update, softDelete };
