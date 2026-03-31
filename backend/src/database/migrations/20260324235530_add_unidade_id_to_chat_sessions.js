/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('chat_sessions', (table) => {
    // 1. Adiciona a coluna como integer
    table.integer('unidade_id').unsigned().nullable();

    // 2. Cria a chave estrangeira (FK) apontando para a tabela de unidades
    // Ajuste 'id_unidade' e 'unidades_atendimento' se os nomes reais forem diferentes
    table.foreign('unidade_id')
      .references('id_unidade')
      .inTable('unidades_atendimento')
      .onDelete('SET NULL') // Se a unidade for excluída, a sessão permanece mas sem ID
      .onUpdate('CASCADE');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('chat_sessions', (table) => {
    // Remove a constraint da FK primeiro e depois a coluna
    table.dropForeign('unidade_id');
    table.dropColumn('unidade_id');
  });
};