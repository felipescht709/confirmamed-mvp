// services/ia/tools/UpsertPacienteTool.js
const knex = require("../../../database/db");
const piiMasker = require("../security/PIIMasker");

const UpsertPacienteTool = {
  definition: {
    type: "function",
    function: {
      name: "upsert_paciente",
      description:
        "Cadastra um novo paciente ou atualiza o telefone de um existente via CPF. OBRIGATÓRIO se o paciente não estiver na lista de vinculados.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome completo" },
          cpf: {
            type: "string",
            description: "CPF do paciente (Apenas números)",
          },
          data_nascimento: {
            type: "string",
            description: "Data de nascimento YYYY-MM-DD",
          },
          telefone_sessao: {
            type: "string",
            description: "Telefone do WhatsApp em atendimento",
          },
        },
        required: ["nome", "cpf", "data_nascimento", "telefone_sessao"],
      },
    },
  },

  async execute({ nome, cpf, data_nascimento, telefone_sessao }) {
    try {
      // 2. DESFAZ A MÁSCARA AQUI: Pega o token gerado pela IA e busca o CPF real no cofre
      const cpfReal = await piiMasker.unmask(cpf, telefone_sessao);

      // 3. Agora limpa os caracteres especiais do CPF real
      const cpfLimpo = cpfReal.replace(/\D/g, "");

      if (cpfLimpo.length !== 11) {
        return "ERRO: O CPF fornecido é inválido. Peça ao usuário para digitar o CPF com 11 dígitos corretos.";
      }

      console.log(`[TOOL] UpsertPaciente: Verificando CPF ${cpfLimpo}`);

      return await knex.transaction(async (trx) => {
        // Pessimistic lock na leitura do CPF
        const pacienteExistente = await trx("pacientes")
          .where({ cpf: cpfLimpo })
          .forUpdate()
          .first();

        if (pacienteExistente) {
          // Atualiza o telefone para garantir que o número do WhatsApp fique vinculado
          await trx("pacientes")
            .where({ id_paciente: pacienteExistente.id_paciente })
            .update({
              telefone: telefone_sessao,
              atualizado_em: knex.fn.now(),
            });

          return `SUCESSO! Paciente já existia no sistema e o telefone foi vinculado. O ID do paciente é ${pacienteExistente.id_paciente}. Você JÁ PODE prosseguir com o agendamento.`;
        }

        // INSERT: Novo dependente
        const [id_paciente] = await trx("pacientes")
          .insert({
            nome,
            cpf: cpfLimpo,
            data_nascimento,
            telefone: telefone_sessao,
          })
          .returning("id_paciente");

        // Tratamento para diferença de retorno entre Postgres (obj) e MySQL/SQLite (number)
        const idReal =
          typeof id_paciente === "object"
            ? id_paciente.id_paciente
            : id_paciente;

        return `SUCESSO! Novo paciente cadastrado. O ID do paciente é ${idReal}. Você JÁ PODE prosseguir com o agendamento usando este ID.`;
      });
    } catch (error) {
      console.error("❌ [TOOL] Erro na UpsertPacienteTool:", error);
      return "ERRO CRÍTICO no banco de dados ao tentar salvar o paciente. Peça desculpas e diga para tentar novamente em alguns minutos.";
    }
  },
};

module.exports = UpsertPacienteTool;
