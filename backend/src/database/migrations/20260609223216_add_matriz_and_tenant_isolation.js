exports.up = function(knex) {
  return knex.schema
    .table('unidades_atendimento', function(table) {
      table.integer('matriz_id').references('id_unidade').inTable('unidades_atendimento').onDelete('SET NULL');
    })
    .table('convenios', function(table) {
      table.integer('unidade_id').references('id_unidade').inTable('unidades_atendimento').onDelete('CASCADE');
    })
    .table('convenio_planos', function(table) {
      table.integer('unidade_id').references('id_unidade').inTable('unidades_atendimento').onDelete('CASCADE');
    });
};

exports.down = function(knex) {
  return knex.schema
    .table('convenio_planos', function(table) {
      table.dropColumn('unidade_id');
    })
    .table('convenios', function(table) {
      table.dropColumn('unidade_id');
    })
    .table('unidades_atendimento', function(table) {
      table.dropColumn('matriz_id');
    });
};
