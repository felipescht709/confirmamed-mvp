const knex = require("../database/db.js");
const axios = require("axios");
const AIOrchestrator = require("../services/ia/AIOrchestrator");
const whatsappService = require("../services/whatsapp/whatsappService");

const orchestrator = new AIOrchestrator();

// Buffer de mensagens para evitar que a IA responda "picado"
const messageQueues = {};

/**
 * WEBHOOK: Recebe mensagens do WhatsApp via Evolution API
 */
const receiveMessage = async (req, res) => {
  const payload = req.body;

  // Normalização de dados (Evolution v2)
  const from = payload.data?.key?.remoteJid || payload.phone || payload.sender;
  const text =
    payload.data?.message?.conversation || payload.text || payload.content;
  const instanceName = payload.instance;

  // Ignora mensagens vazias ou de status
  if (!from || !text || !instanceName) {
    return res.status(200).send("SKIP_EMPTY");
  }

  try {
    // 1. Localiza a unidade pela instância cadastrada no banco
    const unidade = await knex("unidades_atendimento")
      .where("whatsapp_instance_name", instanceName)
      .first();

    if (!unidade) return res.status(200).send("INSTANCE_NOT_MAPPED");

    // 2. Lógica de Buffer (Debounce de 15 segundos)
    // Se for a primeira mensagem, cria o objeto de buffer
    if (!messageQueues[from]) {
      messageQueues[from] = { text: "", timer: null };
    }

    // Acumula o texto (caso o paciente mande várias mensagens picadas)
    messageQueues[from].text += ` ${text}`;

    // Reseta o cronômetro a cada nova mensagem
    if (messageQueues[from].timer) clearTimeout(messageQueues[from].timer);

    messageQueues[from].timer = setTimeout(async () => {
      const fullText = messageQueues[from].text.trim();
      const unidadeId = unidade.id_unidade;
      delete messageQueues[from]; // Limpa o buffer antes de processar

      console.log(`🚀 [AI CORE] Processando bloco de ${from}: "${fullText}"`);

      // 3. Chamada ao Orquestrador de IA
      const response = await orchestrator.processMessage(
        { body: fullText, history: [] },
        unidadeId,
        from,
      );

      // 4. Envia resposta se não estiver em modo de transbordo humano
      if (response && response.text !== "MODO_HUMANO_ATIVO") {
        await whatsappService.sendMessage(from, response.text, instanceName);
      }
    }, 15000);

    return res.status(200).send("QUEUED");
  } catch (error) {
    console.error("❌ Erro Webhook:", error.message);
    return res.status(200).send("ERROR_LOGGED");
  }
};

/**
 * FRONTEND: Gera o QR Code para conexão
 */
const connectInstance = async (req, res) => {
  try {
    const { id_unidade } = req.body;
    const targetUnidade = id_unidade || req.usuario?.unidade_id;

    if (!targetUnidade) return res.status(400).json({ error: "Unidade não identificada." });

    const instanceName = `clinica_${targetUnidade}`;
    const EVOLUTION_URL = process.env.WHATSAPP_BASE_URL || "http://evolution:8080";
    const headers = {
      apikey: process.env.AUTHENTICATION_API_KEY || "admin123"
    };

    // 1. Force Delete (Se solicitado)
    if (req.query.force === "true") {
      try {
        await axios.delete(`${EVOLUTION_URL}/instance/delete/${instanceName}`, { headers });
        await new Promise(r => setTimeout(r, 2000)); 
      } catch (e) { /* ignore */ }
    }

    // 2. Tentar Criar a Instância (Payload Corrigido para v2)
    let qrcode = null;
    try {
      const createRes = await axios.post(
        `${EVOLUTION_URL}/instance/create`,
        { 
          instanceName, 
          qrcode: true, 
          integration: "whatsapp-baileys",
          token: headers.apikey // Recomendado manter o token da instância igual à global no início
        },
        { headers }
      );
      
      // Na v2, o QR pode vir em caminhos diferentes dependendo da config
      qrcode = createRes.data?.qrcode?.base64 || createRes.data?.base64;
    } catch (e) {
      // Se der 403/400 é porque já existe, seguimos para o connect
      console.log(`[WhatsApp] Instância ${instanceName} já existe ou erro de validação. Tentando conectar...`);
    }

    // 3. Loop de Recuperação (Se a criação não trouxe o QR)
    if (!qrcode) {
      // Reduzi o delay de 40s para 3s. 40s derruba sua requisição HTTP por timeout!
      for (let i = 0; i < 5; i++) { 
        console.log(`[WhatsApp] Tentativa ${i + 1} de capturar QR Code via /connect...`);
        
        const connectRes = await axios.get(`${EVOLUTION_URL}/instance/connect/${instanceName}`, { headers });
        
        // Se já conectou, avisa o front
        if (connectRes.data?.instance?.state === "open" || connectRes.data?.state === "open") {
           return res.json({ message: "Conectado", state: "open" });
        }

        qrcode = connectRes.data?.base64 || connectRes.data?.qrcode?.base64 || connectRes.data?.code;
        
        if (qrcode && qrcode !== "pair") break;
        await new Promise(r => setTimeout(r, 3000)); // Espera 3s entre tentativas
      }
    }

    // 4. Finalização
    if (qrcode) {
      await knex("unidades_atendimento")
        .where("id_unidade", targetUnidade)
        .update({ whatsapp_instance_name: instanceName });

      return res.json({ qrcode });
    }

    return res.status(502).json({ error: "Não foi possível gerar o QR Code. Verifique o log da Evolution." });

  } catch (error) {
    console.error("❌ Erro Fatal:", error.response?.data || error.message);
    return res.status(500).json({ error: "Erro na comunicação com Evolution API." });
  }
};

module.exports = { receiveMessage, connectInstance };
