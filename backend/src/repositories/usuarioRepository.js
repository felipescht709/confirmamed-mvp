//backend/src/repositories/usuarioRepository.js
const knex = require("../database/db");

const findByEmail = (email) => {
  return knex('usuarios_sistema')
    .where({ email, ativo: true })
    .whereNull("deleted_at")
    .first();
};

const create = async (dados) => {
  // O ID retornado será o id_usuario conforme o novo schema
  const [id] = await knex('usuarios_sistema')
    .insert({
      email: dados.email,
      nome: dados.nome,
      senha_hash: dados.senha_hash,
      role: dados.role,
      unidade_id: dados.unidade_id,
      profissional_id: dados.profissional_id || null,
      ativo: true,
    })
    .returning("id_usuario");
  return id;
};

const getAll = (unidade_id) => {
  let query = knex('usuarios_sistema').whereNull("deleted_at");
  if (unidade_id) query.where({ unidade_id });
  return query.select(
    "id_usuario",
    "nome",
    "email",
    "role",
    "profissional_id",
    "ativo",
  );
};

const update = (id, dados) => {
  return knex('usuarios_sistema').where({ id_usuario: id }).update(dados);
};

const softDelete = (id) => {
  return knex('usuarios_sistema')
    .where({ id_usuario: id })
    .update({ deleted_at: knex.fn.now(), ativo: false });
};

module.exports = { create, findByEmail, getAll, update, softDelete };
