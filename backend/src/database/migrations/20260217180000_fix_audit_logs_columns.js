/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Verifica se precisa renomear 'decisao_ia' para 'output_ia'
  const hasDecisao = await knex.schema.hasColumn("ai_audit_logs", "decisao_ia");
  if (hasDecisao) {
    await knex.schema.alterTable("ai_audit_logs", (table) => {
      table.renameColumn("decisao_ia", "output_ia");
    });
  }

  // 2. Resolve o conflito de 'data_hora'
  const hasDataHora = await knex.schema.hasColumn("ai_audit_logs", "data_hora");
  const hasCreatedAt = await knex.schema.hasColumn(
    "ai_audit_logs",
    "created_at",
  );

  await knex.schema.alterTable("ai_audit_logs", (table) => {
    if (hasDataHora && hasCreatedAt) {
      // Cenário Atual: Ambas existem (porque criamos data_hora no terminal).
      // Apenas apagamos a antiga para não ficar duplicado.
      table.dropColumn("created_at");
    } else if (!hasDataHora && hasCreatedAt) {
      // Cenário Limpo: Só existe a antiga, então renomeia.
      table.renameColumn("created_at", "data_hora");
    }
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasOutput = await knex.schema.hasColumn("ai_audit_logs", "output_ia");
  if (hasOutput) {
    await knex.schema.alterTable("ai_audit_logs", (table) => {
      table.renameColumn("output_ia", "decisao_ia");
    });
  }

  const hasDataHora = await knex.schema.hasColumn("ai_audit_logs", "data_hora");
  if (hasDataHora) {
    await knex.schema.alterTable("ai_audit_logs", (table) => {
      table.renameColumn("data_hora", "created_at");
    });
  }
};
