const knex = require("../database/db");

const checkSubscription = async (req, res, next) => {
  try {
    const unidade_id = req.usuario.unidade_id;
    if (!unidade_id) return res.status(401).json({ error: "Sessão inválida" });

    const unidade = await knex("unidades_atendimento").where({ id_unidade: unidade_id }).first();
    
    if (unidade.subscription_status === 'ACTIVE') {
      return next();
    }

    if (unidade.subscription_status === 'TRIAL') {
      const now = new Date();
      const trialEndsAt = new Date(unidade.trial_ends_at);
      if (now <= trialEndsAt) {
        return next();
      } else {
        return res.status(402).json({ 
          error: "Seu período de Trial expirou. Por favor, assine um plano.",
          requirePayment: true 
        });
      }
    }

    return res.status(402).json({ 
      error: "Pagamento pendente. Por favor, regularize sua assinatura.",
      requirePayment: true 
    });
  } catch (error) {
    console.error("Erro no middleware de subscription:", error);
    return res.status(500).json({ error: "Erro interno de validação de plano." });
  }
};

module.exports = checkSubscription;
