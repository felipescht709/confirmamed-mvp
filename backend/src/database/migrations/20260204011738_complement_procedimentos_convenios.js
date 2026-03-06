exports.up = function(knex) {
  return knex.schema
    .alterTable('procedimentos', (table) => {
      // Campos que o seu repository usa mas não estavam na migration original
      table.string('codigo_sus', 20);
      table.boolean('permite_telemedicina').defaultTo(false);
      table.text('descricao');
      table.timestamp('atualizado_em').defaultTo(knex.fn.now());
    })
    .alterTable('convenios', (table) => {
      table.timestamp('atualizado_em').defaultTo(knex.fn.now());
    })
    .alterTable('convenio_planos', (table) => {
      table.timestamp('atualizado_em').defaultTo(knex.fn.now());
    });
};

exports.down = function(knex) {
  return knex.schema
    .alterTable('procedimentos', (table) => {
      table.dropColumns('codigo_sus', 'permite_telemedicina', 'descricao', 'atualizado_em');
    })
    .alterTable('convenios', (table) => {
      table.dropColumn('atualizado_em');
    })
    .alterTable('convenio_planos', (table) => {
      table.dropColumn('atualizado_em');
    });
};