const knex = require("../../../database/db");

const ProtocolTool = {
  // A estrutura 'definition' DEVE bater com o que a OpenAI espera
  definition: {
    type: "function",
    function: {
      name: "consultar_protocolo",
      description:
        "Busca orientações de preparo para um exame ou procedimento.",
      parameters: {
        type: "object",
        properties: {
          nome_procedimento: {
            type: "string",
            description: "Nome do exame (ex: Ultrassom)",
          },
        },
        required: ["nome_procedimento"],
      },
    },
  },

  async execute({ nome_procedimento }) {
    try {
      // Busca inteligente usando similaridade de texto (Trigramas)
      const procedimento = await knex("procedimentos")
        .whereRaw("nome_procedimento % ?", [nome_procedimento]) // Operador de similaridade do pg_trgm
        .orWhere("nome_procedimento", "ilike", `%${nome_procedimento}%`)
        .orderByRaw("similarity(nome_procedimento, ?) DESC", [
          nome_procedimento,
        ])
        .select(
          "nome_procedimento",
          "preparo_obrigatorio",
          "contraindicacoes",
          "documentos_necessarios",
        )
        .first();

      if (!procedimento) {
        return "Nenhum protocolo encontrado com este nome. Por favor, tente buscar por uma especialidade ou termo similar.";
      }
      // ... resto do retorno

      return `
        PROCEDIMENTO: ${procedimento.nome_procedimento}
        PREPARO: ${procedimento.preparo_obrigatorio || "Nenhum preparo específico."}
        CONTRAINDICAÇÕES: ${procedimento.contraindicacoes || "Nenhuma."}
        DOCUMENTOS: ${procedimento.documentos_necessarios || "Documento com foto."}
      `;
    } catch (error) {
      console.error("Erro na Tool Protocolo:", error);
      return "Erro interno ao buscar protocolo.";
    }
  },
};

module.exports = ProtocolTool;
