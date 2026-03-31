// src/repositories/pacienteRepository.js
const knex = require("../database/db.js");

const create = async (data, unidade_id) => {
  const [result] = await knex("pacientes")
    .insert({
      nome: data.nome,
      cpf: data.cpf,
      cns: data.cns,
      data_nascimento: data.data_nascimento,
      email: data.email,
      nacionalidade: data.nacionalidade,
      telefone: data.telefone,
      cep: data.cep,
      logradouro: data.logradouro,
      numero: data.numero,
      bairro: data.bairro,
      cidade: data.cidade,
      uf: data.uf,
      unidade_id, // 🔐 Isolamento de Tenant
    })
    .returning("id_paciente");

  return typeof result === "object" ? result.id_paciente : result;
};

// 👇 Agora filtrando por unidade_id
const findByTelefone = (tel, unidade_id) =>
  knex("pacientes")
    .where({ telefone: tel, unidade_id })
    .whereNull("deleted_at")
    .first();

const findAllByTelefone = async (tel, unidade_id) => {
  const numeroLimpo = tel.replace(/\D/g, "");
  const sufixo = numeroLimpo.slice(-8);

  return await knex("pacientes")
    .select("id_paciente", "nome", "cpf")
    .where("telefone", "like", `%${sufixo}%`)
    .where({ unidade_id }) // 🔐 Isolamento de Tenant
    .whereNull("deleted_at");
};

const getAll = (unidade_id, searchTerm = null) => {
  const query = knex("pacientes")
    .select("id_paciente", "nome", "cpf", "telefone", "data_nascimento")
    .where({ unidade_id }) // 🔐 Isolamento de Tenant
    .whereNull("deleted_at")
    .orderBy("nome", "asc");

  if (searchTerm) {
    query.andWhere(function () {
      this.where("nome", "ilike", `%${searchTerm}%`).orWhere(
        "cpf",
        "ilike",
        `%${searchTerm}%`,
      );
    });
  }
  return query.limit(20);
};

const getById = (id, unidade_id) =>
  knex("pacientes")
    .where({ id_paciente: id, unidade_id })
    .whereNull("deleted_at")
    .first();

const update = async (id, unidade_id, data) => {
  const { id_paciente, criado_em, atualizado_em, deleted_at, ...cleanData } =
    data;

  try {
    return await knex("pacientes")
      .where({ id_paciente: id, unidade_id }) // 🔐 Isolamento de Tenant
      .update({
        ...cleanData,
        atualizado_em: knex.fn.now(),
      });
  } catch (error) {
    console.error("ERRO NO REPOSITORY UPDATE:", error.message);
    throw error;
  }
};

const softDelete = (id, unidade_id) =>
  knex("pacientes")
    .where({ id_paciente: id, unidade_id }) // 🔐 Isolamento de Tenant
    .update({ deleted_at: knex.fn.now(), ativo: false });

module.exports = {
  create,
  findByTelefone,
  findAllByTelefone,
  getAll,
  getById,
  update,
  softDelete,
};
