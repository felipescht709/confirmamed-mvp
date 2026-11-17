// backend/src/services/googleCalendarService.js
const { google } = require('googleapis');

// Inicializa o cliente OAuth2 (As chaves vêm do .env)
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI // Ex: http://localhost:4000/api/google/callback
);

// Escopos necessários para ler e editar a agenda
const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

/**
 * Gera a URL para o médico autorizar o app
 */
const getAuthUrl = (profissional_id, unidade_id) => {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // Força o Google a sempre mandar um Refresh Token
    scope: SCOPES,
    state: JSON.stringify({ profissional_id, unidade_id }) // Passa o ID na requisição
  });
};

/**
 * Troca o código temporário por um Refresh Token duradouro
 */
const getTokens = async (code) => {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
};

/**
 * Retorna uma instância da API de calendário autenticada para o médico
 */
const getCalendarApi = (refreshToken) => {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  client.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: 'v3', auth: client });
};

module.exports = {
  getAuthUrl,
  getTokens,
  getCalendarApi,
};
