//backend/src/database/db.js
const knex = require('knex');
const config = require('../../knexfile.js');

// Seleciona o ambiente de desenvolvimento por padrão
const db = knex(config.development);

module.exports = db;