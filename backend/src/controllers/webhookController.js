// src/controllers/webhookController.js
const knex = require("../database/db");
const aiOrchestrator = require("../services/ia/AIOrchestrator");
const whatsappService = require("../services/whatsapp/whatsappService");
const prompts = require("../services/ia/prompts");
const availabilityTool = require("../services/ia/tools/AvailabilityTool");
const protocolTool = require("../services/ia/tools/ProtocolTool");
const schedulingTool = require("../services/ia/tools/SchedulingTool");

const handleWhatsAppMessage = async (req, res) => {
  try {
    const payload = req.body;

    // 1. Gravação Imediata do Webhook (Requisito Sprint 2)
    // Liberamos o webhook rápido se for assíncrono, mas no MVP aguardamos para logar.
    const messageId =
      payload.data?.key?.id || payload.id || `evt_${Date.now()}`;
    await knex("webhook_events")
      .insert({
        message_id: messageId,
        payload: JSON.stringify(payload),
        recebido_em: knex.fn.now(),
      })
      .onConflict("message_id")
      .ignore(); // Previne duplicidade de webhook

    // Adapter de dados (Ajuste conforme o payload real da EvolutionAPI/Z-API)
    const instanceId = payload.instanceId || payload.instance;
    const phoneNumber =
      payload.contact?.number ||
      payload.data?.key?.remoteJid?.replace("@s.whatsapp.net", "");
    const userText =
      payload.message?.text || payload.data?.message?.conversation;
    const fromMe = payload.key?.fromMe || payload.data?.key?.fromMe;

    if (fromMe || !userText) return res.status(200).send({ status: "IGNORED" });

    // 2. Identificação da Unidade (Multi-Tenant)
    // Tabela correta: unidades_atendimento. Coluna telefone_principal ou numero_whatsapp (verifique sua migration)
    const unidade = await knex("unidades_atendimento")
      .where("telefone_principal", "like", `%${instanceId}%`) // Ajuste a coluna de busca conforme seu schema
      .select("id_unidade", "nome_fantasia", "config_ia")
      .first();

    if (!unidade) {
      console.warn(`Unidade não encontrada para a instância: ${instanceId}`);
      return res.status(404).send({ error: "Unidade não encontrada" });
    }

    const unitConfig = {
      nome_clinica: unidade.nome_fantasia,
      tom_de_voz: unidade.config_ia?.tom_de_voz || "Cordial e profissional",
      ramo_atuacao: unidade.config_ia?.ramo_atuacao || "Saúde",
      regras_personalizadas: unidade.config_ia?.regras || "",
      id_unidade: unidade.id_unidade,
    };

    // 3. Gestão de Sessão (FSM)
    let session = await knex("chat_sessions")
      .where("paciente_telefone", phoneNumber) // Schema usa 'telefone', não 'paciente_telefone'
      .andWhere("expires_at", ">", knex.fn.now())
      .first();

    if (!session) {
      const [newSession] = await knex("chat_sessions")
        .insert({
          telefone: phoneNumber,
          estado_atual: "TRIAGEM",
          expires_at: knex.raw("NOW() + INTERVAL '24 HOURS'"), // Mais seguro no DB
        })
        .returning("*");
      session = newSession;
    }

    // 4. Seleção de Estratégia
    let systemPromptTemplate;
    let activeTools = [];

    switch (session.estado_atual) {
      case "ORIENTACOES":
        systemPromptTemplate = (cfg) => prompts.ORIENTACOES(null, cfg);
        activeTools = [protocolTool];
        break;
      case "AGENDAMENTO":
      case "CONFIRMACAO":
        systemPromptTemplate = prompts.AGENDAMENTO;
        activeTools = [availabilityTool, schedulingTool];
        break;
      case "TRANSBORDO":
        return res.status(200).send();
      case "TRIAGEM":
      default:
        systemPromptTemplate = prompts.TRIAGEM;
    }

    // 5. O Cérebro Trabalha (Assegure-se que o AIOrchestrator loga na ai_audit_logs)
    const aiResponse = await aiOrchestrator.processMessage(
      session.session_id,
      userText,
      systemPromptTemplate,
      unitConfig,
      activeTools,
      [],
    );

    // 6. Execução e Resposta
    if (aiResponse.type === "text") {
      await whatsappService.sendTextMessage(
        phoneNumber,
        aiResponse.content,
        instanceName,
      );
    } else if (aiResponse.type === "tool_call") {
      for (const call of aiResponse.tool_calls) {
        const toolName = call.function.name;
        const args = JSON.parse(call.function.arguments);
        args.id_unidade = unidade.id_unidade; // Injeção padronizada

        let result = "";

        if (toolName === "verificar_disponibilidade") {
          result = await availabilityTool.execute(args);
        } else if (toolName === "consultar_protocolo") {
          result = await protocolTool.execute(args);
        } else if (toolName === "realizar_agendamento") {
          // Busca paciente para o agendamento
          const paciente = await knex("pacientes")
            .where("telefone", "like", `%${phoneNumber}%`)
            .first();
          if (paciente) args.id_paciente = paciente.id_paciente;

          result = await schedulingTool.execute(args);
        }

        // Envia a resposta bruta da tool. Futuro: retroalimentar a IA.
        await whatsappService.sendTextMessage(
          phoneNumber,
          result,
          instanceName,
        );
      }
    }

    return res.status(200).send({ status: "OK" });
  } catch (error) {
    console.error("CRITICAL_WEBHOOK_ERROR:", error);
    return res.status(500).send();
  }
};

module.exports = { handleWhatsAppMessage };
