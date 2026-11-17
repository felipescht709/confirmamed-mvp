const axios = require("axios");
const PushService = require("../core/PushService");

class EvolutionHealth {
  constructor() {
    this.baseUrl = process.env.WHATSAPP_BASE_URL || "http://evolution:8080";
    this.intervalMs = 1 * 60 * 1000; // 1 minuto
    this.isDown = false;
  }

  start() {
    setInterval(() => this.ping(), this.intervalMs);
    console.log("🩺 [EvolutionHealth] Pinger iniciado (A cada 1 min).");
  }

  async ping() {
    try {
      await axios.get(`${this.baseUrl}/`, { timeout: 5000 });
      if (this.isDown) {
        console.log("✅ [EvolutionHealth] Evolution API voltou a responder!");
        // Opcional: Avisar todos os administradores que voltou
        this.isDown = false;
      }
    } catch (error) {
      if (!this.isDown) {
        console.error("🚨 [EvolutionHealth] Evolution API está FORA DO AR!");
        
        // Disparar PushNotification Global para todos os painéis abertos
        PushService.notifySystemWide(
          "🚨 Instabilidade WhatsApp",
          "A conexão com o motor do WhatsApp caiu. Os atendimentos entrarão em modo de contingência por E-mail."
        ).catch(() => {});

        this.isDown = true;
      }
    }
  }
}

module.exports = new EvolutionHealth();
