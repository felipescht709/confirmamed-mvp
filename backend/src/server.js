// backend/src/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const routes = require("./routes");
const routesPublic = require("./routesPublic");
const { swaggerUi, specs } = require("./swaggerConfig");
const AgendaCronJob = require("./services/jobs/agendaCronJob");
const EvolutionHealth = require("./services/monitor/evolutionHealth");
const stripeController = require("./controllers/stripeController");
const db = require("./database/db"); // Importamos o db para testar a conexão

const app = express();

// Rota de Webhook DEVE vir antes do express.json() para manter o corpo em Raw Buffer
app.post("/api/stripe/webhook", express.raw({ type: 'application/json' }), stripeController.webhook);

// Middlewares
app.use(cors()); // Permite acesso do React
app.use(express.json({ limit: "10mb" })); // Parser de JSON (aumentado para 10mb para Evolution payloads grandes)
app.use(express.urlencoded({ limit: "10mb", extended: true })); // Parser de urlencoded
app.use(morgan("dev")); // Logs de requisições no terminal

// Rotas
app.use("/api/v1/public", routesPublic);
app.use("/api", routes);

// Documentação Swagger
app.use("/docs", swaggerUi.serve, swaggerUi.setup(specs));

const PORT = process.env.PORT || 4000;

// Função Bootstrap para inicialização segura
async function startServer() {
  try {
    console.log("⏳ [1/3] Iniciando os serviços do backend...");

    // 1. Testa a conexão com o banco de dados (Impede o servidor de rodar às cegas)
    console.log("⏳ [2/3] Conectando ao PostgreSQL...");
    await db.raw("SELECT 1");
    console.log("✅ Banco de Dados conectado!");

    AgendaCronJob.start();
    EvolutionHealth.start();
    console.log("✅ Motor de lembretes, confirmações e pingers em background iniciado.");

    // 3. Sobe a API HTTP garantindo o bind no 0.0.0.0 (OBRIGATÓRIO NO DOCKER)
    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `🚀 [3/3] ConfirmaMED Backend rodando em http://0.0.0.0:${PORT}`,
      );
    });
  } catch (error) {
    // Se o banco falhar (senha errada, host não achou), o erro vai estourar aqui e você verá no log!
    console.error("❌ ERRO FATAL AO INICIAR A APLICAÇÃO:");
    console.error(error);
    process.exit(1); // Derruba o container para o Docker tentar subir de novo
  }
}

// Executa a inicialização
startServer();
