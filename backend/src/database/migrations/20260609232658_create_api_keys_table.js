exports.up = function (knex) {
  return knex.schema.createTable("api_keys", (table) => {
    table.increments("id_key").primary();
    table
      .integer("unidade_id")
      .unsigned()
      .notNullable()
      .references("id_unidade")
      .inTable("unidades_atendimento")
      .onDelete("CASCADE");
    table.string("key_hash", 255).notNullable();
    table.string("nome_integracao", 100).notNullable(); // Ex: Doctoralia, Amplimed
    table.boolean("ativo").defaultTo(true);
    table.timestamp("criado_em").defaultTo(knex.fn.now());
    table.timestamp("ultimo_uso").nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("api_keys");
};
