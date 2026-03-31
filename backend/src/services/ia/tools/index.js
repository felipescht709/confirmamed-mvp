// src/services/ia/tools/index.js
const AvailabilityTool = require("./AvailabilityTool");
const ProtocolTool = require("./ProtocolTool");
const ClinicaTool = require("./ClinicaTool");
const UpsertPacienteTool = require("./UpsertPacienteTool");
const CriarAgendamentoTool = require("./CriarAgendamentoTool");
const ConsultarAgendamentosTool = require("./ConsultarAgendamentosTool");
const CancelarConsultaTool = require("./CancelarConsultaTool");
const ReagendarConsultaTool = require("./ReagendarConsultaTool");
const ConfirmarPresencaTool = require("./ConfirmarPresencaTool");

// Lista bruta de ferramentas
const toolsList = [
  AvailabilityTool,
  ProtocolTool,
  ClinicaTool,
  UpsertPacienteTool,
  CriarAgendamentoTool,
  ConsultarAgendamentosTool,
  CancelarConsultaTool,
  ReagendarConsultaTool,
  ConfirmarPresencaTool,
];

module.exports = {
  getTools: () => {
    // Valida e extrai apenas as definitions corretas
    const validTools = toolsList
      .filter((t) => t && t.definition)
      .map((t) => t.definition);

    // 🔍 DEBUG: Printa as tools no terminal para descobrirmos a culpada
    console.log("🛠️  [DEBUG] Quantidade de Tools válidas:", validTools.length);
    if (validTools.length > 0 && validTools[0] === null) {
      console.error("🚨 ALERTA: A primeira Tool está NULL!");
    }

    // Se o array ficar vazio, retorna undefined para a OpenAI não dar erro 400
    return validTools.length > 0 ? validTools : undefined;
  },

  findTool: (name) => {
    return toolsList.find(
      (t) => t && t.definition && t.definition.function.name === name,
    );
  },
};
