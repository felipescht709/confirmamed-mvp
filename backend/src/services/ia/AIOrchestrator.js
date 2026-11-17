const { StateGraph, START, END } = require("@langchain/langgraph");
const { ToolMessage } = require("@langchain/core/messages");
const { HumanMessage, AIMessage } = require("@langchain/core/messages");
const db = require("../../database/db");
const SessionService = require("../core/SessionService");

// 1. Estado Global e Ferramentas
const { ConfirmaMedState } = require("./state/ConfirmaMedState");
const {
  confirmamedTools,
  protocolTool,
  availabilityTool,
  upsertPacienteTool,
  criarAgendamentoTool,
  cancelarConsultaTool,
  reagendarConsultaTool,
  confirmarPresencaTool,
  consultarAgendamentosTool,
  entrarFilaEsperaTool,
  solicitarAtendenteTool,
} = require("./tools");

// 2. Importação dos Nós (Nodes)
const gatekeeperNode = require("./nodes/GatekeeperNode");
const brainNode = require("./nodes/BrainNode");
const fallbackNode = require("./nodes/FallbackNode");
const supervisorNode = require("./nodes/SupervisorNode");
const auditLogNode = require("./nodes/AuditLogNode");

// 3. Importação do Roteamento (Edges)
const {
  routeFromGatekeeper,
  routeFromBrain,
  routeFromTools,
} = require("./edges/RoutingEdges");

// Mapa para execução dinâmica com injeção de parâmetros de sessão
const toolsMap = {
  verificar_disponibilidade: availabilityTool,
  consultar_protocolo: protocolTool,
  upsert_paciente: upsertPacienteTool,
  criar_agendamento: criarAgendamentoTool,
  cancelar_consulta: cancelarConsultaTool,
  reagendar_consulta: reagendarConsultaTool,
  confirmar_presenca: confirmarPresencaTool,
  consultar_agendamentos_paciente: consultarAgendamentosTool,
  entrar_fila_espera: entrarFilaEsperaTool,
  solicitar_atendente: solicitarAtendenteTool,
};

const customToolsNode = async (state) => {
  const { messages, telefoneOrigem, unidadeId } = state;
  const lastMessage = messages[messages.length - 1];
  const toolOutputs = [];

  for (const toolCall of lastMessage.tool_calls) {
    const toolName = toolCall.name;
    const tool = toolsMap[toolName];
    if (!tool) {
      toolOutputs.push(new ToolMessage({
        content: `Erro: ferramenta ${toolName} não encontrada.`,
        tool_call_id: toolCall.id,
      }));
      continue;
    }

    try {
      // Injeta telefone_sessao e unidade_id nos argumentos de execução!
      const args = {
        ...toolCall.args,
        telefone_sessao: telefoneOrigem,
        unidade_id: unidadeId,
      };

      console.log(`[AIOrchestrator Node:tools] Executando ${toolName} com args:`, JSON.stringify(toolCall.args));

      let result;
      if (typeof tool.execute === "function") {
        result = await tool.execute(args);
      } else if (typeof tool.call === "function") {
        result = await tool.call(args);
      } else if (typeof tool.func === "function") {
        result = await tool.func(args);
      } else {
        result = "Erro: executor da ferramenta não implementado.";
      }

      console.log(`[AIOrchestrator Node:tools] Resultado de ${toolName}:`, String(result).substring(0, 150));

      toolOutputs.push(new ToolMessage({
        content: String(result),
        name: toolName,
        tool_call_id: toolCall.id,
      }));
    } catch (err) {
      console.error(`❌ Erro ao executar a tool ${toolName}:`, err);
      toolOutputs.push(new ToolMessage({
        content: `Erro técnico na ferramenta: ${err.message}`,
        tool_call_id: toolCall.id,
      }));
    }
  }

  return { messages: toolOutputs };
};

/**
 * Construção do Grafo (FSM + ReAct)
 */
const builder = new StateGraph(ConfirmaMedState)
  // Registro de Nós
  .addNode("gatekeeperNode", gatekeeperNode)
  .addNode("brainNode", brainNode)
  .addNode("tools", customToolsNode)
  .addNode("fallbackNode", fallbackNode)
  .addNode("supervisorNode", supervisorNode)
  .addNode("auditLogNode", auditLogNode)

  // Fluxo e Roteamento
  .addEdge(START, "gatekeeperNode")
  .addConditionalEdges("gatekeeperNode", routeFromGatekeeper)
  .addConditionalEdges("brainNode", routeFromBrain)
  .addConditionalEdges("tools", routeFromTools)
  .addEdge("fallbackNode", "supervisorNode") // Se deu ruim e caiu no Gemini, audita o Gemini também
  .addEdge("supervisorNode", "auditLogNode") // Tudo passa pela Auditoria, que sempre deságua no Log
  .addEdge("auditLogNode", END); // Gravação no banco encerra o fluxo

// A Magia do LangGraph: Compila todos os nós e regras em um Executável (Pregel)
const langGraphApp = builder.compile();

/**
 * Orquestrador Principal
 * Ponto único de entrada consumido pelo WebhookController / WhatsappService
 */
class AIOrchestrator {
  async processMessage(telefoneOrigem, unidadeId, textoUsuario) {
    console.log(
      `🤖 [AIOrchestrator] Iniciando Processamento para ${telefoneOrigem} na Unidade ${unidadeId}`,
    );

    try {
      // 1. Carrega ou cria a sessão no banco para recuperar o histórico
      const session = await SessionService.getOrCreateSession(telefoneOrigem, unidadeId);
      
      // 2. Carrega as últimas 10 mensagens de auditoria para memória conversacional
      const historyLogs = await db("ai_audit_logs")
        .where("session_id", session.session_id)
        .orderBy("data_hora", "asc")
        .limit(10)
        .select("input_usuario", "output_ia");

      const historyMessages = [];
      for (const log of historyLogs) {
        if (log.input_usuario && log.input_usuario !== "[SISTEMA]" && log.input_usuario !== "[ADMIN]") {
          historyMessages.push(new HumanMessage(log.input_usuario));
        }
        if (log.output_ia) {
          historyMessages.push(new AIMessage(log.output_ia));
        }
      }

      // Injeção do Estado Inicial (Gatilho com Histórico de Memória)
      const initialState = {
        sessionId: session.session_id,
        telefoneOrigem,
        unidadeId,
        messages: [...historyMessages, new HumanMessage(textoUsuario)],
      };

      // Executa a FSM do LangGraph (Recursão Limits imposta por segurança)
      const finalState = await langGraphApp.invoke(initialState, {
        recursionLimit: 20,
      });

      console.log("DEBUG ORCHESTRATOR state:", {
        estadoSessao: finalState.estadoSessao,
        aceiteLgpd: finalState.aceiteLgpd,
        iso_audit_trail: finalState.iso_audit_trail
      });

      // Validação Crítica Pós-Execução (Compliance ISO 42001)
      if (finalState.iso_audit_trail?.auditoria_reprovada) {
        console.warn(
          "🚫 [AIOrchestrator] Resposta bloqueada pelo SupervisorNode (Risco Clínico).",
        );
        return "Desculpe, por diretrizes de segurança clínica, não posso responder a essa solicitação. Deseja que eu repasse à nossa equipe?";
      }

      // Se a LGPD não foi aceita, tentamos usar o retorno gerado pela IA (que explica os termos, etc.)
      if (finalState.aceiteLgpd === false) {
        const lastMessage = finalState.messages[finalState.messages.length - 1];
        if (lastMessage && lastMessage.content) {
          return lastMessage.content;
        }
        
        let nomeClinica = "ConfirmaMed";
        try {
          const clinica = await db("unidades_atendimento")
            .where("id_unidade", unidadeId)
            .first();
          if (clinica?.nome_fantasia) {
            nomeClinica = clinica.nome_fantasia;
          }
        } catch (e) {
          console.error("Erro ao buscar clinica no AIOrchestrator:", e);
        }

        return `Olá! Bem-vindo ao ${nomeClinica}. Para podermos iniciar o seu atendimento em conformidade com a Lei Geral de Proteção de Dados (LGPD), precisamos que você confirme o aceite dos nossos Termos de Uso e Política de Privacidade. Você aceita? (Por favor, responda com 'Sim' ou 'Aceito')`;
      }

      // Se transbordou, o próprio Controller cuida de ignorar
      if (finalState.estadoSessao === "TRANSBORDO") {
        return null;
      }

      // Devolve ao mensageiro o conteúdo gerado
      const lastMessage = finalState.messages[finalState.messages.length - 1];
      return lastMessage.content;
    } catch (error) {
      console.error(
        "❌ [AIOrchestrator] Falha Crítica na Execução do Grafo:",
        error,
      );
      return "Desculpe, nosso sistema de atendimento está passando por uma instabilidade técnica. Por favor, aguarde alguns minutos e tente novamente.";
    }
  }
}

module.exports = new AIOrchestrator();
