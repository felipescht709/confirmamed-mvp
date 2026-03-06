/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Remove a tabela antiga se ela existir (LIMPEZA)
  await knex.schema.dropTableIfExists("chat_sessions");

  // 2. Cria a nova tabela com a estrutura correta (FSM + RAG)
  return knex.schema.createTable("chat_sessions", (table) => {
    table.uuid("session_id").primary().defaultTo(knex.fn.uuid());
    table.string("paciente_telefone").notNullable();

    // Máquina de Estados (FSM)
    table
      .enum("estado_atual", [
        "TRIAGEM",
        "ORIENTACOES",
        "AGENDAMENTO",
        "CONFIRMACAO",
        "TRANSBORDO",
      ])
      .defaultTo("TRIAGEM")
      .notNullable();

    table.jsonb("contexto_temporario").defaultTo("{}");
    table.boolean("aceite_lgpd").defaultTo(false);
    table.timestamp("expires_at").notNullable();

    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    table.index(["paciente_telefone"], "idx_chat_telefone");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable("chat_sessions");
};
