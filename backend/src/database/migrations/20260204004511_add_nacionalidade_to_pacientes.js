exports.up = function(knex) {
  return knex.schema.alterTable('pacientes', (table) => {
    // Adicionando os campos que o seu repositório está pedindo
    table.string('nacionalidade', 100);
    table.string('numero', 20);
    table.timestamp('atualizado_em').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('pacientes', (table) => {
    table.dropColumn('nacionalidade');
    table.dropColumn('numero');
    table.dropColumn('atualizado_em');
  });
};