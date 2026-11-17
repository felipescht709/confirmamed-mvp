require('dotenv').config();
const AIOrchestrator = require('./services/ia/AIOrchestrator');
const db = require('./database/db');

async function runTests() {
  console.log("=========================================");
  console.log("🚀 INICIANDO TESTES DO AI ORCHESTRATOR 🚀");
  console.log("=========================================\n");

  const telefoneTeste = "5511999999999";
  // Pega a primeira unidade ativa
  const unidade = await db('unidades_atendimento').first();
  
  if (!unidade) {
    console.error("Nenhuma unidade encontrada no banco para rodar o teste.");
    process.exit(1);
  }

  const unidadeId = unidade.id_unidade;
  console.log(`✅ Unidade selecionada: ${unidade.nome_fantasia} (ID: ${unidadeId})`);

  try {
    // TESTE 1: Transbordo Humano
    console.log("\n▶️ TESTE 1: Solicitando Transbordo Humano (Isso deve gerar um e-mail no Mailtrap)");
    console.log("Mensagem: 'Estou com muita raiva, quero falar com um humano agora!'");
    
    let resposta = await AIOrchestrator.processMessage(telefoneTeste, unidadeId, "Estou com muita raiva, quero falar com um humano agora!");
    console.log("\n🤖 Resposta da IA:", resposta);
    
    // Pequeno delay para os logs do nodejs
    await new Promise(resolve => setTimeout(resolve, 3000));

    // TESTE 2: Cadastro de Terceiros
    console.log("\n▶️ TESTE 2: Cadastro de Terceiros");
    console.log("Mensagem: 'Quero marcar uma consulta para o meu filho, Joãozinho. Meu nome é Maria.'");
    
    resposta = await AIOrchestrator.processMessage(telefoneTeste, unidadeId, "Quero marcar uma consulta para o meu filho, Joãozinho. Meu nome é Maria.");
    console.log("\n🤖 Resposta da IA:", resposta);

  } catch (error) {
    console.error("Erro durante os testes:", error);
  } finally {
    console.log("\n✅ Testes finalizados.");
    process.exit(0);
  }
}

runTests();
