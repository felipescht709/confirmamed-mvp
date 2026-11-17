// A8 + A11: Adiciona coluna `origem` em consultas e `unidade_id` em ai_audit_logs
// A8: Distingue agendamentos manuais vs IA para analytics correto
// A11: Elimina JOIN frágil com chat_sessions ao filtrar logs por unidade

exports.up = async function (knex) {
  // A8 — Coluna `origem` em consultas
  const hasOrigem = await knex.schema.hasColumn("consultas", "origem");
  if (!hasOrigem) {
    await knex.schema.table("consultas", (table) => {
      table
        .string("origem", 20)
        .defaultTo("MANUAL")
        .notNullable()
        .comment("MANUAL | IA_WHATSAPP | IA_WEBCHAT | IMPORTACAO");
    });
  }

  // A11 — Coluna `unidade_id` em ai_audit_logs
  const hasUnidade = await knex.schema.hasColumn("ai_audit_logs", "unidade_id");
  if (!hasUnidade) {
    await knex.schema.table("ai_audit_logs", (table) => {
      table
        .integer("unidade_id")
        .unsigned()
        .references("id_unidade")
        .inTable("unidades_atendimento")
        .onDelete("SET NULL")
        .nullable();
      table.index("unidade_id", "idx_audit_logs_unidade_id");
    });
  }
};

exports.down = async function (knex) {
  await knex.schema.table("consultas", (t) => t.dropColumn("origem"));
  await knex.schema.table("ai_audit_logs", (t) => {
    t.dropIndex("unidade_id", "idx_audit_logs_unidade_id");
    t.dropColumn("unidade_id");
  });
};
