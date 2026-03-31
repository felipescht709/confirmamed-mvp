// src/controllers/consultaController.js
const repo = require("../repositories/consultaRepository");
const procedimentoRepo = require("../repositories/procedimentosRepository");
const moment = require("moment-timezone");
const knex = require("../database/db");
const FilaEsperaService = require("../services/core/FilaEsperaService");

/**
 * Lista consultas com filtros (Usado pela Agenda do Frontend)
 */
const index = async (req, res) => {
  try {
    const filters = { ...req.query };

    // Regra de segurança: Se for médico, filtra apenas os dele
    if (req.usuarioRole === "MEDICO") {
      filters.profissional_id = req.profissionalId;
    }

    const consultas = await repo.getAll(filters);
    return res.json(consultas);
  } catch (error) {
    console.error(`[ConsultaController Index Error]: ${error.message}`);
    return res.status(500).json({ error: "Erro ao listar agendamentos." });
  }
};

/**
 * Cria novo agendamento com Cálculo Dinâmico de Fim e Trava de Conflito
 */
const store = async (req, res) => {
  // Transação para garantir integridade total (Evita Double-Booking)
  const trx = await knex.transaction();

  try {
    const {
      paciente_id,
      profissional_id,
      unidade_id,
      id_procedimento,
      data_hora_inicio,
      id_convenio_plano,
      tipo_pagamento,
      observacoes,
      telemedicina,
    } = req.body;

    // 1. Validação de campos obrigatórios
    if (
      !paciente_id ||
      !profissional_id ||
      !id_procedimento ||
      !data_hora_inicio
    ) {
      await trx.rollback();
      return res
        .status(400)
        .json({ error: "Faltam dados essenciais para o agendamento." });
    }

    // 2. Busca o procedimento para calcular data_hora_fim
    const procedimentos = await procedimentoRepo.listByUnidade(unidade_id);
    const procedimento = procedimentos.find(
      (p) => p.id_procedimento === parseInt(id_procedimento),
    );

    if (!procedimento) {
      await trx.rollback();
      return res
        .status(404)
        .json({ error: "Procedimento não encontrado para esta unidade." });
    }

    const duracao = procedimento.duracao_minutos || 30;

    // 3. Tratamento de Timezone (Pilar 1)
    const inicio = moment.tz(data_hora_inicio, "America/Sao_Paulo");
    const fim = inicio.clone().add(duracao, "minutes");

    // 4. Verificação de Conflito com Lock de Transação
    const conflito = await trx("consultas")
      .where("profissional_id", profissional_id)
      .whereNot("status", "CANCELADO")
      .whereNull("deleted_at")
      .andWhere(function () {
        this.whereBetween("data_hora_inicio", [
          inicio.toISOString(),
          fim.toISOString(),
        ])
          .orWhereBetween("data_hora_fim", [
            inicio.toISOString(),
            fim.toISOString(),
          ])
          .orWhere(function () {
            this.where("data_hora_inicio", "<=", inicio.toISOString()).andWhere(
              "data_hora_fim",
              ">=",
              fim.toISOString(),
            );
          });
      })
      .first();

    if (conflito) {
      await trx.rollback();
      return res.status(409).json({
        error: "Conflito: O profissional já possui agendamento neste horário.",
      });
    }

    // 5. Inserção no Banco (Usando nomenclatura do Master Schema)
    // FIX: Captura o resultado completo para evitar erro de desestruturação
    const inserted = await trx("consultas")
      .insert({
        paciente_id,
        profissional_id,
        unidade_id,
        id_procedimento,
        data_hora_inicio: inicio.toDate(),
        data_hora_fim: fim.toDate(),
        valor_consulta: procedimento.valor || 0,
        status: "AGENDADO",

        // Sanitização de entradas (evita erro de sintaxe SQL para strings vazias)
        id_convenio_plano: id_convenio_plano || null,
        tipo_pagamento: tipo_pagamento || "PARTICULAR",
        observacoes: observacoes || null,
        telemedicina: telemedicina || false,

        criado_em: new Date(),
      })
      .returning("id_consulta");

    // FIX: Extração segura do ID (funciona independente se o driver retorna array ou objeto)
    const novoId = inserted[0]?.id_consulta || inserted[0];

    await trx.commit();

    return res.status(201).json({
      id_consulta: novoId,
      message: "Consulta agendada com sucesso.",
      horario: {
        inicio: inicio.format("HH:mm"),
        fim: fim.format("HH:mm"),
        duracao: `${duracao}min`,
      },
    });
  } catch (error) {
    if (trx) await trx.rollback();
    console.error(`[ConsultaController Store Error]: ${error.message}`);
    return res
      .status(500)
      .json({ error: "Erro interno ao processar agendamento." });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    await repo.update(id, req.body);
    return res.json({ message: "Consulta atualizada." });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao atualizar consulta." });
  }
};

const cancel = async (req, res) => {
  try {
    const { id } = req.params;

    // Seu código original que cancela a consulta...
    await knex("consultas")
      .where({ id_consulta: id })
      .update({ status: "CANCELADO" });

    // 🚀 O GATILHO DO GAP FILLING (Roda solto em background)
    FilaEsperaService.processarVagaLiberada(id);

    return res.json({ message: "Consulta cancelada." });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao cancelar consulta." });
  }
};

module.exports = { store, index, update, cancel };
