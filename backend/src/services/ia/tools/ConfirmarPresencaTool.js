// src/services/ia/tools/ConfirmarPresencaTool.js
const knex = require("../../../database/db");

const ConfirmarPresencaTool = {
  // 1. Padronizado com o formato que a OpenAI exige (JSON Schema) e o seu index.js procura
  definition: {
    type: "function",
    function: {
      name: "confirmar_presenca",
      description:
        "Confirma a consulta do paciente no sistema. Use EXCLUSIVAMENTE quando o paciente responder afirmando que vai comparecer a um agendamento prévio.",
      parameters: {
        type: "object",
        properties: {
          id_consulta: {
            type: "integer",
            description: "ID da consulta que deve ser confirmada.",
          },
        },
        required: ["id_consulta"],
      },
    },
  },

  async execute({ id_consulta, telefone_sessao }) {
    try {
      if (!id_consulta) return "ERRO: id_consulta não fornecido.";

      console.log(
        `[TOOL] ConfirmarPresenca: Iniciando para consulta ID ${id_consulta} via telefone ${telefone_sessao}`,
      );

      // 2. Trava de Segurança: Garante que a consulta pertence a este WhatsApp
      const consulta = await knex("consultas as c")
        .join("pacientes as p", "c.paciente_id", "p.id_paciente")
        .where("c.id_consulta", id_consulta)
        // .andWhere("p.telefone", telefone_sessao) // 🔒 Descomente isso em PROD para evitar invasões!
        .select("c.id_consulta", "c.status")
        .first();

      if (!consulta) {
        return "ERRO: Consulta não encontrada ou não pertence a este paciente. Peça para o paciente confirmar o dia e a hora.";
      }

      if (consulta.status === "CONFIRMADA") {
        return "AVISO: A consulta já constava como CONFIRMADA. Diga ao paciente que está tudo certo e a clínica o aguarda.";
      }

      // 3. Efetiva a confirmação
      await knex("consultas").where({ id_consulta }).update({
        status: "CONFIRMADA", // Mudei de CONFIRMADO para CONFIRMADA (ajuste conforme seu ENUM do banco)
        // atualizado_em: knex.fn.now(), // Descomente se a coluna existir no seu db
      });

      return "SUCESSO: Consulta confirmada na agenda. Agradeça ao paciente de forma simpática.";
    } catch (error) {
      console.error("❌ [TOOL] Erro ao confirmar presença:", error);
      return "ERRO CRÍTICO no banco de dados. Informe ao paciente que o sistema teve uma instabilidade temporária.";
    }
  },
};

module.exports = ConfirmarPresencaTool;
