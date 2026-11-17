/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('consultas', function(table) {
    table.string('status_confirmacao').defaultTo('PENDENTE'); // PENDENTE, CONFIRMADO, CANCELADO, REAGENDAR
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('consultas', function(table) {
    table.dropColumn('status_confirmacao');
  });
};
