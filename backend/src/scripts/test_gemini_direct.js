// src/scripts/test_gemini_direct.js
require("dotenv").config();
const GeminiProvider = require("../services/ia/providers/GeminiProvider");

async function testGemini() {
  console.log("🚀 Forçando requisição direta para a API do Gemini...");
  const gemini = new GeminiProvider();

  try {
    const regras = "Consultas particulares exigem PIX. Idade mínima 12 anos.";
    const userMsg = "Quero marcar um cardio pro meu filho de 10 anos.";
    const acaoProposta = { tool: "realizar_agendamento", profissional_id: 1 };

    console.log("🕵️ Iniciando Auditoria de Risco com Gemini-1.5-Flash...");
    const audit = await gemini.auditResponse(regras, userMsg, acaoProposta);

    console.log("✅ Veredicto do Gemini:", audit);
    console.log(
      "🎉 Pode verificar o painel do Google Cloud (GCP) em alguns minutos, os tokens foram consumidos!",
    );
  } catch (error) {
    console.error("💀 Falha Crítica no Gemini:", error.message);
  }
}

testGemini();
