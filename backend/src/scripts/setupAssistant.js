const { OpenAI } = require('openai');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function init() {
  try {
    const assistant = await openai.beta.assistants.create({
      name: "Agente ConfirmaMED",
      instructions: `Você é um assistente de agendamento de elite da ConfirmaMED. 
      Sua missão é gerenciar a agenda da clínica com precisão cirúrgica.
      REGRAS:
      1. Use 'identificar_paciente' no início de toda conversa.
      2. Use 'consultar_horarios' para ver slots reais. Nunca invente horários.
      3. Seja conciso e profissional.`,
      model: "gpt-4o", 
      tools: [
        {
          type: "function",
          function: {
            name: "consultar_horarios",
            description: "Retorna slots livres para uma data específica.",
            parameters: {
              type: "object",
              properties: {
                profissional_id: { type: "integer" },
                data: { type: "string", description: "Formato YYYY-MM-DD" }
              },
              required: ["profissional_id", "data"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "identificar_paciente",
            description: "Busca o cadastro do paciente pelo número do WhatsApp.",
            parameters: {
              type: "object",
              properties: {
                whatsapp: { type: "string" }
              },
              required: ["whatsapp"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "gerenciar_agendamento",
            description: "Cria, Cancela ou Reagenda consultas.",
            parameters: {
              type: "object",
              properties: {
                acao: { type: "string", enum: ["criar", "cancelar", "reagendar"] },
                paciente_id: { type: "integer" },
                profissional_id: { type: "integer" },
                data_hora: { type: "string", description: "ISO 8601" },
                consulta_id: { type: "integer" }
              },
              required: ["acao"]
            }
          }
        }
      ]
    });

    console.log("✅ AGENTE CRIADO!");
    console.log("🆔 Assistant ID:", assistant.id);
    console.log("⚠️  COPIE ESTE ID PARA SEU .ENV COMO OPENAI_ASSISTANT_ID");
  } catch (error) {
    console.error("❌ Erro ao criar assistente:", error);
  }
}

init();