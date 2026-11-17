// backend/src/repositories/unidadeRepository.js
const knex = require("../database/db.js"); // Instância do Knex

const DEFAULTS_IA = {
  especialidade: "Geral",
  tom_de_voz: "Cordial",
  instrucoes_especificas: "",
};

const create = async (data) => {
  // Ajuste: usando [result] para pegar o primeiro objeto do array retornado
  const [result] = await knex('unidades_atendimento')
    .insert({
      nome_fantasia: data.nome_fantasia,
      razao_social: data.razao_social,
      cnpj: data.cnpj,
      cnes: data.cnes,
      telefone_principal: data.telefone_principal,
      email_contato: data.email_contato,
      cep: data.cep,
      logradouro: data.logradouro,
      numero: data.numero,
      complemento: data.complemento,
      bairro: data.bairro,
      cidade: data.cidade,
      uf: data.uf,
      numero_whatsapp: data.numero_whatsapp,
      // Se configuracoes_ia for um objeto, enviamos como string para o campo JSONB/TEXT
      configuracoes_ia:
        typeof data.configuracoes_ia === "object"
          ? JSON.stringify(data.configuracoes_ia)
          : JSON.stringify(DEFAULTS_IA),
    })
    .returning("id_unidade");

  return result.id_unidade;
};

// G1: Traz apenas as unidades que pertencem à mesma rede do usuário
const getAllDaRede = async (unidade_id) => {
  const unidadeUser = await knex('unidades_atendimento').where({ id_unidade: unidade_id }).first();
  if (!unidadeUser) return [];

  const matrizId = unidadeUser.matriz_id || unidadeUser.id_unidade;

  return knex('unidades_atendimento')
    .whereNull("deleted_at")
    .andWhere(function() {
      this.where({ id_unidade: matrizId }).orWhere({ matriz_id: matrizId });
    });
};

const getById = (id) =>
  knex('unidades_atendimento').where({ id_unidade: id }).first();

// Utilitário para pegar todos os IDs da rede (útil para consultas amplas)
const getNetworkIds = async (unidade_id) => {
  const unidades = await getAllDaRede(unidade_id);
  return unidades.map(u => u.id_unidade);
};
const update = (id, data) =>
  knex('unidades_atendimento')
    .where({ id_unidade: id })
    .update({ ...data, atualizado_em: knex.fn.now() });
const softDelete = (id) =>
  knex('unidades_atendimento')
    .where({ id_unidade: id })
    .update({ deleted_at: knex.fn.now(), ativo: false });
const updateConfigIA = async (id, config) => {
  return await knex('unidades_atendimento') // G5: era `tableName` (undefined)
    .where({ id_unidade: id })
    .update({ 
        configuracoes_ia: JSON.stringify(config), // coluna real é configuracoes_ia
        atualizado_em: knex.fn.now() 
    });
};
module.exports = { create, getAllDaRede, getNetworkIds, getById, update, softDelete, updateConfigIA };
