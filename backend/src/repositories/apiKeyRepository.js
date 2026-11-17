const knex = require("../database/db");
const bcrypt = require("bcryptjs");

/**
 * Cria uma nova chave de API hasheada.
 * Esta função deve ser chamada apenas internamente por scripts ou rotas de admin.
 */
const createKey = async (unidade_id, nome_integracao, plainKey) => {
  const salt = await bcrypt.genSalt(10);
  const key_hash = await bcrypt.hash(plainKey, salt);

  const [id] = await knex("api_keys").insert({
    unidade_id,
    key_hash,
    nome_integracao,
    ativo: true,
  }).returning("id_key");

  return id;
};

/**
 * Busca todas as chaves ativas
 */
const getActiveKeys = async () => {
  return knex("api_keys").where({ ativo: true });
};

/**
 * Atualiza o último uso
 */
const updateLastUse = async (id_key) => {
  return knex("api_keys").where({ id_key }).update({ ultimo_uso: knex.fn.now() });
};

module.exports = { createKey, getActiveKeys, updateLastUse };
