require("dotenv").config(); // Carrega variáveis de ambiente (DB, OPENAI_API_KEY, etc)

// Mapeia os hosts do Docker para o Localhost, pois o script roda fora da rede interna do Docker
if (!process.env.DB_HOST || process.env.DB_HOST === "db")
  process.env.DB_HOST = "127.0.0.1";
if (!process.env.PGHOST || process.env.PGHOST === "db")
  process.env.PGHOST = "127.0.0.1";

if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(
    /@db([:/])/g,
    "@127.0.0.1$1",
  );
}
if (!process.env.REDIS_HOST || process.env.REDIS_HOST === "redis")
  process.env.REDIS_HOST = "127.0.0.1";
if (process.env.REDIS_URL) {
  process.env.REDIS_URL = process.env.REDIS_URL.replace(
    /@redis([:/])/g,
    "@127.0.0.1$1",
  );
}

const readline = require("readline");
const orchestrator = require("../src/services/ia/AIOrchestrator");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Mocks para a simulação (Aja como se fosse o paciente deste telefone na unidade 4)
const TELEFONE_TESTE = "5511999999999";
const UNIDADE_TESTE = 4;

console.log("=====================================================");
console.log("🤖 [AI Local Test] Simulador de Chat via Terminal");
console.log(
  `📱 Telefone simulado: ${TELEFONE_TESTE} | 🏥 Unidade: ${UNIDADE_TESTE}`,
);
console.log("Digite 'sair' para encerrar a simulação.");
console.log("=====================================================\n");

const askQuestion = () => {
  rl.question("Você: ", async (texto) => {
    if (texto.toLowerCase() === "sair") {
      console.log("Encerrando simulação...");
      rl.close();
      process.exit(0);
    }

    try {
      const response = await orchestrator.processMessage(
        TELEFONE_TESTE,
        UNIDADE_TESTE,
        texto,
      );

      if (response === null) {
        console.log(
          "🤖 IA: [Ação Silenciosa - Sessão Transbordada ou LGPD pendente]",
        );
      } else {
        console.log(`🤖 IA: ${response}`);
      }
    } catch (error) {
      console.error("\n❌ [Erro Crítico na Simulação]:", error);
    }
    console.log("-----------------------------------------------------");
    askQuestion();
  });
};

askQuestion();
