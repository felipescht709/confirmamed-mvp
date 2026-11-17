const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
    if (process.env.MAILTRAP_TOKEN) {
      const { MailtrapTransport } = require("mailtrap");
      this.transporter = nodemailer.createTransport(
        MailtrapTransport({
          token: process.env.MAILTRAP_TOKEN,
        })
      );
    } else {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || process.env.EMAIL_HOST || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587),
        secure: (process.env.SMTP_SECURE || process.env.EMAIL_SECURE) === "true",
        auth: {
          user: process.env.SMTP_USER || process.env.EMAIL_USER,
          pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
        },
      });
    }
  }

  /**
   * Envia um e-mail de notificação.
   * @param {string} to Destinatário
   * @param {string} subject Assunto
   * @param {string} text Corpo em texto plano
   * @param {string} html Corpo em HTML (opcional)
   */
  async sendEmail(to, subject, text, html = "") {
    try {
      const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
      const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

      if (!process.env.MAILTRAP_TOKEN && (!smtpUser || !smtpPass)) {
        console.warn("⚠️ [EmailService] Credenciais SMTP/Mailtrap não configuradas. E-mail não enviado.");
        return;
      }

      const fromEmail = process.env.EMAIL_FROM || `"ConfirmaMED Notificações" <${smtpUser || "no-reply@confirmamed.com"}>`;

      const mailOptions = {
        from: fromEmail,
        to,
        subject,
        text,
        html: html || text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`📧 [EmailService] E-mail enviado com sucesso: ${info.messageId}`);
      return info;
    } catch (error) {
      console.error("❌ [EmailService] Erro ao enviar e-mail:", error);
    }
  }
}

module.exports = new EmailService();
