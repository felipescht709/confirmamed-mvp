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

  async execute({ unidade_id }) {
    if (!unidade_id) return "Erro: Unidade não identificada.";

    try {
      const [unidade, medicos, procedimentos, convenios] = await Promise.all([
        knex("unidades_atendimento").where("id_unidade", unidade_id).first(),
        
        knex("profissionais_da_saude as p")
          .join("profissional_unidade_vinculo as pu", "p.id_profissional_saude", "pu.profissional_id")
          .where("pu.unidade_id", unidade_id)
          .where("p.ativo", true)
          .whereNull("p.deleted_at")
          .select("p.id_profissional_saude", "p.nome_completo", "p.especialidade"),

        knex("procedimentos")
          .where({ unidade_id, ativo: true, tipo: "CONSULTA" })
          .select("nome_procedimento", "valor"),

        knex("convenios")
          .where("ativo", true)
          .select("nome")
      ]);

      if (!unidade) return "Erro: Unidade não encontrada.";

      let cfgIa = {};
      if (unidade.configuracoes_ia) {
        cfgIa = typeof unidade.configuracoes_ia === "string"
          ? JSON.parse(unidade.configuracoes_ia)
          : unidade.configuracoes_ia;
      }

      return JSON.stringify({
        unidade: unidade.nome_fantasia,
        cidade: unidade.cidade,
        configuracoes_ia: cfgIa,
        profissionais: medicos.map(m => ({
          id: m.id_profissional_saude,
          nome: m.nome_completo,
          especialidade: m.especialidade
        })),
        servicos_e_precos: procedimentos.map(p => `${p.nome_procedimento}: R$ ${p.valor}`),
        convenios_aceitos: convenios.map(c => c.nome),
        observacao: "Para outros convênios ou procedimentos, consulte nossa recepção."
      });
    } catch (error) {
      console.error("❌ [ClinicaTool] Erro:", error);
      return "Erro ao consultar informações dinâmicas da clínica.";
    }
  },
};

module.exports = ClinicaTool;
