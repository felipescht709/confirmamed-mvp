// src/services/ia/tools/AvailabilityTool.js
const AvailabilityService = require("../../core/AvailabilityService");

const AvailabilityTool = {
  definition: {
    type: "function",
    function: {
      name: "verificar_disponibilidade",
      description:
        "Verifica horários livres. Se o paciente pedir 'qualquer dia' ou 'próximo livre', passe a data de amanhã. O sistema buscará automaticamente os próximos 7 dias.",
      parameters: {
        type: "object",
        properties: {
          profissional_id: {
            type: "integer",
            description: "ID do profissional",
          },
          unidade_id: {
            type: "integer",
            description: "ID da unidade (default: 1)",
          },
          data: { type: "string", description: "Data no formato YYYY-MM-DD" },
        },
        required: ["profissional_id", "data"],
      },
    },
  },

  async execute({ profissional_id, unidade_id, data }) {
    if (!profissional_id) {
      return "ERRO: Profissional não identificado.";
    }

    try {
      const dataAlvo = new Date(data + "T00:00:00-03:00");
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      if (dataAlvo < hoje) {
        return "FALHA LÓGICA: A data solicitada já passou. Peça para o paciente escolher uma data a partir de hoje.";
      }

      const idUnidade = unidade_id || 1;

      // 🛠️ NOVO FLUXO: Smart Scan (Busca Automática de Próximos Dias)
      let dataAtualPesquisa = data;
      let slotsLivres = [];
      let diasTentados = 0;
      const limiteBuscaDias = 7; // Quantos dias para frente o backend deve procurar

      while (diasTentados < limiteBuscaDias) {
        console.log(
          `🔎 [TOOL] Verificando agenda para: ${dataAtualPesquisa} | Méd: ${profissional_id}`,
        );

        slotsLivres = await AvailabilityService.getAvailableSlots(
          profissional_id,
          idUnidade,
          dataAtualPesquisa,
        );

        if (slotsLivres && slotsLivres.length > 0) {
          break; // Achou horário livre! Para a busca.
        }

        // Não achou? Adiciona 1 dia na data e tenta de novo no loop
        let [year, month, day] = dataAtualPesquisa.split("-");
        let dateObj = new Date(
          Number(year),
          Number(month) - 1,
          Number(day) + 1,
        );

        let y = dateObj.getFullYear();
        let m = String(dateObj.getMonth() + 1).padStart(2, "0");
        let d = String(dateObj.getDate()).padStart(2, "0");

        dataAtualPesquisa = `${y}-${m}-${d}`;
        diasTentados++;
      }

      // Se passou 7 dias e não achou nada
      if (!slotsLivres || slotsLivres.length === 0) {
        return `A agenda deste profissional está TOTALMENTE FECHADA ou lotada para os próximos 7 dias a partir de ${data}. Informe isso ao paciente e pergunte se ele deseja olhar para a próxima semana ou escolher outro profissional.`;
      }

      // Prepara os horários encontrados
      const horariosFormatados = slotsLivres
        .map((slot) => slot.hora_formatada)
        .join(", ");

      // Se achou no MESMO dia que o usuário pediu
      if (dataAtualPesquisa === data) {
        return `SUCESSO! Dia ${data} possui horários livres. Ofereça estes horários ao paciente: ${horariosFormatados}.`;
      }
      // Se o backend precisou pular dias para achar uma vaga
      else {
        return `O dia ${data} que o usuário pediu estava lotado/fechado. MAS, a busca inteligente encontrou que a PRÓXIMA DATA LIVRE é dia ${dataAtualPesquisa}. Ofereça esta nova data e os seguintes horários: ${horariosFormatados}.`;
      }
    } catch (error) {
      console.error("❌ [TOOL] Erro na AvailabilityTool:", error);
      return "Erro técnico interno ao consultar a agenda. Diga ao paciente que o sistema está instável.";
    }
  },
};

module.exports = AvailabilityTool;
