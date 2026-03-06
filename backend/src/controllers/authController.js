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
    };

    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "8h" });

    return res.json({
      usuario: {
        id: usuario.id_usuario || usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        unidade_id: usuario.unidade_id,
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

module.exports = { login, forgotPassword, resetPassword };
