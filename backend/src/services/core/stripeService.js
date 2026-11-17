const Stripe = require('stripe');
const stripeSecret = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder_key_until_configured";
const stripe = Stripe(stripeSecret);
const knex = require("../../database/db");

class StripeService {
  /**
   * Cria ou recupera o cliente no Stripe e gera link de Checkout
   */
  async createCheckoutSession(unidade_id) {
    try {
      const unidade = await knex("unidades_atendimento").where({ id_unidade: unidade_id }).first();
      if (!unidade) throw new Error("Unidade não encontrada");

      let customerId = unidade.stripe_customer_id;

      // Se não tem Customer, cria no Stripe
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: unidade.email_contato,
          name: unidade.nome_fantasia,
          metadata: { unidade_id: String(unidade_id) }
        });
        customerId = customer.id;

        await knex("unidades_atendimento").where({ id_unidade: unidade_id }).update({ stripe_customer_id: customerId });
      }

      // Cria a sessão de checkout
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: process.env.STRIPE_MVP_PLAN_PRICE_ID, // ID do Preço do Plano Único
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.FRONTEND_URL}/pagamento/sucesso?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/pagamento/cancelado`,
      });

      return { url: session.url };
    } catch (error) {
      console.error("[StripeService Error]:", error);
      throw error;
    }
  }

  /**
   * Cria o portal do cliente para gerenciar o cartão
   */
  async createBillingPortalSession(unidade_id) {
    const unidade = await knex("unidades_atendimento").where({ id_unidade: unidade_id }).first();
    if (!unidade || !unidade.stripe_customer_id) throw new Error("Cliente Stripe não encontrado.");

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: unidade.stripe_customer_id,
      return_url: `${process.env.FRONTEND_URL}/config`,
    });

    return { url: portalSession.url };
  }

  /**
   * Processa os webhooks do Stripe (pagamento com sucesso, falha, etc)
   */
  async handleWebhook(event) {
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          const customerId = session.customer;
          const subscriptionId = session.subscription;

          // Atualiza status da unidade para ACTIVE
          await knex("unidades_atendimento")
            .where({ stripe_customer_id: customerId })
            .update({ 
              subscription_status: 'ACTIVE',
              stripe_subscription_id: subscriptionId
            });
          console.log(`[Stripe Webhook] Unidade com Customer ${customerId} ativada.`);
          break;
        }
        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          await knex("unidades_atendimento")
            .where({ stripe_subscription_id: subscription.id })
            .update({ subscription_status: 'CANCELED' });
          console.log(`[Stripe Webhook] Assinatura ${subscription.id} cancelada.`);
          break;
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          await knex("unidades_atendimento")
            .where({ stripe_subscription_id: invoice.subscription })
            .update({ subscription_status: 'PAST_DUE' });
          console.log(`[Stripe Webhook] Pagamento falhou para assinatura ${invoice.subscription}. Status atualizado para PAST_DUE.`);
          break;
        }
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object;
          await knex("unidades_atendimento")
            .where({ stripe_subscription_id: invoice.subscription })
            .update({ subscription_status: 'ACTIVE' });
          break;
        }
      }
    } catch (error) {
      console.error("[Stripe Webhook Error]:", error);
    }
  }
}

module.exports = new StripeService();
