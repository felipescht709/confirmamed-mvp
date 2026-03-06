/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function (knex) {
  return knex.schema.createTable("WEBHOOK_EVENTS", (table) => {
    // ID da mensagem vindo da Evolution (key.id). Evita duplicidade.
    table.string("message_id").primary().notNullable();

    // O JSON completo. Se a API mudar, não quebramos a tabela.
    table.jsonb("payload").notNullable();

    // Controle de estado: RECEIVED -> PROCESSING -> COMPLETED (ou ERROR)
    table.string("status").defaultTo("RECEIVED").index();

    // Log de erro caso o processamento falhe
    table.text("error_log").nullable();

    table.timestamp("recebido_em").defaultTo(knex.fn.now());
    table.timestamp("processado_em").nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function (knex) {
  return knex.schema.dropTable("WEBHOOK_EVENTS");
};
