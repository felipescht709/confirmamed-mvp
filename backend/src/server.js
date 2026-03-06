// backend/src/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const routes = require("./routes");

const app = express();

// Middlewares
app.use(cors()); // Permite acesso do React
app.use(express.json()); // Parser de JSON
app.use(morgan("dev")); // Logs de requisições no terminal

// Rotas
app.use("/api", routes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 ConfirmaMED Backend rodando na porta ${PORT}`);
});
