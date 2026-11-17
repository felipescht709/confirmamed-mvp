// src/controllers/publicChatController.js
const knex = require("../database/db");
const orchestrator = require("../services/ia/AIOrchestrator");

const publicChatController = {
  // GET /public/chat/:sessionId?page=1&limit=20
  getHistory: async (req, res) => {
    try {
      const { sessionId } = req.params;
      // A10: Suporte a paginação — padrão 20 mensagens por página
      const page  = Math.max(1, parseInt(req.query.page  || "1",  10));
      const limit = Math.min(50, parseInt(req.query.limit || "20", 10));
      const offset = (page - 1) * limit;

      const session = await knex("chat_sessions").where({ session_id: sessionId }).first();
      if (!session) return res.status(404).json({ error: "Sessão expirada ou não encontrada." });

      const baseQuery = knex("ai_audit_logs")
        .where({ session_id: sessionId });

      // Conta total para o frontend saber quantas páginas existem
      const [{ total }] = await baseQuery.clone().count("* as total");

      const logs = await baseQuery
        .clone()
        .orderBy("data_hora", "asc")
        .limit(limit)
        .offset(offset)
        .select("input_usuario", "output_ia", "provider_usado", "data_hora");

      // Monta pares user/assistant na ordem correta
      const history = [];
      logs.forEach(log => {
        if (log.input_usuario && log.input_usuario !== "[SISTEMA]" && log.input_usuario !== "[ADMIN]") {
          history.push({ role: "user", content: log.input_usuario, timestamp: log.data_hora });
        }
        if (log.output_ia) {
          history.push({ 
            role: log.provider_usado === "HUMAN_OPERATOR" ? "assistant" : "assistant", 
            content: log.output_ia, 
            timestamp: log.data_hora 
          });
        }
      });

      return res.json({
        history,
        status:     session.estado_atual,
        pagination: {
          page,
          limit,
          total: parseInt(total, 10),
          pages: Math.ceil(parseInt(total, 10) / limit),
        },
      });
    } catch (error) {
      console.error("[PublicChat] Erro ao buscar histórico:", error);
      return res.status(500).json({ error: "Erro interno" });
    }
  },

  sendMessage: async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { messageText } = req.body;

      // A10: Validação de entrada
      if (!messageText || !messageText.trim()) {
        return res.status(400).json({ error: "Mensagem não pode estar vazia." });
      }

      const session = await knex("chat_sessions").where({ session_id: sessionId }).first();
      if (!session) return res.status(404).json({ error: "Sessão inválida." });

      const response = await orchestrator.processMessage(
        session.paciente_telefone,
        session.unidade_id,
        messageText.trim(),
      );

      if (response === null || response === "MODO_HUMANO_ATIVO") {
        return res.json({ response: "Um atendente humano assumiu esta conversa. Por favor, aguarde." });
      }

      return res.json({ response });
    } catch (error) {
      console.error("[PublicChat] Erro ao processar mensagem:", error);
      return res.status(500).json({ error: "Erro ao processar mensagem com a IA." });
    }
  },
};

module.exports = publicChatController;