exports.up = function (knex) {
  return knex.schema.alterTable("ai_audit_logs", (table) => {
    // Altera de varchar(255) para TEXT (ilimitado)
    table.text("input_usuario").alter();
    table.text("output_ia").alter();
    table.text("prompt_enviado").alter();
    table.text("risco_detectado").alter();
  });
};

exports.down = function (knex) {
  // Reverte (cuidado, pode truncar dados)
  return knex.schema.alterTable("ai_audit_logs", (table) => {
    table.string("input_usuario").alter();
    table.string("output_ia").alter();
    table.string("prompt_enviado").alter();
    table.string("risco_detectado").alter();
  });
};
