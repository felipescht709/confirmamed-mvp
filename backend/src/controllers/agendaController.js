// src/controllers/AgendaController.js
const availabilityService = require("../services/core/AvailabilityService");

class AgendaController {
  /**
   * GET /api/agenda/disponibilidade
   * Query: profissional_id, unidade_id, data (YYYY-MM-DD)
   */
  async getDisponibilidade(req, res) {
    try {
      const { profissional_id, unidade_id, data } = req.query;

      if (!profissional_id || !unidade_id || !data) {
        return res.status(400).json({
          error: "Campos profissional_id, unidade_id e data são obrigatórios.",
        });
      }

      // Chama o método padronizado getAvailableSlots
      const slots = await availabilityService.getAvailableSlots(
        parseInt(profissional_id),
        parseInt(unidade_id),
        data,
      );

      return res.json({
        metadata: {
          data,
          profissional_id,
          unidade_id,
          total_slots_livres: slots.length,
        },
        slots,
      });
    } catch (error) {
      console.error(`[AgendaController Error]:`, error);
      return res
        .status(500)
        .json({ error: "Erro interno ao processar agenda." });
    }
  }

  /**
   * GET /api/agenda/profissionais/:unidade_id
   */
  async getProfissionaisDaUnidade(req, res) {
    try {
      const { unidade_id } = req.params;
      const profissionais =
        await availabilityService.listProfissionaisPorUnidade(unidade_id);
      return res.json(profissionais);
    } catch (error) {
      console.error("Erro ao buscar profissionais:", error);
      return res.status(500).json({ error: "Erro ao buscar profissionais." });
    }
  }
}

module.exports = new AgendaController();
