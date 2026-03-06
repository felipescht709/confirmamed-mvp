const knex = require("../../../database/db");

const ClinicaTool = {
  definition: {
    type: "function",
    function: {
      name: "consultar_clinica",
      description:
        "Consulta a lista de médicos, especialidades disponíveis e preços das consultas na clínica.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },

  async execute() {
    try {
      const medicos = await knex("profissionais_da_saude")
        .where("ativo", true)
        .select("nome_completo", "especialidade");

      // Podes adicionar aqui uma busca de preços se tiveres uma tabela de serviços
      return JSON.stringify({
        profissionais: medicos,
        preco_padrao_particular: "R$ 200,00",
        observacao: "Aceitamos Bradesco e SulAmérica.",
      });
    } catch (error) {
      return "Erro ao consultar informações da clínica.";
    }
  },
};

module.exports = ClinicaTool;
