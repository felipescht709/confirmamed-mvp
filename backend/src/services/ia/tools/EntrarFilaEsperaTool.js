// src/services/ia/tools/EntrarFilaEsperaTool.js
const knex = require("../../../database/db");

const EntrarFilaEsperaTool = {
  definition: {
    type: "function",
    function: {
      name: "entrar_fila_espera",
      description:
        "Insere o paciente na fila de espera para um profissional quando a agenda estiver lotada. " +
        "Use OBRIGATORIAMENTE quando 'verificar_disponibilidade' retornar que a agenda está FECHADA ou LOTADA e o paciente aceitar entrar na fila.",
      parameters: {
        type: "object",
        properties: {
          paciente_id: {
            type: "integer",
            description: "O ID numérico do paciente (obtido do contexto ou da tool upsert_paciente)",
          },
          profissional_id: {
            type: "integer",
            description: "O ID do profissional para o qual o paciente quer aguardar vaga",
          },
          preferencia_turno: {
            type: "string",
            enum: ["MANHA", "TARDE", "NOITE", "QUALQUER"],
            description:
              "Preferência de turno do paciente. Pergunte antes de chamar esta tool. Se o paciente não tiver preferência, use 'QUALQUER'.",
          },
        },
        required: ["paciente_id", "profissional_id", "preferencia_turno"],
      },
    },
  },

  async execute({ paciente_id, profissional_id, preferencia_turno, unidade_id }) {
    if (!unidade_id) return "ERRO: Unidade não identificada.";
    if (!paciente_id || String(paciente_id) === "PENDENTE") {
      return "FALHA: ID do paciente inválido. Chame 'upsert_paciente' primeiro para obter o ID real antes de entrar na fila.";
    }

    // Normaliza preferência de turno (garante que o enum seja respeitado)
    const turnosValidos = ["MANHA", "TARDE", "NOITE", "QUALQUER"];
    const turnoFinal = turnosValidos.includes(preferencia_turno?.toUpperCase())
      ? preferencia_turno.toUpperCase()
      : "QUALQUER";

    try {
      // 1. Verifica se o paciente já está na fila para este profissional/unidade
      const jaNaFila = await knex("fila_espera")
        .where({
          paciente_id,
          profissional_id,
          unidade_id,
          status: "AGUARDANDO",
        })
        .first();

      if (jaNaFila) {
        return (
          `AVISO: O paciente já está na fila de espera para este profissional (Fila ID: ${jaNaFila.id_fila}). ` +
          `Informe que ele será avisado assim que uma vaga abrir. Pergunte se pode ajudá-lo com mais alguma coisa.`
        );
      }

      // 2. Conta quantas pessoas estão à frente na fila (posição)
      const posicao = await knex("fila_espera")
        .where({ profissional_id, unidade_id, status: "AGUARDANDO" })
        .count("id_fila as total")
        .first();

      const posicaoNaFila = parseInt(posicao?.total || 0) + 1;

      // 3. Insere na fila de espera
      const [id_fila] = await knex("fila_espera")
        .insert({
          paciente_id,
          profissional_id,
          unidade_id,
          preferencia_turno: turnoFinal,
          prioridade_clinica: false,
          status: "AGUARDANDO",
          solicitado_em: knex.fn.now(),
        })
        .returning("id_fila");

      const idReal = typeof id_fila === "object" ? id_fila.id_fila : id_fila;

      console.log(
        `📋 [TOOL] Paciente ${paciente_id} adicionado à fila para Profissional ${profissional_id} na Unidade ${unidade_id}. Posição: ${posicaoNaFila}`
      );

      return (
        `SUCESSO! Paciente adicionado à fila de espera (ID Fila: ${idReal}). ` +
        `Posição atual: ${posicaoNaFila}º na fila. Preferência de turno: ${turnoFinal}. ` +
        `Informe ao paciente que ele receberá um aviso pelo WhatsApp assim que uma vaga abrir com este profissional. ` +
        `Pergunte se pode ajudá-lo com mais alguma coisa.`
      );
    } catch (error) {
      console.error("❌ [TOOL] Erro na EntrarFilaEsperaTool:", error);
      return "ERRO CRÍTICO ao tentar adicionar o paciente na fila de espera. Diga ao paciente para tentar novamente em instantes.";
    }
  },
};

module.exports = EntrarFilaEsperaTool;
