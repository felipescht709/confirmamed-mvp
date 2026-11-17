// services/ia/tools/UpsertPacienteTool.js
const knex = require("../../../database/db");
const piiMasker = require("../security/PIIMasker");
const SessionService = require("../../core/SessionService");

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
            description: "CPF do paciente (Pode ser o número ou um PII_TOKEN)",
          },
          data_nascimento: {
            type: "string",
            description: "Data de nascimento YYYY-MM-DD",
          },
          telefone_contato: {
            type: "string",
            description: "Telefone de contato preferencial para este paciente (opcional)",
          },
        },
        required: ["nome", "cpf", "data_nascimento"],
      },
    },
  },

  async execute({ nome, cpf, data_nascimento, telefone_contato, telefone_sessao, unidade_id }) {
    try {
      // Prioriza o telefone fornecido pela IA (preferencial), senão usa o da sessão
      const telefoneFinal = (telefone_contato || telefone_sessao).replace(/\D/g, "");
      
      // 1. Normalização de Data (DD/MM/YYYY ou DDMMYYYY -> YYYY-MM-DD)
      let dataNormalizada = data_nascimento;
      if (data_nascimento && data_nascimento.includes("/")) {
        const partes = data_nascimento.split("/");
        if (partes.length === 3) {
          let [dia, mes, ano] = partes;
          if (ano.length === 2) {
            // T11-Auditoria: Threshold 30 — anos <= 30 são 20xx (ex: "05" -> 2005), acima são 19xx (ex: "85" -> 1985)
            ano = parseInt(ano, 10) <= 30 ? "20" + ano : "19" + ano;
          }
          dataNormalizada = `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
        }
      } else if (data_nascimento && data_nascimento.length === 8) {
        // Formato DDMMYYYY
        const dia = data_nascimento.substring(0, 2);
        const mes = data_nascimento.substring(2, 4);
        const ano = data_nascimento.substring(4, 8);
        dataNormalizada = `${ano}-${mes}-${dia}`;
      }

      // 2. DESFAZ A MÁSCARA DO CPF
      const cpfReal = await piiMasker.unmask(cpf, telefone_sessao);
      const cpfLimpo = cpfReal.replace(/\D/g, "");

      console.log(`[DEBUG TOOL] CPF recebido: "${cpf}" | Unmasked: "${cpfReal}" | Limpo: "${cpfLimpo}"`);

      if (cpfLimpo.length !== 11) {
        return "ERRO: O CPF fornecido é inválido. Peça ao usuário para digitar o CPF com 11 dígitos corretos.";
      }

      console.log(`[TOOL] UpsertPaciente: Verificando CPF ${cpfLimpo} na Unidade ${unidade_id}`);

      return await knex.transaction(async (trx) => {
        const pacienteExistente = await trx("pacientes")
          .where({ cpf: cpfLimpo, unidade_id })
          .forUpdate()
          .first();

        if (pacienteExistente) {
          await trx("pacientes")
            .where({ id_paciente: pacienteExistente.id_paciente, unidade_id })
            .update({
              telefone: telefoneFinal,
              atualizado_em: knex.fn.now(),
            });

          await SessionService.updateSession(telefone_sessao, unidade_id, "AGENDAMENTO", {
            paciente_alvo_id: pacienteExistente.id_paciente
          });

          return `SUCESSO! Paciente já existia no sistema e o telefone foi vinculado. O ID do paciente é ${pacienteExistente.id_paciente}. Você JÁ PODE prosseguir com o agendamento.`;
        }

        const [id_paciente] = await trx("pacientes")
          .insert({
            nome,
            cpf: cpfLimpo,
            data_nascimento: dataNormalizada,
            telefone: telefoneFinal,
            unidade_id,
          })
          .returning("id_paciente");

        const idReal = typeof id_paciente === "object" ? id_paciente.id_paciente : id_paciente;

        await SessionService.updateSession(telefone_sessao, unidade_id, "AGENDAMENTO", {
          paciente_alvo_id: idReal
        });

        return `SUCESSO! Novo paciente cadastrado. O ID do paciente é ${idReal}. Você JÁ PODE prosseguir com o agendamento usando este ID.`;
      });
    } catch (error) {
      console.error("❌ [TOOL] Erro na UpsertPacienteTool:", error);
      return "ERRO CRÍTICO no banco de dados ao tentar salvar o paciente. Peça desculpas e diga para tentar novamente em alguns minutos.";
    }
  },
};

module.exports = UpsertPacienteTool;
