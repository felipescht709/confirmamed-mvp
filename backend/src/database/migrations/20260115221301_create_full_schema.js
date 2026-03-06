exports.up = function (knex) {
  return (
    knex.schema
      // --- NÍVEL 1: Tabelas Independentes ---
      .createTable("unidades_atendimento", (table) => {
        table.increments("id_unidade").primary();
        table.string("nome_fantasia").notNullable();
        table.string("razao_social");
        table.string("cnpj").unique();
        table.string("cnes");
        table.string("telefone_principal").notNullable();
        table.string("email_contato");
        table.string("cep");
        table.string("logradouro");
        table.string("numero");
        table.string("complemento");
        table.string("bairro");
        table.string("cidade");
        table.string("uf");
        table.string("numero_whatsapp");
        table.boolean("ativo").defaultTo(true);
        table.timestamp("criado_em").defaultTo(knex.fn.now());
        table.timestamp("atualizado_em").defaultTo(knex.fn.now());
        table.timestamp("deleted_at");
      })
      .createTable("profissionais_da_saude", (table) => {
        table.increments("id_profissional_saude").primary();
        table.string("nome_completo").notNullable();
        table.string("cpf").notNullable().unique();
        table.date("data_nascimento");
        table.text("imagem_profissional"); // Alterado para snake_case
        table.string("conselho");
        table.string("numero_conselho");
        table.string("uf_conselho");
        table.string("rqe");
        table.string("telefone");
        table.string("email");
        table.string("especialidade");
        table.boolean("permite_telemedicina").defaultTo(false);
        table.boolean("ativo").defaultTo(true);
        table.timestamp("deleted_at");
      })
      .createTable("pacientes", (table) => {
        table.increments("id_paciente").primary();
        table.string("nome").notNullable();
        table.string("cpf").unique();
        table.string("cns");
        table.date("data_nascimento");
        table.string("email");
        table.string("telefone").notNullable();
        table.string("cep");
        table.string("logradouro");
        table.string("bairro");
        table.string("cidade");
        table.string("uf");
        table.boolean("ativo").defaultTo(true);
        table.timestamp("criado_em").defaultTo(knex.fn.now());
        table.timestamp("deleted_at");
      })
      .createTable("convenios", (table) => {
        table.increments("id_convenio").primary();
        table.string("nome").notNullable();
        table.string("registro_ans");
        table.boolean("ativo").defaultTo(true);
      })

      // --- NÍVEL 2: Tabelas Dependentes ---
      .createTable("usuarios_sistema", (table) => {
        table.increments("id_usuario").primary();
        table.string("nome").notNullable();
        table.string("email").notNullable().unique();
        table.string("senha_hash").notNullable();
        table.string("role").defaultTo("RECEPCAO");
        table
          .integer("unidade_id")
          .references("id_unidade")
          .inTable("unidades_atendimento"); // FK corrigida
        table
          .integer("profissional_id")
          .references("id_profissional_saude")
          .inTable("profissionais_da_saude") // FK corrigida
          .nullable();
        table.boolean("ativo").defaultTo(true);
        table.timestamp("criado_em").defaultTo(knex.fn.now());
        table.timestamp("ultimo_login");
        table.timestamp("deleted_at");
      })
      .createTable("convenio_planos", (table) => {
        table.increments("id_plano").primary();
        table
          .integer("convenio_id")
          .references("id_convenio")
          .inTable("convenios"); // FK corrigida
        table.string("nome_plano").notNullable();
        table.boolean("ativo").defaultTo(true);
      })
      .createTable("procedimentos", (table) => {
        table.increments("id_procedimento").primary();
        table
          .integer("unidade_id")
          .references("id_unidade")
          .inTable("unidades_atendimento"); // FK corrigida
        table.string("nome_procedimento").notNullable();
        table.decimal("valor").defaultTo(0);
        table.integer("duracao_minutos").notNullable();
        table.string("tipo").notNullable();
        table.boolean("ativo").defaultTo(true);
        table.timestamp("deleted_at");
      })

      // --- NÍVEL 3: Agenda e Consultas ---
      .createTable("agenda_configuracao_horario", (table) => {
        table.increments("id_config_agenda").primary();
        table
          .integer("profissional_id")
          .references("id_profissional_saude")
          .inTable("profissionais_da_saude");
        table
          .integer("unidade_id")
          .references("id_unidade")
          .inTable("unidades_atendimento");
        table.integer("dia_semana").notNullable();
        table.time("hora_inicio").notNullable();
        table.time("hora_fim").notNullable();
        table.integer("duracao_slot_minutos").defaultTo(30);
        table.boolean("ativo").defaultTo(true);
      })
      .createTable("agenda_bloqueios", (table) => {
        table.increments("id_bloqueio").primary();
        table
          .integer("profissional_id")
          .references("id_profissional_saude")
          .inTable("profissionais_da_saude");
        table.timestamp("data_inicio").notNullable();
        table.timestamp("data_fim").notNullable();
        table.string("motivo");
      })
      .createTable("consultas", (table) => {
        table.increments("id_consulta").primary();
        table
          .integer("paciente_id")
          .references("id_paciente")
          .inTable("pacientes");
        table
          .integer("profissional_id")
          .references("id_profissional_saude")
          .inTable("profissionais_da_saude");
        table
          .integer("unidade_id")
          .references("id_unidade")
          .inTable("unidades_atendimento");
        table
          .integer("id_convenio_plano")
          .references("id_plano")
          .inTable("convenio_planos");
        table.timestamp("data_hora_inicio").notNullable();
        table.timestamp("data_hora_fim").notNullable();
        table.string("status").defaultTo("AGENDADO");
        table
          .integer("criado_por_usuario_id")
          .references("id_usuario")
          .inTable("usuarios_sistema");
        table.timestamp("criado_em").defaultTo(knex.fn.now());
        table.timestamp("deleted_at");
      })

      // --- NÍVEL 4: IA e Logs ---
      .createTable("chat_sessions", (table) => {
        table.increments("id").primary();
        table.string("telefone_paciente").notNullable();
        table.string("status").defaultTo("ACTIVE");
        table.timestamp("criado_em").defaultTo(knex.fn.now());
      })
      .createTable("webhook_events", (table) => {
        table.string("message_id").primary();
        table.jsonb("payload");
        table.timestamp("recebido_em").defaultTo(knex.fn.now());
      })
      .createTable("profissional_unidade_vinculo", (table) => {
        table
          .integer("profissional_id")
          .references("id_profissional_saude")
          .inTable("profissionais_da_saude");
        table
          .integer("unidade_id")
          .references("id_unidade")
          .inTable("unidades_atendimento");
        table.primary(["profissional_id", "unidade_id"]);
      })
  );
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists("profissional_unidade_vinculo")
    .dropTableIfExists("webhook_events")
    .dropTableIfExists("chat_sessions")
    .dropTableIfExists("consultas")
    .dropTableIfExists("agenda_bloqueios")
    .dropTableIfExists("agenda_configuracao_horario")
    .dropTableIfExists("procedimentos")
    .dropTableIfExists("convenio_planos")
    .dropTableIfExists("usuarios_sistema")
    .dropTableIfExists("convenios")
    .dropTableIfExists("pacientes")
    .dropTableIfExists("profissionais_da_saude")
    .dropTableIfExists("unidades_atendimento");
};
