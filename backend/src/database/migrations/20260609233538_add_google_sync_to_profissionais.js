exports.up = function(knex) {
  return knex.schema.alterTable('profissionais_da_saude', table => {
    table.text('google_refresh_token').nullable();
    table.string('google_calendar_id').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('profissionais_da_saude', table => {
    table.dropColumn('google_refresh_token');
    table.dropColumn('google_calendar_id');
  });
};
