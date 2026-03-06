/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema
    // 1. Habilita extensão para busca textual rápida (ILIKE otimizado)
    .raw('CREATE EXTENSION IF NOT EXISTS pg_trgm')
    .table("procedimentos", (table) => {
      // Campos de Texto Rico para a IA (RAG)
      table.text("preparo_obrigatorio").nullable().comment("Instruções de jejum, roupas, etc.");
      table.text("contraindicacoes").nullable().comment("Marca-passo, gravidez, alergias");
      table.text("pos_procedimento").nullable().comment("Cuidados pós-exame");
      table.text("documentos_necessarios").nullable().comment("Pedido médico, carteirinha");

      // 2. Cria Índice GIN (Generalized Inverted Index) para performance extrema em buscas
      // Isso permite buscar "ecocardiograma" e achar "eco cardio" em milissegundos
      table.index(
        [knex.raw("nome_procedimento gin_trgm_ops")],
        "idx_procedimentos_busca_trgm",
        "gin"
      );
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.table("procedimentos", (table) => {
    table.dropIndex([], "idx_procedimentos_busca_trgm");
    table.dropColumn("preparo_obrigatorio");
    table.dropColumn("contraindicacoes");
    table.dropColumn("pos_procedimento");
    table.dropColumn("documentos_necessarios");
  });
};