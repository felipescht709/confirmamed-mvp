exports.up = function(knex) {
  return knex.schema.table('unidades_atendimento', function(table) {
    table.string('email_notificacao');
    table.timestamp('trial_ends_at');
  });
};

exports.down = function(knex) {
  return knex.schema.table('unidades_atendimento', function(table) {
    table.dropColumn('email_notificacao');
    table.dropColumn('trial_ends_at');
  });
};
