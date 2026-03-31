// src/controllers/publicChatController.js
const knex = require("../database/db");
const AIOrchestrator = require("../services/ia/AIOrchestrator");

const orchestrator = new AIOrchestrator();

const publicChatController = {
  getHistory: async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      const session = await knex("chat_sessions").where({ session_id: sessionId }).first();
      if (!session) return res.status(404).json({ error: "Sessão expirada ou não encontrada." });

      // Reconstrói o histórico lendo os logs de auditoria
      const logs = await knex("ai_audit_logs")
        .where({ session_id: sessionId })
        .orderBy("data_hora", "asc"); // Ajuste o nome da coluna se for criado_em

      const history = [];
      logs.forEach(log => {
        if (log.input_usuario && log.input_usuario !== "[SISTEMA]") {
          history.push({ role: "user", content: log.input_usuario });
        }
        if (log.output_ia) {
          history.push({ role: "assistant", content: log.output_ia });
        }
      });

      return res.json({ history, status: session.estado_atual });
    } catch (error) {
      console.error("[PublicChat] Erro ao buscar histórico:", error);
      return res.status(500).json({ error: "Erro interno" });
    }
  },

  sendMessage: async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { messageText } = req.body; // Alterado para bater com o que seu React envia

      // 1. Valida a sessão
      const session = await knex("chat_sessions").where({ session_id: sessionId }).first();
      if (!session) return res.status(404).json({ error: "Sessão inválida." });

      // 2. Chama o Cérebro da IA (O mesmo que o WhatsApp usa!)
      // Precisamos passar o unidade_id e o telefoneOrigem que estão atrelados a esta sessão
      const response = await orchestrator.processMessage(
        { body: messageText, history: [] }, // O Orquestrador já puxa o histórico lá dentro
        session.unidade_id,
        session.paciente_telefone
      );

      // 3. Se a IA detectou que a secretária assumiu
      if (response && response.text === "MODO_HUMANO_ATIVO") {
        return res.json({ response: "Um atendente humano assumiu esta conversa. Por favor, aguarde." });
      }

      return res.json({ response: response.text });
    } catch (error) {
      console.error("[PublicChat] Erro ao processar mensagem:", error);
      return res.status(500).json({ error: "Erro ao processar mensagem com a IA." });
    }
  }
};

module.exports = publicChatController;