// src/services/ia/tools/ReagendarConsultaTool.js
// T02-Auditoria: Adicionado knex.transaction + forUpdate() + verificação de conflito de horário.
const knex = require("../../../database/db");
const { addMinutes, format, parse } = require("date-fns");

const ReagendarConsultaTool = {
  definition: {
    type: "function",
    function: {
      name: "reagendar_consulta",
      description:
        "Altera o horário de uma consulta existente. Use esta tool quando o usuário quiser 'mudar', 'trocar' ou 'reagendar'. " +
        "IMPORTANTE: Chame 'verificar_disponibilidade' antes para garantir que o novo horário está livre.",
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

  async execute({ id_consulta, paciente_id, nova_data, nova_hora, unidade_id }) {
    if (!unidade_id) return "ERRO: Unidade não identificada.";

    const inicioStr = `${nova_data} ${nova_hora}:00`;
    let dataInicio;
    try {
      dataInicio = parse(inicioStr, "yyyy-MM-dd HH:mm:ss", new Date());
    } catch (e) {
      return "ERRO: Formato de data ou hora inválido. Use nova_data=YYYY-MM-DD e nova_hora=HH:mm.";
    }
    const fimStr = format(addMinutes(dataInicio, 30), "yyyy-MM-dd HH:mm:ss");

    console.log(
      `🔄 [TOOL] Reagendando Consulta ${id_consulta} para ${inicioStr} na Unidade ${unidade_id}`
    );

    try {
      return await knex.transaction(async (trx) => {
        // 1. Busca a consulta original com LOCK para obter o profissional_id
        const consultaOriginal = await trx("consultas")
          .where({ id_consulta, paciente_id, unidade_id })
          .whereNull("deleted_at")
          .forUpdate()
          .first();

        if (!consultaOriginal) {
          return "ERRO: Consulta não encontrada ou não pertence a este paciente nesta unidade.";
        }

        if (consultaOriginal.status === "CANCELADO" || consultaOriginal.status === "REALIZADA") {
          return `ERRO: Não é possível reagendar uma consulta com status '${consultaOriginal.status}'.`;
        }

        // 2. Verifica conflito de horário com outro paciente do mesmo profissional (anti double-booking)
        const conflito = await trx("consultas")
          .where({
            profissional_id: consultaOriginal.profissional_id,
            unidade_id,
            status: "AGENDADO",
          })
          .whereNot({ id_consulta }) // Exclui a própria consulta do check
          .andWhere(function () {
            // Lógica de overlap de intervalo: novo slot se sobrepõe a um existente?
            this.where("data_hora_inicio", "<", fimStr).andWhere(
              "data_hora_fim",
              ">",
              inicioStr
            );
          })
          .whereNull("deleted_at")
          .first();

        if (conflito) {
          return (
            "FALHA: O novo horário já está ocupado por outro paciente. " +
            "Chame 'verificar_disponibilidade' para oferecer outros horários disponíveis."
          );
        }

        // 3. Executa o reagendamento dentro da mesma transação
        const rowsAffected = await trx("consultas")
          .where({ id_consulta, paciente_id, unidade_id })
          .update({
            data_hora_inicio: inicioStr,
            data_hora_fim: fimStr,
          });

        if (rowsAffected === 0) {
          return "ERRO: Nenhum registro foi alterado. Tente novamente.";
        }

        return `SUCESSO! Consulta ID ${id_consulta} reagendada para ${nova_data} às ${nova_hora}. Confirme ao paciente.`;
      });
    } catch (error) {
      if (error.code === "23505") {
        return "FALHA: Conflito de horário detectado pelo banco de dados. Ofereça outro horário ao paciente.";
      }
      console.error("❌ Erro no Reagendamento:", error);
      return "FALHA TÉCNICA ao processar o reagendamento no banco.";
    }
  },
};

module.exports = ReagendarConsultaTool;
