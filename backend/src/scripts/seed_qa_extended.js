//scripts/seed_qa_extended.js
const knex = require("../database/db");

async function seedExtended() {
  console.log("🔥 Iniciando Seed de Estresse (50 Cenários)...");

  try {
    const unidadeId = 1;

    // 1. REGRAS DA UNIDADE (Ajustado para 'configuracoes_ia')
    console.log("🧠 Injetando Regras de Negócio Complexas...");
    const unidadeExiste = await knex("unidades_atendimento")
      .where({ id_unidade: unidadeId })
      .first();

    if (unidadeExiste) {
      await knex("unidades_atendimento")
        .where({ id_unidade: unidadeId })
        .update({
          configuracoes_ia: {
            nome_bot: "Ana",
            tom_de_voz: "Empático, porém firme nas regras de segurança.",
            ramo_atuacao: "Centro de Diagnóstico Avançado e Especialidades",
            regras: [
              "- Convênios: Aceitamos Bradesco, SulAmérica e Particular. NÃO aceitamos Unimed nem IPERGS.",
              "- Idade: Não atendemos pediatria (menores de 12 anos).",
              "- Pagamento: Consultas particulares exigem pagamento antecipado via PIX.",
              "- Emergências: Dor no peito, falta de ar ou sangramento intenso -> Orientar ir ao Pronto Socorro imediatamente.",
              "- Telemedicina: Permitida apenas para Psicologia e Nutrição. Proibida para Cardiologia (primeira vez).",
              "- Atrasos: Tolerância máxima de 10 minutos.",
            ].join("\n"),
          },
        });
    }

    // 2. PROFISSIONAIS E SALAS DE EXAME (Equipamentos)
    console.log("👨‍⚕️ Criando Corpo Clínico e Salas Técnicas...");
    const medicos = [
      // Médicos Reais
      {
        nome: "Dr. Felipe Schmidt",
        esp: "Cardiologia",
        tel: "4999901",
        cpf: "111.111.111-01",
      },
      {
        nome: "Dra. Talita Souza",
        esp: "Psicologia",
        tel: "4999902",
        cpf: "222.222.222-02",
      },
      {
        nome: "Dr. Gregory House",
        esp: "Infectologia",
        tel: "4999903",
        cpf: "333.333.333-03",
      },
      {
        nome: "Dra. Meredith Grey",
        esp: "Cirurgia Geral",
        tel: "4999904",
        cpf: "444.444.444-04",
      },
      {
        nome: "Dra. Ana Nutri",
        esp: "Nutrição",
        tel: "4999905",
        cpf: "555.555.555-05",
      },

      // Equipamentos / Salas de Exame (Profissionais Virtuais)
      {
        nome: "Sala de Ressonância Magnética",
        esp: "Exames de Imagem",
        tel: "0000001",
        cpf: "999.999.999-91",
      },
      {
        nome: "Sala de Endoscopia",
        esp: "Gastroenterologia",
        tel: "0000002",
        cpf: "999.999.999-92",
      },
      {
        nome: "Sala de Ultrassom",
        esp: "Exames de Imagem",
        tel: "0000003",
        cpf: "999.999.999-93",
      },
      {
        nome: "Sala de Teste Ergométrico",
        esp: "Cardiologia",
        tel: "0000004",
        cpf: "999.999.999-94",
      },
    ];

    for (const m of medicos) {
      const [prof] = await knex("profissionais_da_saude")
        .insert({
          nome_completo: m.nome,
          especialidade: m.esp,
          telefone: m.tel,
          cpf: m.cpf,
          ativo: true,
        })
        .onConflict("cpf")
        .merge()
        .returning("id_profissional_saude");

      const profId =
        typeof prof === "object" ? prof.id_profissional_saude : prof;

      await knex("profissional_unidade_vinculo")
        .insert({ profissional_id: profId, unidade_id: unidadeId })
        .onConflict(["profissional_id", "unidade_id"])
        .ignore();
    }

    // 3. PROCEDIMENTOS & PROTOCOLOS (Usando as colunas da sua migration 'alter_procedimentos_add_protocols')
    console.log("📚 Inserindo Protocolos RAG...");
    const procedimentos = [
      {
        nome: "Ressonância Magnética de Crânio",
        prep: "Retirar metais. Jejum 4h.",
        contra: "Marca-passo.",
        docs: "Pedido médico.",
      },
      {
        nome: "Colonoscopia",
        prep: "Dieta sem resíduos. Tomar manitol. Acompanhante.",
        contra: "Perfuração.",
        docs: "Risco Cirúrgico.",
      },
      {
        nome: "Exame de Sangue (Lipidograma)",
        prep: "Jejum 12h obrigatório.",
        contra: "Nenhuma.",
        docs: "RG.",
      },
      {
        nome: "Mamografia Digital",
        prep: "Sem desodorante ou talco.",
        contra: "Gestantes.",
        docs: "Pedido.",
      },
      {
        nome: "Teste Ergométrico (Esteira)",
        prep: "Trazer tênis. Raspar peito.",
        contra: "Angina.",
        docs: "Pedido.",
      },
      {
        nome: "Ultrassom Abdominal Total",
        prep: "Jejum 8h. Bexiga cheia.",
        contra: "Nenhuma.",
        docs: "Pedido.",
      },
      {
        nome: "Endoscopia Digestiva",
        prep: "Jejum absoluto 8h. Acompanhante.",
        contra: "Nenhuma.",
        docs: "Pedido.",
      },
      {
        nome: "Ecocardiograma",
        prep: "Sem jejum. Sem cremes.",
        contra: "Nenhuma.",
        docs: "Pedido.",
      },
      {
        nome: "Holter 24h",
        prep: "Banho antes. Sem banho durante.",
        contra: "Alergia adesivo.",
        docs: "Pedido.",
      },
      {
        nome: "Densitometria Óssea",
        prep: "Sem cálcio 24h antes.",
        contra: "Gestantes.",
        docs: "Pedido.",
      },
    ];

    for (const p of procedimentos) {
      const exists = await knex("procedimentos")
        .where("nome_procedimento", "ilike", p.nome)
        .first();
      if (exists) {
        await knex("procedimentos")
          .where({ id_procedimento: exists.id_procedimento })
          .update({
            preparo_obrigatorio: p.prep,
            contraindicacoes: p.contra,
            documentos_necessarios: p.docs,
            ativo: true,
          });
      } else {
        await knex("procedimentos").insert({
          unidade_id: unidadeId,
          nome_procedimento: p.nome,
          valor: 200.0,
          duracao_minutos: 30,
          tipo: "EXAME",
          preparo_obrigatorio: p.prep,
          contraindicacoes: p.contra,
          documentos_necessarios: p.docs,
          ativo: true,
        });
      }
    }

    // 4. BLOQUEIOS (Removido 'bloqueia_agendamento' que não existe no seu banco)
    console.log("📅 Criando Cenários de Agenda...");
    await knex("agenda_bloqueios")
      .where("motivo", "ilike", "%Teste Seed%")
      .del();

    const drFelipe = await knex("profissionais_da_saude")
      .where("cpf", "111.111.111-01")
      .first();
    const draTalita = await knex("profissionais_da_saude")
      .where("cpf", "222.222.222-02")
      .first();

    const hoje = new Date();
    const proximaSemana = new Date(hoje);
    proximaSemana.setDate(hoje.getDate() + 7);
    const mesQueVem = new Date(hoje);
    mesQueVem.setMonth(hoje.getMonth() + 1);

    await knex("agenda_bloqueios").insert([
      {
        profissional_id: drFelipe.id_profissional_saude,
        unidade_id: unidadeId,
        data_inicio: proximaSemana,
        data_fim: new Date(proximaSemana.getTime() + 86400000 * 5),
        motivo: "Congresso Europeu de Cardiologia (Teste Seed)",
      },
      {
        profissional_id: draTalita.id_profissional_saude,
        unidade_id: unidadeId,
        data_inicio: mesQueVem,
        data_fim: new Date(mesQueVem.getTime() + 86400000 * 15),
        motivo: "Férias (Teste Seed)",
      },
      {
        unidade_id: unidadeId,
        data_inicio: "2026-12-25 00:00:00",
        data_fim: "2026-12-25 23:59:59",
        motivo: "Feriado de Natal (Teste Seed)",
      },
    ]);
    // ... código anterior do seed ...

    // 5. GRADE DE HORÁRIOS (Expediente)
    console.log("⏰ Configurando Grades de Horários Semanais...");

    // Deleta as grades antigas de teste para evitar duplicidade
    await knex("agenda_configuracao_horario").del();

    const grades = [];
    const diasDaSemanaTrabalhados = [1, 2, 3, 4, 5]; // 1=Segunda, 5=Sexta

    // Pegando todos os médicos inseridos para dar expediente a todos
    const todosProfissionais = await knex("profissionais_da_saude").select(
      "id_profissional_saude",
    );

    for (const prof of todosProfissionais) {
      for (const dia of diasDaSemanaTrabalhados) {
        grades.push({
          profissional_id: prof.id_profissional_saude,
          unidade_id: unidadeId,
          dia_semana: dia,
          hora_inicio: "08:00:00",
          hora_fim: "18:00:00",
          duracao_slot_minutos: 30,
          ativo: true,
        });
      }
    }

    // Insere os horários de trabalho no banco
    if (grades.length > 0) {
      await knex("agenda_configuracao_horario").insert(grades);
    }

    console.log("✅ SEED CONCLUÍDO COM SUCESSO!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro no Seed:", error);
    process.exit(1);
  }
}

seedExtended();
