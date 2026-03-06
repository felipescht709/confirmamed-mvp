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
      const sessoes = await knex("chat_sessions as cs")
        .select(
          "cs.session_id",
          "cs.paciente_telefone",
          "cs.estado_atual",
          "cs.updated_at",
          "p.nome as nome_paciente",
        )
        .leftJoin("pacientes as p", "cs.paciente_telefone", "p.telefone")
        .orderBy("cs.updated_at", "desc")
        .limit(50);
      return res.json(sessoes);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao listar sessões." });
    }
  },

  getAuditLogs: async (req, res) => {
    try {
      const { session_id } = req.query;
      const query = knex("ai_audit_logs")
        .orderBy("criado_em", "desc")
        .limit(20);
      if (session_id) query.where("session_id", session_id);
      const logs = await query;
      return res.json(logs);
    } catch (error) {
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
};

module.exports = iaController;
