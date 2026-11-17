/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('unidades_atendimento', function(table) {
    table.string('stripe_customer_id');
    table.string('stripe_subscription_id');
    table.string('subscription_status').defaultTo('TRIAL'); // TRIAL, ACTIVE, PAST_DUE, CANCELED
    table.string('plan').defaultTo('MVP_SINGLE');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('unidades_atendimento', function(table) {
    table.dropColumn('stripe_customer_id');
    table.dropColumn('stripe_subscription_id');
    table.dropColumn('subscription_status');
    table.dropColumn('plan');
  });
};
