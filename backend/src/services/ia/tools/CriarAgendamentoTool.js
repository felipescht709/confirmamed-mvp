// src/services/ia/tools/CriarAgendamentoTool.js
const knex = require("../../../database/db");
const moment = require("moment-timezone");
const PushService = require("../../core/PushService");
const AvailabilityService = require("../../core/AvailabilityService");
const EmailService = require("../../core/EmailService");

const CriarAgendamentoTool = {
  definition: {
    type: "function",
    function: {
      name: "criar_agendamento",
      description:
        "Agenda uma nova consulta no banco de dados. SÓ DEVE SER CHAMADA após o usuário escolher um horário livre e confirmar os dados.",
      parameters: {
        type: "object",
        properties: {
          paciente_id: {
            type: "integer",
            description:
              "O ID numérico do paciente (recebido no contexto ou na tool upsert_paciente)",
          },
          profissional_id: {
            type: "integer",
            description: "O ID numérico do médico/profissional",
          },
          data_hora_inicio: {
            type: "string",
            description:
              "A data e hora EXATA do início no formato YYYY-MM-DD HH:mm:ss",
          },
          data_hora_fim: {
            type: "string",
            description:
              "Opcional: A data e hora do término. Se omitido, será calculado pela duração do procedimento ou 30 min.",
          },
          id_procedimento: {
            type: "integer",
            description: "Opcional: ID do procedimento/tipo de consulta. Obter com 'consultar_clinica'. Usado para calcular duração real e valor correto.",
          },
          solicitante_nome: {
            type: "string",
            description: "Opcional: O nome da pessoa que está pedindo o agendamento, caso seja diferente do paciente.",
          },
        },
        required: [
          "paciente_id",
          "profissional_id",
          "data_hora_inicio",
        ],
      },
    },
  },

  async execute({
    paciente_id,
    profissional_id,
    data_hora_inicio,
    data_hora_fim,
    id_procedimento,
    solicitante_nome,
    telefone_sessao,
    unidade_id,
  }) {
    if (!unidade_id) return "ERRO: ID da Unidade não identificado.";
    if (!paciente_id || String(paciente_id) === "PENDENTE") {
       return "FALHA: ID do paciente é inválido ou PENDENTE. Você DEVE chamar 'upsert_paciente' primeiro para obter o ID real do paciente antes de agendar.";
    }

    // A12: Usa moment-timezone para calcular fim corretamente em qualquer fuso/horário de verão
    let duracao = 30;
    let valorConsulta = 0;

    // A4: Busca duração e valor reais do procedimento se fornecido
    if (id_procedimento) {
      try {
        const proc = await knex("procedimentos")
          .where({ id_procedimento, unidade_id })
          .first();
        if (proc) {
          duracao = proc.duracao_minutos || 30;
          valorConsulta = proc.valor || 0;
        }
      } catch (e) {
        console.warn("[TOOL] Falha ao buscar procedimento, usando duração padrão:", e.message);
      }
    }

    const inicioMoment = moment.tz(data_hora_inicio, "YYYY-MM-DD HH:mm:ss", "America/Sao_Paulo");
    if (!inicioMoment.isValid()) return "ERRO: Formato de data_hora_inicio inválido. Use YYYY-MM-DD HH:mm:ss";

    const fimMoment = data_hora_fim
      ? moment.tz(data_hora_fim, "YYYY-MM-DD HH:mm:ss", "America/Sao_Paulo")
      : inicioMoment.clone().add(duracao, "minutes");

    const finalFim = fimMoment.format("YYYY-MM-DD HH:mm:ss");

    try {
      console.log(
        `[TOOL] Tentando agendar: Paciente ${paciente_id} com Profissional ${profissional_id} as ${data_hora_inicio} na Unidade ${unidade_id}`,
      );

      return await knex.transaction(async (trx) => {
        // A5: Usa AvailabilityService.isSlotAvailable (cobre consultas + bloqueios manuais + forUpdate)
        const livre = await AvailabilityService.isSlotAvailable(
          profissional_id,
          data_hora_inicio,
          finalFim,
          trx,
        );

        if (!livre) {
          return "FALHA: O horário escolhido acabou de ser ocupado ou está bloqueado. Peça desculpas e ofereça os outros horários disponíveis.";
        }

        // 2. INSERT enriquecido (A4)
        const [id_consulta] = await trx("consultas")
          .insert({
            paciente_id,
            profissional_id,
            unidade_id,
            id_procedimento: id_procedimento || null,
            data_hora_inicio: inicioMoment.toISOString(),
            data_hora_fim: fimMoment.toISOString(),
            valor_consulta: valorConsulta,
            status: "AGENDADO",
            tipo_pagamento: "PARTICULAR",
            observacoes: "Agendado via IA ConfirmaMED",
            origem: "IA_WHATSAPP",
            solicitante_nome: solicitante_nome || null,
            solicitante_telefone: solicitante_nome ? telefone_sessao : null,
            criado_em: new Date(),
          })
          .returning("id_consulta");

        const idReal = typeof id_consulta === "object" ? id_consulta.id_consulta : id_consulta;

        PushService.notifyUnidade(
          unidade_id,
          "🤖 Nova Consulta Agendada!",
          `A IA agendou o paciente ID ${paciente_id} automaticamente.`,
          { url: "/agenda" },
        ).catch((err) => console.error("Erro no Push:", err));

        // Disparar E-mail para a Clínica
        (async () => {
          try {
            const unidade = await knex("unidades_atendimento")
              .where("id_unidade", unidade_id)
              .first();
            const destEmail = unidade ? (unidade.email_notificacao || unidade.email_contato || unidade.email) : null;
            if (destEmail) {
              const paciente = await knex("pacientes").where("id_paciente", paciente_id).first();
              const profissional = await knex("profissionais_da_saude").where("id_profissional_saude", profissional_id).first();
              const dataFormatada = moment(data_hora_inicio).format("DD/MM/YYYY [às] HH:mm");
              
              await EmailService.sendEmail(
                destEmail,
                "📅 ConfirmaMED - Nova Consulta Agendada!",
                `Olá!\n\nUma nova consulta foi agendada automaticamente pela Inteligência Artificial.\n\n` +
                `🏥 Unidade: ${unidade.nome_fantasia || "Unidade " + unidade_id}\n` +
                `👤 Paciente: ${paciente?.nome || "Paciente ID " + paciente_id}\n` +
                `👨‍⚕️ Profissional: ${profissional?.nome_completo || "Profissional ID " + profissional_id}\n` +
                `📅 Data e Hora: ${dataFormatada}\n\n` +
                `Acesse o painel do ConfirmaMED para visualizar a agenda: ${process.env.FRONTEND_URL || "http://localhost:5173"}/agenda`
              );
            }
          } catch (mailErr) {
            console.error("Erro ao enviar e-mail de notificação de agendamento:", mailErr);
          }
        })();

        // T09-Auditoria: Retorna o ID da consulta para o agente não precisar de tool call extra
        return (
          `SUCESSO TOTAL! Consulta ID ${idReal} agendada para ${data_hora_inicio}. ` +
          `Confirme ao paciente a data e hora. ` +
          `Guarde o ID ${idReal} — ele será necessário se o paciente quiser cancelar ou reagendar. ` +
          `Pergunte se pode ajudá-lo com mais alguma coisa.`
        );
      });
    } catch (error) {
      console.error("❌ [TOOL] Erro na CriarAgendamentoTool:", error);
      return "ERRO CRÍTICO no banco de dados ao agendar. Tente novamente em instantes.";
    }
  },
};

module.exports = CriarAgendamentoTool;
