exports.up = function (knex) {
  return knex.schema
    .hasColumn("agenda_bloqueios", "unidade_id")
    .then((exists) => {
      if (!exists) {
        return knex.schema.alterTable("agenda_bloqueios", (table) => {
          table
            .integer("unidade_id")
            .unsigned() // Importante para FKs
            .references("id_unidade")
            .inTable("unidades_atendimento")
            .onDelete("CASCADE"); // Se a unidade for deletada, os bloqueios somem
        });
      }
    });
};

exports.down = function (knex) {
  return knex.schema.alterTable("agenda_bloqueios", (table) => {
    table.dropColumn("unidade_id");
  });
};
