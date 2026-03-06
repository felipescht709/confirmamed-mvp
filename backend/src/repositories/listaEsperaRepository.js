const knex = require("../database/db");

class ListaEsperaRepository {
  async findBestMatch(profissional_id, unidade_id, data_hora) {
    const hora = new Date(data_hora).getHours();
    let turno = "Qualquer";

    if (hora >= 5 && hora < 12) turno = "Manhã";
    else if (hora >= 12 && hora < 18) turno = "Tarde";
    else if (hora >= 18) turno = "Noite";

    return knex("lista_espera")
      .where({ profissional_id, unidade_id, status: "AGUARDANDO" })
      .whereIn("periodo_preferencia", [turno, "Qualquer"])
      .orderBy([
        { column: "prioridade", order: "desc" }, // Urgente > Alta > Media
        { column: "criado_em", order: "asc" }, // Primeiro que chegou
      ])
      .first();
  }

  async updateStatus(id_lista, status) {
    return knex("lista_espera").where({ id_lista }).update({ status });
  }
}

module.exports = new ListaEsperaRepository();
