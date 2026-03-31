// src/services/core/FilaEsperaService.js
const knex = require("../../database/db");
const whatsappService = require("../whatsapp/whatsappService");
const SessionService = require("./SessionService");
const moment = require("moment-timezone");

const FilaEsperaService = {
  async processarVagaLiberada(id_consulta_cancelada) {
    try {
      // 1. Pega os dados da vaga que acabou de abrir
      const vaga = await knex("consultas").where({ id_consulta: id_consulta_cancelada }).first();
      if (!vaga) return;

      // 2. Busca o primeiro paciente da fila aguardando esse médico/unidade
      const pacienteFila = await knex("fila_espera as f")
        .join("pacientes as p", "f.paciente_id", "p.id_paciente")
        .where({
          "f.profissional_id": vaga.profissional_id,
          "f.unidade_id": vaga.unidade_id,
          "f.status": "AGUARDANDO"
        })
        .orderBy("f.data_solicitacao", "asc")
        .select("f.id_fila", "p.id_paciente", "p.nome", "p.telefone")
        .first();

      if (pacienteFila) {
        console.log(`🚀 [Gap Filling] Vaga livre! Oferecendo para ${pacienteFila.nome} (Fila ID: ${pacienteFila.id_fila})`);

        const dataFormatada = moment(vaga.data_hora_inicio).tz("America/Sao_Paulo").format("DD/MM/YYYY [às] HH:mm");
        const primeiroNome = pacienteFila.nome.split(" ")[0];
        
        // 3. Dispara o WhatsApp oferecendo a vaga
        const msg = `Olá, ${primeiroNome}! Surgiu uma desistência e abriu uma vaga com seu médico para ${dataFormatada}.\n\nVocê gostaria de agendar neste horário? (Responda *SIM* para garantir a vaga)`;
        await whatsappService.sendMessage(pacienteFila.telefone, msg);

        // 4. Trava a fila (para não oferecer a mesma vaga pra duas pessoas ao mesmo tempo)
        await knex("fila_espera").where({ id_fila: pacienteFila.id_fila }).update({ status: "NOTIFICADO" });

        // 5. Injeta o contexto na IA para ela saber do que se trata se ele disser "SIM"
        await SessionService.getOrCreateSession(pacienteFila.telefone);
        await SessionService.updateSession(pacienteFila.telefone, "OFERTA_VAGA", {
          paciente_alvo_id: pacienteFila.id_paciente,
          profissional_id: vaga.profissional_id,
          data_hora_inicio: vaga.data_hora_inicio,
          data_hora_fim: vaga.data_hora_fim,
          id_fila: pacienteFila.id_fila
        });
      }
    } catch (error) {
      console.error("❌ [FilaEsperaService] Erro ao processar Gap Filling:", error);
    }
  }
};

module.exports = FilaEsperaService;