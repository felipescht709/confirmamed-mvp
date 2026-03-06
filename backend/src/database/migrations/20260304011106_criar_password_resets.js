exports.up = function(knex) {
  return knex.schema.createTable('password_resets', (table) => {
    table.increments('id').primary();
    table.integer('usuario_id').unsigned().notNullable()
      .references('id_usuario').inTable('usuarios_sistema').onDelete('CASCADE');
    table.string('token').notNullable().unique();
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('password_resets');
};