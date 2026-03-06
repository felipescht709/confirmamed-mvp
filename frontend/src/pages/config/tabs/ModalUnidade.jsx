//src/pages/config/tabs/ModalUnidade.jsx
import { useEffect, useState } from "react";
import api from "../../../services/api";
import { X, Save, Loader2, Building2 } from "lucide-react";

export default function ModalUnidade({
  isOpen,
  onClose,
  onRefresh,
  selectedData,
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome_fantasia: "",
    razao_social: "",
    cnpj: "",
    telefone_principal: "",
    email_contato: "",
    cep: "",
    logradouro: "",
    numero: "",
    bairro: "",
    cidade: "",
    uf: "",
  });

  useEffect(() => {
    if (selectedData && isOpen) {
      setFormData({ ...selectedData });
    } else {
      setFormData({
        nome_fantasia: "",
        razao_social: "",
        cnpj: "",
        telefone_principal: "",
        email_contato: "",
        cep: "",
        logradouro: "",
        numero: "",
        bairro: "",
        cidade: "",
        uf: "",
      });
    }
  }, [selectedData, isOpen]);

  // --- MÁSCARAS ---

  const handleCNPJInput = (e) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length > 14) v = v.slice(0, 14);
    v = v.replace(/^(\d{2})(\d)/, "$1.$2");
    v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
    v = v.replace(/\.(\d{3})(\d)/, ".$1/$2");
    v = v.replace(/(\d{4})(\d)/, "$1-$2");
    setFormData({ ...formData, cnpj: v });
  };

  const handlePhoneInput = (e) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
    v = v.replace(/(\d{5})(\d)/, "$1-$2");
    setFormData({ ...formData, telefone_principal: v });
  };

  const handleCEPInput = (e) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length > 8) v = v.slice(0, 8);
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
    } catch (err) {
      console.error(err);
      console.error("Erro ao buscar CEP");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Limpar máscaras para enviar ao banco (enviamos apenas números)
    const payload = {
      ...formData,
      cnpj: formData.cnpj.replace(/\D/g, ""),
      cep: formData.cep.replace(/\D/g, ""),
      telefone_principal: formData.telefone_principal.replace(/\D/g, ""),
    };

    try {
      if (selectedData) {
        await api.put(`/unidades/${selectedData.id_unidade}`, payload);
      } else {
        await api.post("/unidades", payload);
      }
      onRefresh();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar unidade.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="font-display font-bold text-xl text-slate-800 flex items-center gap-2">
            <Building2 size={20} className="text-brand-blue" />
            {selectedData ? "Editar Unidade" : "Nova Unidade"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full"
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
              <label className="text-xs font-bold text-slate-400 uppercase">
                Nome Fantasia
              </label>
              <input
                required
                type="text"
                value={formData.nome_fantasia}
                className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-blue"
                onChange={(e) =>
                  setFormData({ ...formData, nome_fantasia: e.target.value })
                }
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">
                CNPJ
              </label>
              <input
                type="text"
                value={formData.cnpj}
                placeholder="00.000.000/0000-00"
                className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-blue"
                onChange={handleCNPJInput}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">
                Telefone Principal
              </label>
              <input
                required
                type="text"
                value={formData.telefone_principal}
                placeholder="(00) 00000-0000"
                className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-blue"
                onChange={handlePhoneInput}
              />
            </div>

            <div className="col-span-2">
              <hr className="my-2 border-slate-100" />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">
                CEP
              </label>
              <input
                type="text"
                value={formData.cep}
                onBlur={handleCEPBlur}
                placeholder="00000-000"
                className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-blue"
                onChange={handleCEPInput}
              />
            </div>

            <div className="col-span-1">
              <label className="text-xs font-bold text-slate-400 uppercase">
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
              <label className="text-xs font-bold text-slate-400 uppercase">
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
              <label className="text-xs font-bold text-slate-400 uppercase">
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
              <label className="text-xs font-bold text-slate-400 uppercase">
                UF
              </label>
              <input
                type="text"
                maxLength={2}
                value={formData.uf}
                className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl uppercase text-center font-semibold"
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
              {selectedData ? "Atualizar Unidade" : "Salvar Unidade"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
