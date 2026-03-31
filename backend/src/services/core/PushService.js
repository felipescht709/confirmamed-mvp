// src/services/core/PushService.js
const admin = require("firebase-admin");
const knex = require("../../database/db");

// Inicialização Singleton segura (evita erro de app já inicializado no nodemon)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // O replace é vital porque o .env quebra as quebras de linha reais da private key
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const PushService = {
  /**
   * Dispara notificação para todos os usuários logados de uma unidade
   */
  async notifyUnidade(unidade_id, title, body, data = {}) {
    try {
      // Busca os tokens ativos da equipe daquela clínica
      const usuarios = await knex("usuarios_sistema")
        .where({ unidade_id })
        .whereNotNull("fcm_token")
        .select("fcm_token");

      const tokens = usuarios.map((u) => u.fcm_token);

      if (tokens.length === 0) return; // Ninguém online/com permissão ativa

      const message = {
        notification: { title, body },
        data: {
          click_action: "FLUTTER_NOTIFICATION_CLICK", // Padrão para PWA/Web
          ...data,
        },
        tokens,
      };

      const response = await admin.messaging().sendMulticast(message);
      
      console.log(`[FCM] Notificações para Unidade ${unidade_id}: ${response.successCount} sucesso, ${response.failureCount} falhas.`);
      
      // Opcional: Tratar tokens expirados (response.responses[i].error) e dar UPDATE para null no banco.
    } catch (error) {
      console.error("❌ [PushService Error]:", error);
    }
  }
};

module.exports = PushService;