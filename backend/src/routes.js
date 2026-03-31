// backend/routes.js
const express = require("express");
const router = express.Router();
const knex = require("./database/db");

const authController = require("./controllers/authController");
const authMiddleware = require("./middlewares/authMiddleware");
const usuarioController = require("./controllers/usuarioController");
const pacienteController = require("./controllers/pacienteController");
const profissionalController = require("./controllers/profissionalController");
const unidadeController = require("./controllers/unidadeController");
const procedimentoController = require("./controllers/procedimentoController");
const agendaConfigController = require("./controllers/agendaConfigController");
const consultaController = require("./controllers/consultaController");
const agendaBloqueioController = require("./controllers/agendaBloqueioController");
const agendaController = require("./controllers/AgendaController");
const vinculoController = require("./controllers/vinculoController");
const convenioController = require("./controllers/convenioController");
const iaController = require("./controllers/iaController");
const whatsappController = require("./controllers/whatsappController");
const webhookController = require("./controllers/webhookController");
const publicChatController = require("./controllers/publicChatController");

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
router.post("/auth/forgot-password", authController.forgotPassword);
router.post("/auth/reset-password", authController.resetPassword);
router.post("/webhooks/whatsapp", whatsappController.receiveMessage);
router.get("/public/chat/:sessionId", publicChatController.getHistory);
router.post("/public/chat/:sessionId/send", publicChatController.sendMessage);

// 2. ATIVAÇÃO DO FILTRO DE SEGURANÇA (Obrigatório daqui para baixo)
router.use(authMiddleware);

// 3. ROTAS PROTEGIDAS (Precisam de req.usuario.unidade_id)
router.post("/whatsapp/connect", whatsappController.connectInstance);
router.get("/ia/audit-logs", iaController.getAuditLogs);
router.get("/ia/dashboard-stats", iaController.getAuditLogs);
router.get("/ia/monitor", iaController.monitorSessoes);

// usuários
router.get("/usuarios", usuarioController.index);
router.post("/usuarios", usuarioController.store);
router.put("/usuarios/:id", usuarioController.update);
router.patch("/usuarios/senha", usuarioController.alterarSenhaLogado);

// --- UNIDADES ---
router.get("/unidades", unidadeController.index);
router.get("/unidades/:id", unidadeController.show);
router.post("/unidades", unidadeController.store);
router.put("/unidades/:id", unidadeController.update);
router.delete("/unidades/:id", unidadeController.destroy);
router.put("/unidades/:id/config-ia", unidadeController.updateConfigIA);

// --- PROFISSIONAIS ---
router.get("/profissionais", profissionalController.index);
router.get(
  "/profissionais/unidade/:unidade_id",
  profissionalController.getByUnidade,
);
router.post("/profissionais", profissionalController.store);
router.put("/profissionais/:id", profissionalController.update);
router.delete("/profissionais/:id", profissionalController.remove);

// --- PACIENTES ---
router.post("/pacientes", pacienteController.store);
router.get("/pacientes", pacienteController.index);
router.get("/pacientes/:id", pacienteController.show);
router.put("/pacientes/:id", pacienteController.update);
router.delete("/pacientes/:id", pacienteController.destroy);

// --- PROCEDIMENTOS ---
router.post("/procedimentos", procedimentoController.store);
router.get(
  "/procedimentos/unidade/:unidade_id",
  procedimentoController.getByUnidade,
);
router.get("/unidades/:id/procedimentos", procedimentoController.getByUnidade);
router.put("/procedimentos/:id", procedimentoController.update);
router.delete("/procedimentos/:id", procedimentoController.destroy);

// --- GESTÃO DE GRADE HORÁRIA (AGENDA) ---
router.post("/agenda/config", agendaConfigController.store);
router.get("/agenda/config", agendaConfigController.index);
router.put("/agenda/config/:id", agendaConfigController.update);
router.delete("/agenda/config/:id", agendaConfigController.destroy);

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
router.post("/agenda/bloqueios", agendaBloqueioController.store);
router.get("/agenda/bloqueios", agendaBloqueioController.index);
router.put("/agenda/bloqueios/:id", agendaBloqueioController.update);
router.delete("/agenda/bloqueios/:id", agendaBloqueioController.destroy);

// Vínculos
router.get("/vinculos", vinculoController.index);
router.post("/vinculos", vinculoController.store);
router.delete(
  "/vinculos/:profissional_id/:unidade_id",
  vinculoController.destroy,
);

// Convênios
router.get("/convenios", convenioController.indexConvenios);
router.post("/convenios", convenioController.storeConvenio);
router.put("/convenios/:id", convenioController.updateConvenio);
router.delete("/convenios/:id", convenioController.destroyConvenio);

// Planos
router.get("/convenios/:convenio_id/planos", convenioController.indexPlanos);
router.post("/planos", convenioController.storePlano);
router.put("/planos/:id", convenioController.updatePlano);
router.delete("/planos/:id", convenioController.destroyPlano);

module.exports = router;
