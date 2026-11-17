const SessionService = require("../../core/SessionService");
const piiMasker = require("../security/PIIMasker");
const knex = require("../../../database/db");
const { SystemMessage } = require("@langchain/core/messages");

/**
 * Gatekeeper Node
 * Responsável por Inicialização de Sessão, Controle de LGPD e Anonimização (PII Masking).
 * @param {import("../state/ConfirmaMedState").ConfirmaMedState} state - O estado atual do Grafo
 */
const gatekeeperNode = async (state) => {
  const { telefoneOrigem, unidadeId, messages, iso_audit_trail } = state;

  // 1. Busca ou Cria a Sessão (FSM - Finite State Machine)
  const session = await SessionService.getOrCreateSession(
    telefoneOrigem,
    unidadeId,
  );

  // 2. Interceptador de Aceite de LGPD em Linguagem Natural
  let lgpdAceito = session.aceite_lgpd || false;
  const lastMessage = messages[messages.length - 1];
  const userText = lastMessage && lastMessage._getType() === "human" ? lastMessage.content : "";

  if (!lgpdAceito && userText) {
    const cleanMsg = userText.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"");
    const cleanMsgWords = cleanMsg.split(/\s+/);
    
    // Lista de palavras afirmativas exatas (devem ser o texto inteiro ou iniciar a mensagem)
    const exactStartKeywords = ["sim", "aceito", "ok", "concordo", "quero", "s", "yes", "aceitar", "concordar"];
    
    // Lista de expressões completas de consentimento (podem estar contidas em qualquer parte do texto)
    const expressionsOfConsent = ["aceito os termos", "eu aceito", "concedo o aceite", "quero aceitar"];
    
    // Verificar se contém palavras de dúvida/pergunta para evitar falso positivo
    const isQuestion = userText.toLowerCase().includes("?") || 
                       /\b(por\s*que|porque|como|qual|quais|o\s*que|explicar|motivo|para\s*que)\b/i.test(userText);
                       
    let hasAceite = false;
    if (!isQuestion) {
      const firstWord = cleanMsgWords[0];
      const matchesFirstWord = exactStartKeywords.includes(firstWord);
      const matchesExpression = expressionsOfConsent.some(exp => cleanMsg.includes(exp));
      hasAceite = matchesFirstWord || matchesExpression;
    }

    if (hasAceite) {
      await SessionService.acceptLgpd(telefoneOrigem, unidadeId);
      lgpdAceito = true;
    }
  }

  // 3. Proteção LGPD: PII Masking nas mensagens recentes (Human Messages)
  if (lastMessage && lastMessage._getType() === "human" && lgpdAceito) {
    const originalContent = lastMessage.content;

    // Passa o texto pelo PIIMasker para remover CPFs, emails, etc.
    const maskedContent = await piiMasker.mask(originalContent, telefoneOrigem);

    // Se houve alteração, atualizamos o conteúdo para a LLM não receber o dado puro
    if (originalContent !== maskedContent) {
      lastMessage.content = maskedContent;
    }
  }

  // 3.5 Interceptador de CONFIRMAÇÃO de Consulta
  if (session.estado_atual === "CONFIRMACAO" && userText) {
    const cleanMsg = userText.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"");
    const consultaId = session.contexto_temporario?.consulta_confirmacao_id;

    if (consultaId) {
      if (cleanMsg === "sim" || cleanMsg.includes("sim ") || cleanMsg === "s" || cleanMsg.includes("confirmo")) {
        // CONFIRMOU
        await knex("consultas").where("id_consulta", consultaId).update({ status_confirmacao: "CONFIRMADO" });
        await SessionService.updateSession(telefoneOrigem, unidadeId, "ATIVO", { consulta_confirmacao_id: null });
        session.estado_atual = "ATIVO";
        messages.push(new SystemMessage(`[SISTEMA] O paciente acaba de CONFIRMAR a presença na consulta (ID: ${consultaId}). Agradeça brevemente.`));
      } else if (cleanMsg === "nao" || cleanMsg === "não" || cleanMsg.includes("nao ") || cleanMsg === "n") {
        // CANCELOU/REAGENDAR
        await knex("consultas").where("id_consulta", consultaId).update({ status_confirmacao: "REAGENDAR", status: "CANCELADO" });
        await SessionService.updateSession(telefoneOrigem, unidadeId, "ATIVO", { consulta_confirmacao_id: null });
        session.estado_atual = "ATIVO";
        messages.push(new SystemMessage(`[SISTEMA] O paciente acaba de INFORMAR QUE NÃO PODERÁ COMPARECER à consulta (ID: ${consultaId}) e ela foi cancelada automaticamente pelo sistema. Ofereça novos horários chamando 'verificar_disponibilidade' e proponha o reagendamento.`));
      }
    }
  }

  // 4. Atualiza o Estado Global com as regras da sessão e métricas de compliance
  return {
    // Propriedades do Banco
    estadoSessao: session.estado_atual || "ATIVO",
    aceiteLgpd: lgpdAceito,
    sessionId: session.session_id,
    pacienteId: session.contexto_temporario?.paciente_alvo_id || null,

    // Atualiza metadados da ISO 42001 (AIMS)
    iso_audit_trail: {
      pii_masked: true,
      human_override: session.estado_atual === "TRANSBORDO", // Ativa flag se a sessão já estiver para um humano
    },
  };
};

module.exports = gatekeeperNode;
