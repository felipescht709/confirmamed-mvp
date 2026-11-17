const Stripe = require("stripe");
const stripeSecret = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder_key_until_configured";
const stripe = Stripe(stripeSecret);
const stripeService = require("../services/core/stripeService");

const stripeController = {
  /**
   * Gera o link do Checkout (Primeira Assinatura)
   */
  createCheckoutSession: async (req, res) => {
    try {
      const unidade_id = req.usuario.unidade_id;
      const { url } = await stripeService.createCheckoutSession(unidade_id);
      return res.json({ url });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao gerar link de pagamento." });
    }
  },

  /**
   * Gera o link do Portal do Cliente (Gerenciar Assinatura/Cartão)
   */
  createPortalSession: async (req, res) => {
    try {
      const unidade_id = req.usuario.unidade_id;
      const { url } = await stripeService.createBillingPortalSession(unidade_id);
      return res.json({ url });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao gerar link do portal." });
    }
  },

  /**
   * Webhook Seguro recebido do Stripe (Acesso Público com Verificação de Assinatura)
   */
  webhook: async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      // req.body precisa ser o rawBody para validar a assinatura!
      // (Isso é feito no express usando express.raw no middleware)
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Processa o evento via service
    await stripeService.handleWebhook(event);

    return res.json({ received: true });
  }
};

module.exports = stripeController;
