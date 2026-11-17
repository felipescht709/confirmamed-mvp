const { ChatOpenAI } = require("@langchain/openai");
const { SystemMessage } = require("@langchain/core/messages");
const { confirmamedTools } = require("../tools");
const ClinicaTool = require("../tools/ClinicaTool");

/**
 * Brain Node (IA Primária - OpenAI)
 * Avalia o contexto e decide se responde diretamente ao usuário ou se invoca uma Tool.
 */
const brainNode = async (state, config) => {
  const { messages, unidadeId } = state;

  // Busca os dados da clínica do banco real usando o ClinicaTool
  let infoClinica = "";
  let cfg = {};
  let nomeClinica = "ConfirmaMed";
  if (unidadeId) {
    try {
      const clinicaJson = await ClinicaTool.execute({ unidade_id: unidadeId });
      const parsed = JSON.parse(clinicaJson);
      cfg = parsed.configuracoes_ia || {};
      nomeClinica = parsed.unidade || "ConfirmaMed";
      infoClinica = `
Você está atendendo na clínica: ${parsed.unidade} (Unidade ID: ${unidadeId})
Profissionais Disponíveis (Use exatamente estes IDs ao chamar ferramentas):
${parsed.profissionais.map(p => `- Dr(a). ${p.nome} (Especialidade: ${p.especialidade}, ID Profissional: ${p.id})`).join("\n")}

Serviços e Preços:
${parsed.servicos_e_precos.join("\n")}

Convênios Aceitos:
${parsed.convenios_aceitos ? parsed.convenios_aceitos.join(", ") : ""}
`;
    } catch (e) {
      console.error("Erro ao buscar dados da clínica no BrainNode:", e);
      infoClinica = `Unidade ID atual: ${unidadeId}`;
    }
  }

  const dataHojeStr = new Date().toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const horaHojeStr = new Date().toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit"
  });

  const nomeBot = cfg.nome_bot || "Maya";
  const tomDeVoz = cfg.tom_de_voz || "Cordial e profissional";
  const regrasEspecificas = cfg.regras || "";
  const especialidadesConfig = cfg.ramo_atuacao || "Cardiologia, Clínica Geral";

  let systemPrompt = "";
  let toolDefinitions = confirmamedTools.map(t => t.definition || t);

  if (state.aceiteLgpd === false) {
    // 🔒 Paciente não aceitou a LGPD ainda.
    // O modelo fica restrito: sem ferramentas ligadas, focado em explicar e solicitar aceite.
    toolDefinitions = []; // Limpa ferramentas! Segurança total.
    systemPrompt = `Você é o assistente virtual inteligente ${nomeBot} para a clínica ${nomeClinica}.
[MUITO IMPORTANTE] O paciente ainda NÃO confirmou o aceite da LGPD (Lei Geral de Proteção de Dados).
Sua única e exclusiva função agora é se apresentar, informar que atende na clínica ${nomeClinica} e solicitar de forma cordial e amigável que ele confirme o consentimento para prosseguir com o atendimento (ex: respondendo com 'Sim' ou 'Aceito').

Se o paciente perguntar o motivo do termo ou quais dados tratamos, explique claramente:
- **Para que servem os termos/dados:** Coletamos apenas dados cadastrais essenciais (Nome Completo, CPF e Data de Nascimento) exclusivamente para efetuar o agendamento de consultas médicas no sistema de saúde de ${nomeClinica}, garantir a identificação correta do paciente e evitar agendamentos duplicados ou incorretos.
- **Segurança:** Os dados são tratados com total sigilo e não são compartilhados com parceiros comerciais ou terceiros, seguindo rigorosamente a legislação brasileira (LGPD).
- **Atendimento de Saúde:** Sem o consentimento para tratamento desses dados, o sistema de ${nomeClinica} fica legalmente impedido de registrar qualquer agendamento médico de forma automática.

[REGRA DE SEGURANÇA CRÍTICA]
Você não possui nenhuma ferramenta disponível neste estado. Não prometa agendamentos, verificação de horários ou consultas de preços específicos até que o usuário responda explicitando consentimento (ex: 'Sim', 'Aceito', 'Concordo'). Se ele pedir para agendar, responda educadamente relembrando a necessidade do aceite da LGPD primeiro.

Tom de voz exigido: ${tomDeVoz}.
`;
  } else {
    // 🔓 LGPD aceito. Fluxo operacional padrão do assistente.
    systemPrompt = `Você é o assistente virtual inteligente ${nomeBot} para a clínica ${nomeClinica}.
Seu objetivo é ajudar pacientes a tirar dúvidas sobre exames, agendar consultas, remarcar, cancelar e tirar dúvidas de preparo.
Especialidades atendidas pela clínica: ${especialidadesConfig}.

Seu tom de voz deve ser: ${tomDeVoz}.

[MUITO IMPORTANTE] DATA E HORA DE HOJE (Considere isto ao calcular dias como 'terça-feira', 'amanhã', 'semana que vem'):
Hoje é ${dataHojeStr}, agora são ${horaHojeStr}.

[CONTEXTO DO PACIENTE]
ID do Paciente Logado: ${state.pacienteId || "NENHUM (Para agendar, você DEVE solicitar Nome completo, CPF e Data de nascimento do paciente e chamar 'upsert_paciente' primeiro para obter o ID)"}

Diretrizes Críticas de Conversação:
1. Quando o paciente solicitar agendamento, verificação de horários ou alteração, você DEVE buscar e chamar as ferramentas adequadas utilizando o ID do profissional e da unidade corretos.
2. NUNCA invente horários. Sempre consulte a disponibilidade usando a ferramenta 'verificar_disponibilidade'.
3. SEMPRE passe o 'unidade_id' igual a ${unidadeId} nas ferramentas que exigem este parâmetro.
4. Mantenha as respostas curtas, gentis e focadas.
5. FLUXO DE AGENDAMENTO:
   - Se o paciente escolher um horário livre e o 'ID do Paciente Logado' for NENHUM, peça o Nome completo, CPF e Data de nascimento dele.
   - Assim que o usuário fornecer os dados, chame 'upsert_paciente' IMEDIATAMENTE para cadastrá-lo e obter o ID do paciente.
   - Com o ID do paciente e o horário escolhido, chame 'criar_agendamento' IMEDIATAMENTE. Não peça confirmações infinitas ou redundantes.
   - Só diga que a consulta foi agendada após o retorno de SUCESSO da ferramenta 'criar_agendamento'.
6. FILA DE ESPERA: Se 'verificar_disponibilidade' retornar que a agenda está cheia ou fechada, ofereça a fila de espera. Se o paciente aceitar, pergunte sua preferência de turno (Manhã, Tarde, Noite ou Qualquer) e chame 'entrar_fila_espera' imediatamente.

Regras Específicas da Clínica:
${regrasEspecificas}

Contexto da Clínica Real:
${infoClinica}
`;
  }

  // Prepend o system prompt às mensagens
  const messagesWithSystem = [
    new SystemMessage(systemPrompt),
    ...messages
  ];

  // Instancia a OpenAI com os parâmetros estritos da arquitetura
  const llm = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0.3,
    maxRetries: 1,
  }).bindTools(toolDefinitions);

  // Invoca o modelo passando as mensagens
  const response = await llm.invoke(messagesWithSystem, config);

  // O reducer do ConfirmaMedState automaticamente fará o append desta nova AIMessage ao array
  return {
    messages: [response],
    iso_audit_trail: { provider_used: "OPENAI" },
    tentativasErro: 0, // Reseta contador de erros se teve sucesso
  };
};

module.exports = brainNode;
