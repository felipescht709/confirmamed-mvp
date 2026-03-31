// src/services/core/ReminderJob.js
const cron = require('node-cron');
const knex = require('../../database/db');
const whatsappService = require('../whatsapp/whatsappService');
const SessionService = require('./SessionService'); // Usando o serviço padronizado

class ReminderJob {
  start() {
    // Roda a cada 15 minutos (00, 15, 30, 45)
    cron.schedule('*/15 * * * *', async () => {
      console.log('⏰ [ReminderJob] Iniciando varredura de lembretes...');
      await this.checkAndSend();
    });
    console.log("✅ [ReminderJob] Agendador de tarefas configurado (15 em 15 min).");
  }

  async checkAndSend() {
    try {
      // 1. Busca unidades que querem confirmação automática
      // Se não tiver essa coluna ainda no BD, remova o where ou assuma true
      const unidades = await knex('unidades_atendimento')
        .select('*'); 

      for (const unidade of unidades) {
        // Fallback para [24] horas se a clínica não tiver configurado o array JSON
        const janelasHoras = unidade.lembretes_config_horas || [24]; 

        for (const horas of janelasHoras) {
          // 2. Busca consultas na janela de disparo
          const consultasParaLembrar = await knex('consultas as c')
            .join('pacientes as p', 'c.paciente_id', 'p.id_paciente') // CORRIGIDO: paciente_id
            .where('c.unidade_id', unidade.id_unidade)
            .where('c.status', 'AGENDADO')
            .whereNull('c.deleted_at')
            // Cálculo seguro usando bind variables no Postgres:
            .whereRaw("c.data_hora_inicio <= (NOW() + (? * INTERVAL '1 hour'))", [horas])
            .whereRaw("c.data_hora_inicio > (NOW() + (? * INTERVAL '1 hour') - INTERVAL '15 minutes')", [horas])
            .whereNotExists(function() {
              this.select(1).from('comunicacoes_log as log')
                .whereRaw('log.id_consulta = c.id_consulta')
                .andWhere('log.tipo_gatilho_horas', horas);
            });

          for (const consulta of consultasParaLembrar) {
            await this.executeDisparo(consulta, horas);
          }
        }
      }
    } catch (error) {
      console.error('💀 [ReminderJob Fatal Error]:', error);
    }
  }

  async executeDisparo(consulta, horas) {
    try {
      const primeiroNome = consulta.nome.split(' ')[0];
      const msg = `Olá, ${primeiroNome}! O ConfirmaMED passando para lembrar da sua consulta daqui a aproximadamente ${horas}h. Podemos confirmar sua presença? (Responda SIM ou NÃO)`;
      
      // 1. Dispara via WhatsApp
      await whatsappService.sendMessage(consulta.telefone, msg);

      // 2. Registra o log de idempotência para não mandar em duplicidade
      await knex('comunicacoes_log').insert({
        id_consulta: consulta.id_consulta,
        tipo_gatilho_horas: horas,
        status: 'ENVIADO',
        canal: 'WHATSAPP'
      });

      // 3. Garante que a sessão exista e injeta a FSM de CONFIRMAÇÃO
      await SessionService.getOrCreateSession(consulta.telefone);
      await SessionService.updateSession(consulta.telefone, 'CONFIRMACAO', {
        paciente_alvo_id: consulta.paciente_id,
        consulta_pendente_id: consulta.id_consulta
      });

      console.log(`✅ [ReminderJob] Lembrete de ${horas}h enviado para ID ${consulta.id_consulta} (${primeiroNome})`);
    } catch (err) {
      console.error(`❌ Erro ao disparar para consulta ${consulta.id_consulta}:`, err.message);
    }
  }
}

module.exports = new ReminderJob();