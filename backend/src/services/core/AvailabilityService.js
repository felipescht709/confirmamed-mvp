// src/services/core/AvailabilityService.js
const knex = require("../../database/db");
const moment = require("moment-timezone");
const {
  parseISO,
  format,
  addMinutes,
  isBefore,
  isValid,
  getDay,
  startOfDay,
  endOfDay,
} = require("date-fns");

class AvailabilityService {
  /**
   * 1. GERAÇÃO DE GRADE: Retorna array de horários livres em um dia.
   * Usado pela AvailabilityTool (IA) e pela tela de Agenda (React).
   */
  async getAvailableSlots(profissionalId, unidadeId, dataString) {
    let dataAlvo = parseISO(dataString);
    if (!isValid(dataAlvo)) throw new Error("Data inválida.");

    // JS getDay(): 0 (Dom) a 6 (Sáb). Garanta que seu banco salva nesse formato.
    const diaSemana = getDay(dataAlvo); 

    const [configuracao, bloqueios, consultas] = await Promise.all([
      knex("agenda_configuracao_horario")
        .where({ profissional_id: profissionalId, unidade_id: unidadeId, dia_semana: diaSemana, ativo: true })
        .first(),

      knex("agenda_bloqueios")
        .where({ profissional_id: profissionalId, unidade_id: unidadeId })
        .andWhere("data_inicio", "<=", endOfDay(dataAlvo).toISOString())
        .andWhere("data_fim", ">=", startOfDay(dataAlvo).toISOString()),

      knex("consultas")
        .where({ profissional_id: profissionalId, unidade_id: unidadeId })
        .whereIn("status", ["AGENDADO", "CONFIRMADA", "EM_ATENDIMENTO"])
        .whereNull("deleted_at")
        .andWhere("data_hora_inicio", ">=", startOfDay(dataAlvo).toISOString())
        .andWhere("data_hora_fim", "<=", endOfDay(dataAlvo).toISOString()),
    ]);

    if (!configuracao) return [];

    const slots = [];
    const duracaoSlot = configuracao.duracao_slot_minutos || 30;
    const inicioExpediente = this._timeStringToDate(dataAlvo, configuracao.hora_inicio);
    const fimExpediente = this._timeStringToDate(dataAlvo, configuracao.hora_fim);

    let cursor = inicioExpediente;
    const agora = new Date();

    while (isBefore(addMinutes(cursor, duracaoSlot), addMinutes(fimExpediente, 1))) {
      const slotFim = addMinutes(cursor, duracaoSlot);
      const estaLivre = this._checkCollision(cursor, slotFim, consultas, bloqueios);
      const ehNoPassado = isBefore(cursor, agora);

      if (estaLivre && !ehNoPassado) {
        slots.push({
          start: cursor.toISOString(),
          end: slotFim.toISOString(),
          hora_formatada: format(cursor, "HH:mm"),
        });
      }
      cursor = addMinutes(cursor, duracaoSlot);
    }

    return slots;
  }

  /**
   * 2. TRAVA DE INTEGRIDADE (OVERBOOKING): Valida um slot específico abrindo lock.
   * OBRIGATÓRIO usar na rota de criação (Controller) e na CriarAgendamentoTool.
   */
  async isSlotAvailable(profissional_id, data_hora_inicio, data_hora_fim, trx = knex) {
    const inicioIso = moment.tz(data_hora_inicio, "America/Sao_Paulo").toISOString();
    const fimIso = moment.tz(data_hora_fim, "America/Sao_Paulo").toISOString();

    // 1. Verifica Consultas Concorrentes (PESSIMISTIC LOCK)
    const conflitoConsulta = await trx("consultas")
      .where("profissional_id", profissional_id)
      .whereNotIn("status", ["CANCELADO", "FALTOU"])
      .whereNull("deleted_at")
      .andWhere(function () {
        this.whereBetween("data_hora_inicio", [inicioIso, fimIso])
          .orWhereBetween("data_hora_fim", [inicioIso, fimIso])
          .orWhere(function () {
            this.where("data_hora_inicio", "<=", inicioIso)
                .andWhere("data_hora_fim", ">=", fimIso);
          });
      })
      .forUpdate() // 🔒 Evita que 2 requests leiam o slot livre no mesmo milissegundo
      .first();

    if (conflitoConsulta) return false;

    // 2. Verifica Bloqueios Manuais
    const conflitoBloqueio = await trx("agenda_bloqueios")
      .where("profissional_id", profissional_id)
      .andWhere(function() {
         this.whereBetween("data_inicio", [inicioIso, fimIso])
             .orWhereBetween("data_fim", [inicioIso, fimIso])
             .orWhere(function() {
                this.where("data_inicio", "<=", inicioIso)
                    .andWhere("data_fim", ">=", fimIso);
             });
      })
      .first();

    if (conflitoBloqueio) return false;

    return true; 
  }

  /**
   * Lista profissionais vinculados à unidade (Helper)
   */
  async listProfissionaisPorUnidade(unidadeId) {
    return knex("profissionais_da_saude as p")
      .join("profissional_unidade_vinculo as pu", "p.id_profissional_saude", "pu.profissional_id")
      .where("pu.unidade_id", unidadeId)
      .whereNull("p.deleted_at")
      .select("p.id_profissional_saude", "p.nome_completo", "p.especialidade");
  }

  // --- Métodos Privados Auxiliares ---
  _timeStringToDate(baseDate, timeString) {
    const [hours, minutes] = timeString.split(":");
    const date = new Date(baseDate);
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return date;
  }

  _checkCollision(start, end, consultas, bloqueios) {
    const conflitoConsulta = consultas.some((c) => {
      const cStart = new Date(c.data_hora_inicio);
      const cEnd = new Date(c.data_hora_fim);
      return start < cEnd && end > cStart;
    });
    if (conflitoConsulta) return false;

    const conflitoBloqueio = bloqueios.some((b) => {
      const bStart = new Date(b.data_inicio);
      const bEnd = new Date(b.data_fim);
      return start < bEnd && end > bStart;
    });
    if (conflitoBloqueio) return false;

    return true;
  }
}

module.exports = new AvailabilityService();