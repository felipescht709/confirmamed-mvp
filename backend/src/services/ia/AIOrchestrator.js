// src/services/ia/AIOrchestrator.js
const OpenAIProvider = require("./providers/OpenAIProvider");
const GeminiProvider = require("./providers/GeminiProvider");
const toolManager = require("./tools/index");
const piiMasker = require("./security/PIIMasker");
const knex = require("../../database/db");
const unidadeRepository = require("../../repositories/unidadeRepository");
const prompts = require("./prompts/index");
const SessionService = require("../core/SessionService");
const pacienteRepository = require("../../repositories/pacienteRepository");
const PushService = require("../core/PushService");

class AIOrchestrator {
  constructor() {
    this.primaryProvider = new OpenAIProvider();
    this.fallbackProvider = new GeminiProvider();
    this.CRITICAL_TOOLS = [
      "realizar_agendamento",
      "cancelar_agendamento",
      "criar_agendamento",
      "reagendar_consulta",
    ];
  }

  /**
   * MÉTODO PRIVADO: Constrói a blindagem de contexto e regras dinâmicas
   */
  _buildContextualInput(params) {
    const {
      depth,
      session,
      diaSemana,
      dataLocal,
      horaLocal,
      contextoIdentidade,
      maskedMessage,
      rawMessage,
    } = params;

    if (depth > 0) return rawMessage;

    const pacienteId =
      session?.contexto_temporario?.paciente_alvo_id || "PENDENTE";

    const regrasExecucao = [
      `# DIRETRIZES DE AGORA (NÃO IGNORE):`,
      `- PACIENTE ATUAL: ID ${pacienteId}.`,
      `- MÉDICO: O ID do médico deve ser extraído EXCLUSIVAMENTE da última interação.`,
      `- AGENDAMENTO: Ao chamar 'criar_agendamento', use EXATAMENTE o profissional_id da disponibilidade.`,
      `- REAGENDAMENTO: Pegue o ID da consulta na ferramenta 'consultar_agendamentos_paciente'.`,
      `- HOJE: ${diaSemana}, ${dataLocal}. Hora: ${horaLocal}.`,
    ];

    if (session?.estado_atual === "CONFIRMACAO") {
      regrasExecucao.push(
        `🚨 STATUS ATUAL: O paciente recebeu um lembrete automático e o status da sessão é 'CONFIRMACAO'.`,
        `- Se o usuário responder afirmativamente (ex: 'sim', 'vou', 'ok'), EXECUTE OBRIGATORIAMENTE a ferramenta 'confirmar_presenca'.`,
        `- Pegue o ID da consulta do histórico da conversa.`,
      );
    } else if (session?.estado_atual === "TRIAGEM") {
      regrasExecucao.push(
        `- Estamos na fase de triagem inicial. Descubra o que o usuário deseja e guie a conversa.`,
      );
    }
  
    return `[REGRAS DE OURO]\n${regrasExecucao.join("\n")}\n\n[IDENTIDADE]\n${contextoIdentidade}\n\n[MENSAGEM DO USUÁRIO]\n${maskedMessage}`;
  }

  /**
   * MÉTODO PRIVADO: Gerencia a Máquina de Estados (FSM) da identidade do paciente
   */
  async _identifyUserContext(telefoneOrigem) {
    if (!telefoneOrigem) return { contexto: "", session: null };

    try {
      const session = await SessionService.getOrCreateSession(telefoneOrigem);
      const pacientesVinculados =
        await pacienteRepository.findAllByTelefone(telefoneOrigem);

      let contexto = "\n# REDE FAMILIAR VINCULADA\n";

      // Auto-seleção se houver apenas um dependente
      if (
        pacientesVinculados.length === 1 &&
        !session.contexto_temporario?.paciente_alvo_id
      ) {
        await SessionService.updateSession(telefoneOrigem, "AGENDAMENTO", {
          paciente_alvo_id: pacientesVinculados[0].id_paciente,
        });
        session.contexto_temporario = {
          ...session.contexto_temporario,
          paciente_alvo_id: pacientesVinculados[0].id_paciente,
        };
      }

      if (pacientesVinculados.length > 0) {
        contexto += `- Pacientes: ${JSON.stringify(pacientesVinculados)}.\n`;
      } else {
        contexto += `- [INFO: Usuário novo. Exija dados para 'upsert_paciente'.]\n`;
      }

      if (session.contexto_temporario?.paciente_alvo_id) {
        contexto += `\n🚨 CONFIRMADO: O atendimento é para o ID ${session.contexto_temporario.paciente_alvo_id}. Não pergunte novamente.\n`;
      }

      return { contexto, session };
    } catch (err) {
      console.warn("⚠️ Erro Identificação:", err.message);
      return { contexto: "\n[Erro ao carregar sessão]", session: null };
    }
  }

  /**
   * Ciclo de Vida Principal
   */
  async processMessage(messageData, unidadeId, telefoneOrigem, depth = 0) {
    if (depth > 3) {
      PushService.notifyUnidade(
        unidadeId,
        "⚠️ IA Solicitando Ajuda",
        `O paciente ${telefoneOrigem} está confuso ou a IA entrou em loop.`,
        { url: "/monitor" },
      ).catch(() => {});
      return { text: "TRANSFERIR", provider: "SYSTEM_LIMIT" };
    }

    const { body: rawMessage, history = [] } = messageData;
    const startTime = Date.now();

    try {
      const maskedMessage = await piiMasker.mask(
        rawMessage,
        telefoneOrigem || "anonimo",
      );

      const { contexto: contextoIdentidade, session } =
        depth === 0
          ? await this._identifyUserContext(telefoneOrigem)
          : { contexto: "", session: null };

      // 1. Trava de Intervenção Humana (Transbordo)
      if (session && session.estado_atual === "TRANSBORDO") {
        console.log(
          `[AIOrchestrator] Sessão ${telefoneOrigem} em modo TRANSBORDO.`,
        );
        return { text: "MODO_HUMANO_ATIVO", provider: "SYSTEM" };
      }

      // 2. 🔒 Trava LGPD (Consentimento Explícito)
      if (session && session.aceite_lgpd === false && depth === 0) {
        const inputClean = rawMessage.toLowerCase().trim();
        const acceptKeywords = ["aceito", "sim", "concordo", "ok", "pode ser"];

        if (acceptKeywords.some((kw) => inputClean.includes(kw))) {
          // Atualiza banco e segue o baile
          await knex("chat_sessions")
            .where("session_id", session.session_id)
            .update({
              aceite_lgpd: true,
              updated_at: knex.fn.now(),
            });
          session.aceite_lgpd = true;
          // Retorna System Prompt para engajar
          return {
            text: "Obrigado! Seu consentimento foi registrado. Como posso ajudar você hoje?",
            provider: "SYSTEM",
          };
        } else {
          // Interrompe o fluxo da OpenAI e barra o usuário na porta
          return {
            text: "Olá! Para podermos realizar agendamentos e acessar seus dados de saúde, precisamos que você aceite nossos Termos de Privacidade e LGPD. Responda *ACEITO* para continuar.",
            provider: "SYSTEM",
          };
        }
      }

      // Dados temporais
      const agora = new Date();
      const dataLocal = agora.toLocaleDateString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      });
      const horaLocal = agora.toLocaleTimeString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
      });
      const diaSemana = agora.toLocaleDateString("pt-BR", {
        weekday: "long",
        timeZone: "America/Sao_Paulo",
      });

      // Constrói o Input usando o novo método
      const contextualInput = this._buildContextualInput({
        depth,
        session,
        diaSemana,
        dataLocal,
        horaLocal,
        contextoIdentidade,
        maskedMessage,
        rawMessage,
      });

      const systemPrompt = await this.buildSystemPrompt(unidadeId);
      let providerUsed = "OPENAI";
      let aiResponse = null;

      try {
        aiResponse = await this.primaryProvider.generateResponse(
          systemPrompt,
          contextualInput,
          toolManager.getTools(),
          history,
        );
      } catch (error) {
        providerUsed = "GEMINI";
        aiResponse = await this.fallbackProvider.generateResponse(
          systemPrompt,
          contextualInput,
        );
      }

      if (this.isToolCall(aiResponse)) {
        const toolCallData = this.parseSafeJson(aiResponse);
        const calls =
          toolCallData.tool_calls ||
          (toolCallData.function_call ? [toolCallData.function_call] : []);
        let currentHistory = [
          ...history,
          { role: "user", content: contextualInput },
          { role: "assistant", content: null, tool_calls: calls },
        ];

        const toolResultsMessages = [];
        for (const functionCall of calls) {
          const toolName = functionCall.function?.name || functionCall.name;
          const args = this.parseSafeJson(
            functionCall.function?.arguments || functionCall.arguments,
          );

          const toolInstance = toolManager.findTool(toolName);
          const toolResult = toolInstance
            ? await toolInstance.execute({
                ...args,
                unidade_id: unidadeId,
                telefone_sessao: telefoneOrigem,
              })
            : "ERRO: Tool inexistente.";

          toolResultsMessages.push({
            role: "tool",
            tool_call_id: functionCall.id || "call_id",
            name: toolName,
            content: String(toolResult),
          });
        }

        return this.processMessage(
          {
            body: "Resultado processado.",
            history: [...currentHistory, ...toolResultsMessages],
          },
          unidadeId,
          telefoneOrigem,
          depth + 1,
        );
      }

      const finalOutput = this.applyHardFilters(aiResponse, maskedMessage);
      await this.logAudit(
        maskedMessage,
        systemPrompt,
        finalOutput,
        providerUsed,
        { aprovado: true },
        startTime,
      );

      return { text: finalOutput, provider: providerUsed };
    } catch (error) {
      console.error("💀 Erro Orquestrador:", error);
      
      PushService.notifyUnidade(
        unidadeId,
        "🚨 Erro Crítico na IA",
        `Falha de processamento no atendimento de ${telefoneOrigem}. Assuma via Monitor.`,
        { url: "/monitor" },
      ).catch(() => {});

      return {
        text: "Desculpe, tive um problema técnico.",
        provider: "CRITICAL_ERROR",
      };
    }
  }
  // MÉTODO PÚBLICO: Transcrição de Áudio usando OpenAI Whisper
  async transcribeAudio(audioBuffer) {
    try {
      // OpenAI Whisper exige um arquivo com extensão/mime-type
      const formData = new FormData();
      const blob = new Blob([audioBuffer], { type: "audio/ogg" });
      formData.append("file", blob, "recording.ogg");
      formData.append("model", "whisper-1");

      const response = await axios.post(
        "https://api.openai.com/v1/audio/transcriptions",
        formData,
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            ...formData.getHeaders(),
          },
        },
      );

      return response.data.text;
    } catch (error) {
      console.error("WHISPER_TRANSCRIPTION_ERROR:", error);
      throw new Error("Falha ao processar áudio.");
    }
  }

  // --- MÉTODOS AUXILIARES ---
  async buildSystemPrompt(unidadeId) {
    const unidade = await unidadeRepository.getById(unidadeId);
    return prompts.BASE_SYSTEM(unidade, unidade?.configuracoes_ia || {});
  }
  isToolCall(response) {
    return (
      typeof response === "string" &&
      response.trim().startsWith("{") &&
      (response.includes('"tool_calls"') ||
        response.includes('"function_call"'))
    );
  }
  parseSafeJson(data) {
    try {
      return typeof data === "string" ? JSON.parse(data) : data;
    } catch (e) {
      return {};
    }
  }
  applyHardFilters(response, userInput) {
    if (response.startsWith("{") && response.includes("tool_calls"))
      return "Erro no processamento da agenda.";
    return response;
  }
  async logAudit(input, prompt, output, provider, verdict, startTime) {
    try {
      await knex("ai_audit_logs").insert({
        input_usuario: input,
        prompt_enviado: prompt.substring(0, 1500),
        output_ia: output,
        provider_usado: provider,
        latency_ms: Date.now() - startTime,
        data_hora: new Date(),
      });
    } catch (e) {}
  }
}

module.exports = AIOrchestrator;
