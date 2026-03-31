// backend/src/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const routes = require("./routes");
const ReminderJob = require("./services/core/ReminderJob");
const db = require("./database/db"); // Importamos o db para testar a conexão

const app = express();

// Middlewares
app.use(cors()); // Permite acesso do React
app.use(express.json()); // Parser de JSON
app.use(morgan("dev")); // Logs de requisições no terminal

// Rotas
app.use("/api", routes);

const PORT = process.env.PORT || 4000;

// Função Bootstrap para inicialização segura
async function startServer() {
  try {
    console.log("⏳ [1/3] Iniciando os serviços do backend...");

    // 1. Testa a conexão com o banco de dados (Impede o servidor de rodar às cegas)
    console.log("⏳ [2/3] Conectando ao PostgreSQL...");
    await db.raw("SELECT 1");
    console.log("✅ Banco de Dados conectado!");

    // 2. Inicia o CronJob
    ReminderJob.start();
    console.log("✅ Motor de lembretes em background iniciado.");

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
