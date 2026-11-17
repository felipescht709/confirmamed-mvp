// src/services/core/RedisService.js
// A9 — Buffer de mensagens WhatsApp via Redis (multi-pod safe)
const Redis = require("ioredis");

let client = null;

function getClient() {
  if (client) return client;

  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  const redisPassword = process.env.REDIS_PASSWORD || null;

  client = new Redis(redisUrl, {
    password: redisPassword || undefined,
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 5) {
        console.error("❌ [Redis] Falha persistente na conexão. Desistindo.");
        return null; // Para de tentar
      }
      return Math.min(times * 200, 2000); // Back-off exponencial
    },
  });

  client.on("connect", () => console.log("✅ [Redis] Conectado com sucesso."));
  client.on("error", (err) => console.error("❌ [Redis] Erro:", err.message));

  return client;
}

const RedisService = {
  /**
   * Acumula texto de mensagem no buffer do usuário.
   * TTL padrão de 30s (tempo máximo de acumulação).
   */
  async appendToBuffer(key, text, ttlSeconds = 30) {
    const redis = getClient();
    const current = await redis.get(key);
    const accumulated = current ? `${current} ${text}` : text;
    await redis.setex(key, ttlSeconds, accumulated);
    return accumulated;
  },

  /**
   * Lê e remove atomicamente o buffer (consume o buffer).
   */
  async consumeBuffer(key) {
    const redis = getClient();
    const [value] = await redis.multi().get(key).del(key).exec();
    return value?.[1] || null; // Retorna o valor antes do del
  },

  /**
   * Lê o buffer sem remover (para checagem).
   */
  async getBuffer(key) {
    const redis = getClient();
    return redis.get(key);
  },

  /**
   * Armazena um valor genérico com TTL.
   */
  async set(key, value, ttlSeconds = 3600) {
    const redis = getClient();
    return redis.setex(key, ttlSeconds, typeof value === "string" ? value : JSON.stringify(value));
  },

  /**
   * Lê um valor genérico.
   */
  async get(key) {
    const redis = getClient();
    const val = await redis.get(key);
    try { return JSON.parse(val); } catch { return val; }
  },

  /**
   * Remove uma chave.
   */
  async del(key) {
    const redis = getClient();
    return redis.del(key);
  },

  /**
   * Verifica se uma chave existe.
   */
  async exists(key) {
    const redis = getClient();
    return redis.exists(key);
  },

  /**
   * Acquire/Release de lock distribuído (mutex simples para debounce).
   * Retorna true se adquiriu o lock, false se já existe.
   */
  async acquireLock(key, ttlSeconds = 5) {
    const redis = getClient();
    // NX = só seta se não existir (atômico)
    const result = await redis.set(key, "1", "EX", ttlSeconds, "NX");
    return result === "OK";
  },

  async releaseLock(key) {
    const redis = getClient();
    return redis.del(key);
  },

  getClient,
};

module.exports = RedisService;
