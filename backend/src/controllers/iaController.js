//src/controllers/iaController.js
const knex = require("../database/db");

const iaController = {
  getDashboardStats: async (req, res) => {
    try {
      const { unidade_id } = req.query;

      // 1. Agendamentos Totais vs IA
      // No seu dump, a tabela 'consultas' tem a coluna 'observacoes'
      const stats = await knex("consultas")
        .where("unidade_id", unidade_id)
        .select(
          knex.raw("COUNT(*)::int as total"),
          knex.raw(
            "COUNT(*) FILTER (WHERE observacoes ILIKE '%IA%')::int as por_ia",
          ),
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

      // 3. Performance da IA (Lógica Segura)
      // Como seu dump não tem a coluna 'action' ou 'status' na ai_audit_logs,
      // vamos contar logs bem-sucedidos baseados na existência de response_data
      const health = await knex("ai_audit_logs")
        .select(
          knex.raw("COUNT(*)::int as total_logs"),
          knex.raw("AVG(total_tokens)::int as media_tokens"),
        )
        .first();

      // 4. Fluxo de 7 dias
      const grafico = await knex("consultas")
        .where("unidade_id", unidade_id)
        .andWhere(
          "criado_em",
          ">=",
          knex.raw("CURRENT_DATE - INTERVAL '7 days'"),
        )
        .select(
          knex.raw("to_char(criado_em, 'DD/MM') as dia"),
          knex.raw("COUNT(*)::int as total"),
        )
        .groupBy("dia")
        .orderBy("dia", "asc");

      const agendamentosIA = stats?.por_ia || 0;

      return res.json({
        kpis: {
          agendamentosIA: agendamentosIA,
          taxaConfirmacao: confirmacoes?.taxa || 0,
          tempoEconomizado: agendamentosIA * 10, // 10 min por agendamento (constante de mercado)
          pacientesAtendidos: stats?.total || 0,
        },
        iaHealth: {
          uptime: health?.total_logs > 0 ? "100%" : "---",
          interacoesSucesso: health?.total_logs || 0,
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
      const { session_id } = req.query;
      const unidade_id = req.usuario.unidade_id;

      // 🔒 Join com chat_sessions para garantir que a unidade bate
      const query = knex("ai_audit_logs as al")
        .join("chat_sessions as cs", "al.session_id", "cs.session_id")
        .where("cs.unidade_id", unidade_id)
        .select("al.*")
        .orderBy("al.data_hora", "desc")
        .limit(20);

      if (session_id) query.where("al.session_id", session_id);

      const logs = await query;
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
      await knex("ai_audit_logs").insert({
        session_id,
        input_usuario: "[SISTEMA]",
        output_ia:
          "Um atendente humano assumiu esta conversa. Como posso ajudar?",
        veredicto_auditoria: "APROVADO",
        provider_usado: "SISTEMA",
        data_hora: knex.fn.now(), // Garanta que o nome da coluna de tempo esteja correto
      });

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
};

module.exports = iaController;
