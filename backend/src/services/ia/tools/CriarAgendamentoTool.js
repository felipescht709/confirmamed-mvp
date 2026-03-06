// src/services/ia/tools/CriarAgendamentoTool.js
const knex = require("../../../database/db");

const CriarAgendamentoTool = {
  definition: {
    type: "function",
    function: {
      name: "criar_agendamento",
      description: "Agenda uma nova consulta no banco de dados. SÓ DEVE SER CHAMADA após o usuário escolher um horário livre e confirmar os dados.",
      parameters: {
        type: "object",
        properties: {
          paciente_id: { type: "integer", description: "O ID numérico do paciente (recebido no contexto ou na tool upsert_paciente)" },
          profissional_id: { type: "integer", description: "O ID numérico do médico/profissional" },
          data_hora_inicio: { type: "string", description: "A data e hora EXATA do início no formato YYYY-MM-DD HH:mm:ss" },
          data_hora_fim: { type: "string", description: "A data e hora do término no formato YYYY-MM-DD HH:mm:ss (geralmente 30 mins após o início)" }
        },
        required: ["paciente_id", "profissional_id", "data_hora_inicio", "data_hora_fim"]
      }
    }
  },

  async execute({ paciente_id, profissional_id, data_hora_inicio, data_hora_fim, unidade_id }) {
    try {
      console.log(`[TOOL] Tentando agendar: Paciente ${paciente_id} com Profissional ${profissional_id} as ${data_hora_inicio}`);
      
      return await knex.transaction(async (trx) => {
        // 1. PESSIMISTIC LOCK: Verifica se o slot AINDA está livre e trava leitura concorrente
        const conflito = await trx('consultas')
          .where({ profissional_id, status: 'AGENDADO' })
          .andWhere(function() {
            this.where('data_hora_inicio', '<', data_hora_fim)
                .andWhere('data_hora_fim', '>', data_hora_inicio);
          })
          .whereNull('deleted_at')
          .forUpdate() // 🔒 A MÁGICA: Trava a tabela para evitar o Double Booking
          .first();

        if (conflito) {
          return "FALHA: O horário escolhido acabou de ser ocupado por outro paciente. Peça desculpas e ofereça os outros horários disponíveis.";
        }

        // 2. INSERT SEGURO
        const [id_consulta] = await trx('consultas')
          .insert({
            paciente_id,
            profissional_id,
            unidade_id: unidade_id || 1,
            data_hora_inicio,
            data_hora_fim,
            status: 'AGENDADO',
            tipo_pagamento: 'PARTICULAR' // Ajuste conforme a lógica de convênios, se necessário
          })
          .returning('id_consulta');

        const idReal = typeof id_consulta === 'object' ? id_consulta.id_consulta : id_consulta;
        
        return `SUCESSO TOTAL! A consulta foi agendada. O ID da consulta é ${idReal}. Confirme para o usuário que deu tudo certo e passe as orientações finais.`;
      });
    } catch (error) {
      console.error("❌ [TOOL] Erro na CriarAgendamentoTool:", error);
      return "ERRO CRÍTICO no banco de dados. Informe ao paciente que houve uma instabilidade e para tentar novamente mais tarde.";
    }
  }
};

module.exports = CriarAgendamentoTool;