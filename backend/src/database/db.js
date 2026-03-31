// backend/src/database/db.js
const knex = require("knex");
const config = require("../../knexfile.js");

// Pega o ambiente correto (development, production, etc) ou usa dev como fallback
const environment = process.env.NODE_ENV || "development";
const db = knex(config[environment]);

module.exports = db;
