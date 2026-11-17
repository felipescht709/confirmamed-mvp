/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  const defaultPermissions = JSON.stringify({
    ver_agenda_geral: true,
    editar_agenda_geral: true,
    gerenciar_fila_espera: true,
    ver_pacientes: true,
    editar_pacientes: true,
    acessar_monitor_ia: true,
    intervir_ia: true,
    configurar_ia: true,
    ver_indicadores: true,
    gerenciar_assinatura_app: true,
    gerenciar_procedimentos: true,
    gerenciar_profissionais: true,
    gerenciar_usuarios: true
  });

  return knex.schema.table('usuarios_sistema', function(table) {
    table.jsonb('permissoes').defaultTo(defaultPermissions);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('usuarios_sistema', function(table) {
    table.dropColumn('permissoes');
  });
};
