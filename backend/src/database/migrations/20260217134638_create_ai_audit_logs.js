/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("ai_audit_logs", (table) => {
    table.increments("id_log").primary();

    // Link com a sessão (mas não deleta o log se a sessão for apagada - Auditoria Forense)
    table.uuid("session_id").nullable();

    // O que o usuário disse (Sanitizado se possível, mas necessário para contexto)
    table.text("input_usuario");

    // O que mandamos pra IA (Com PII Masking: [CPF_REDACTED])
    table.text("prompt_enviado");

    // Hash para agrupar perguntas idênticas (Analytics)
    table.string("prompt_hash");

    // Qual IA trabalhou
    table.string("provider_usado").comment("OPENAI ou GEMINI");

    // O que a IA decidiu fazer (Ex: 'verificar_disponibilidade')
    table.string("decisao_ia");

    // O Veredito da IA Secundária
    table.string("veredicto_auditoria").comment("APROVADO ou REPROVADO");
    table
      .text("risco_detectado")
      .nullable()
      .comment("Explicação do Gemini caso reprove");

    // Métricas de Performance
    table.integer("latency_ms");
    table.float("custo_estimado").nullable();

    table.timestamp("created_at").defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable("ai_audit_logs");
};
