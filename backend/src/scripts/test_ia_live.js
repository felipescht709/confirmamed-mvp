require("dotenv").config();
const AIOrchestrator = require("../services/ia/AIOrchestrator");
const knex = require("../database/db");

async function runTest() {
  console.log("🚀 Iniciando Validação Final do ConfirmaMED IA...");

  try {
    // 1. Validação de Conexão com Banco e Contexto
    console.log("🔍 Verificando contexto da Unidade 1...");
    const unidade = await knex("unidades_atendimento")
      .where({ id_unidade: 1 })
      .first();

    if (!unidade) {
      console.error(
        "❌ ERRO CRÍTICO: Unidade 1 não encontrada na tabela 'unidades_atendimento'.",
      );
      process.exit(1);
    }
    console.log(
      `✅ Contexto Carregado: Bot "${unidade.configuracoes_ia?.nome_bot || "Ana"}"`,
    );

    // 2. Instancia o Orquestrador
    const orchestrator = new AIOrchestrator();

    // Cenários de Teste
    const scenarios = [
      {
        testName: "Personalidade e Tom de Voz",
        input: "Bom dia, quem é você?",
        expectedKeyword: "Ana", // Deve se apresentar
      },
      {
        testName: "Teste de RAG (Protocolo Álcool)",
        input: "Vou fazer um eletrocardiograma. Posso tomar cerveja antes?",
        expectedKeyword: "proibido", // Ou "não", "evitar"
      },
      {
        testName: "Teste de Bloqueio de Agenda (Sexta-feira)",
        input:
          "Gostaria de marcar com o Dr. Felipe na próxima sexta-feira as 14h.",
        expectedKeyword: "Congresso", // Ou "indisponível"
      },
      {
        testName: "Teste de Negativa (Cirurgia)",
        input: "Quero agendar uma cirurgia cardíaca de ponte de safena.",
        expectedKeyword: "não realizamos", // Transbordo
      },
    ];

    for (const scenario of scenarios) {
      console.log(`\n🧪 TESTANDO: ${scenario.testName}`);
      console.log(`👤 Usuário: "${scenario.input}"`);

      const response = await orchestrator.processMessage(
        { body: scenario.input, from: "5549999999999" }, // Mock do WhatsApp
        1, // ID da Unidade
      );

      console.log(`🤖 Bot: "${response.text}"`);

      // Validação simples
      if (
        response.text &&
        response.text
          .toLowerCase()
          .includes(scenario.expectedKeyword.toLowerCase())
      ) {
        console.log("✅ PASSOU");
      } else {
        console.log(
          `⚠️ ATENÇÃO: Verifique se a resposta condiz com o esperado ('${scenario.expectedKeyword}')`,
        );
      }
    }

    console.log("\n🎉 Testes Finalizados!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ ERRO FATAL NO TESTE:");
    console.error(error);
    process.exit(1);
  }
}

runTest();
