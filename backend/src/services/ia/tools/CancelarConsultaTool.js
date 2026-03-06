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

  async execute({ id_consulta, paciente_id }) {
    try {
      console.log(
        `🗑️ [TOOL] Tentando cancelar consulta ${id_consulta} para o paciente ${paciente_id}`,
      );

      const updatedRows = await knex("consultas")
        .where({ id_consulta: id_consulta, paciente_id: paciente_id })
        .update({
          status: "CANCELADO",

          deleted_at: knex.fn.now(), // Marcar como deletado para sair da lista de ativos
        });

      if (updatedRows === 0) {
        return "FALHA: Consulta não encontrada. Verifique se o ID da consulta está correto.";
      }

      return "SUCESSO! A consulta foi cancelada com sucesso no sistema.";
    } catch (error) {
      console.error("❌ [TOOL] Erro na CancelarConsultaTool:", error);
      return "Erro crítico de banco de dados ao tentar cancelar.";
    }
  },
};

module.exports = CancelarConsultaTool;
