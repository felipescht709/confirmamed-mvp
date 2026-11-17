// backend/src/swaggerConfig.js
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "ConfirmaMED - Public API",
      version: "1.0.0",
      description:
        "API oficial para integração B2B do ConfirmaMED com sistemas de terceiros (Doctoralia, Amplimed, Clínica nas Nuvens). Todas as rotas exigem autenticação via API Key.",
      contact: {
        name: "Suporte ConfirmaMED",
      },
    },
    servers: [
      {
        url: "/api/v1/public",
        description: "Rotas de Integração",
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description: "Chave criptografada fornecida pelo suporte do ConfirmaMED. (Opcionalmente, pode-se usar Authorization: Bearer <key>)",
        },
      },
    },
    security: [
      {
        ApiKeyAuth: [],
      },
    ],
  },
  apis: ["./src/routesPublic.js", "./src/controllers/*.js"], // Caminho para encontrar os @swagger
};

const specs = swaggerJsdoc(options);

module.exports = { swaggerUi, specs };
