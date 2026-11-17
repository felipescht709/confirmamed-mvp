// src/services/ia/tools/CancelarConsultaTool.js
const knex = require("../../../database/db");

const CancelarConsultaTool = {
  definition: {
    type: "function",
    function: {
      name: "cancelar_consulta",
      description:
        "Cancela uma consulta existente. Exige o ID da consulta e o ID do paciente logado.",
      parameters: {
        type: "object",
        properties: {
          id_consulta: {
            type: "integer",
            description: "O ID da consulta a ser cancelada",
          },
          paciente_id: {
            type: "integer",
            description: "O ID do paciente solicitando o cancelamento",
          },
        },
        required: ["id_consulta", "paciente_id"],
      },
    },
  },

  async execute({ id_consulta, paciente_id, unidade_id }) {
    if (!unidade_id) return "ERRO: Unidade não identificada.";

    try {
      console.log(
        `🗑️ [TOOL] Tentando cancelar consulta ${id_consulta} para o paciente ${paciente_id} na unidade ${unidade_id}`,
      );

      // T05-Auditoria: Verifica o status atual antes de cancelar (evita sobrescrever REALIZADA)
      const consulta = await knex("consultas")
        .where({ id_consulta, paciente_id, unidade_id })
        .whereNull("deleted_at")
        .first();

      if (!consulta) {
        return "FALHA: Consulta não encontrada. Verifique se o ID da consulta está correto.";
      }

      if (consulta.status === "CANCELADO") {
        return "AVISO: Esta consulta já foi cancelada anteriormente. Não há nada a fazer.";
      }

      if (consulta.status === "REALIZADA") {
        return "ERRO: Não é possível cancelar uma consulta que já foi realizada.";
      }

      const updatedRows = await knex("consultas")
        .where({ id_consulta, paciente_id, unidade_id })
        .update({
          status: "CANCELADO",
          deleted_at: knex.fn.now(),
        });

      if (updatedRows === 0) {
        return "FALHA: Não foi possível cancelar. Tente novamente.";
      }

      // A1: Dispara Gap Filling em background — notifica próximo da fila de espera
      const FilaEsperaService = require("../../core/FilaEsperaService");
      FilaEsperaService.processarVagaLiberada(id_consulta)
        .catch(err => console.error("❌ [TOOL] Erro no Gap Filling pós-cancelamento:", err));

      return "SUCESSO! A consulta foi cancelada com sucesso no sistema.";
    } catch (error) {
      console.error("❌ [TOOL] Erro na CancelarConsultaTool:", error);
      return "Erro crítico de banco de dados ao tentar cancelar.";
    }
  },
};

module.exports = CancelarConsultaTool;
