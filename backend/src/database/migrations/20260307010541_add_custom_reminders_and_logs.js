/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // 1. Altera a tabela de Unidades para permitir a configuração personalizada
    .alterTable('unidades_atendimento', table => {
      // Array de inteiros para horas (ex: {1, 24, 48}) - Recurso do PostgreSQL
      table.specificType('lembretes_config_horas', 'integer[]').defaultTo('{24}');
      table.boolean('confirmacao_automatica_ativa').defaultTo(true);
    })
    // 2. Cria a tabela de logs de comunicação (Obrigatório para evitar spam e auditar cobrança)
    .createTable('comunicacoes_log', table => {
      table.increments('id_log').primary();
      table.integer('id_consulta').unsigned().notNullable()
        .references('id_consulta').inTable('consultas').onDelete('CASCADE');
      
      table.integer('tipo_gatilho_horas').notNullable(); // Ex: 1, 24, 168
      table.string('status').notNullable().defaultTo('ENVIADO'); // PENDENTE, ENVIADO, ERRO
      table.string('canal').defaultTo('WHATSAPP'); // WHATSAPP, SMS, WEBCHAT
      
      table.timestamp('enviado_em').defaultTo(knex.fn.now());
      
      // Índice composto para evitar que o robô envie o mesmo lembrete de "24h" duas vezes para a mesma consulta
      table.unique(['id_consulta', 'tipo_gatilho_horas']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('comunicacoes_log')
    .alterTable('unidades_atendimento', table => {
      table.dropColumn('lembretes_config_horas');
      table.dropColumn('confirmacao_automatica_ativa');
    });
};