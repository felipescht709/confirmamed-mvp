exports.up = function(knex) {
  return knex.schema.alterTable('consultas', table => {
    table.string('google_event_id').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('consultas', table => {
    table.dropColumn('google_event_id');
  });
};
