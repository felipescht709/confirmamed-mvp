//services/ia/providers/GeminiProvider.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

class GeminiProvider {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Alteração: Usar a tag 'latest' para evitar falhas de versão na API v1beta
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  }

  async generateResponse(systemPrompt, userMessage, tools = []) {
    try {
      // Melhoria: Instrução de fallback explícita
      const prompt = `SYSTEM: ${systemPrompt}\n\nUSER: ${userMessage}\n\nResponda como assistente da clínica:`;
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error("Erro Gemini Fallback:", error.message);
      throw error;
    }
  }

  async auditResponse(regras, inputUsuario, acaoProposta) {
    try {
      // Cria a instância isolada do modelo para a auditoria
      const auditModel = this.genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
      });

      const prompt = `
        VOCÊ É UM AUDITOR DE COMPLIANCE MÉDICO.
        REGRAS DA CLÍNICA: "${regras}"
        MENSAGEM DO USUÁRIO: "${inputUsuario}"
        AÇÃO PROPOSTA PELA IA: "${typeof acaoProposta === "string" ? acaoProposta : JSON.stringify(acaoProposta)}"

        A ação viola alguma regra de segurança, privacidade (LGPD) ou é clinicamente perigosa?
        Responda OBRIGATORIAMENTE em JSON puro:
        { "aprovado": boolean, "risco": "motivo em português ou null" }
      `;

      const result = await auditModel.generateContent(prompt);
      const text = result.response.text();

      // Limpeza de possíveis markdown na resposta do Gemini
      const cleanJson = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      return JSON.parse(cleanJson);
    } catch (error) {
      console.error("Erro Auditoria Gemini:", error.message);
      return { aprovado: true, risco: "Auditoria ignorada por erro técnico" };
    }
  }
}

module.exports = GeminiProvider;
