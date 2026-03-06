// src/controllers/whatsappController.js
const knex = require("../database/db.js");
const axios = require("axios");
const AIOrchestrator = require("../services/ia/AIOrchestrator");
const whatsappService = require("../services/whatsapp/whatsappService"); // Ajuste o caminho conforme sua estrutura

const orchestrator = new AIOrchestrator();

// Objeto em memória para gerenciar o buffer de mensagens por telefone
// Em produção com múltiplas instâncias, o ideal seria usar Redis.
const messageQueues = {};

const receiveMessage = async (req, res) => {
  const payload = req.body;

  // Extração de dados padrão Z-API / Evolution
  const messageId = payload.id || payload.messageId;
  const from = payload.phone || payload.sender || payload.from;
  const text = payload.text?.message || payload.body || payload.content;
  const unidadeId = payload.unidadeId || 1; // Default para unidade 1

  if (!from || !text) {
    return res.status(200).send("EMPTY_MESSAGE");
  }

  try {
    // 1. Auditoria e Idempotência (Mantendo sua lógica original)
    await knex("WEBHOOK_EVENTS")
      .insert({
        message_id: messageId,
        payload: JSON.stringify(payload),
        status: "RECEIVED",
      })
      .onConflict("message_id")
      .ignore();

    // 2. LÓGICA DE DEBOUNCE (ACUMULADOR)
    if (!messageQueues[from]) {
      messageQueues[from] = {
        text: text,
        timer: null,
        unidadeId: unidadeId,
      };
    } else {
      // Concatena com um espaço para manter a semântica
      messageQueues[from].text += " " + text;
    }

    // 3. Reinicia o cronômetro sempre que uma nova mensagem chega
    if (messageQueues[from].timer) {
      clearTimeout(messageQueues[from].timer);
    }

    console.log(
      `📩 [Whatsapp] Mensagem de ${from} acumulada. Aguardando silêncio de 20s...`,
    );

    messageQueues[from].timer = setTimeout(async () => {
      const context = messageQueues[from];
      const fullText = context.text;

      // Limpa a fila antes de processar para evitar condições de corrida
      delete messageQueues[from];

      console.log(
        `🚀 [AI CORE] Processando bloco de mensagens de ${from}: "${fullText}"`,
      );

      try {
        // 4. Chamada ao Orquestrador de IA
        const response = await orchestrator.processMessage(
          { body: fullText, history: [] }, // O history é recuperado pela sessão dentro do orquestrador
          context.unidadeId,
          from,
        );

        // 5. Envio da resposta única via Z-API
        await whatsappService.sendMessage(from, response.text);

        // Atualiza status do evento no banco
        await knex("WEBHOOK_EVENTS")
          .where({ message_id: messageId })
          .update({ status: "PROCESSED" });
      } catch (aiError) {
        console.error(`[AI Processing Error] Telefone: ${from}`, aiError);
      }
    }, 20000); // 20 segundos de espera

    return res.status(200).send("EVENT_QUEUED");
  } catch (error) {
    console.error(`[Webhook Error] ID: ${messageId}`, error);
    return res.status(200).send("ERROR_LOGGED");
  }
};

const connectInstance = async (req, res) => {
  try {
    const { id_unidade } = req.body;
    if (!id_unidade)
      return res.status(400).json({ error: "id_unidade é obrigatório" });

    const instanceName = `clinica_${id_unidade}`;
    const EVOLUTION_URL =
      process.env.EVOLUTION_URL || "http://evolution_api:8080";
    const GLOBAL_TOKEN = process.env.AUTHENTICATION_API_KEY || "admin123";

    const headers = {
      apikey: GLOBAL_TOKEN,
      "Content-Type": "application/json",
    };
    let qrCodeBase64 = null;

    // 1. VERIFICA O ESTADO DA INSTÂNCIA
    try {
      const stateRes = await axios.get(
        `${EVOLUTION_URL}/instance/connectionState/${instanceName}`,
        { headers },
      );
      const state = stateRes.data?.instance?.state;

      if (state === "open") {
        return res.status(400).json({
          error: "O WhatsApp desta clínica já está conectado e online!",
        });
      }
      console.log(
        `[WhatsApp] Instância já existe (Estado: ${state}). Buscando QR Code...`,
      );
    } catch (error) {
      // Se deu 404, a instância não existe. Vamos criar!
      if (error.response?.status === 404) {
        console.log(
          `[WhatsApp] Instância não existe. Criando ${instanceName}...`,
        );
        await axios.post(
          `${EVOLUTION_URL}/instance/create`,
          {
            instanceName: instanceName,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS",
          },
          { headers },
        );
      } else {
        throw error; // Se for outro erro de rede, joga pro catch final
      }
    }

    // 2. BUSCA O QR CODE EXPLICITAMENTE (A Rota garantida da EvolutionAPI)
    // Damos um pequeno delay (1 segundo) caso ela tenha acabado de ser criada para dar tempo do Baileys gerar o QR Code
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const connectRes = await axios.get(
      `${EVOLUTION_URL}/instance/connect/${instanceName}`,
      { headers },
    );

    // A Evolution V2 costuma devolver direto no 'base64'
    qrCodeBase64 = connectRes.data?.base64 || connectRes.data?.qrcode?.base64;

    if (!qrCodeBase64) {
      return res.status(502).json({
        error:
          "A instância foi criada, mas a EvolutionAPI não retornou a imagem do QR Code.",
      });
    }

    // 3. SALVA NO BANCO DE DADOS
    await knex("unidades_atendimento")
      .where("id_unidade", id_unidade)
      .update({ whatsapp_instance_name: instanceName });

    // 4. RETORNA PARA O FRONTEND
    return res.status(200).json({
      qrcode: qrCodeBase64,
      instanceName: instanceName,
    });
  } catch (error) {
    console.error(
      "[WhatsAppController Fatal Error]:",
      error.response?.data || error.message,
    );
    return res
      .status(500)
      .json({ error: "Erro interno ao processar QR Code." });
  }
};

module.exports = { receiveMessage, connectInstance };
