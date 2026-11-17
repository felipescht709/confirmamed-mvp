/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const hasToken = await knex.schema.hasColumn('profissionais_da_saude', 'google_refresh_token');
  const hasCalId = await knex.schema.hasColumn('profissionais_da_saude', 'google_calendar_id');

  return knex.schema.alterTable('profissionais_da_saude', table => {
    if (!hasToken) {
      table.text('google_refresh_token').nullable();
    }
    if (!hasCalId) {
      table.string('google_calendar_id').nullable();
    }
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('profissionais_da_saude', table => {
    table.dropColumn('google_refresh_token');
    table.dropColumn('google_calendar_id');
  });
};
