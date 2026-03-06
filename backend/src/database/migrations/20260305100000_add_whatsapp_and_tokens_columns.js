// src/database/migrations/20260305100000_add_whatsapp_and_tokens_columns.js
exports.up = function(knex) {
  return knex.schema
    .alterTable('unidades_atendimento', table => {
      table.string('whatsapp_instance_name', 255);
    })
    .alterTable('ai_audit_logs', table => {
      // Adicionando a coluna que quebrou a Rota do Dashboard
      table.integer('total_tokens').defaultTo(0);
    });
};

exports.down = function(knex) {
  return knex.schema
    .alterTable('unidades_atendimento', table => {
      table.dropColumn('whatsapp_instance_name');
    })
    .alterTable('ai_audit_logs', table => {
      table.dropColumn('total_tokens');
    });
};