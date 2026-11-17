const { DynamicStructuredTool } = require("@langchain/core/tools");
const { z } = require("zod");
const db = require("../../../database/db");

/**
 * ProtocolTool - Consulta de Preparos (RAG no SQL)
 * Aderente à ISO 42001: Impede a IA de inventar preparos, forçando leitura direta da tabela procedimentos.
 */
const protocolTool = new DynamicStructuredTool({
  name: "consultar_protocolo",
  description:
    "Busca orientações médicas, preparos de jejum, contraindicações e documentos necessários para exames ou procedimentos.",
  schema: z.object({
    nome_exame: z
      .string()
      .describe(
        "Nome do exame. Ex: Ressonância, Endoscopia, Eletrocardiograma, etc.",
      ),
  }),
  func: async ({ nome_exame }) => {
    try {
      // Busca Fuzzy Segura (ILIKE) apenas em procedimentos ativos
      const proc = await db("procedimentos")
        .whereRaw("nome_procedimento ILIKE ?", [`%${nome_exame}%`])
        .where("ativo", true)
        .first();

      if (!proc) {
        return `Nenhum protocolo encontrado para o exame '${nome_exame}'. Oriente o paciente a confirmar o nome do exame ou transferir para a equipe.`;
      }

      return `
        Exame/Procedimento: ${proc.nome_procedimento}
        Preparo Obrigatório: ${proc.preparo_obrigatorio || "Nenhum preparo específico informado."}
        Contraindicações: ${proc.contraindicacoes || "Nenhuma informada."}
        Documentos Necessários: ${proc.documentos_necessarios || "Documento com foto original."}
      `.trim();
    } catch (error) {
      return "Erro técnico ao buscar o protocolo. Solicite que aguarde um momento.";
    }
  },
});

module.exports = protocolTool;
