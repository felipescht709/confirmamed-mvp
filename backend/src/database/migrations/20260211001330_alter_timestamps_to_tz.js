exports.up = function (knex) {
  return knex.schema.alterTable("consultas", (table) => {
    // Altera as datas para Timezone
    table.timestamp("data_hora_inicio", { useTz: true }).alter();
    table.timestamp("data_hora_fim", { useTz: true }).alter();
    table
      .timestamp("criado_em", { useTz: true })
      .defaultTo(knex.fn.now())
      .alter();

    // Adiciona o id_procedimento se não existir
    table
      .integer("id_procedimento")
      .unsigned()
      .references("id_procedimento")
      .inTable("procedimentos")
      .onUpdate("CASCADE")
      .onDelete("RESTRICT");

    // ADICIONA a coluna valor_consulta (em vez de dar alter)
    table.decimal("valor_consulta", 10, 2).defaultTo(0);
  });
  // ... restante das tabelas (bloqueios, unidades, etc)
};

exports.down = function (knex) {
  return knex.schema.alterTable("consultas", (table) => {
    table.dropColumn("id_procedimento");
    table.dropColumn("valor_consulta");
  });
};
