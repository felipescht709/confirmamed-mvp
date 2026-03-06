// backend/src/controllers/pacienteController.js
const repo = require("../repositories/pacienteRepository");

// src/controllers/pacienteController.js

const store = async (req, res) => {
  try {
    const { telefone, nome, cpf } = req.body;

    if (!telefone || !nome) {
      return res
        .status(400)
        .json({ error: "Nome e Telefone são obrigatórios." });
    }

    const existe = await repo.findByTelefone(telefone);
    if (existe) {
      return res
        .status(409)
        .json({ error: "Paciente já cadastrado com este telefone." });
    }

    // Cria no banco
    const result = await repo.create(req.body);

    // --- CORREÇÃO DE OURO ---
    // O Knex pode retornar [1], [{id:1}], 1, ou {id:1} dependendo da configuração.
    // Vamos normalizar para garantir que sempre teremos o ID.
    let novoId;

    if (Array.isArray(result)) {
      // Se for array (ex: [{id_paciente: 5}] ou [5])
      const firstItem = result[0];
      novoId = firstItem?.id_paciente || firstItem?.id || firstItem;
    } else if (typeof result === "object") {
      // Se for objeto (ex: {id_paciente: 5})
      novoId = result.id_paciente || result.id;
    } else {
      // Se for primitivo (ex: 5)
      novoId = result;
    }

    // Retorna o objeto completo e plano para o frontend não se perder
    return res.status(201).json({
      id_paciente: novoId,
      nome: nome,
      cpf: cpf,
      telefone: telefone,
      ...req.body, // Devolve o restante dos dados enviados
    });
  } catch (error) {
    console.error("ERRO DETALHADO NO PACIENTE:", error.message);
    return res.status(500).json({
      error: "Falha interna ao processar paciente.",
      details: error.message,
    });
  }
};

const index = async (req, res) => {
  try {
    const { search } = req.query;
    // Garante que o repo.getAll está preparado para filtrar por search
    const pacientes = await repo.getAll(search);
    return res.json(pacientes);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar pacientes." });
  }
};

const show = async (req, res) => {
  try {
    const { id } = req.params;
    const paciente = await repo.getById(id);
    if (!paciente) {
      return res.status(404).json({ error: "Paciente não encontrado." });
    }
    return res.json(paciente);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar paciente." });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    await repo.update(id, req.body);
    return res.json({ message: "Paciente atualizado com sucesso." });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao atualizar paciente." });
  }
};

const destroy = async (req, res) => {
  try {
    const { id } = req.params;
    await repo.softDelete(id);
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: "Erro ao excluir paciente." });
  }
};

module.exports = { store, index, show, update, destroy };
