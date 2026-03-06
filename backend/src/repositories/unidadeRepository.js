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

const getAll = () => knex('unidades_atendimento').whereNull("deleted_at");
const getById = (id) =>
  knex('unidades_atendimento').where({ id_unidade: id }).first();
const update = (id, data) =>
  knex('unidades_atendimento')
    .where({ id_unidade: id })
    .update({ ...data, atualizado_em: knex.fn.now() });
const softDelete = (id) =>
  knex('unidades_atendimento')
    .where({ id_unidade: id })
    .update({ deleted_at: knex.fn.now(), ativo: false });
const updateConfigIA = async (id, config) => {
  return await knex(tableName)
    .where({ id_unidade: id })
    .update({ 
        configuracoes_ia: config, // Confirme se sua coluna é 'config_ia' ou 'configuracoes_ia'
        atualizado_em: knex.fn.now() 
    });
};
module.exports = { create, getAll, getById, update, softDelete, updateConfigIA };
