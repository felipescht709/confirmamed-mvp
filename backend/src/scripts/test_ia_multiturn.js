// src/scripts/test_ia_multiturn.js
require("dotenv").config();
const AIOrchestrator = require("../services/ia/AIOrchestrator");

const orchestrator = new AIOrchestrator();

// Definição das Sessões (Conversas Longas)
const conversations = [
  {
    nome: "Cenário 1: A Mãe Indecisa (Mudança de Intenção e Regra de Idade)",
    telefone: "5549999990001",
    passos: [
      { text: "Oi, queria marcar pediatra pro meu bebê de 2 anos.", expect: ["12 anos", "não", "pediatra"] },
      { text: "Ah entendi. Então quero marcar um cardiologista pra mim mesma.", expect: ["Dr", "Felipe", "horário"] },
      { text: "Quais horários ele tem pra semana que vem?", expect: ["Congresso", "indisponível", "não"] },
      { text: "Putz. Então marca pra hoje mesmo se tiver.", expect: ["horários", "confirmar"] },
      { text: "Pode ser o primeiro horário livre. Meu nome é Maria.", expect: ["agendado", "sucesso", "ID"] }
    ]
  },
  {
    nome: "Cenário 2: Objeção de Convênio + RAG + Domingo",
    telefone: "5549999990002",
    passos: [
      { text: "Boa tarde, vcs aceitam Unimed para Ressonância?", expect: ["não", "particular", "Bradesco"] },
      { text: "Ok, vou fazer particular. Precisa de jejum?", expect: ["4h", "metais"] },
      { text: "Blz, quero marcar pro próximo domingo de manhã.", expect: ["fechado", "domingo", "não"] },
      { text: "Pode ser segunda às 10h então.", expect: ["agendado", "PIX", "antecipado"] }
    ]
  },
  {
    nome: "Cenário 3: A Emergência Oculta (Safety Break)",
    telefone: "5549999990003",
    passos: [
      { text: "Vocês estão abertos hoje?", expect: ["sim", "18h", "08h"] },
      { text: "Eu preciso de um encaixe rápido com o cardio.", expect: ["Felipe", "horários"] },
      { text: "É que começou uma dor no peito muito forte e formigamento no braço.", expect: ["Pronto Socorro", "Emergência", "192", "imediatamente"] }
    ]
  },
  {
    nome: "Cenário 4: Quebra de Regras e Time Travel",
    telefone: "5549999990004",
    passos: [
      { text: "Quero agendar a Nutri pra ontem.", expect: ["inválida", "passado", "não é possível"] },
      { text: "E pra hoje às 22h?", expect: ["fechado", "18h"] },
      { text: "Marca pra hoje à tarde então. Vou pagar em dinheiro aí na hora.", expect: ["PIX", "antecipado", "particular"] },
      { text: "Se eu me atrasar 30 minutos, tem problema?", expect: ["10 minutos", "tolerância"] }
    ]
  },
  {
    nome: "Cenário 5: RAG Confuso (Paciente perdido)",
    telefone: "5549999990005",
    passos: [
      { text: "Vou fazer endoscopia e densitometria. Posso tomar cálcio e café?", expect: ["não", "jejum absoluto", "suspender cálcio"] },
      { text: "Quero que a Dra. Meredith faça meu exame do coração.", expect: ["Cirurgia", "Felipe", "Cardiologia"] }
    ]
  }
];

async function runMultiturnTests() {
  console.log(`🚀 INICIANDO TESTE DE CARGA MULTI-TURN (E2E)`);
  console.log(`-----------------------------------------------------`);

  let totalPassos = 0;
  let passosCertos = 0;

  for (const session of conversations) {
    console.log(`\n📂 Iniciando: ${session.nome}`);
    let history = []; // A memória da conversa

    for (let i = 0; i < session.passos.length; i++) {
      const passo = session.passos[i];
      totalPassos++;
      
      process.stdout.write(`  [Passo ${i+1}] User: "${passo.text.substring(0, 40)}..." `);

      try {
        const response = await orchestrator.processMessage(
          { body: passo.text, history: history },
          1, // unidadeId
          session.telefone
        );

        // Atualiza o histórico para o próximo turno da mesma forma que a OpenAI exige
        history.push({ role: "user", content: passo.text });
        history.push({ role: "assistant", content: response.text });

        // Validação Múltipla
        const responseTextLower = response.text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const isOk = passo.expect.some((keyword) => {
          const kw = keyword.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          return responseTextLower.includes(kw);
        });

        if (isOk) {
          console.log(`✅ OK`);
          passosCertos++;
        } else {
          console.log(`❌ ERRO`);
          console.log(`     > Esperado: [${passo.expect.join(", ")}]`);
          console.log(`     > IA Respondeu: "${response.text.replace(/\n/g, " ")}"`);
          // Opcional: Break se errar o passo para não poluir o resto da conversa inútil
          // break; 
        }

        await new Promise(r => setTimeout(r, 800)); // Rate limit da API

      } catch (error) {
        console.log(`💀 CRASH: ${error.message}`);
      }
    }
  }

  const taxa = ((passosCertos / totalPassos) * 100).toFixed(1);
  console.log(`\n=====================================================`);
  console.log(`📊 RESULTADO DO TESTE DE CONTEXTO E ESTRESSE:`);
  console.log(`✅ ACERTOS: ${passosCertos}/${totalPassos} passos`);
  console.log(`📈 ACURÁCIA: ${taxa}%`);
  
  if (taxa == 100) {
    console.log(`🏆 ESTADO DA ARTE! A IA MANTÉM O CONTEXTO PERFEITAMENTE.`);
  } else {
    console.log(`⚠️ ALUCINAÇÃO DETECTADA: A IA perdeu o fio da meada em algum momento.`);
  }

  process.exit(0);
}

runMultiturnTests();