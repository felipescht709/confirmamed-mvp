const knex = require("../../database/db.js");

const checkAvailability = async (
  id_profissional,
  id_unidade,
  data_solicitada,
) => {
  try {
    // Correção de Fuso: Parse da ISO garantindo leitura correta no fuso BRT (caso necessário)
    // O ideal é usar o DB para extrair o dia da semana:
    const diaQuery = await knex.raw(
      "SELECT EXTRACT(ISODOW FROM ?::timestamp) as dia",
      [data_solicitada],
    );
    // ISODOW: 1 (Segunda) a 7 (Domingo). Ajuste dependendo de como você mapeou no seu banco.
    const diaSemana = diaQuery.rows[0].dia;

    // 1. Verifica se o profissional atende nesse dia/unidade
    const config = await knex("agenda_config_horarios") // Padrão lowercase
      .where({
        id_profissional: id_profissional, // Padrão id_tabela
        id_unidade: id_unidade,
        dia_semana: diaSemana,
        ativo: true,
      })
      .first();

    if (!config)
      return {
        disponivel: false,
        motivo: "Profissional não atende neste dia.",
      };

    // 2. Verifica se há bloqueios (feriados, folgas)
    const bloqueio = await knex("agenda_bloqueios") // Padrão lowercase
      .where("id_profissional", id_profissional) // Padrão id_tabela
      .andWhere("data_inicio", "<=", data_solicitada)
      .andWhere("data_fim", ">=", data_solicitada)
      .first();

    if (bloqueio)
      return {
        disponivel: false,
        motivo: "Horário bloqueado: " + bloqueio.motivo,
      };

    // 3. Verifica conflito com consultas existentes
    const conflito = await knex("consultas") // Padrão lowercase
      .where({
        id_profissional: id_profissional, // Padrão id_tabela
        status: "AGENDADO",
      })
      // Use cast para garantir comparação de timestamp correta
      .andWhereRaw("data_hora_inicio = ?::timestamp", [data_solicitada])
      .andWhere("deleted_at", null)
      .first();

    if (conflito) return { disponivel: false, motivo: "Horário já ocupado." };

    return {
      disponivel: true,
      slot_duracao: config.duracao_slot_minutos || 30,
    };
  } catch (error) {
    console.error("AVAILABILITY_ERROR:", error);
    throw new Error("Erro ao verificar disponibilidade do profissional.");
  }
};

module.exports = { checkAvailability };
