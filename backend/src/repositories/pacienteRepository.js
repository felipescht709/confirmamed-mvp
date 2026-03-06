// src/repositories/pacienteRepository.js
const knex = require("../database/db.js");

const create = async (data) => {
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
    })
    .returning("id_paciente");

  return typeof result === "object" ? result.id_paciente : result;
};

// 👇 Função original (mantida para não quebrar outras partes do sistema)
const findByTelefone = (tel) =>
  knex("pacientes").where({ telefone: tel }).whereNull("deleted_at").first();

// 👇 NOVA FUNÇÃO (Para a IA achar múltiplos dependentes)
const findAllByTelefone = async (tel) => {
  const numeroLimpo = tel.replace(/\D/g, "");
  const sufixo = numeroLimpo.slice(-8);

  return await knex("pacientes")
    .select("id_paciente", "nome", "cpf")
    .where("telefone", "like", `%${sufixo}%`)
    .whereNull("deleted_at");
};

const getAll = (searchTerm = null) => {
  const query = knex("pacientes")
    .select("id_paciente", "nome", "cpf", "telefone", "data_nascimento")
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

const getById = (id) =>
  knex("pacientes").where({ id_paciente: id }).whereNull("deleted_at").first();

const update = async (id, data) => {
  const { id_paciente, criado_em, atualizado_em, deleted_at, ...cleanData } =
    data;

  try {
    return await knex("pacientes")
      .where({ id_paciente: id })
      .update({
        ...cleanData,
        atualizado_em: knex.fn.now(),
      });
  } catch (error) {
    console.error("ERRO NO REPOSITORY UPDATE:", error.message);
    throw error;
  }
};

const softDelete = (id) =>
  knex("pacientes")
    .where({ id_paciente: id })
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
