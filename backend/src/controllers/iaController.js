const knex = require("../database/db");
const orchestrator = require("../services/ia/AIOrchestrator");
const whatsappService = require("../services/whatsapp/whatsappService");

const iaController = {
  getDashboardStats: async (req, res) => {
    try {
      const unidade_id = req.query.unidade_id || req.usuario?.unidade_id;

      if (!unidade_id) {
        return res.status(400).json({ error: "unidade_id é obrigatório." });
      }

      // 1. Agendamentos Totais vs IA
      // A13: Usa coluna `origem` (adicionada na migration A8) em vez do hack ILIKE em observacoes
      const stats = await knex("consultas")
        .where("unidade_id", unidade_id)
        .select(
          knex.raw("COUNT(*)::int as total"),
          knex.raw("COUNT(*) FILTER (WHERE origem ILIKE 'IA%')::int as por_ia"),
        )
        .first();

      // 2. Taxa de Confirmação
      const confirmacoes = await knex("consultas")
        .where("unidade_id", unidade_id)
        .select(
          knex.raw(
            "ROUND(COUNT(*) FILTER (WHERE status = 'CONFIRMADA') * 100.0 / NULLIF(COUNT(*), 0), 1)::float as taxa",
          ),
        )
        .first();

      // 3. Performance da IA
      // A13: Filtra por unidade_id agora que a coluna existe em ai_audit_logs (migration A11)
      const health = await knex("ai_audit_logs")
        .where("unidade_id", unidade_id)
        .select(
          knex.raw("COUNT(*)::int as total_logs"),
          knex.raw("AVG(latency_ms)::int as media_latencia_ms"),
        )
        .first();

      // 4. Fluxo de 7 dias
      // A13: groupBy usando a mesma expressão do select para compatibilidade PostgreSQL
      const grafico = await knex("consultas")
        .where("unidade_id", unidade_id)
        .andWhere("criado_em", ">=", knex.raw("CURRENT_DATE - INTERVAL '7 days'"))
        .select(
          knex.raw("to_char(criado_em, 'DD/MM') as dia"),
          knex.raw("COUNT(*)::int as total"),
        )
        .groupByRaw("to_char(criado_em, 'DD/MM')")
        .orderByRaw("to_char(criado_em, 'DD/MM') asc");

      const agendamentosIA = stats?.por_ia || 0;

      return res.json({
        kpis: {
          agendamentosIA,
          taxaConfirmacao:  confirmacoes?.taxa || 0,
          tempoEconomizado: agendamentosIA * 10,
          pacientesAtendidos: stats?.total || 0,
        },
        iaHealth: {
          uptime:             health?.total_logs > 0 ? "100%" : "---",
          interacoesSucesso:  health?.total_logs || 0,
          mediaLatenciaMs:    health?.media_latencia_ms || 0,
        },
        chartData: grafico || [],
      });
    } catch (error) {
      console.error("Erro Dashboard Real:", error);
      res.status(500).json({ error: "Erro na consulta ao banco de dados." });
    }
  },


  monitorSessoes: async (req, res) => {
    try {
      const unidade_id = req.usuario?.unidade_id; // O '?' evita o erro de undefined
      if (!unidade_id) {
        return res
          .status(401)
          .json({ error: "Sessão inválida ou usuário não identificado." });
      }

      const sessoes = await knex("chat_sessions as cs")
        .select(
          "cs.session_id",
          "cs.paciente_telefone",
          "cs.estado_atual",
          "cs.updated_at",
          "p.nome as nome_paciente",
        )
        .leftJoin("pacientes as p", "cs.paciente_telefone", "p.telefone")
        .where("cs.unidade_id", unidade_id) // 🔒 Trava Multi-Tenant
        .orderBy("cs.updated_at", "desc")
        .limit(50);

      return res.json(sessoes);
    } catch (error) {
      console.error("[SecError] Erro ao listar sessões:", error);
      return res.status(500).json({ error: "Erro ao listar sessões." });
    }
  },

  getAuditLogs: async (req, res) => {
    try {
      const { session_id, limit, order } = req.query;
      const unidade_id = req.usuario.unidade_id;
      const limitVal = parseInt(limit || (session_id ? "100" : "20"), 10);
      const orderDir = order || (session_id ? "asc" : "desc");

      // 🔒 Join com chat_sessions para garantir isolamento multi-tenant
      let query = knex("ai_audit_logs as al")
        .join("chat_sessions as cs", "al.session_id", "cs.session_id")
        .where("cs.unidade_id", unidade_id)
        .select("al.*")
        .orderBy("al.data_hora", orderDir)
        .limit(limitVal);

      if (session_id) query.where("al.session_id", session_id);

      let logs = await query;

      // Fallback: se a sessão existe na unidade, busca os logs diretamente
      if (session_id && logs.length === 0) {
        const session = await knex("chat_sessions")
          .where({ session_id, unidade_id })
          .first();
        if (session) {
          logs = await knex("ai_audit_logs")
            .where({ session_id })
            .orderBy("data_hora", orderDir)
            .limit(limitVal);
        }
      }

      return res.json(logs);
    } catch (error) {
      console.error("[SecError] Erro ao buscar logs de auditoria:", error);
      return res.status(500).json({ error: "Erro ao buscar logs." });
    }
  },

  // POST /api/ia/test-prompt
  testPrompt: async (req, res) => {
    try {
      const { message, config } = req.body;

      // Aqui, futuramente, você instanciará o AIOrchestrator passando o config.regras
      // Por enquanto, retornamos uma resposta estruturada de teste
      return res.json({
        response: `[Simulação] O assistente ${config.nome_bot} responderia de forma ${config.tom_de_voz}: "Entendido, verifiquei que para ${config.ramo_atuacao} as regras são: ${config.regras.substring(0, 50)}..."`,
        debug: { tokens: 120, latency: 380 },
      });
    } catch (error) {
      return res.status(500).json({ error: "Erro ao testar motor de IA." });
    }
  },

  intervirSessao: async (req, res) => {
    try {
      const { session_id } = req.body;
      const unidade_id = req.usuario.unidade_id; // Pego pelo middleware de auth

      // 1. Mudamos o estado para TRANSBORDO no banco.
      await knex("chat_sessions").where("session_id", session_id).update({
        estado_atual: "TRANSBORDO",
        updated_at: knex.fn.now(),
      });

      // 2. Criamos um log de sistema (Auditoria)
      const systemMessage = "Um atendente humano assumiu esta conversa. Como posso ajudar?";
      await knex("ai_audit_logs").insert({
        session_id,
        input_usuario: "[SISTEMA]",
        output_ia: systemMessage,
        veredicto_auditoria: "APROVADO",
        provider_usado: "SISTEMA",
        data_hora: knex.fn.now(),
      });

      // 🔍 Buscamos dados para enviar via WhatsApp se for o caso
      const sessionData = await knex("chat_sessions as cs")
        .join("unidades_atendimento as ua", "cs.unidade_id", "ua.id_unidade")
        .where("cs.session_id", session_id)
        .select("cs.paciente_telefone", "ua.whatsapp_instance_name")
        .first();

      if (sessionData?.paciente_telefone && !sessionData.paciente_telefone.includes("-")) {
        whatsappService.sendTextMessage(
          sessionData.paciente_telefone,
          systemMessage,
          sessionData.whatsapp_instance_name
        ).catch(err => console.error("Erro ao notificar WhatsApp sobre transbordo:", err));
      }

      // 👇 INSERÇÃO DO PUSH SERVICE AQUI 👇
      // Importamos localmente para evitar problemas de dependência circular
      const PushService = require("../services/core/PushService");

      // Chamamos sem o 'await' para disparar em background e retornar a resposta
      // para quem clicou o mais rápido possível.
      PushService.notifyUnidade(
        unidade_id,
        "👩‍💻 Atendimento Assumido",
        `A sessão ${session_id.substring(0, 6)}... agora está sob controle humano.`,
        {
          url: `/monitor/${session_id}`,
          type: "TRANSBORDO_ASSUMIDO",
        },
      ).catch((err) => console.error("Erro silencioso no Push:", err));

      // 3. Retorno de sucesso para o frontend
      return res.json({ success: true, message: "Intervenção ativada." });
    } catch (error) {
      console.error("Erro ao intervir:", error);
      return res
        .status(500)
        .json({ error: "Falha ao assumir controle da sessão." });
    }
  },

  // POST /api/ai/analyze (Chamado pelo WebChatWidget.jsx)
  webAnalyze: async (req, res) => {
    try {
      const { messageText, clientId, unidadeId } = req.body;

      if (!messageText || !unidadeId) {
        return res.status(400).json({ error: "Parâmetros insuficientes." });
      }

      // Chama o Orquestrador passando o clientId como telefone (para fins de sessão)
      const response = await orchestrator.processMessage(
        { body: messageText, history: [] },
        unidadeId,
        clientId || "web-client",
      );

      return res.json({
        response: response.text,
        provider: response.provider,
      });
    } catch (error) {
      console.error("Erro no webAnalyze:", error);
      return res.status(500).json({ error: "Erro ao processar mensagem web." });
    }
  },

  sendMessageAdmin: async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { messageText } = req.body;
      const unidade_id = req.usuario.unidade_id;

      // 1. Valida a sessão e se pertence à unidade
      const session = await knex("chat_sessions as cs")
        .join("unidades_atendimento as ua", "cs.unidade_id", "ua.id_unidade")
        .where({ "cs.session_id": sessionId, "cs.unidade_id": unidade_id })
        .select("cs.*", "ua.whatsapp_instance_name")
        .first();

      if (!session) {
        return res.status(404).json({ error: "Sessão não encontrada." });
      }

      // 2. Insere no log de auditoria como vindo de um humano (Sistema/Admin)
      await knex("ai_audit_logs").insert({
        session_id: sessionId,
        input_usuario: "[ADMIN]",
        output_ia: messageText,
        veredicto_auditoria: "HUMANO",
        provider_usado: "HUMAN_OPERATOR",
        data_hora: knex.fn.now(),
      });

      // 3. SE FOR WHATSAPP, ENVIAMOS VIA EVOLUTION API
      // Identificamos se é WhatsApp se o telefone for um número válido (não UUID de web)
      if (session.paciente_telefone && !session.paciente_telefone.includes("-")) {
        try {
          await whatsappService.sendTextMessage(
            session.paciente_telefone,
            messageText,
            session.whatsapp_instance_name
          );
          console.log(`[Monitor] Mensagem enviada via WhatsApp para ${session.paciente_telefone}`);
        } catch (err) {
          console.error("Erro ao enviar via WhatsApp no Monitor:", err.message);
          // Não travamos o fluxo aqui, o log já foi gravado no banco para o webchat
        }
      }

      // 4. Atualiza o timestamp da sessão
      await knex("chat_sessions")
        .where({ session_id: sessionId })
        .update({ updated_at: knex.fn.now() });

      return res.json({ success: true });
    } catch (error) {
      console.error("Erro ao enviar mensagem admin:", error);
      return res.status(500).json({ error: "Erro ao enviar mensagem." });
    }
  },

  getRecentNotifications: async (req, res) => {
    try {
      const unidade_id = req.usuario?.unidade_id;
      if (!unidade_id) {
        return res.status(401).json({ error: "Não autorizado." });
      }

      // Buscar ocorrências nos últimos 15 segundos
      const threshold = new Date(Date.now() - 15000);

      // 1. Consultas recentes agendadas pela IA
      const consultas = await knex("consultas")
        .leftJoin("pacientes", "consultas.paciente_id", "pacientes.id_paciente")
        .where("consultas.unidade_id", unidade_id)
        .where("consultas.criado_em", ">=", threshold)
        .select(
          "consultas.id_consulta",
          "pacientes.nome as paciente_nome",
          "consultas.data_hora_inicio",
          "consultas.criado_em"
        );

      // 2. Transbordos recentes
      const transbordos = await knex("chat_sessions as cs")
        .leftJoin("pacientes as p", "cs.paciente_telefone", "p.telefone")
        .where("cs.unidade_id", unidade_id)
        .where("cs.estado_atual", "TRANSBORDO")
        .where("cs.updated_at", ">=", threshold)
        .select(
          "cs.session_id",
          "cs.paciente_telefone",
          "p.nome as nome_paciente",
          "cs.updated_at"
        );

      return res.json({ consultas, transbordos });
    } catch (error) {
      console.error("Erro ao buscar notificações recentes:", error);
      return res.status(500).json({ error: "Erro ao carregar notificações." });
    }
  },
};

module.exports = iaController;
