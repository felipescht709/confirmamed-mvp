const cron = require("node-cron");
const knex = require("../../database/db");
const whatsappService = require("../whatsapp/whatsappService");
const SessionService = require("../core/SessionService");
const FilaEsperaService = require("../core/FilaEsperaService");
const moment = require("moment-timezone");

class AgendaCronJob {
  start() {
    // Executa as verificações a cada 5 minutos
    cron.schedule("*/5 * * * *", async () => {
      console.log("🕒 [AgendaCronJob] Verificando rotinas de lembretes e confirmações...");
      await this.verificarConfirmacoes();
      await this.verificarLembretesReforco();
    });

    // Roda a cada 1 hora para verificar a fila de espera
    cron.schedule("0 * * * *", async () => {
      await FilaEsperaService.verificarNotificacoesExpiradas();
    });
  }

  /**
   * Envia as mensagens interativas de confirmação configuradas pela clínica em minutos.
   */
  async verificarConfirmacoes() {
    try {
      // Buscar consultas ativas 'PENDENTE' no futuro
      const consultas = await knex("consultas as c")
        .join("pacientes as p", "c.paciente_id", "p.id_paciente")
        .join("unidades_atendimento as ua", "c.unidade_id", "ua.id_unidade")
        .where("c.status_confirmacao", "PENDENTE")
        .andWhere("c.status", "AGENDADO")
        .andWhere("c.data_hora_inicio", ">", knex.fn.now())
        .select(
          "c.id_consulta",
          "c.data_hora_inicio",
          "p.nome",
          "p.telefone",
          "c.unidade_id",
          "ua.whatsapp_instance_name",
          "ua.nome_fantasia",
          "ua.confirmacao_automatica_ativa",
          "ua.lembretes_config_minutos",
          "ua.lembretes_config_horas"
        );

      console.log(`[AgendaCronJob] Processando confirmações para ${consultas.length} consultas pendentes.`);

      for (const consulta of consultas) {
        if (!consulta.telefone || !consulta.confirmacao_automatica_ativa) continue;

        // Resolve os gatilhos configurados da unidade em minutos
        let gatilhosMinutos = [1440]; // Default 24h
        if (consulta.lembretes_config_minutos && consulta.lembretes_config_minutos.length > 0) {
          gatilhosMinutos = consulta.lembretes_config_minutos;
        } else if (consulta.lembretes_config_horas && consulta.lembretes_config_horas.length > 0) {
          gatilhosMinutos = consulta.lembretes_config_horas.map(h => h * 60);
        }

        // Calcula a diferença em minutos
        const difMinutos = moment(consulta.data_hora_inicio).diff(moment(), 'minutes');

        for (const gatilho of gatilhosMinutos) {
          // Se estiver na janela de disparo (gatilho +/- 10 minutos)
          if (difMinutos >= gatilho - 10 && difMinutos <= gatilho + 10) {
            // Verifica se já enviou
            const logExiste = await knex("comunicacoes_log")
              .where({ id_consulta: consulta.id_consulta, tipo_gatilho_horas: gatilho })
              .first();

            if (!logExiste) {
              console.log(`[AgendaCronJob] Enviando confirmação de ${gatilho} min para consulta ID ${consulta.id_consulta}`);
              
              // Atualiza sessão para CONFIRMACAO
              const jid = consulta.telefone.includes("@") ? consulta.telefone : `${consulta.telefone}@s.whatsapp.net`;
              await SessionService.updateSession(jid, consulta.unidade_id, "CONFIRMACAO", {
                consulta_confirmacao_id: consulta.id_consulta
              });

              // Monta e envia a mensagem
              const dataFormatada = moment(consulta.data_hora_inicio).format("DD/MM/YYYY");
              const horaFormatada = moment(consulta.data_hora_inicio).format("HH:mm");
              const mensagem = `Olá, ${consulta.nome}! Somos da clínica ${consulta.nome_fantasia}.\n\nGostaríamos de confirmar o seu agendamento para o dia *${dataFormatada}* às *${horaFormatada}*.\n\nResponda *SIM* para confirmar sua presença, ou *NÃO* caso precise reagendar ou cancelar.`;

              try {
                await whatsappService.sendTextMessage(
                  consulta.telefone,
                  mensagem,
                  consulta.whatsapp_instance_name
                );

                // Grava log
                await knex("comunicacoes_log").insert({
                  id_consulta: consulta.id_consulta,
                  tipo_gatilho_horas: gatilho,
                  status: "ENVIADO",
                  canal: "WHATSAPP",
                  enviado_em: new Date()
                });
              } catch (err) {
                console.error(`Erro ao enviar confirmação de ${gatilho} min para ${consulta.telefone}:`, err.message);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Erro no verificarConfirmacoes do AgendaCronJob:", error);
    }
  }

  /**
   * Envia o lembrete padrão de reforço de compromisso 1h antes da consulta.
   */
  async verificarLembretesReforco() {
    try {
      // Buscar consultas ativas nas próximas 1h (entre 50 e 70 minutos)
      const thresholdMin = moment().add(50, 'minutes').toDate();
      const thresholdMax = moment().add(70, 'minutes').toDate();

      const consultas = await knex("consultas as c")
        .join("pacientes as p", "c.paciente_id", "p.id_paciente")
        .join("profissionais_da_saude as pro", "c.profissional_id", "pro.id_profissional_saude")
        .join("unidades_atendimento as ua", "c.unidade_id", "ua.id_unidade")
        .where("c.status", "AGENDADO")
        .andWhereBetween("c.data_hora_inicio", [thresholdMin, thresholdMax])
        .select(
          "c.id_consulta",
          "c.data_hora_inicio",
          "c.status_confirmacao",
          "p.nome as paciente_nome",
          "p.telefone as paciente_telefone",
          "pro.nome_completo as profissional_nome",
          "c.unidade_id",
          "ua.whatsapp_instance_name",
          "ua.nome_fantasia",
          "ua.confirmacao_automatica_ativa"
        );

      console.log(`[AgendaCronJob] Processando lembretes de reforço de 1h para ${consultas.length} consultas.`);

      for (const consulta of consultas) {
        if (!consulta.paciente_telefone || !consulta.confirmacao_automatica_ativa) continue;

        // Verifica se já enviou o lembrete de reforço de 1h (gatilho = -60)
        const logExiste = await knex("comunicacoes_log")
          .where({ id_consulta: consulta.id_consulta, tipo_gatilho_horas: -60 })
          .first();

        if (!logExiste) {
          console.log(`[AgendaCronJob] Enviando lembrete de reforço de 1h para consulta ID ${consulta.id_consulta}`);

          const horaFormatada = moment(consulta.data_hora_inicio).format("HH:mm");
          
          let mensagem = "";
          if (consulta.status_confirmacao === "CONFIRMADO") {
            mensagem = `Olá, ${consulta.paciente_nome}! Lembramos que sua consulta com o(a) Dr(a). ${consulta.profissional_nome} está *CONFIRMADA* para hoje às *${horaFormatada}* na clínica ${consulta.nome_fantasia}. Estamos te aguardando!`;
          } else {
            mensagem = `Olá, ${consulta.paciente_nome}! Lembramos de sua consulta agendada com o(a) Dr(a). ${consulta.profissional_nome} para hoje às *${horaFormatada}* na clínica ${consulta.nome_fantasia}. Caso não possa comparecer, por favor nos avise.`;
          }

          try {
            await whatsappService.sendTextMessage(
              consulta.paciente_telefone,
              mensagem,
              consulta.whatsapp_instance_name
            );

            // Grava log
            await knex("comunicacoes_log").insert({
              id_consulta: consulta.id_consulta,
              tipo_gatilho_horas: -60, // Gatilho negativo para sinalizar lembrete de reforço
              status: "ENVIADO",
              canal: "WHATSAPP",
              enviado_em: new Date()
            });
          } catch (err) {
            console.error(`Erro ao enviar lembrete de reforço de 1h para ${consulta.paciente_telefone}:`, err.message);
          }
        }
      }
    } catch (error) {
      console.error("Erro no verificarLembretesReforco do AgendaCronJob:", error);
    }
  }
}

module.exports = new AgendaCronJob();
