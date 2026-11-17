const knex = require("./src/database/db");

async function dump() {
  try {
    const unidades = await knex("unidades_atendimento").select("id_unidade", "nome_fantasia", "whatsapp_instance_name");
    console.log("UNIDADES MAPEADAS:", JSON.stringify(unidades, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

dump();
