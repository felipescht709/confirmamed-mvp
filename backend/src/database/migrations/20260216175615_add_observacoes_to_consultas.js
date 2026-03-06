/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('consultas', function(table) {
    table.text('observacoes').nullable(); // Text permite textos longos, nullable pois é opcional
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('consultas', function(table) {
    table.dropColumn('observacoes');
  });
};