exports.up = function(knex) {
  return knex.schema.alterTable('unidades_atendimento', (table) => {
        table.jsonb('configuracoes_ia').nullable(); 
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('unidades_atendimento', (table) => {
    table.dropColumn('configuracoes_ia');
  });
};