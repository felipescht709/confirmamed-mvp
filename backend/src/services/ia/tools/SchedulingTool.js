//services/ia/tools/SchedulingTool.js
const knex = require("../../../database/db");

const SchedulingTool = {
  definition: {
    type: "function",
    function: {
      name: "realizar_agendamento",
      description: "Finaliza e confirma o agendamento no sistema.",
      parameters: {
        type: "object",
        properties: {
          profissional_id: { type: "integer" },
          paciente_id: { type: "integer" },
          data_hora_inicio: {
            type: "string",
            description: "ISO 8601 (YYYY-MM-DDTHH:mm:ss)",
          },
          unidade_id: { type: "integer" },
        },
        required: ["profissional_id", "paciente_id", "data_hora_inicio"],
      },
    },
  },

  async execute({
    profissional_id,
    paciente_id,
    data_hora_inicio,
    unidade_id,
  }) {
    try {
      const idUnidade = unidade_id || 1;

      // Transação para evitar inconsistência no agendamento (Race Condition)
      const result = await knex.transaction(async (trx) => {
        // 1. Lock consultando o registro na tabela (bloqueia leituras simultâneas para update)
        // Nota: Idealmente, o banco deve ter uma UNIQUE constraint (profissional_id, data_hora_inicio)
        const ocupado = await trx("consultas")
          .where({
            profissional_id,
            data_hora_inicio,
            status: "AGENDADO",
          })
          .whereNull("deleted_at")
          .first();

        if (ocupado) {
          return {
            success: false,
            message:
              "FALHA: Este horário acabou de ser ocupado por outra pessoa. Peça para escolher outro.",
          };
        }

        // 2. Insere o agendamento dentro da mesma transação
        const [inserido] = await trx("consultas")
          .insert({
            profissional_id,
            paciente_id,
            unidade_id: idUnidade,
            data_hora_inicio,
            data_hora_fim: knex.raw(`?::timestamp + interval '30 minutes'`, [
              data_hora_inicio,
            ]),
            status: "AGENDADO",
            tipo_pagamento: "PARTICULAR",
            created_at: knex.fn.now(), // Use knex.fn.now() em vez de new Date() para sincronia com DB
          })
          .returning("id_consulta");

        return { success: true, id: inserido.id_consulta };
      });

      return result.success
        ? `SUCESSO: Agendamento realizado. ID: ${result.id}. Confirme com o paciente.`
        : result.message;
    } catch (error) {
      // Tratar erro de Unique Constraint do PG (código 23505) se existir
      if (error.code === "23505")
        return "FALHA: Horário indisponível (conflito de concorrência).";
      console.error("Erro na Tool Agendamento:", error);
      return "Erro técnico ao salvar agendamento.";
    }
  },
};

module.exports = SchedulingTool;
