exports.up = function (knex) {
  return knex.schema.createTable("fila_espera", (table) => {
    table.increments("id_fila").primary();

    // FK Unidade - Referenciando 'id_unidade'
    table
      .integer("unidade_id")
      .unsigned()
      .notNullable()
      .references("id_unidade")
      .inTable("unidades_atendimento")
      .onDelete("CASCADE");

    // FK Paciente - Referenciando 'id_paciente'
    table
      .integer("paciente_id")
      .unsigned()
      .notNullable()
      .references("id_paciente")
      .inTable("pacientes")
      .onDelete("CASCADE");

    // FK Profissional - Referenciando 'id_profissional_saude'
    table
      .integer("profissional_id")
      .unsigned()
      .nullable()
      .references("id_profissional_saude")
      .inTable("profissionais_da_saude")
      .onDelete("SET NULL");

    table
      .enum("preferencia_turno", ["MANHA", "TARDE", "NOITE", "QUALQUER"])
      .defaultTo("QUALQUER");
    table.boolean("prioridade_clinica").defaultTo(false);
    table.string("status").defaultTo("AGUARDANDO"); // AGUARDANDO, NOTIFICADO, AGENDADO
    table.timestamp("solicitado_em", { useTz: true }).defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("fila_espera");
};
