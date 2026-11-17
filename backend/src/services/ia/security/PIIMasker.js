// src/services/ia/security/PIIMasker.js
// LGPD Art. 46 + ISO 42001 — Tokenização de PII antes de enviar a terceiros (OpenAI/Gemini)
//
// FIX: Usa o RedisService compartilhado (com autenticação) em vez de uma
// conexão própria sem senha, que fazia o unmask falhar silenciosamente.

const crypto = require("crypto");
const RedisService = require("../../core/RedisService");

class PIIMasker {
  constructor() {
    this.TTL_SECONDS = 3600; // 1 hora de retenção (LGPD: Direito ao Esquecimento)
  }

  /**
   * Normaliza o sessionId para remover sufixos do WhatsApp JID
   * ex: "554988495029@s.whatsapp.net" → "554988495029"
   * Garante chave consistente entre mask() e unmask()
   */
  _normalizeSessionId(sessionId) {
    if (!sessionId || typeof sessionId !== "string") return sessionId;
    return sessionId.replace(/@s\.whatsapp\.net$/, "").replace(/@.*$/, "");
  }

  /**
   * Mascara dados sensíveis e armazena os tokens no Redis
   * @param {string} text - Texto do usuário a ser mascarado
   * @param {string} sessionId - ID da sessão (telefone, UUID, etc.)
   * @returns {Promise<string>} Texto mascarado com tokens
   */
  async mask(text, sessionId) {
    if (!text || typeof text !== "string") return text;
    if (!sessionId)
      throw new Error("sessionId é obrigatório para tokenização segura.");

    const sid = this._normalizeSessionId(sessionId);
    const redisKey = `pii_vault:${sid}`;
    const sessionTokens = {};
    let masked = text;

    // 1. Mascara CPF (formatos: 097.736.319-82, 09773631982, 097 736 319 82, 097.736.319 82)
    const cpfRegex = /\b\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2}\b/g;
    masked = masked.replace(cpfRegex, (match) => {
      const cleanCpf = match.replace(/\D/g, "");
      if (cleanCpf.length !== 11) return match; // Não é CPF válido, não mascara

      const token = `[PII_TOKEN_CPF_${crypto.randomBytes(3).toString("hex").toUpperCase()}]`;
      sessionTokens[token] = cleanCpf;
      return token;
    });

    // 2. Mascara Cartão do SUS (CNS) — 15 dígitos
    masked = masked.replace(
      /\b\d{3}[\s.-]?\d{4}[\s.-]?\d{4}[\s.-]?\d{4}\b/g,
      (match) => {
        const cleanSus = match.replace(/\D/g, "");
        if (cleanSus.length !== 15) return match;

        const token = `[PII_TOKEN_SUS_${crypto.randomBytes(3).toString("hex").toUpperCase()}]`;
        sessionTokens[token] = cleanSus;
        return token;
      }
    );

    // 3. Mascara E-mail
    masked = masked.replace(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      (match) => {
        const token = `[TOKEN_EMAIL_${crypto.randomBytes(3).toString("hex").toUpperCase()}]`;
        sessionTokens[token] = match;
        return token;
      }
    );

    // Persiste tokens no Redis usando o cliente compartilhado (com autenticação)
    if (Object.keys(sessionTokens).length > 0) {
      try {
        const redis = RedisService.getClient();
        await redis.hmset(redisKey, sessionTokens);
        await redis.expire(redisKey, this.TTL_SECONDS);
        console.log(`[PIIMasker] ${Object.keys(sessionTokens).length} token(s) PII salvos para sessão ${sid}`);
      } catch (err) {
        console.error(`[SecError] Falha ao salvar tokens PII no Redis:`, err.message);
        // Fail-safe: em saúde, não podemos enviar PII para terceiros se falhar a tokenização
        throw new Error("Erro interno de segurança: não foi possível tokenizar PII.");
      }
    }

    return masked;
  }

  /**
   * Busca no Redis os valores reais e desfaz a máscara
   * @param {string} text - Texto com tokens (ex: "[TOKEN_CPF_A1B2C3]" ou "TOKEN_CPF_A1B2C3")
   * @param {string} sessionId - ID da sessão para lookup no Redis
   * @returns {Promise<string>} Texto com PII real restaurada
   */
  async unmask(text, sessionId) {
    if (!text || typeof text !== "string") return text;

    const sid = this._normalizeSessionId(sessionId);
    const redisKey = `pii_vault:${sid}`;

    try {
      const redis = RedisService.getClient();
      const sessionTokens = await redis.hgetall(redisKey);

      if (!sessionTokens || Object.keys(sessionTokens).length === 0) {
        console.warn(`[PIIMasker] Vault vazio para sessão "${sid}".`);
        return text; 
      }

      let unmasked = text;
      
      // Ordena tokens por tamanho (maiores primeiro) para evitar substituição parcial
      const sortedTokens = Object.entries(sessionTokens).sort((a, b) => b[0].length - a[0].length);

      for (const [token, realValue] of sortedTokens) {
        const rawToken = token.replace("[", "").replace("]", "");
        
        // Tenta substituir variações: [PII_TOKEN_...] , PII_TOKEN_...
        unmasked = unmasked.split(token).join(realValue); 
        unmasked = unmasked.split(rawToken).join(realValue); 
      }

      return unmasked;
    } catch (err) {
      console.error(`[SecError] Falha unmask:`, err.message);
      return text;
    }
  }

  /**
   * Remove todos os tokens PII da sessão (LGPD: Direito ao Esquecimento)
   * Chamar no encerramento da sessão ou após 1h de inatividade (TTL automático)
   */
  async purge(sessionId) {
    const sid = this._normalizeSessionId(sessionId);
    try {
      const redis = RedisService.getClient();
      await redis.del(`pii_vault:${sid}`);
      console.log(`[PIIMasker] Vault PII purgado para sessão ${sid}`);
    } catch (err) {
      console.error(`[SecError] Falha ao purgar vault PII:`, err.message);
    }
  }
}

module.exports = new PIIMasker();
