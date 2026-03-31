// src/services/whatsapp/whatsappService.js
const axios = require("axios");

class WhatsAppService {
  constructor() {
    this.baseUrl = process.env.EVOLUTION_URL || "http://evolution:8080";
    this.globalToken = process.env.AUTHENTICATION_API_KEY || "admin123"; // Conforme seu docker-compose
  }

  /**
   * Envia uma mensagem de texto simples
   * @param {string} to - Telefone do destinatário
   * @param {string} message - Texto da mensagem
   * @param {string} instanceName - Nome da instância da clínica na EvolutionAPI
   */
  async sendTextMessage(to, message, instanceName) {
    if (!instanceName)
      throw new Error("instanceName é obrigatório para multi-tenant");

    try {
      // Evolution API exige formato numérico internacional limpo (ex: 5511999999999)
      const phone = to.replace(/\D/g, "");

      // ROTA CORRETA DA EVOLUTION API V2
      const url = `${this.baseUrl}/message/sendText/${instanceName}`;

      const response = await axios.post(
        url,
        {
          number: phone,
          text: message,
          delay: 1500, // Delay humano opcional
        },
        {
          headers: {
            apikey: this.globalToken,
            "Content-Type": "application/json",
          },
        },
      );

      console.log(
        `[WhatsApp] Mensagem enviada para ${to} via instância ${instanceName}`,
      );
      return response.data;
    } catch (error) {
      console.error(
        `[WhatsApp Error] Falha via ${instanceName} para ${to}:`,
        error.response?.data || error.message,
      );
      throw new Error("Erro na comunicação com a Evolution API.");
    }
  }
}

module.exports = new WhatsAppService();
