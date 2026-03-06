const knex = require("../../../database/db");
const { addMinutes, format, parse } = require("date-fns");

const ReagendarConsultaTool = {
  definition: {
    type: "function",
    function: {
      name: "reagendar_consulta",
      description:
        "Altera o horário de uma consulta existente. Use esta tool quando o usuário quiser 'mudar', 'trocar' ou 'reagendar'.",
      parameters: {
        type: "object",
        properties: {
          id_consulta: {
            type: "integer",
            description: "ID da consulta que será alterada",
          },
          paciente_id: {
            type: "integer",
            description: "ID do paciente dono da consulta",
          },
          nova_data: {
            type: "string",
            description: "Nova data no formato YYYY-MM-DD",
          },
          nova_hora: {
            type: "string",
            description: "Nova hora no formato HH:mm",
          },
        },
        required: ["id_consulta", "paciente_id", "nova_data", "nova_hora"],
      },
    },
  },

  async execute({ id_consulta, paciente_id, nova_data, nova_hora }) {
    try {
      // 1. Monta as strings de data/hora
      const inicioStr = `${nova_data} ${nova_hora}:00`;
      const dataInicio = parse(inicioStr, "yyyy-MM-dd HH:mm:ss", new Date());
      const dataFim = addMinutes(dataInicio, 30);
      const fimStr = format(dataFim, "yyyy-MM-dd HH:mm:ss");

      console.log(
        `🔄 [TOOL] Reagendando Consulta ${id_consulta} para ${inicioStr}`,
      );

      const rowsAffected = await knex("consultas")
        .where({ id_consulta, paciente_id })
        .update({
          data_hora_inicio: inicioStr,
          data_hora_fim: fimStr,
        });

      if (rowsAffected === 0)
        return "ERRO: Consulta não encontrada ou não pertence a este paciente.";

      return `SUCESSO! Consulta reagendada para ${nova_data} às ${nova_hora}.`;
    } catch (error) {
      console.error("❌ Erro no Reagendamento:", error);
      return "FALHA TÉCNICA ao processar o reagendamento no banco.";
    }
  },
};

module.exports = ReagendarConsultaTool;
