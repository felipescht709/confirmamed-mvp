// src/scripts/chat_live.js
require("dotenv").config();
const readline = require("readline");
const AIOrchestrator = require("../services/ia/AIOrchestrator");
const knex = require("../database/db");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const orchestrator = new AIOrchestrator();
const TELEFONE_TESTE = "5549999998888"; // Número fixo para a sessão

async function setupPacienteTeste() {
  console.log("⚙️  Preparando ambiente de E2E...");

  // Garante que existe um paciente para a ferramenta de agendamento não quebrar (FK)
  const [paciente] = await knex("pacientes")
    .insert({
      nome: "Sr. Teste E2E Frontend",
      telefone: TELEFONE_TESTE,
      cpf: "123.456.789-99",
      data_nascimento: "1990-01-01",
    })
    .onConflict("cpf")
    .merge()
    .returning("*");

  const p = typeof paciente === "object" ? paciente : { id_paciente: paciente };
  console.log(
    `✅ Paciente de Teste Pronto! ID: ${p.id_paciente} | Tel: ${TELEFONE_TESTE}`,
  );
  return p;
}

async function startChat() {
  await setupPacienteTeste();

  console.log("\n=================================================");
  console.log("🤖 CONFIRMAMED LIVE CHAT (E2E TEST)");
  console.log(
    "Digite sua mensagem e aperte ENTER. Digite 'sair' para encerrar.",
  );
  console.log("=================================================\n");

  let history = [];

  const ask = () => {
    rl.question("Você: ", async (input) => {
      if (input.toLowerCase() === "sair") {
        console.log("👋 Encerrando teste.");
        process.exit(0);
      }

      try {
        process.stdout.write("IA digitando... ");
        const startTime = Date.now();

        const response = await orchestrator.processMessage(
          { body: input, history },
          1, // unidadeId
          TELEFONE_TESTE,
        );

        // Limpa a linha do "digitando..."
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);

        console.log(`🤖 Ana (${Date.now() - startTime}ms): ${response.text}\n`);

        // Atualiza o histórico para o próximo turno
        history.push({ role: "user", content: input });
        history.push({ role: "assistant", content: response.text });
      } catch (error) {
        console.error("\n💀 CRASH:", error.message);
      }

      ask(); // Loop infinito de conversa
    });
  };

  ask();
}

startChat();
