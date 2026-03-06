// src/services/core/AvailabilityService.js
const knex = require("../../database/db"); // Caminho ajustado para sua estrutura padrão
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
   * Calcula os slots livres baseando-se na configuração, agendamentos e bloqueios.
   */
  async getAvailableSlots(profissionalId, unidadeId, dataString) {
    // 1. Validação de Data
    let dataAlvo = parseISO(dataString);
    if (!isValid(dataAlvo)) {
      throw new Error("Data inválida.");
    }

    const diaSemana = getDay(dataAlvo); // 0 (Domingo) a 6 (Sábado)

    // 2. Busca Dados em Paralelo (Performance)
    const [configuracao, bloqueios, consultas] = await Promise.all([
      // Configuração da grade do médico
      knex("agenda_configuracao_horario")
        .where({
          profissional_id: profissionalId,
          unidade_id: unidadeId,
          dia_semana: diaSemana,
          ativo: true,
        })
        .first(),

      // Bloqueios manuais (Férias, folgas)
      knex("agenda_bloqueios")
        .where("profissional_id", profissionalId)
        .where("unidade_id", unidadeId) // IMPORTANTE: Filtrar por unidade também
        .andWhere("data_inicio", "<=", endOfDay(dataAlvo))
        .andWhere("data_fim", ">=", startOfDay(dataAlvo)),

      // Consultas já agendadas (Ocupadas)
      knex("consultas")
        .where({
          profissional_id: profissionalId,
          unidade_id: unidadeId, // Opcional: depende se o médico pode estar em 2 lugares
        })
        .whereIn("status", ["AGENDADO", "CONFIRMADO", "EM_ATENDIMENTO"]) // Ignora CANCELADO
        .andWhere("data_hora_inicio", ">=", startOfDay(dataAlvo))
        .andWhere("data_hora_fim", "<=", endOfDay(dataAlvo)),
    ]);

    // 3. Se não tem configuração, não atende
    if (!configuracao) return [];

    // 4. Gerar Slots
    const slots = [];
    const duracaoSlot = configuracao.duracao_slot_minutos || 30;

    // Constrói objeto Date para o início e fim do expediente no dia específico
    const inicioExpediente = this._timeStringToDate(
      dataAlvo,
      configuracao.hora_inicio,
    );
    const fimExpediente = this._timeStringToDate(
      dataAlvo,
      configuracao.hora_fim,
    );

    let cursor = inicioExpediente;

    while (
      isBefore(addMinutes(cursor, duracaoSlot), addMinutes(fimExpediente, 1))
    ) {
      const slotFim = addMinutes(cursor, duracaoSlot);

      const estaLivre = this._checkCollision(
        cursor,
        slotFim,
        consultas,
        bloqueios,
      );

      // Regra de Negócio: Não mostrar horários que já passaram hoje
      const agora = new Date();
      const ehNoPassado = isBefore(cursor, agora);

      if (estaLivre && !ehNoPassado) {
        slots.push({
          start: cursor.toISOString(), // Padrão ISO para o Frontend (React Big Calendar)
          end: slotFim.toISOString(),
          hora_formatada: format(cursor, "HH:mm"),
        });
      }

      cursor = addMinutes(cursor, duracaoSlot);
    }

    return slots;
  }

  /**
   * Método que faltava para o AgendaController funcionar
   */
  async listProfissionaisPorUnidade(unidadeId) {
    return knex("profissionais_da_saude as p")
      .join(
        "profissional_unidade_vinculo as pu",
        "p.id_profissional_saude",
        "pu.profissional_id",
      )
      .where("pu.unidade_id", unidadeId)
      .whereNull("p.deleted_at")
      .select("p.id_profissional_saude", "p.nome_completo", "p.especialidade");
  }

  // --- Métodos Privados Auxiliares ---

  _timeStringToDate(baseDate, timeString) {
    // timeString vem como "08:00:00" ou "08:00"
    const [hours, minutes] = timeString.split(":");
    const date = new Date(baseDate);
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return date;
  }

  _checkCollision(start, end, consultas, bloqueios) {
    // Verifica colisão com Consultas
    const conflitoConsulta = consultas.some((consulta) => {
      const cStart = new Date(consulta.data_hora_inicio);
      const cEnd = new Date(consulta.data_hora_fim);
      return start < cEnd && end > cStart;
    });

    if (conflitoConsulta) return false;

    // Verifica colisão com Bloqueios (Removido o bloqueio_dia_inteiro)
    const conflitoBloqueio = bloqueios.some((bloqueio) => {
      const bStart = new Date(bloqueio.data_inicio);
      const bEnd = new Date(bloqueio.data_fim);
      return start < bEnd && end > bStart;
    });

    if (conflitoBloqueio) return false;

    return true;
  }
}

module.exports = new AvailabilityService();
