// src/services/ia/security/PIIMasker.js
const crypto = require("crypto");
const Redis = require("ioredis"); // ou o client redis que você já usa ('redis' v4)

// Configuração do Redis (Idealmente puxar de process.env.REDIS_URL)
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

class PIIMasker {
  constructor() {
    this.TTL_SECONDS = 3600; // 1 hora de retenção (LGPD: Direito ao Esquecimento)
  }

  /**
   * Mascara dados sensíveis e armazena os tokens no Redis
   * @returns {Promise<string>} Texto mascarado
   */
  async mask(text, sessionId) {
    if (!text || typeof text !== "string") return text;
    if (!sessionId)
      throw new Error("sessionId é obrigatório para tokenização segura.");

    const sessionTokens = {};
    let masked = text;

    // 1. Mascara CPF
    masked = masked.replace(/(?:\d{3}[.\s]?){2}\d{3}[-\s]?\d{2}/g, (match) => {
      const cleanCpf = match.replace(/\D/g, "");
      if (cleanCpf.length !== 11) return match;

      const token = `[TOKEN_CPF_${crypto.randomBytes(3).toString("hex").toUpperCase()}]`;
      sessionTokens[token] = cleanCpf;
      return token;
    });

    // 2. Mascara Cartão do SUS (CNS)
    masked = masked.replace(
      /\b\d{3}[\s.-]?\d{4}[\s.-]?\d{4}[\s.-]?\d{4}\b/g,
      (match) => {
        const cleanSus = match.replace(/\D/g, "");
        if (cleanSus.length !== 15) return match;

        const token = `[TOKEN_SUS_${crypto.randomBytes(3).toString("hex").toUpperCase()}]`;
        sessionTokens[token] = cleanSus;
        return token;
      },
    );

    // 3. Mascara E-mail
    masked = masked.replace(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      (match) => {
        const token = `[TOKEN_EMAIL_${crypto.randomBytes(3).toString("hex").toUpperCase()}]`;
        sessionTokens[token] = match;
        return token;
      },
    );

    // Se gerou algum token, salva no Redis em batch (Hash Set)
    if (Object.keys(sessionTokens).length > 0) {
      const redisKey = `pii_vault:${sessionId}`;

      try {
        await redis.hmset(redisKey, sessionTokens);
        // Renova o TTL a cada nova interação da sessão
        await redis.expire(redisKey, this.TTL_SECONDS);
      } catch (err) {
        console.error(`[SecError] Falha ao salvar tokens PII no Redis:`, err);
        // Em aplicações de saúde, fail-safe é não seguir se não puder mascarar
        throw new Error(
          "Erro interno de segurança. Não foi possível tokenizar PII.",
        );
      }
    }

    return masked;
  }

  /**
   * Busca no Redis os valores reais e desfaz a máscara
   * @returns {Promise<string>} Texto original restaurado
   */
  async unmask(text, sessionId) {
    if (!text || typeof text !== "string") return text;

    const redisKey = `pii_vault:${sessionId}`;

    try {
      // Busca todos os tokens salvos para esta sessão
      const sessionTokens = await redis.hgetall(redisKey);

      if (!sessionTokens || Object.keys(sessionTokens).length === 0) {
        return text; // Sessão expirou ou sem tokens
      }

      // Renova o TTL (o usuário ainda está ativo no fluxo)
      await redis.expire(redisKey, this.TTL_SECONDS);

      let unmasked = text;
      // Substitui os tokens pelos dados reais
      for (const [token, realValue] of Object.entries(sessionTokens)) {
        unmasked = unmasked.split(token).join(realValue);
      }

      return unmasked;
    } catch (err) {
      console.error(`[SecError] Falha ao recuperar tokens PII do Redis:`, err);
      return text; // Se o Redis falhar no unmask, repassa com token para estourar erro previsível na Tool
    }
  }
}

module.exports = new PIIMasker();
