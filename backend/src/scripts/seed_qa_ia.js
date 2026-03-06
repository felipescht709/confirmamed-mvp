const knex = require("../database/db");

async function seedQA() {
  console.log("🚀 Iniciando Ajuste Fino para Testes de Conversação (QA)...");

  try {
    // =========================================================================
    // 1. REFINAR A PERSONA DA IA (Tabela: unidades_atendimento)
    // =========================================================================
    console.log("🧠 Atualizando Regras da IA (Unidade 1)...");
    
    // Atualiza apenas as configurações de IA da unidade existente
    await knex("unidades_atendimento")
      .where({ id_unidade: 1 })
      .update({
        configuracoes_ia: {
          nome_bot: "Ana",
          tom_de_voz: "Cordial, profissional e acolhedor",
          ramo_atuacao: "Clínica Multidisciplinar (Cardiologia e Psicologia)",
          regras: [
            "- NÃO atendemos convênio Unimed para procedimentos estéticos.",
            "- Horário de atendimento: Segunda a Sexta das 08:00 às 18:00.",
            "- Não realizamos cirurgias cardíacas complexas (apenas consultas e exames leves).",
            "- Em caso de emergência, oriente o paciente a ligar para o SAMU (192)."
          ].join("\n")
        }
      });

    // =========================================================================
    // 2. GARANTIR PROTOCOLOS DE IA (Tabela: procedimentos)
    // =========================================================================
    console.log("📚 Refinando Protocolos de Exames...");

    // ID 4 é o Eletrocardiograma no seu backup. Vamos garantir o texto do teste da cerveja.
    await knex("procedimentos")
        .where({ id_procedimento: 4 })
        .update({
            preparo_obrigatorio: "Jejum de 8 horas. PROIBIDO ingerir bebidas alcoólicas, energéticos ou café nas 24h anteriores ao exame. Não usar cremes corporais no tórax.",
            contraindicacoes: "Não indicado para gestantes sem pedido médico específico.",
            documentos_necessarios: "Documento com foto e carteirinha do convênio (se houver)."
        });

    // =========================================================================
    // 3. CRIAR BLOQUEIO PARA TESTE DE AGENDA (Tabela: agenda_bloqueios)
    // =========================================================================
    console.log("📅 Criando Bloqueio Teste na Agenda...");
    
    // Vamos bloquear a PRÓXIMA SEXTA-FEIRA do Dr. Felipe (ID 3) para testar se a IA nega o agendamento.
    const hoje = new Date();
    const proximaSexta = new Date();
    proximaSexta.setDate(hoje.getDate() + (5 + 7 - hoje.getDay()) % 7);
    proximaSexta.setHours(8, 0, 0, 0); // 08:00
    
    const fimSexta = new Date(proximaSexta);
    fimSexta.setHours(18, 0, 0, 0); // 18:00

    // Limpa bloqueios anteriores de teste para não poluir
    await knex("agenda_bloqueios")
        .where({ profissional_id: 3, motivo: "Congresso Brasileiro de Cardiologia (Teste IA)" })
        .del();

    await knex("agenda_bloqueios").insert({
        profissional_id: 3, // Felipe Schmidt (Baseado no seu backup)
        unidade_id: 1,
        data_inicio: proximaSexta,
        data_fim: fimSexta,
        motivo: "Congresso Brasileiro de Cardiologia (Teste IA)"
    });

    console.log(`🔒 Bloqueio criado para ${proximaSexta.toLocaleDateString()} (Dr. Felipe)`);
    console.log("✅ AMBIENTE DE TESTE PRONTO!");
    console.log("Agora você pode rodar o script 'test_ia_live.js' ou usar o chat.");
    process.exit(0);

  } catch (error) {
    console.error("❌ Erro no Seed:", error);
    process.exit(1);
  }
}

seedQA();