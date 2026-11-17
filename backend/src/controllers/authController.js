// backend/src/controllers/authController.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto"); // Nativo do Node para gerar tokens
const repo = require("../repositories/usuarioRepository");
const knex = require("../database/db");
const { sendResetEmail } = require("../services/EmailService");

const login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    const usuario = await repo.findByEmail(email.trim());

    if (!usuario) {
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    const senhaValida = await bcrypt.compare(senha.trim(), usuario.senha_hash);

    if (!senhaValida) {
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    const SECRET_KEY = process.env.JWT_SECRET || "confirmamed_secret_key";

    const payload = {
      id: usuario.id_usuario || usuario.id,
      role: usuario.role,
      unidade_id: usuario.unidade_id,
      profissional_id: usuario.profissional_id,
      permissoes: typeof usuario.permissoes === 'string' ? JSON.parse(usuario.permissoes) : usuario.permissoes
    };

    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "18h" });

    return res.json({
      usuario: {
        id: usuario.id_usuario || usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        unidade_id: usuario.unidade_id,
        profissional_id: usuario.profissional_id,
        role: usuario.role,
        permissoes: typeof usuario.permissoes === 'string' ? JSON.parse(usuario.permissoes) : usuario.permissoes
      },
      token,
    });
  } catch (error) {
    console.error("ERRO NO LOGIN:", error);
    return res.status(500).json({ error: "Erro interno ao processar login." });
  }
};

// --- NOVAS FUNÇÕES DA SPRINT 1 ---

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const usuario = await repo.findByEmail(email.trim());

    // Segurança: Não confirmamos se o e-mail existe para evitar enumeração
    if (!usuario) {
      return res.json({
        message: "Se o e-mail existir, um link de recuperação será enviado.",
      });
    }

    // Gerar token de 32 bytes (64 caracteres hex)
    const token = crypto.randomBytes(32).toString("hex");
    const expires_at = new Date(Date.now() + 3600000); // 1 hora de validade

    // Salvar na tabela de tokens (Certifique-se de rodar a migration password_resets)
    await knex("password_resets").insert({
      usuario_id: usuario.id_usuario || usuario.id,
      token: token,
      expires_at: expires_at,
    });
    console.log("-----------------------------------------");
    console.log(`[TESTE] Token gerado para ${email}: ${token}`);
    console.log("-----------------------------------------");
    // Enviar via Mailtrap/Nodemailer
    await sendResetEmail(usuario.email, token);

    // Log para teste sem precisar abrir o e-mail
    console.log(`[DEV ONLY] Token de reset para ${email}: ${token}`);

    return res.json({
      message: "Se o e-mail existir, um link de recuperação será enviado.",
    });
  } catch (error) {
    console.error("ERRO FORGOT PASSWORD:", error);
    return res.status(500).json({ error: "Erro ao processar solicitação." });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, novaSenha } = req.body;

    // Buscar token válido
    const reset = await knex("password_resets")
      .where({ token })
      .andWhere("expires_at", ">", new Date())
      .first();

    if (!reset) {
      return res
        .status(400)
        .json({ error: "Link de recuperação inválido ou expirado." });
    }

    // Gerar novo hash
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(novaSenha, salt);

    // Atualizar senha e deletar token (Transação para garantir segurança)
    await knex.transaction(async (trx) => {
      await trx("usuarios_sistema")
        .where({ id_usuario: reset.usuario_id })
        .update({ senha_hash: hash });

      await trx("password_resets").where({ id: reset.id }).del();
    });

    return res.json({ message: "Senha atualizada com sucesso!" });
  } catch (error) {
    console.error("ERRO RESET PASSWORD:", error);
    return res.status(500).json({ error: "Erro ao redefinir senha." });
  }
};

const register = async (req, res) => {
  try {
    const { nome_clinica, nome_admin, email, senha, telefone } = req.body;

    if (!nome_clinica || !nome_admin || !email || !senha || !telefone) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios." });
    }

    // Verificar se email já existe
    const usuarioExistente = await repo.findByEmail(email.trim());
    if (usuarioExistente) {
      return res.status(400).json({ error: "E-mail já está em uso." });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(senha.trim(), salt);
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    // Usamos transação pois criaremos unidade e usuário ao mesmo tempo
    const result = await knex.transaction(async (trx) => {
      // 1. Criar Unidade
      const [id_unidade] = await trx("unidades_atendimento")
        .insert({
          nome_fantasia: nome_clinica,
          telefone_principal: telefone,
          email_contato: email,
          email_notificacao: email, // Default inicial
          subscription_status: "TRIAL",
          plan: "MVP_SINGLE",
          trial_ends_at: trialEndsAt,
        })
        .returning("id_unidade");

      const unidadeIdNum = typeof id_unidade === 'object' ? id_unidade.id_unidade : id_unidade;

      // 2. Criar Usuário Admin
      const defaultPermissions = JSON.stringify({
        ver_agenda_geral: true, editar_agenda_geral: true, gerenciar_fila_espera: true,
        ver_pacientes: true, editar_pacientes: true, acessar_monitor_ia: true, intervir_ia: true,
        configurar_ia: true, ver_indicadores: true, gerenciar_assinatura_app: true,
        gerenciar_procedimentos: true, gerenciar_profissionais: true, gerenciar_usuarios: true
      });

      const [id_usuario] = await trx("usuarios_sistema")
        .insert({
          nome: nome_admin,
          email: email.trim(),
          senha_hash: hash,
          role: "ADMIN",
          unidade_id: unidadeIdNum,
          permissoes: defaultPermissions
        })
        .returning("id_usuario");

      return {
        id_usuario: typeof id_usuario === 'object' ? id_usuario.id_usuario : id_usuario,
        id_unidade: unidadeIdNum
      };
    });

    // 3. Tentar criar o Stripe Customer (Assíncrono para não travar o DB)
    try {
      const stripeService = require("../services/core/stripeService");
      const customer = await stripeService.createCustomer(email.trim(), nome_clinica);
      if (customer && customer.id) {
        await knex("unidades_atendimento")
          .where({ id_unidade: result.id_unidade })
          .update({ stripe_customer_id: customer.id });
      }
    } catch (e) {
      console.error("Erro ao criar cliente no Stripe durante registro:", e);
      // Não falha o cadastro se o stripe der pau
    }

    // 4. Logar usuário recém-criado
    const SECRET_KEY = process.env.JWT_SECRET || "confirmamed_secret_key";
    const parsedPermissions = {
        ver_agenda_geral: true, editar_agenda_geral: true, gerenciar_fila_espera: true,
        ver_pacientes: true, editar_pacientes: true, acessar_monitor_ia: true, intervir_ia: true,
        configurar_ia: true, ver_indicadores: true, gerenciar_assinatura_app: true,
        gerenciar_procedimentos: true, gerenciar_profissionais: true, gerenciar_usuarios: true
    };

    const payload = {
      id: result.id_usuario,
      role: "ADMIN",
      unidade_id: result.id_unidade,
      permissoes: parsedPermissions
    };
    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "18h" });

    return res.status(201).json({
      message: "Conta criada com sucesso!",
      usuario: {
        id: result.id_usuario,
        nome: nome_admin,
        email: email,
        unidade_id: result.id_unidade,
        role: "ADMIN",
        permissoes: parsedPermissions
      },
      token,
    });
  } catch (error) {
    console.error("ERRO NO REGISTER:", error);
    return res.status(500).json({ error: "Erro interno ao cadastrar conta." });
  }
};

module.exports = { login, register, forgotPassword, resetPassword };
