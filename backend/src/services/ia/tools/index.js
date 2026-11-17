const protocolTool = require("./ProtocolTool");
const availabilityTool = require("./AvailabilityTool");
const upsertPacienteTool = require("./UpsertPacienteTool");
const criarAgendamentoTool = require("./CriarAgendamentoTool");
const cancelarConsultaTool = require("./CancelarConsultaTool");
const reagendarConsultaTool = require("./ReagendarConsultaTool");
const confirmarPresencaTool = require("./ConfirmarPresencaTool");
const consultarAgendamentosTool = require("./ConsultarAgendamentosTool");
const entrarFilaEsperaTool = require("./EntrarFilaEsperaTool");
const solicitarAtendenteTool = require("./SolicitarAtendenteTool");

// Exposição das ferramentas validadas num único Array
const confirmamedTools = [
  protocolTool,
  availabilityTool,
  upsertPacienteTool,
  criarAgendamentoTool,
  cancelarConsultaTool,
  reagendarConsultaTool,
  confirmarPresencaTool,
  consultarAgendamentosTool,
  entrarFilaEsperaTool,
  solicitarAtendenteTool,
];

module.exports = {
  confirmamedTools,
  protocolTool,
  availabilityTool,
  upsertPacienteTool,
  criarAgendamentoTool,
  cancelarConsultaTool,
  reagendarConsultaTool,
  confirmarPresencaTool,
  consultarAgendamentosTool,
  entrarFilaEsperaTool,
  solicitarAtendenteTool,
};

