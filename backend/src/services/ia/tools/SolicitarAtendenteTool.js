const { tool } = require("@langchain/core/tools");
const { z } = require("zod");
const knex = require("../../../database/db");
const EmailService = require("../../core/EmailService");
const PushService = require("../../core/PushService");

/**
 * Ferramenta que a IA invoca quando o paciente deseja falar com um atendente humano,
 * ou quando a IA não consegue resolver o problema após várias tentativas.
 */
const solicitarAtendenteTool = tool(
  async ({ motivo_solicitacao, telefone_sessao, unidade_id }) => {
    try {
      console.log(`[SolicitarAtendenteTool] Chamado por ${telefone_sessao}. Motivo: ${motivo_solicitacao}`);

      // 1. Alterar o estado da sessão para TRANSBORDO
      await knex("chat_sessions")
        .where({ paciente_telefone: telefone_sessao, unidade_id })
        .update({
          estado_atual: "TRANSBORDO",
          updated_at: knex.fn.now()
        });

      // 2. Buscar a sessão para pegar o session_id
      const session = await knex("chat_sessions")
        .where({ paciente_telefone: telefone_sessao, unidade_id })
        .first();

      // 3. Buscar dados da unidade (para e-mail)
      const unidade = await knex("unidades_atendimento")
        .where("id_unidade", unidade_id)
        .first();

      if (session) {
        // Disparar Push no Painel
        PushService.notifyUnidade(
          unidade_id,
          "🚨 Atendimento Humano Solicitado",
          `Paciente (${telefone_sessao}) solicitou um atendente. Motivo: ${motivo_solicitacao}`,
          {
            url: `/monitor/${session.session_id}`,
            type: "TRANSBORDO_SOLICITADO",
          }
        ).catch(err => console.error("Push falhou silenciosamente", err));

        // Disparar E-mail
        const destEmail = unidade ? (unidade.email_notificacao || unidade.email_contato || unidade.email) : null;
        if (destEmail) {
          EmailService.sendEmail(
            destEmail,
            "🚨 ConfirmaMED - Transbordo Humano Solicitado",
            `Um paciente solicitou falar com um atendente.\n\nTelefone: ${telefone_sessao}\nMotivo: ${motivo_solicitacao}\nLink do Monitor: ${process.env.FRONTEND_URL || "http://localhost:5173"}/monitor/${session.session_id}`
          ).catch(err => console.error("Erro ao enviar email de transbordo:", err));
        }
      }

      return `O estado do atendimento foi alterado para TRANSBORDO com sucesso. A clínica já foi notificada (por e-mail e painel). O paciente está aguardando um humano. Diga a ele que já repassou para a equipe e um atendente entrará em contato.`;
    } catch (error) {
      console.error("[SolicitarAtendenteTool] Erro:", error);
      return `Erro ao acionar o transbordo: ${error.message}`;
    }
  },
  {
    name: "solicitar_atendente",
    description: "Invoca esta ferramenta quando o paciente EXPLICITAMENTE quiser falar com um atendente humano, funcionário ou recepcionista, OU quando você não puder resolver o problema.",
    schema: z.object({
      motivo_solicitacao: z.string().describe("O motivo pelo qual o paciente deseja falar com um atendente humano (ex: 'dúvida complexa', 'solicitação direta')."),
    }),
  }
);

module.exports = solicitarAtendenteTool;
