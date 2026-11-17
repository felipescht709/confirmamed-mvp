const db = require("../../../database/db");

/**
 * Audit Log Node (Rastreabilidade - ISO/IEC 42001)
 * Este nó é sempre o último a ser executado antes da devolução da resposta.
 * Ele pega o estado final do StateGraph e materializa no PostgreSQL.
 */
const auditLogNode = async (state) => {
  const { messages, iso_audit_trail } = state;

  // Recupera o input inicial e o output final
  const inputUsuario =
    messages
      .slice()
      .reverse()
      .find((m) => m._getType() === "human")?.content || "";
  let outputIa =
    messages
      .slice()
      .reverse()
      .find((m) => m._getType() === "ai" && m.content)?.content || "";

  if (state.aceiteLgpd === false && !outputIa) {
    let nomeClinica = "ConfirmaMed";
    try {
      const unidade = await db("unidades_atendimento")
        .where("id_unidade", state.unidadeId)
        .first();
      if (unidade?.nome_fantasia) {
        nomeClinica = unidade.nome_fantasia;
      }
    } catch (e) {
      console.error("Erro ao buscar clinica no AuditLogNode:", e);
    }
    outputIa = `Olá! Bem-vindo ao ${nomeClinica}. Para podermos iniciar o seu atendimento em conformidade com a Lei Geral de Proteção de Dados (LGPD), precisamos que você confirme o aceite dos nossos Termos de Uso e Política de Privacidade. Você aceita? (Por favor, responda com 'Sim' ou 'Aceito')`;
  }

  try {
    // Gravação unificada na tabela de auditoria
    await db("ai_audit_logs").insert({
      session_id: state.sessionId,
      unidade_id: state.unidadeId,
      input_usuario: inputUsuario,
      output_ia: outputIa,
      provider_usado: iso_audit_trail?.provider_used || "OPENAI",
      veredicto_auditoria: iso_audit_trail?.auditoria_reprovada
        ? "REPROVADO"
        : "APROVADO",
      risco_detectado: iso_audit_trail?.risco_detectado || null,
      prompt_hash: iso_audit_trail?.prompt_hash || "v3.0-langgraph",
      data_hora: new Date(),
    });
  } catch (error) {
    console.error(
      "❌ [AuditLogNode] Falha Crítica ao salvar rastreabilidade:",
      error,
    );
  }

  return {}; // Nó terminal de persistência, não precisa mutar o estado do LangGraph
};

module.exports = auditLogNode;
