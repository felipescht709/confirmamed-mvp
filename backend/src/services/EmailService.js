const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "sandbox.smtp.mailtrap.io",
  port: process.env.EMAIL_PORT || 2525,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendResetEmail = async (email, token) => {
  const resetLink = `http://localhost:5173/recuperar-senha?token=${token}`;

  const mailOptions = {
    from: '"ConfirmaMED 🏥" <no-reply@confirmamed.com>',
    to: email,
    subject: "Recuperação de Senha - ConfirmaMED",
    html: `
      <div style="font-family: sans-serif; color: #334155;">
        <h2>Olá!</h2>
        <p>Você solicitou a recuperação de senha na plataforma ConfirmaMED.</p>
        <p>Clique no botão abaixo para criar uma nova senha:</p>
        <a href="${resetLink}" style="background-color: #0ea5e9; color: white; padding: 12px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
          Redefinir Minha Senha
        </a>
        <p style="margin-top: 20px; font-size: 12px; color: #94a3b8;">
          Se você não solicitou isso, ignore este e-mail. O link expira em 1 hora.
        </p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = { sendResetEmail };
