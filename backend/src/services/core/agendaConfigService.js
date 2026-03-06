// src/services/core/AgendaConfigService.js
const knex = require("../../database/db");

class AgendaConfigService {
  async validarConflitoUnidades(
    profissional_id,
    dia_semana,
    hora_inicio,
    hora_fim,
    unidade_id_atual,
  ) {
    const conflito = await knex("agenda_configuracao_horario")
      .where({ profissional_id, dia_semana, ativo: true })
      .whereNot("unidade_id", unidade_id_atual) // Verifica em OUTRAS unidades
      .andWhere(function () {
        this.whereRaw("?::time < hora_fim AND ?::time > hora_inicio", [
          hora_inicio,
          hora_fim,
        ]);
      })
      .first();

    if (conflito) {
      throw new Error(
        `Conflito: O profissional já atende em outra unidade neste horário (Dia ${dia_semana}).`,
      );
    }
    return true;
  }
}
module.exports = new AgendaConfigService();
