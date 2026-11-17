/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('unidades_atendimento', table => {
    // Array de minutos para lembretes (ex: {1440, 2880}) - Default 1440 (24h)
    table.specificType('lembretes_config_minutos', 'integer[]').defaultTo('{1440}');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('unidades_atendimento', table => {
    table.dropColumn('lembretes_config_minutos');
  });
};
