const knex = require("../database/db.js");
const axios = require("axios");
const orchestrator = require("../services/ia/AIOrchestrator");
const whatsappService = require("../services/whatsapp/whatsappService");
const SessionService = require("../services/core/SessionService");
const RedisService = require("../services/core/RedisService"); // A9: Buffer Redis

// A9: Chave de prefixo para buffer de mensagens no Redis
const BUFFER_PREFIX = "wa:buffer:"; // wa:buffer:<telefone>
const LOCK_PREFIX = "wa:lock:"; // wa:lock:<telefone>
const BUFFER_TTL = 30; // segundos (TTL máximo do buffer)
const DEBOUNCE_MS = 3000; // milissegundos de espera após última mensagem

/**
 * WEBHOOK: Recebe mensagens do WhatsApp via Evolution API
 */
const receiveMessage = async (req, res) => {
  const payload = req.body;

  // LOG DE DEBUG PARA IDENTIFICAR ESTRUTURA V2
  console.log(
    "📩 [WEBHOOK RECEIVED] Instance:",
    payload.instance,
    "Body keys:",
    Object.keys(payload),
  );
  if (payload.data)
    console.log(
      "📦 [DATA] Event:",
      payload.event,
      "Data structure:",
      Object.keys(payload.data),
    );

  // Normalização de dados (Evolution v2 pode vir como objeto ou array em data)
  const data = Array.isArray(payload.data) ? payload.data[0] : payload.data;

  const from = data?.key?.remoteJid || payload.phone || payload.sender;
  const instanceName = payload.instance;
  const fromMe = data?.key?.fromMe;

  // Extração de texto mais robusta
  let text =
    data?.message?.conversation ||
    data?.message?.extendedTextMessage?.text ||
    payload.text ||
    payload.content;

  // 🎙️ SUPORTE A ÁUDIO: Se for um audioMessage, transcrevemos antes de seguir
  const audioMessage = data?.message?.audioMessage;
  if (audioMessage && !text) {
    try {
      console.log(
        `🎙️ [WhatsApp] Áudio detectado de ${from}. Instance: ${instanceName}`,
      );

      const EVOLUTION_URL =
        process.env.WHATSAPP_BASE_URL || "http://evolution:8080";
      const mediaRes = await axios.post(
        `${EVOLUTION_URL}/chat/getBase64FromMediaMessage/${instanceName}`,
        {
          message: data,
        },
        {
          headers: { apikey: process.env.AUTHENTICATION_API_KEY || "admin123" },
        },
      );

      const base64Data = mediaRes.data?.base64;
      if (base64Data) {
        const audioBuffer = Buffer.from(base64Data, "base64");
        text = await orchestrator.transcribeAudio(audioBuffer);
        console.log(`📝 [Whisper] Transcrição concluída: "${text}"`);
      } else {
        console.warn(
          "⚠️ [WhatsApp] Falha ao obter base64 do áudio. Resposta evolution:",
          mediaRes.data,
        );
      }
    } catch (err) {
      console.error(
        "❌ Erro ao processar áudio:",
        err.response?.data || err.message,
      );
    }
  }

  // Ignora mensagens vazias, de status ou enviadas pelo próprio bot
  if (!from || !text || !instanceName || fromMe) {
    if (fromMe) return res.status(200).send("SKIP_LOGIC"); // Silencioso para mensagens próprias

    // Log apenas para eventos que deveriam ter conteúdo (upsert)
    if (payload.event === "messages.upsert") {
      console.log("⚠️ [SKIP] Mensagem sem conteúdo processável:", {
        from,
        event: payload.event,
        hasAudio: !!audioMessage,
      });
    }
    return res.status(200).send("SKIP_LOGIC");
  }

  try {
    // 1. Localiza a unidade pela instância cadastrada no banco
    const unidade = await knex("unidades_atendimento")
      .where("whatsapp_instance_name", instanceName)
      .first();

    if (!unidade) return res.status(200).send("INSTANCE_NOT_MAPPED");

    // A9: Buffer Redis — acumula texto e agenda processamento com debounce
    const bufferKey = `${BUFFER_PREFIX}${from}`;
    const lockKey = `${LOCK_PREFIX}${from}`;

    await RedisService.appendToBuffer(bufferKey, text, BUFFER_TTL);

    // Responde o webhook imediatamente (Evolution API não tolera timeout)
    res.status(200).send("QUEUED");

    // Aguarda o debounce antes de processar
    await new Promise((r) => setTimeout(r, DEBOUNCE_MS));

    // Garante que apenas 1 worker processa por vez (lock distribuído)
    const gotLock = await RedisService.acquireLock(lockKey, 60);
    if (!gotLock) {
      // Outro processo já está cuidando desta fila — nada a fazer
      return;
    }

    try {
      const fullText = await RedisService.consumeBuffer(bufferKey);
      if (!fullText || !fullText.trim()) {
        // Buffer já foi consumido por outro worker
        return;
      }

      const unidadeId = unidade.id_unidade;
      console.log(
        `🚀 [AI CORE] Processando bloco de ${from}: "${fullText.trim()}"`,
      );

      // 3. Sessão
      await SessionService.getOrCreateSession(from, unidadeId);

      // 4. Delegação para a nova FSM (LangGraph)
      let response = await orchestrator.processMessage(
        from,
        unidadeId,
        fullText.trim(),
      );

      // Se a IA retornou null, significa que estamos em TRANSBORDO ou a LGPD não foi aceita
      if (!response) {
        console.log(
          `⏸️ [AI CORE] Sessão ${from} em Transbordo ou sem LGPD. Nenhuma mensagem gerada.`,
        );
        return;
      }

      // 🛡️ Fallback amigável se IA retornar vazio
      let finalText = typeof response === "string" ? response.trim() : "";

      if (!finalText) {
        console.warn(
          `⚠️ [AI CORE] Resposta vazia para ${from}. Enviando fallback.`,
        );
        finalText =
          "Desculpe, tive uma instabilidade momentânea. Poderia repetir o que você precisa?";
      }

      // Envia a resposta final gerada pelo LangGraph ao WhatsApp
      await whatsappService.sendTextMessage(from, finalText, instanceName);
    } finally {
      await RedisService.releaseLock(lockKey);
    }
  } catch (error) {
    console.error("❌ Erro Webhook:", error.message);
    // Não retorna 500 para o Evolution API — já respondemos 200 acima
  }
};

/**
 * FRONTEND: Gera o QR Code ou Pairing Code para conexão
 */
const connectInstance = async (req, res) => {
  const { id_unidade } = req.body;
  const targetUnidade = id_unidade || req.usuario?.unidade_id;
  const EVOLUTION_URL =
    process.env.WHATSAPP_BASE_URL || "http://evolution:8080";
  const headers = { apikey: process.env.AUTHENTICATION_API_KEY || "admin123" };

  if (!targetUnidade)
    return res.status(400).json({ error: "Unidade não identificada." });

  const instanceName = `clinica_${targetUnidade}`;

  try {
    // 1. Verificar Estado Atual
    let state = "none";
    try {
      const check = await axios.get(
        `${EVOLUTION_URL}/instance/connectionState/${instanceName}`,
        { headers },
      );
      state = check.data?.instance?.state || "disconnected";
    } catch (e) {
      state = "not_found";
    }

    console.log(`[WhatsApp] Estado da instância ${instanceName}: ${state}`);

    // 2. Ação baseada no estado
    if (state === "open") {
      return res.json({ message: "Conectado", state: "open" });
    }

    // Se solicitado force delete ou se estiver em estado inconsistente
    if (req.query.force === "true" && state !== "not_found") {
      console.log(
        `[WhatsApp] Deletando instância ${instanceName} para recriação limpa...`,
      );
      await axios.delete(`${EVOLUTION_URL}/instance/delete/${instanceName}`, {
        headers,
      });
      state = "not_found";
      await new Promise((r) => setTimeout(r, 1000));
    }

    // 3. Criar apenas se não existir
    if (state === "not_found") {
      console.log(`[WhatsApp] Criando nova instância: ${instanceName}`);
      await axios.post(
        `${EVOLUTION_URL}/instance/create`,
        {
          instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
          token: headers.apikey,
        },
        { headers },
      );
    }

    // 4. Capturar QR Code ou Pairing Code
    let qrcode = null;
    for (let i = 0; i < 12; i++) {
      console.log(
        `[WhatsApp] Tentativa ${i + 1}/12 de capturar código para ${instanceName}...`,
      );

      const connectRes = await axios.get(
        `${EVOLUTION_URL}/instance/connect/${instanceName}`,
        { headers },
      );

      if (
        connectRes.data?.instance?.state === "open" ||
        connectRes.data?.state === "open"
      ) {
        return res.json({ message: "Conectado", state: "open" });
      }

      qrcode = connectRes.data?.base64 || connectRes.data?.code; // Tenta QR (base64) ou Pairing (code)

      if (qrcode && qrcode !== "pair") {
        // Mapeia a unidade para a instância no BD
        await knex("unidades_atendimento")
          .where("id_unidade", targetUnidade)
          .update({ whatsapp_instance_name: instanceName });

        return res.json({ qrcode, instanceName });
      }

      await new Promise((r) => setTimeout(r, 3000));
    }

    return res
      .status(502)
      .json({
        error:
          "O motor está demorando a responder. Tente novamente em instantes.",
      });
  } catch (error) {
    console.error(
      "❌ [WhatsApp Controller] Erro:",
      error.response?.data || error.message,
    );
    return res
      .status(500)
      .json({ error: "Erro na comunicação com Evolution API." });
  }
};

/**
 * Retorna o status de conexão da instância do WhatsApp
 */
const getInstanceStatus = async (req, res) => {
  const targetUnidade = req.usuario?.unidade_id;
  const EVOLUTION_URL = process.env.WHATSAPP_BASE_URL || "http://evolution:8080";
  const headers = { apikey: process.env.AUTHENTICATION_API_KEY || "admin123" };
  const knex = require("../database/db");

  if (!targetUnidade) {
    return res.status(400).json({ error: "Unidade não identificada." });
  }

  const instanceName = `clinica_${targetUnidade}`;

  try {
    const check = await axios.get(
      `${EVOLUTION_URL}/instance/connectionState/${instanceName}`,
      { headers }
    );
    const state = check.data?.instance?.state || "disconnected";
    
    let connectedPhone = null;
    if (state === "open") {
      connectedPhone = check.data?.instance?.number || check.data?.instance?.ownerJid || null;
      if (connectedPhone && connectedPhone.includes("@")) {
        connectedPhone = connectedPhone.split("@")[0];
      }
    }

    return res.json({ 
      instanceName, 
      state, 
      connected: state === "open",
      phone: connectedPhone
    });
  } catch (error) {
    if (error.response?.status === 404) {
      return res.json({ 
        instanceName, 
        state: "not_found", 
        connected: false,
        phone: null
      });
    }
    console.error("Erro ao verificar status da instância:", error.message);
    return res.json({ 
      instanceName, 
      state: "error", 
      connected: false,
      phone: null
    });
  }
};

/**
 * Desconecta a instância do WhatsApp (logout ou delete) e zera o BD
 */
const disconnectInstance = async (req, res) => {
  const targetUnidade = req.usuario?.unidade_id;
  const EVOLUTION_URL = process.env.WHATSAPP_BASE_URL || "http://evolution:8080";
  const headers = { apikey: process.env.AUTHENTICATION_API_KEY || "admin123" };
  const knex = require("../database/db");

  if (!targetUnidade) {
    return res.status(400).json({ error: "Unidade não identificada." });
  }

  const instanceName = `clinica_${targetUnidade}`;

  try {
    console.log(`[WhatsApp] Desconectando sessão para ${instanceName}...`);
    try {
      await axios.post(
        `${EVOLUTION_URL}/instance/logout/${instanceName}`,
        {},
        { headers }
      );
      console.log(`[WhatsApp] Sessão da instância ${instanceName} desconectada via logout.`);
    } catch (logoutError) {
      console.warn(`[WhatsApp] Logout falhou, deletando instância para limpar:`, logoutError.message);
      await axios.delete(`${EVOLUTION_URL}/instance/delete/${instanceName}`, {
        headers,
      });
      console.log(`[WhatsApp] Instância ${instanceName} deletada com sucesso.`);
    }

    await knex("unidades_atendimento")
      .where("id_unidade", targetUnidade)
      .update({ whatsapp_instance_name: null });

    return res.json({ success: true, message: "Instância desconectada com sucesso." });
  } catch (error) {
    console.error("Erro ao desconectar instância:", error.response?.data || error.message);
    return res.status(500).json({ error: "Erro ao desconectar instância do WhatsApp." });
  }
};

module.exports = { receiveMessage, connectInstance, getInstanceStatus, disconnectInstance };
