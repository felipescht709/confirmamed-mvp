// src/services/ia/security/PIIMasker.js
const crypto = require("crypto");

class PIIMasker {
  constructor() {
    this.vault = {};
    this.TTL_MS = 1000 * 60 * 60; // 1 hora de retenção na memória
    
    // Inicia a rotina de limpeza para evitar Memory Leak
    // Roda a cada 30 minutos em background
    setInterval(() => this._cleanup(), 1000 * 60 * 30);
  }

  /**
   * Mascara dados sensíveis e armazena na memória da sessão
   */
  mask(text, sessionId) {
    if (!text || typeof text !== "string") return "";
    if (!sessionId) throw new Error("sessionId é obrigatório para tokenização segura.");

    // Inicializa o cofre da sessão se não existir
    if (!this.vault[sessionId]) {
      this.vault[sessionId] = { data: {}, lastAccess: Date.now() };
    } else {
      this.vault[sessionId].lastAccess = Date.now(); // Atualiza o TTL
    }

    let masked = text;

    // 1. Mascara CPF (Mapeia apenas números)
    masked = masked.replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, (match) => {
      // Uso de bytes aleatórios evita colisão no mesmo milissegundo
      const token = `[TOKEN_CPF_${crypto.randomBytes(3).toString("hex").toUpperCase()}]`;
      this.vault[sessionId].data[token] = match.replace(/\D/g, ""); // Salva limpo
      return token;
    });

    // 2. Opcional MVP: Mascara Email e Telefone sem tokenizar (Descarte)
    // Se a IA não precisar do e-mail no banco, não gaste memória guardando
    masked = masked.replace(/\b[\w\.-]+@[\w\.-]+\.\w{2,4}\b/g, "[EMAIL_REDACTED]");

    return masked;
  }

  /**
   * Desfaz a máscara para as Tools usarem no Backend (Knex)
   */
  unmask(token, sessionId) {
    if (!this.vault[sessionId]) return token; // Se a sessão expirou, retorna o próprio texto
    
    this.vault[sessionId].lastAccess = Date.now();
    return this.vault[sessionId].data[token] || token;
  }

  /**
   * Garbage Collector: Limpa dados de sessões inativas (LGPD: Direito ao Esquecimento)
   */
  _cleanup() {
    const agora = Date.now();
    for (const session in this.vault) {
      if (agora - this.vault[session].lastAccess > this.TTL_MS) {
        delete this.vault[session];
      }
    }
  }
}

// Exporta como instância única
module.exports = new PIIMasker();