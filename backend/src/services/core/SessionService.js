const knex = require("../../database/db");
const { v4: uuidv4 } = require("uuid");

class SessionService {
  /**
   * Busca ou cria a sessão atual do WhatsApp.
   */
  static async getOrCreateSession(telefone) {
    let session = await knex("chat_sessions")
      .where("paciente_telefone", telefone)
      .where("expires_at", ">", knex.fn.now())
      .first();

    if (!session) {
      session = {
        session_id: uuidv4(),
        paciente_telefone: telefone,
        estado_atual: "TRIAGEM",
        contexto_temporario: {}, // Guarda paciente_alvo_id, etc.
        expires_at: knex.raw("NOW() + INTERVAL '24 HOURS'"),
      };
      await knex("chat_sessions").insert(session);
    }
    return session;
  }

  /**
   * Atualiza o estado da conversa e salva o ID do paciente alvo
   */
  static async updateSession(telefone, estadoAtual, contextoParcial = {}) {
    const session = await this.getOrCreateSession(telefone);

    // Mescla o contexto antigo com o novo (ex: preserva o paciente_alvo_id)
    const novoContexto = { ...session.contexto_temporario, ...contextoParcial };

    await knex("chat_sessions")
      .where("paciente_telefone", telefone)
      .update({
        estado_atual: estadoAtual,
        contexto_temporario: novoContexto,
        expires_at: knex.raw("NOW() + INTERVAL '24 HOURS'"), // Renova o TTL
      });
  }
}

module.exports = SessionService;
