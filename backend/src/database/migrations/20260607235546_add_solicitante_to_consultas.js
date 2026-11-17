/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('consultas', function(table) {
    table.string('solicitante_nome');
    table.string('solicitante_telefone');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('consultas', function(table) {
    table.dropColumn('solicitante_nome');
    table.dropColumn('solicitante_telefone');
  });
};
