const knex = require("../database/db");

const filaEsperaController = {
  index: async (req, res) => {
    try {
      const unidade_id = req.usuario.unidade_id;
      const fila = await knex("fila_espera as f")
        .join("pacientes as p", "f.paciente_id", "p.id_paciente")
        .leftJoin("profissionais_da_saude as prof", "f.profissional_id", "prof.id_profissional_saude")
        .where("f.unidade_id", unidade_id)
        .select(
          "f.*",
          "p.nome as paciente_nome",
          "p.telefone as paciente_telefone",
          "prof.nome_completo as profissional_nome"
        )
        .orderBy("f.solicitado_em", "asc");

      return res.json(fila);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao buscar fila de espera." });
    }
  },

  store: async (req, res) => {
    try {
      const unidade_id = req.usuario.unidade_id;
      const { paciente_id, profissional_id, preferencia_turno, prioridade_clinica } = req.body;

      const [id_fila] = await knex("fila_espera").insert({
        unidade_id,
        paciente_id,
        profissional_id,
        preferencia_turno: preferencia_turno || "QUALQUER",
        prioridade_clinica: prioridade_clinica || false,
        status: "AGUARDANDO",
        solicitado_em: knex.fn.now()
      }).returning("id_fila");

      return res.status(201).json({ id_fila, message: "Adicionado à fila de espera." });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao inserir na fila de espera." });
    }
  },

  destroy: async (req, res) => {
    try {
      const { id } = req.params;
      const unidade_id = req.usuario.unidade_id;

      await knex("fila_espera")
        .where({ id_fila: id, unidade_id })
        .del();

      return res.json({ message: "Removido da fila de espera." });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao remover da fila." });
    }
  }
};

module.exports = filaEsperaController;
