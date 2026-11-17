/**
 * Arquivo central de Arestas Condicionais (Conditional Edges) do LangGraph.
 * Define o fluxo do autômato (FSM) avaliando o ConfirmaMedState.
 */

/**
 * 1. Roteamento de Entrada (Após o Gatekeeper)
 * Avalia se o paciente tem permissão de usar a IA.
 */
const routeFromGatekeeper = (state) => {
  // Se a sessão estiver com um atendente humano (TRANSBORDO)
  if (state.estadoSessao === "TRANSBORDO") {
    return "auditLogNode";
  }
  // Se o paciente não aceitou a LGPD, nós AINDA vamos para o BrainNode para que a IA possa se apresentar 
  // e tirar dúvidas de privacidade/LGPD de forma personalizada, sem executar nenhuma tool/ação de agendamento.
  return "brainNode";
};

/**
 * 2. Roteamento da Inteligência (Após BrainNode / LLM Primária)
 * Avalia se a IA escolheu usar uma ferramenta ou se ela respondeu um texto final.
 */
const routeFromBrain = (state) => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];

  // Verifica na BaseMessage do LangChain se o modelo invocou tools via 'bindTools'
  if (lastMessage?.tool_calls && lastMessage.tool_calls.length > 0) {
    return "tools"; // Roteia para o utilitário ToolNode nativo
  }

  // Se não tem tool_call, significa que a IA gerou o texto final. Roteia para o Auditor Clínico.
  return "supervisorNode";
};

/**
 * 3. Guardião Anti-Loop (Após execução de Ferramentas)
 * Substitui o antigo (depth > 3). Previne que a IA chame a mesma Tool eternamente em caso de erro técnico.
 */
const routeFromTools = (state) => {
  const { messages } = state;

  // Anti-Loop Guard: Previne que a IA chame a mesma Tool eternamente no mesmo turno
  let lastHumanIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]._getType() === "human") {
      lastHumanIndex = i;
      break;
    }
  }

  let consecutiveToolSteps = 0;
  if (lastHumanIndex !== -1) {
    for (let i = lastHumanIndex + 1; i < messages.length; i++) {
      if (
        messages[i]._getType() === "tool" ||
        (messages[i]._getType() === "ai" && messages[i].tool_calls?.length > 0)
      ) {
        consecutiveToolSteps++;
      }
    }
  }

  // 6 steps significam 3 ciclos completos de Tool Call -> Tool Response no turno atual
  if (consecutiveToolSteps > 6) {
    console.warn(
      `⚠️ [Anti-Loop Guard] LLM presa em Loop de Tools (${consecutiveToolSteps} passos no turno). Forçando interrupção via Fallback.`,
    );
    return "fallbackNode";
  }

  // Ciclo normal: Ferramenta executou, volta para o BrainNode ler o resultado do Banco
  return "brainNode";
};

module.exports = {
  routeFromGatekeeper,
  routeFromBrain,
  routeFromTools,
};
