const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { ChatOpenAI } = require("@langchain/openai");
const { z } = require("zod");

/**
 * Supervisor Node (Auditor Clínico - Gemini com fallback para OpenAI)
 * Avalia a resposta gerada pela LLM Primária para garantir que não haja alucinação
 * ou risco clínico antes de enviar ao paciente (Human-in-the-loop / ISO 42001).
 */
const supervisorNode = async (state) => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];

  // Se a mensagem for uma Tool Call (IA decidiu chamar o banco de dados),
  // não auditamos o texto, pois a ação interna já é fechada pelas restrições do Knex.
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return { iso_audit_trail: { auditoria_reprovada: false } };
  }

  // Recupera a mensagem original do paciente e a resposta gerada pela IA
  const humanMessage =
    messages
      .slice()
      .reverse()
      .find((m) => m._getType() === "human")?.content || "";
  const aiResponse = lastMessage.content || "";

  const prompt = `Você é um Auditor Clínico Nível 3 focando na norma ISO/IEC 42001 de IAs.
Analise se a IA de atendimento cometeu um erro ao responder o paciente ou se a entrada do paciente indica emergência médica.
Regras de Reprovação (aprovado = false se violar qualquer uma):
1. A resposta prescreveu remédio ou dosagem.
2. A resposta inventou preparo de exame.
3. A resposta deu diagnóstico ou suspeita diagnóstica.
4. A entrada do paciente apresenta sintomas graves de urgência ou emergência médica (como dor forte no peito, falta de ar, dor aguda intensa, palpitações fortes, etc). Qualquer menção a sintomas de emergência médica DEVE ser REPROVADA para acionar o protocolo de segurança clínica.

Entrada do Paciente: "${humanMessage}"
Resposta da IA de Atendimento: "${aiResponse}"`;

  const schema = z.object({
    aprovado: z
      .boolean()
      .describe(
        "True se a resposta for segura, ética e não inventar procedimentos médicos.",
      ),
    risco_detectado: z
      .string()
      .describe(
        "Se reprovado, descreva brevemente o risco. Se aprovado, deixe vazio.",
      ),
    nivel_risco: z
      .enum(["LOW", "MEDIUM", "HIGH"])
      .describe("Nível de gravidade clínica da interação."),
  });

  let avaliacao;
  try {
    // Instancia o Gemini como Avaliador
    const llm = new ChatGoogleGenerativeAI({
      model: "gemini-1.5-flash",
      temperature: 0.0,
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
    });
    const auditorLlm = llm.withStructuredOutput(schema);
    avaliacao = await auditorLlm.invoke(prompt);
  } catch (geminiError) {
    console.warn(
      "⚠️ [SupervisorNode] Gemini falhou. Utilizando OpenAI gpt-4o-mini como auditor de contingência.",
      geminiError.message,
    );
    try {
      const backupLlm = new ChatOpenAI({
        modelName: "gpt-4o-mini",
        temperature: 0.0,
      });
      const backupAuditor = backupLlm.withStructuredOutput(schema);
      avaliacao = await backupAuditor.invoke(prompt);
    } catch (openaiError) {
      console.error("❌ [SupervisorNode] Falha no auditor de contingência OpenAI:", openaiError.message);
      // Em último caso, reprova por segurança (fail-secure)
      avaliacao = {
        aprovado: false,
        risco_detectado: "Falha de infraestrutura: impossível auditar segurança da resposta.",
        nivel_risco: "HIGH"
      };
    }
  }

  return {
    iso_audit_trail: {
      auditoria_reprovada: !avaliacao.aprovado,
      risco_detectado: avaliacao.risco_detectado || null,
      risk_level: avaliacao.nivel_risco,
    },
  };
};

module.exports = supervisorNode;
