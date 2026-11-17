exports.up = function (knex) {
  return knex.schema.alterTable("pacientes", (table) => {
    table
      .integer("unidade_id")
      .references("id_unidade")
      .inTable("unidades_atendimento")
      .onDelete("CASCADE");
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable("pacientes", (table) => {
    table.dropColumn("unidade_id");
  });
};
