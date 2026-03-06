const knex = require("../../../database/db");

const ConsultarAgendamentosTool = {
  definition: {
    type: "function",
    function: {
      name: "consultar_agendamentos_paciente",
      description:
        "Busca as consultas futuras de um paciente específico. Use isso quando o usuário quiser saber quando é a consulta dele ou pedir para cancelar/reagendar.",
      parameters: {
        type: "object",
        properties: {
          paciente_id: { type: "integer", description: "O ID do paciente" },
        },
        required: ["paciente_id"],
      },
    },
  },

  async execute({ paciente_id }) {
    try {
      const consultas = await knex("consultas")
        .join(
          "profissionais_da_saude",
          "consultas.profissional_id",
          "profissionais_da_saude.id_profissional_saude",
        )
        .select(
          "consultas.id_consulta",
          "consultas.data_hora_inicio",
          "consultas.status",
          "consultas.profissional_id",
          "profissionais_da_saude.nome_completo",
          "profissionais_da_saude.especialidade",
        )
        .where("consultas.paciente_id", paciente_id)
        .where("consultas.status", "AGENDADO")
        .whereNull("consultas.deleted_at")
        .orderBy("consultas.data_hora_inicio", "asc");

      if (!consultas || consultas.length === 0) {
        return "Nenhuma consulta futura encontrada para este paciente.";
      }

      // Correção no mapeamento: usando os nomes exatos das colunas
      const lista = consultas
        .map(
          (c) =>
            `ID Consulta: ${c.id_consulta} | Médico: ${c.nome_completo} (ID Profissional: ${c.profissional_id}) | Data: ${c.data_hora_inicio}`,
        )
        .join("\n");

      return `SUCESSO. O paciente possui as seguintes consultas:\n${lista}\nSe ele quiser cancelar ou reagendar, use o ID Consulta listado acima.`;
    } catch (error) {
      console.error("❌ [TOOL] Erro na ConsultarAgendamentosTool:", error);
      return "Erro técnico ao buscar as consultas.";
    }
  },
};

module.exports = ConsultarAgendamentosTool;
