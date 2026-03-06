//agendaRepository.js
const knex = require("../database/db");

class AgendaRepository {
  // Busca a grade de horários base (o que o médico "pretende" trabalhar)
  async getConfiguracaoPorDia(profissional_id, unidade_id, dia_semana) {
    return knex("agenda_configuracao_horario")
      .where({
        profissional_id,
        unidade_id,
        dia_semana,
        ativo: true
      })
      .first();
  }

  // Busca agendamentos que ocupam slots (Consultas)
  async getConsultasAgendadas(profissional_id, unidade_id, data) {
    return knex("consultas")
      .where({ profissional_id, unidade_id })
      .whereRaw("data_hora_inicio::date = ?", [data])
      .whereNot("status", "CANCELADO")
      .select("data_hora_inicio", "data_hora_fim");
  }

  // Busca exceções/bloqueios manuais
  async getBloqueiosAtivos(profissional_id, unidade_id, data) {
    return knex("agenda_bloqueios")
      .where({ profissional_id, unidade_id })
      .whereRaw("?::date BETWEEN data_inicio::date AND data_fim::date", [data])
      .select("data_inicio", "data_fim", "bloqueio_dia_inteiro");
  }

  // Para a visão da IA: Busca lista de profissionais por unidade
  async getProfissionaisPorUnidade(unidade_id) {
    return knex("profissionais_da_saude as p")
      .join("profissional_unidade_vinculo as v", "p.id_profissional_saude", "v.profissional_id")
      .where("v.unidade_id", unidade_id)
      .select("p.id_profissional_saude", "p.nome_completo", "p.especialidade");
  }
}

module.exports = new AgendaRepository();