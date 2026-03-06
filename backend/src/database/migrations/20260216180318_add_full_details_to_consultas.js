/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const hasTipoPagamento = await knex.schema.hasColumn('consultas', 'tipo_pagamento');
  const hasConvenio = await knex.schema.hasColumn('consultas', 'id_convenio_plano');
  const hasTelemedicina = await knex.schema.hasColumn('consultas', 'telemedicina');

  return knex.schema.table('consultas', function(table) {
    
    // 1. Resolve o erro atual
    if (!hasTipoPagamento) {
      table.enum('tipo_pagamento', ['PARTICULAR', 'CONVENIO', 'RETORNO']).defaultTo('PARTICULAR');
    }

    // 2. Previne o próximo erro (FK de convênio)
    if (!hasConvenio) {
      table.integer('id_convenio_plano')
           .unsigned()
           .nullable()
           .references('id_convenio_plano')
           .inTable('convenio_planos') // Certifique-se que esta tabela existe, senão remova o .references
           .onDelete('SET NULL');
    }

    // 3. Previne o erro de modalidade
    if (!hasTelemedicina) {
      table.boolean('telemedicina').defaultTo(false);
    }
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('consultas', function(table) {
    table.dropColumn('tipo_pagamento');
    table.dropColumn('id_convenio_plano');
    table.dropColumn('telemedicina');
  });
};