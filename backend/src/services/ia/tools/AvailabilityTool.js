const { DynamicStructuredTool } = require("@langchain/core/tools");
const { z } = require("zod");
const AvailabilityService = require("../../core/AvailabilityService");

/**
 * AvailabilityTool - Consulta de Agenda
 * Retorna os "slots" livres sem que a IA precise fazer cálculos de datetime ou fuso horário.
 */
const availabilityTool = new DynamicStructuredTool({
  name: "verificar_disponibilidade",
  description:
    "Verifica os horários livres de um médico/equipamento em uma data específica.",
  schema: z.object({
    profissional_id: z.number().describe("ID do profissional ou equipamento"),
    unidade_id: z.number().describe("ID da unidade de atendimento"),
    data: z.string().describe("Data para buscar horários, formato YYYY-MM-DD"),
  }),
  func: async ({ profissional_id, unidade_id, data }, config) => {
    try {
      const slots = await AvailabilityService.getAvailableSlots(profissional_id, unidade_id, data);
      
      if (slots && slots.length > 0) {
        const formatted = slots.map(s => s.hora_formatada).join(", ");
        return `Horários livres para o profissional ID ${profissional_id} no dia ${data}: ${formatted}. Peça ao paciente para escolher um deles.`;
      }

      // Se a agenda do dia estiver vazia/cheia, busca o dia com horários mais próximo nos próximos 15 dias
      const proximo = await AvailabilityService.getNextAvailableInRange(profissional_id, unidade_id, data, 15);
      if (proximo && proximo.slots && proximo.slots.length > 0) {
        const formatted = proximo.slots.map(s => s.hora_formatada).join(", ");
        return `Não há horários disponíveis para o dia ${data}. O dia disponível mais próximo é ${proximo.data} com os seguintes horários: ${formatted}. Ofereça esta alternativa ao paciente.`;
      }

      return `Não há horários livres para o profissional ID ${profissional_id} nos próximos 15 dias a partir de ${data}. Pergunte se o paciente gostaria de entrar na fila de espera.`;
    } catch (error) {
      console.error("Erro no AvailabilityTool:", error);
      return `Erro ao consultar disponibilidade no banco de dados para a data ${data}: ${error.message}`;
    }
  },
});

module.exports = availabilityTool;

