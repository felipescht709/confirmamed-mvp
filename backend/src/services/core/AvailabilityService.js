// src/services/core/AvailabilityService.js
const knex = require("../../database/db");
const moment = require("moment-timezone");
class AvailabilityService {
  /**
   * 1. GERAÇÃO DE GRADE: Retorna array de horários livres em um dia.
   */
  async getAvailableSlots(profissionalId, unidadeId, dataString) {
    let dataAlvo = moment.tz(dataString, "America/Sao_Paulo");
    if (!dataAlvo.isValid()) throw new Error("Data inválida.");

    // dia_semana do moment: 0 (Dom) a 6 (Sáb)
    const diaSemana = dataAlvo.day(); 
    const diaInicio = dataAlvo.clone().startOf("day").toISOString();
    const diaFim    = dataAlvo.clone().endOf("day").toISOString();

    const [configuracao, bloqueios, consultas] = await Promise.all([
      knex("agenda_configuracao_horario")
        .where({ profissional_id: profissionalId, unidade_id: unidadeId, dia_semana: diaSemana, ativo: true })
        .first(),

      knex("agenda_bloqueios")
        .where({ profissional_id: profissionalId, unidade_id: unidadeId })
        .andWhere("data_inicio", "<=", diaFim)
        .andWhere("data_fim", ">=", diaInicio),

      knex("consultas")
        .where({ profissional_id: profissionalId, unidade_id: unidadeId })
        .whereIn("status", ["AGENDADO", "CONFIRMADA", "EM_ATENDIMENTO"])
        .whereNull("deleted_at")
        .andWhere("data_hora_inicio", ">=", diaInicio)
        .andWhere("data_hora_fim", "<=", diaFim),
    ]);

    if (!configuracao) return [];

    const slots = [];
    const duracaoSlot = configuracao.duracao_slot_minutos || 30;
    
    // Constrói horários baseados no fuso SP
    let cursor = moment.tz(`${dataString} ${configuracao.hora_inicio}`, "YYYY-MM-DD HH:mm:ss", "America/Sao_Paulo");
    const fimExpediente = moment.tz(`${dataString} ${configuracao.hora_fim}`, "YYYY-MM-DD HH:mm:ss", "America/Sao_Paulo");
    
    const agora = moment.tz("America/Sao_Paulo");

    while (cursor.isBefore(fimExpediente)) {
      const slotFim = cursor.clone().add(duracaoSlot, "minutes");
      if (slotFim.isAfter(fimExpediente)) break;

      const estaLivre = this._checkCollision(cursor, slotFim, consultas, bloqueios);
      const ehNoPassado = cursor.isBefore(agora);

      if (estaLivre && !ehNoPassado) {
        slots.push({
          start: cursor.toISOString(),
          end: slotFim.toISOString(),
          hora_formatada: cursor.format("HH:mm"),
        });
      }
      cursor.add(duracaoSlot, "minutes");
    }

    return slots;
  }

  async getNextAvailableInRange(profissionalId, unidadeId, dataInicio, diasParaFrente = 7) {
    const inicio = moment.tz(dataInicio, "America/Sao_Paulo");
    if (!inicio.isValid()) throw new Error("Data de início inválida.");

    const fimRange = inicio.clone().add(diasParaFrente, "days").endOf("day");
    const inicioISO = inicio.clone().startOf("day").toISOString();
    const fimISO    = fimRange.toISOString();

    const [configuracoes, bloqueios, consultas] = await Promise.all([
      knex("agenda_configuracao_horario")
        .where({ profissional_id: profissionalId, unidade_id: unidadeId, ativo: true })
        .select("dia_semana", "hora_inicio", "hora_fim", "duracao_slot_minutos"),

      knex("agenda_bloqueios")
        .where({ profissional_id: profissionalId, unidade_id: unidadeId })
        .andWhere("data_inicio", "<=", fimISO)
        .andWhere("data_fim",    ">=", inicioISO),

      knex("consultas")
        .where({ profissional_id: profissionalId, unidade_id: unidadeId })
        .whereIn("status", ["AGENDADO", "CONFIRMADA", "EM_ATENDIMENTO"])
        .whereNull("deleted_at")
        .andWhere("data_hora_inicio", ">=", inicioISO)
        .andWhere("data_hora_fim",    "<=", fimISO)
        .select("data_hora_inicio", "data_hora_fim"),
    ]);

    const configPorDia = {};
    configuracoes.forEach(c => { configPorDia[c.dia_semana] = c; });

    const agora = moment.tz("America/Sao_Paulo");

    for (let i = 0; i < diasParaFrente; i++) {
      const dataAlvo = inicio.clone().add(i, "days");
      const config = configPorDia[dataAlvo.day()];
      if (!config) continue;

      const duracaoSlot = config.duracao_slot_minutos || 30;
      let cursor = moment.tz(`${dataAlvo.format("YYYY-MM-DD")} ${config.hora_inicio}`, "YYYY-MM-DD HH:mm:ss", "America/Sao_Paulo");
      const fimExp = moment.tz(`${dataAlvo.format("YYYY-MM-DD")} ${config.hora_fim}`, "YYYY-MM-DD HH:mm:ss", "America/Sao_Paulo");

      const slots = [];
      while (cursor.isBefore(fimExp)) {
        const slotFim = cursor.clone().add(duracaoSlot, "minutes");
        if (slotFim.isAfter(fimExp)) break;

        const estaLivre = this._checkCollision(cursor, slotFim, consultas, bloqueios);
        const ehPassado = cursor.isBefore(agora);

        if (estaLivre && !ehPassado) {
          slots.push({
            start: cursor.toISOString(),
            end: slotFim.toISOString(),
            hora_formatada: cursor.format("HH:mm"),
          });
        }
        cursor.add(duracaoSlot, "minutes");
      }

      if (slots.length > 0) {
        return {
          data: dataAlvo.format("YYYY-MM-DD"),
          slots,
        };
      }
    }

    return null;
  }

  async isSlotAvailable(profissional_id, data_hora_inicio, data_hora_fim, trx = knex) {
    const inicioIso = moment.tz(data_hora_inicio, "America/Sao_Paulo").toISOString();
    const fimIso = moment.tz(data_hora_fim, "America/Sao_Paulo").toISOString();

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
      .forUpdate()
      .first();

    if (conflitoConsulta) return false;

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

  async listProfissionaisPorUnidade(unidadeId) {
    return knex("profissionais_da_saude as p")
      .join("profissional_unidade_vinculo as pu", "p.id_profissional_saude", "pu.profissional_id")
      .where("pu.unidade_id", unidadeId)
      .where("p.ativo", true) // Apenas ativos
      .whereNull("p.deleted_at")
      .select("p.id_profissional_saude", "p.nome_completo", "p.especialidade");
  }

  _checkCollision(start, end, consultas, bloqueios) {
    const s = moment(start);
    const e = moment(end);

    const conflitoConsulta = consultas.some((c) => {
      const cStart = moment(c.data_hora_inicio);
      const cEnd = moment(c.data_hora_fim);
      return s.isBefore(cEnd) && e.isAfter(cStart);
    });
    if (conflitoConsulta) return false;

    const conflitoBloqueio = bloqueios.some((b) => {
      const bStart = moment(b.data_inicio);
      const bEnd = moment(b.data_fim);
      return s.isBefore(bEnd) && e.isAfter(bStart);
    });
    if (conflitoBloqueio) return false;

    return true;
  }
}

module.exports = new AvailabilityService();