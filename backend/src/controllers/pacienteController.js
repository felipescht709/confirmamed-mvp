// backend/src/controllers/pacienteController.js
const repo = require("../repositories/pacienteRepository");

// src/controllers/pacienteController.js

const store = async (req, res) => {
  try {
    const { telefone, nome, cpf } = req.body;
    const { unidade_id } = req.usuario; // 🔐 Extraído do JWT

    if (!telefone || !nome) {
      return res
        .status(400)
        .json({ error: "Nome e Telefone são obrigatórios." });
    }

    const existe = await repo.findByTelefone(telefone, unidade_id);
    if (existe) {
      return res
        .status(409)
        .json({ error: "Paciente já cadastrado com este telefone." });
    }

    // Cria no banco passando a unidade
    const result = await repo.create(req.body, unidade_id);

    // --- CORREÇÃO DE OURO ---
    let novoId;
    if (Array.isArray(result)) {
      const firstItem = result[0];
      novoId = firstItem?.id_paciente || firstItem?.id || firstItem;
    } else if (typeof result === "object") {
      novoId = result.id_paciente || result.id;
    } else {
      novoId = result;
    }

    return res.status(201).json({
      id_paciente: novoId,
      nome: nome,
      cpf: cpf,
      telefone: telefone,
      ...req.body,
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
    const { unidade_id } = req.usuario;
    const pacientes = await repo.getAll(unidade_id, search);
    return res.json(pacientes);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar pacientes." });
  }
};

const show = async (req, res) => {
  try {
    const { id } = req.params;
    const { unidade_id } = req.usuario;
    const paciente = await repo.getById(id, unidade_id);
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
    const { unidade_id } = req.usuario;
    const affected = await repo.update(id, unidade_id, req.body);
    if (!affected) {
      return res.status(404).json({ error: "Paciente não encontrado ou acesso negado." });
    }
    return res.json({ message: "Paciente atualizado com sucesso." });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao atualizar paciente." });
  }
};

const destroy = async (req, res) => {
  try {
    const { id } = req.params;
    const { unidade_id } = req.usuario;
    const affected = await repo.softDelete(id, unidade_id);
    if (!affected) {
      return res.status(404).json({ error: "Paciente não encontrado ou acesso negado." });
    }
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: "Erro ao excluir paciente." });
  }
};

module.exports = { store, index, show, update, destroy };
