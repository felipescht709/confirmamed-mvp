// backend/src/routesPublic.js
const express = require("express");
const router = express.Router();
const apiKeyAuth = require("./middlewares/apiKeyAuth");

// Controllers
const pacienteController = require("./controllers/pacienteController");
const consultaController = require("./controllers/consultaController");
const profissionalController = require("./controllers/profissionalController");
const procedimentoController = require("./controllers/procedimentoController");

// Todas as rotas neste arquivo DEVEM passar pelo filtro de API Key
router.use(apiKeyAuth);

/**
 * @swagger
 * /pacientes:
 *   get:
 *     tags: [Pacientes]
 *     summary: Lista todos os pacientes da clínica.
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Sucesso. Retorna a lista de pacientes.
 *   post:
 *     tags: [Pacientes]
 *     summary: Cria um novo paciente.
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       201:
 *         description: Paciente criado com sucesso.
 */
router.get("/pacientes", pacienteController.index);
router.post("/pacientes", pacienteController.store);

/**
 * @swagger
 * /consultas:
 *   get:
 *     tags: [Agenda]
 *     summary: Lista a agenda de consultas.
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Sucesso. Retorna a lista de agendamentos.
 *   post:
 *     tags: [Agenda]
 *     summary: Agenda uma nova consulta.
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       201:
 *         description: Consulta agendada.
 */
router.get("/consultas", consultaController.index);
router.post("/consultas", consultaController.store);

/**
 * @swagger
 * /profissionais:
 *   get:
 *     tags: [Profissionais]
 *     summary: Lista os profissionais cadastrados na clínica.
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Sucesso.
 */
// Usamos a função getByUnidade adaptada via middleware: req.params.unidade_id ou req.usuario.unidade_id
router.get("/profissionais", (req, res, next) => {
    // Adapter for getByUnidade
    req.params.unidade_id = req.usuario.unidade_id;
    profissionalController.getByUnidade(req, res, next);
});

/**
 * @swagger
 * /procedimentos:
 *   get:
 *     tags: [Procedimentos]
 *     summary: Lista o catálogo de procedimentos oferecidos pela clínica.
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Sucesso.
 */
router.get("/procedimentos", (req, res, next) => {
    // Adapter for getByUnidade
    req.params.unidade_id = req.usuario.unidade_id;
    procedimentoController.getByUnidade(req, res, next);
});

module.exports = router;
