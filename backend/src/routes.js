// backend/routes.js
const express = require("express");
const router = express.Router();
const knex = require("./database/db");

const authController = require("./controllers/authController");
const authMiddleware = require("./middlewares/authMiddleware");
const checkPermission = require("./middlewares/checkPermission");
const usuarioController = require("./controllers/usuarioController");
const pacienteController = require("./controllers/pacienteController");
const profissionalController = require("./controllers/profissionalController");
const unidadeController = require("./controllers/unidadeController");
const procedimentoController = require("./controllers/procedimentoController");
const agendaConfigController = require("./controllers/agendaConfigController");
const consultaController = require("./controllers/consultaController");
const agendaBloqueioController = require("./controllers/agendaBloqueioController");
const agendaController = require("./controllers/agendaController");
const filaEsperaController = require("./controllers/filaEsperaController");
const stripeController = require("./controllers/stripeController");
const vinculoController = require("./controllers/vinculoController");
const convenioController = require("./controllers/convenioController");
const iaController = require("./controllers/iaController");
const whatsappController = require("./controllers/whatsappController");
// A6: webhookController removido — sem rotas registradas (dead import)
// Arquivo mantido em /controllers/_deprecated/webhookController.js para histórico
const publicChatController = require("./controllers/publicChatController");
const googleAuthController = require("./controllers/googleAuthController");

// 1. ROTAS PÚBLICAS (NÃO precisam de token)
router.get("/healthcheck", async (req, res) => {
  try {
    // Tenta realizar uma operação matemática simples no banco
    await knex.raw("SELECT 1+1 AS result");
    return res.json({
      status: "online",
      database: "conectado",
      timestamp: new Date(),
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      database: "desconectado",
      message: error.message,
    });
  }
});

router.post("/login", authController.login);
router.post("/auth/register", authController.register);
router.post("/auth/forgot-password", authController.forgotPassword);
router.post("/auth/reset-password", authController.resetPassword);
router.post("/webhooks/whatsapp", whatsappController.receiveMessage);
router.get("/public/chat/:sessionId", publicChatController.getHistory);
router.post("/public/chat/:sessionId/send", publicChatController.sendMessage);

// Callback do Google (Público, pois é redirecionado do servidor do Google sem Header JWT)
router.get("/google/callback", googleAuthController.callback);

// 2. ATIVAÇÃO DO FILTRO DE SEGURANÇA (Obrigatório daqui para baixo)
router.use(authMiddleware);

// 3. ROTAS PROTEGIDAS (Precisam de req.usuario.unidade_id)
router.get("/google/auth", googleAuthController.auth); // Rota para gerar link de auth

router.post("/whatsapp/connect", checkPermission('configurar_ia'), whatsappController.connectInstance);
router.get("/whatsapp/status", whatsappController.getInstanceStatus);
router.post("/whatsapp/disconnect", checkPermission('configurar_ia'), whatsappController.disconnectInstance);
router.get("/ia/notifications/recent", iaController.getRecentNotifications);
router.get("/ia/audit-logs", checkPermission('acessar_monitor_ia'), iaController.getAuditLogs);
router.get("/ia/dashboard-stats", checkPermission('ver_indicadores'), iaController.getDashboardStats);
router.get("/ia/monitor", checkPermission('acessar_monitor_ia'), iaController.monitorSessoes);
router.post("/ia/intervir", checkPermission('intervir_ia'), iaController.intervirSessao);
router.post("/ia/chat/:sessionId/send", checkPermission('intervir_ia'), iaController.sendMessageAdmin);
router.post("/ia/test-prompt", checkPermission('configurar_ia'), iaController.testPrompt);
router.post("/ai/analyze", iaController.webAnalyze);

// usuários
router.get("/usuarios", checkPermission('gerenciar_usuarios'), usuarioController.index);
router.post("/usuarios", checkPermission('gerenciar_usuarios'), usuarioController.store);
router.put("/usuarios/:id", checkPermission('gerenciar_usuarios'), usuarioController.update);
router.patch("/usuarios/senha", usuarioController.alterarSenhaLogado);

// --- UNIDADES ---
router.get("/unidades", checkPermission('gerenciar_usuarios'), unidadeController.index);
router.get("/unidades/:id", checkPermission('gerenciar_usuarios'), unidadeController.show);
router.post("/unidades", checkPermission('gerenciar_usuarios'), unidadeController.store);
router.put("/unidades/:id", checkPermission('gerenciar_usuarios'), unidadeController.update);
router.delete("/unidades/:id", checkPermission('gerenciar_usuarios'), unidadeController.destroy);
router.put("/unidades/:id/config-ia", checkPermission('configurar_ia'), unidadeController.updateConfigIA);

// --- PROFISSIONAIS ---
router.get("/profissionais", profissionalController.index);
router.get(
  "/profissionais/unidade/:unidade_id",
  profissionalController.getByUnidade,
);
router.post("/profissionais", checkPermission('gerenciar_profissionais'), profissionalController.store);
router.put("/profissionais/:id", checkPermission('gerenciar_profissionais'), profissionalController.update);
router.delete("/profissionais/:id", checkPermission('gerenciar_profissionais'), profissionalController.remove);

// --- PACIENTES ---
router.post("/pacientes", checkPermission('editar_pacientes'), pacienteController.store);
router.get("/pacientes", checkPermission('ver_pacientes'), pacienteController.index);
router.get("/pacientes/:id", checkPermission('ver_pacientes'), pacienteController.show);
router.put("/pacientes/:id", checkPermission('editar_pacientes'), pacienteController.update);
router.delete("/pacientes/:id", checkPermission('editar_pacientes'), pacienteController.destroy);

// --- PROCEDIMENTOS ---
router.post("/procedimentos", checkPermission('gerenciar_procedimentos'), procedimentoController.store);
router.get(
  "/procedimentos/unidade/:unidade_id",
  procedimentoController.getByUnidade,
);
router.get("/unidades/:id/procedimentos", procedimentoController.getByUnidade);
router.put("/procedimentos/:id", checkPermission('gerenciar_procedimentos'), procedimentoController.update);
router.delete("/procedimentos/:id", checkPermission('gerenciar_procedimentos'), procedimentoController.destroy);

// --- GESTÃO DE GRADE HORÁRIA (AGENDA) ---
router.post("/agenda/config", checkPermission('gerenciar_profissionais'), agendaConfigController.store);
router.get("/agenda/config", checkPermission('gerenciar_profissionais'), agendaConfigController.index);
router.put("/agenda/config/:id", checkPermission('gerenciar_profissionais'), agendaConfigController.update);
router.delete("/agenda/config/:id", checkPermission('gerenciar_profissionais'), agendaConfigController.destroy);

// --- DISPONIBILIDADE (Para o Modal de Agendamento) --- [NOVO]
router.get("/agenda/disponibilidade", agendaController.getDisponibilidade);
router.get(
  "/agenda/profissionais/:unidade_id",
  agendaController.getProfissionaisDaUnidade,
);

// --- AGENDAMENTOS (O Core) ---
router.post("/consultas", consultaController.store);
router.get("/consultas", consultaController.index);
router.put("/consultas/:id", consultaController.update);
router.delete("/consultas/:id", consultaController.cancel);

// --- BLOQUEIOS DE AGENDA ---
router.post("/agenda/bloqueios", checkPermission('editar_agenda_geral'), agendaBloqueioController.store);
router.get("/agenda/bloqueios", agendaBloqueioController.index);
router.put("/agenda/bloqueios/:id", checkPermission('editar_agenda_geral'), agendaBloqueioController.update);
router.delete("/agenda/bloqueios/:id", checkPermission('editar_agenda_geral'), agendaBloqueioController.destroy);

// --- FILA DE ESPERA ---
router.get("/fila-espera", checkPermission('gerenciar_fila_espera'), filaEsperaController.index);
router.post("/fila-espera", checkPermission('gerenciar_fila_espera'), filaEsperaController.store);
router.delete("/fila-espera/:id", checkPermission('gerenciar_fila_espera'), filaEsperaController.destroy);

// --- ASSINATURAS (STRIPE) ---
router.post("/pagamento/checkout", checkPermission('gerenciar_assinatura_app'), stripeController.createCheckoutSession);
router.post("/pagamento/portal", checkPermission('gerenciar_assinatura_app'), stripeController.createPortalSession);

// Vínculos
router.get("/vinculos", checkPermission('gerenciar_profissionais'), vinculoController.index);
router.post("/vinculos", checkPermission('gerenciar_profissionais'), vinculoController.store);
router.delete(
  "/vinculos/:profissional_id/:unidade_id",
  checkPermission('gerenciar_profissionais'),
  vinculoController.destroy,
);

// Convênios
router.get("/convenios", convenioController.indexConvenios);
router.post("/convenios", checkPermission('gerenciar_procedimentos'), convenioController.storeConvenio);
router.put("/convenios/:id", checkPermission('gerenciar_procedimentos'), convenioController.updateConvenio);
router.delete("/convenios/:id", checkPermission('gerenciar_procedimentos'), convenioController.destroyConvenio);

// Planos
router.get("/convenios/:convenio_id/planos", convenioController.indexPlanos);
router.post("/planos", checkPermission('gerenciar_procedimentos'), convenioController.storePlano);
router.put("/planos/:id", checkPermission('gerenciar_procedimentos'), convenioController.updatePlano);
router.delete("/planos/:id", checkPermission('gerenciar_procedimentos'), convenioController.destroyPlano);

module.exports = router;

