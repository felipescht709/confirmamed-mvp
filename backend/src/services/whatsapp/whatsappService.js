// src/services/whatsapp/whatsappService.js
const axios = require("axios");

class WhatsAppService {
  constructor() {
    this.baseUrl = process.env.WHATSAPP_BASE_URL || "http://evolution:8080";
    this.globalToken = process.env.AUTHENTICATION_API_KEY || "admin123"; // Conforme seu docker-compose
  }

  /**
   * Envia uma mensagem de texto simples com mecanismo de retentativa
   */
  async sendTextMessage(to, message, instanceName) {
    if (!instanceName) throw new Error("instanceName é obrigatório");

    const phone = to.replace(/\D/g, "");
    const url = `${this.baseUrl}/message/sendText/${instanceName}`;
    
    // Configuração de retentativa (3 vezes para erros temporários 502/504)
    let attempts = 0;
    while (attempts < 3) {
      try {
        const response = await axios.post(
          url,
          { number: phone, text: message, delay: 1200 },
          {
            headers: {
              apikey: this.globalToken,
              "Content-Type": "application/json",
            },
            timeout: 15000, 
          }
        );

        console.log(`✅ [WhatsApp] Mensagem enviada para ${to} [Instance: ${instanceName}]`);
        return response.data;
      } catch (error) {
        attempts++;
        const status = error.response?.status;
        
        // Se for 502 ou 504 (timeout de rede/docker), tentamos de novo
        if ((status === 502 || status === 504) && attempts < 3) {
          console.warn(`[WhatsApp Retry] Instância ${instanceName} ocupada (Erro ${status}). Tentativa ${attempts}/3...`);
          await new Promise(r => setTimeout(r, 2000 * attempts));
          continue;
        }

        console.error(`❌ [WhatsApp Error] Falha fatal na instância ${instanceName}:`, error.response?.data || error.message);
        
        if (attempts === 3) {
          console.warn(`[WhatsApp Redundância] Iniciando fallback via E-mail para ${phone}`);
          await this.acionarRedundanciaEmail(phone, instanceName);
        }

        throw new Error(`Falha no envio via Evolution API: ${status || "Timeout"}`);
      }
    }
  }

  /**
   * Verifica se a instância está conectada e saudável
   */
  async checkInstanceStatus(instanceName) {
    try {
      const response = await axios.get(`${this.baseUrl}/instance/connectionState/${instanceName}`, {
        headers: { apikey: this.globalToken }
      });
      return response.data;
    } catch (e) {
      return { instance: { state: "disconnected" } };
    }
  }

  /**
   * Aciona E-mail com link do Public Chat caso o WhatsApp caia
   */
  async acionarRedundanciaEmail(telefone, instanceName) {
    try {
      const knex = require("../../database/db");
      const EmailService = require("../core/EmailService");
      const SessionService = require("../core/SessionService");
      
      const paciente = await knex("pacientes").where("telefone", telefone).first();
      if (!paciente || !paciente.email) {
        console.warn(`[WhatsApp Redundância] Paciente ${telefone} não possui e-mail cadastrado. Abortando fallback.`);
        return;
      }

      const unidade = await knex("unidades_atendimento").where("whatsapp_instance_name", instanceName).first();
      if (!unidade) return;

      const session = await SessionService.getOrCreateSession(telefone, unidade.id_unidade);
      const link = `${process.env.FRONTEND_URL || "http://localhost:5173"}/chat/${session.session_id}`;
      
      const msg = `Olá, ${paciente.nome}.\n\nNosso canal de atendimento via WhatsApp está passando por uma instabilidade momentânea.\n\nPara continuarmos seu atendimento sem interrupções, por favor acesse nosso Chat Público Seguro através do link abaixo:\n\n${link}\n\nAgradecemos a compreensão.\nEquipe ${unidade.nome_fantasia}`;

      await EmailService.sendEmail(paciente.email, `Continue seu atendimento - ${unidade.nome_fantasia}`, msg);
    } catch (err) {
      console.error("❌ [WhatsApp Redundância] Erro ao acionar fallback de e-mail:", err);
    }
  }
}

module.exports = new WhatsAppService();
