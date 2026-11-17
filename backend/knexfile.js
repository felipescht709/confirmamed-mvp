// backend/knexfile.js
require("dotenv").config();

module.exports = {
  development: {
    client: "postgresql",
    connection: {
      host: process.env.DB_HOST || "db",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      database: process.env.DB_NAME || "confirmamed",
      port: Number(process.env.DB_PORT) || 5432,
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
      // Garante que o driver do Node entenda que o banco opera em UTC
      timezone: "UTC",
      options: "-c search_path=public,extensions",
    },
    searchPath: ['public', 'extensions'],
    pool: {
      min: 2,
      max: 10,
      afterCreate: (conn, cb) => {
        // Força a sessão de cada conexão a interpretar 'America/Sao_Paulo'
        // Isso resolve o problema de cálculos de data em queries RAW
        conn.query("SET timezone='America/Sao_Paulo';", cb);
      },
    },
    migrations: {
      directory: "./src/database/migrations",
    },
    seeds: {
      directory: "./src/database/seeds",
    },
  },
};
