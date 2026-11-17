const { Annotation } = require("@langchain/langgraph");

/**
 * Definição do Estado Global do LangGraph (StateGraph)
 * Adere à LGPD (Minimização de Dados) e ISO/IEC 42001 (AIMS)
 */
const ConfirmaMedState = Annotation.Root({
  // 1. MEMÓRIA TRANSACIONAL (Core LangGraph)
  // O reducer concatena novas mensagens ao histórico dinamicamente
  messages: Annotation({
    reducer: (currentState, updateValue) => currentState.concat(updateValue),
    default: () => [],
  }),

  // 2. IDENTIDADE E MULTI-TENANCY (Business Core)
  telefoneOrigem: Annotation({ default: () => null }),
  unidadeId: Annotation({ default: () => null }),
  pacienteId: Annotation({ default: () => null }), // null se for usuário novo

  // 3. MÁQUINA DE ESTADOS (Controle de Fluxo)
  estadoSessao: Annotation({ default: () => "ATIVO" }), // ATIVO, TRANSBORDO, TRIAGEM, CONFIRMACAO
  aceiteLgpd: Annotation({ default: () => false }),
  sessionId: Annotation({ default: () => null }),

  // 4. COMPLIANCE ISO/IEC 42001 & SEGURANÇA
  iso_audit_trail: Annotation({
    // Atualiza apenas as chaves enviadas (merge)
    reducer: (currentState, updateValue) => ({ ...currentState, ...updateValue }),
    default: () => ({
      prompt_hash: null,          // Rastreabilidade: Hash do System Prompt usado
      risk_level: "LOW",          // LOW, MEDIUM, HIGH (Ex: HIGH se for emergência médica)
      pii_masked: true,           // Validação de Minimização de Dados Ativa
      human_override: false,      // Flag ativada quando entra no Transbordo (Human-in-the-loop)
      provider_used: "OPENAI",    // OPENAI ou GEMINI (Fallback)
      auditoria_reprovada: false  // Se o nó do Gemini Auditor barrar a resposta
    }),
  }),

  // 5. TELEMETRIA E PREVENÇÃO DE LOOP INFINITO
  tentativasErro: Annotation({
    reducer: (currentState, updateValue) => currentState + updateValue,
    default: () => 0,
  }),
});

module.exports = { ConfirmaMedState };