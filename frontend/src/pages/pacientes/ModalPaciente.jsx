//pages/pacientes/ModalPaciente.jsx
import { useEffect, useState } from "react";
import api from "../../services/api";
import {
  X,
  Save,
  Loader2,
  UserCircle,
  Calendar,
  MapPin,
  Phone,
} from "lucide-react";

export default function ModalPaciente({
  isOpen,
  onClose,
  onRefresh,
  selectedData,
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    cpf: "",
    cns: "",
    data_nascimento: "",
    email: "",
    nacionalidade: "",
    telefone: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
  });

  useEffect(() => {
    if (selectedData && isOpen) {
      let dataMask = "";
      if (selectedData.data_nascimento) {
        const [ano, mes, dia] = selectedData.data_nascimento
          .split("T")[0]
          .split("-");
        dataMask = `${dia}/${mes}/${ano}`;
      }
      setFormData({ ...selectedData, data_nascimento: dataMask });
    } else {
      setFormData({
        nome: "",
        cpf: "",
        cns: "",
        data_nascimento: "",
        email: "",
        nacionalidade: "",
        telefone: "",
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        uf: "",
      });
    }
  }, [selectedData, isOpen]);

  const handleCPF = (e) => {
    let v = e.target.value.replace(/\D/g, "").slice(0, 11);
    v = v
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    setFormData({ ...formData, cpf: v });
  };

  const handleData = (e) => {
    let v = e.target.value.replace(/\D/g, "").slice(0, 8);
    if (v.length > 4) v = v.replace(/(\d{2})(\d{2})(\d{1,4})/, "$1/$2/$3");
    else if (v.length > 2) v = v.replace(/(\d{2})(\d{1,2})/, "$1/$2");
    setFormData({ ...formData, data_nascimento: v });
  };

  const handlePhone = (e) => {
    let v = e.target.value.replace(/\D/g, "").slice(0, 11);
    v = v.replace(/^(\d{2})(\d)/g, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
    setFormData({ ...formData, telefone: v });
  };

  const handleCEP = (e) => {
    let v = e.target.value.replace(/\D/g, "").slice(0, 8);
    v = v.replace(/^(\d{5})(\d)/, "$1-$2");
    setFormData({ ...formData, cep: v });
  };

  const handleCEPBlur = async () => {
    const cep = formData.cep.replace(/\D/g, "");
    if (cep.length !== 8) return;
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setFormData((prev) => ({
          ...prev,
          logradouro: data.logradouro,
          bairro: data.bairro,
          cidade: data.localidade,
          uf: data.uf,
        }));
      }
    } catch {
      console.error("Erro ao buscar CEP");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Tratar a data
      const parts = formData.data_nascimento.split("/");
      const dataFormatada =
        parts.length === 3
          ? `${parts[2]}-${parts[1]}-${parts[0]}`
          : formData.data_nascimento;

      const payload = {
        ...formData,
        cpf: formData.cpf.replace(/\D/g, ""),
        cep: formData.cep.replace(/\D/g, ""),
        telefone: formData.telefone.replace(/\D/g, ""),
        data_nascimento: dataFormatada,
      };

      delete payload.id_paciente;

      let resultData;

      if (selectedData) {
        // --- EDIÇÃO ---
        await api.put(`/pacientes/${selectedData.id_paciente}`, payload);
        resultData = { ...payload, id_paciente: selectedData.id_paciente };
      } else {
        // --- CRIAÇÃO ---
        const response = await api.post("/pacientes", payload);

        const dadosRetornados = Array.isArray(response.data)
          ? response.data[0]
          : response.data;

        resultData = {
          ...payload, // Dados que o usuário digitou
          ...dadosRetornados, // Dados que o backend confirmou (incluindo ID)
        };
      }

      // Passa o paciente completo para o Agendamento
      if (onRefresh) {
        // Validação final para evitar "undefined"
        if (!resultData.id_paciente) {
          console.warn(
            "Aviso: ID do paciente não identificado no retorno, mas salvo.",
          );
        }
        onRefresh(resultData);
      }

      onClose();
    } catch (error) {
      console.error("ERRO NO SUBMIT:", error);
      const msg =
        error.response?.data?.error ||
        error.message ||
        "Erro ao processar requisição.";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="font-bold text-xl text-slate-800 flex items-center gap-2">
            <UserCircle className="text-brand-blue" />
            {selectedData ? "Editar Paciente" : "Novo Paciente"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-8 space-y-4 max-h-[80vh] overflow-y-auto"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase">
                Nome Completo
              </label>
              <input
                required
                type="text"
                value={formData.nome}
                className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-blue"
                onChange={(e) =>
                  setFormData({ ...formData, nome: e.target.value })
                }
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">
                CPF
              </label>
              <input
                required
                type="text"
                value={formData.cpf}
                placeholder="000.000.000-00"
                className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                onChange={handleCPF}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">
                Data de Nascimento
              </label>
              <div className="relative">
                <input
                  required
                  type="text"
                  value={formData.data_nascimento}
                  placeholder="DD/MM/AAAA"
                  className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  onChange={handleData}
                />
                <Calendar
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300"
                  size={16}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">
                Nacionalidade
              </label>
              <input
                type="text"
                value={formData.nacionalidade}
                placeholder="Ex: Brasileira"
                className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                onChange={(e) =>
                  setFormData({ ...formData, nacionalidade: e.target.value })
                }
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">
                Telefone
              </label>
              <div className="relative">
                <input
                  required
                  type="text"
                  value={formData.telefone}
                  placeholder="(00) 00000-0000"
                  className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  onChange={handlePhone}
                />
                <Phone
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300"
                  size={16}
                />
              </div>
            </div>

            <div className="col-span-2 py-2">
              <hr className="border-slate-100" />
            </div>

            {/* CEP e Número Alinhados */}
            <div className="col-span-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <MapPin size={10} /> CEP
              </label>
              <input
                type="text"
                value={formData.cep}
                onBlur={handleCEPBlur}
                placeholder="00000-000"
                className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-blue transition-all"
                onChange={handleCEP}
              />
            </div>

            <div className="col-span-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">
                Número
              </label>
              <input
                type="text"
                value={formData.numero}
                className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-blue"
                onChange={(e) =>
                  setFormData({ ...formData, numero: e.target.value })
                }
              />
            </div>

            <div className="col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase">
                Logradouro
              </label>
              <input
                type="text"
                value={formData.logradouro}
                className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-blue"
                onChange={(e) =>
                  setFormData({ ...formData, logradouro: e.target.value })
                }
              />
            </div>

            <div className="col-span-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">
                Cidade
              </label>
              <input
                type="text"
                value={formData.cidade}
                className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-blue"
                onChange={(e) =>
                  setFormData({ ...formData, cidade: e.target.value })
                }
              />
            </div>

            <div className="col-span-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">
                UF
              </label>
              <input
                type="text"
                maxLength={2}
                value={formData.uf}
                className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-center uppercase font-bold outline-none focus:border-brand-blue"
                onChange={(e) =>
                  setFormData({ ...formData, uf: e.target.value.toUpperCase() })
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 font-bold text-slate-400"
            >
              Cancelar
            </button>
            <button
              disabled={loading}
              className="bg-brand-blue text-white px-10 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-opacity-90 transition-all"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Save size={20} />
              )}
              {selectedData ? "Atualizar Paciente" : "Salvar Paciente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
