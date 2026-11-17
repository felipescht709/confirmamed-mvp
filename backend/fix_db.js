require('./src/database/db').raw("DELETE FROM knex_migrations WHERE name = '20260609233658_add_google_event_id_to_consultas.js'").then(()=>process.exit(0)).catch(console.error);
