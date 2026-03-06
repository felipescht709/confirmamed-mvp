import { useEffect, useState } from "react";
import api from "../../../services/api";
import { X, Save, Loader2, Calendar, Link2, Check } from "lucide-react"; // Check adicionado

export default function ModalProfissional({
  isOpen,
  onClose,
  onRefresh,
  selectedData,
}) {
  const [loading, setLoading] = useState(false);
  const [unidades, setUnidades] = useState([]);
  const [vinculosAtuais, setVinculosAtuais] = useState([]);
  const [novosVinculos, setNovosVinculos] = useState([]); // Estado para novos cadastros

  const [formData, setFormData] = useState({
    nome_completo: "",
    cpf: "",
    data_nascimento: "",
    especialidade: "",
    rqe: "",
    conselho: "",
    numero_conselho: "",
    uf_conselho: "",
    telefone: "",
    email: "",
    permite_telemedicina: false,
  });

  const fetchVinculos = async (id) => {
    try {
      const res = await api.get(`/vinculos?profissional_id=${id}`);
      setVinculosAtuais(res.data);
    } catch (err) {
      console.error("Erro ao carregar vínculos:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      api.get("/unidades").then((res) => setUnidades(res.data));

      if (selectedData) {
        fetchVinculos(selectedData.id_profissional_saude);

        let dataMask = "";
        if (selectedData.data_nascimento) {
          const [ano, mes, dia] = selectedData.data_nascimento
            .split("T")[0]
            .split("-");
          dataMask = `${dia}/${mes}/${ano}`;
        }

        setFormData({
          ...selectedData,
          data_nascimento: dataMask,
          rqe: selectedData.rqe || "",
          telefone: selectedData.telefone || "",
          email: selectedData.email || "",
        });
      } else {
        setFormData({
          nome_completo: "",
          cpf: "",
          data_nascimento: "",
          especialidade: "",
          rqe: "",
          conselho: "",
          numero_conselho: "",
          uf_conselho: "",
          telefone: "",
          email: "",
          permite_telemedicina: false,
        });
        setVinculosAtuais([]);
        setNovosVinculos([]); // Limpa vínculos temporários ao abrir para novo cadastro
      }
    }
  }, [selectedData, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const parts = formData.data_nascimento.split("/");
    const dataFormatada =
      parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : "";
    const cpfLimpo = formData.cpf.replace(/\D/g, "");

    try {
      let profissionalId = selectedData?.id_profissional_saude;

      if (selectedData) {
        // EDIÇÃO
        await api.put(`/profissionais/${profissionalId}`, {
          ...formData,
          cpf: cpfLimpo,
          data_nascimento: dataFormatada,
        });
      } else {
        // NOVO CADASTRO
        const res = await api.post("/profissionais", {
          ...formData,
          cpf: cpfLimpo,
          data_nascimento: dataFormatada,
        });

        // Importante: Verifique se sua API retorna o ID no campo .id ou .id_profissional_saude
        profissionalId = res.data.id || res.data.id_profissional_saude;

        // Cria os vínculos em lote para o novo profissional
        if (novosVinculos.length > 0 && profissionalId) {
          await Promise.all(
            novosVinculos.map((unidade_id) =>
              api.post("/vinculos", {
                profissional_id: profissionalId,
                unidade_id,
              }),
            ),
          );
        }
      }

      onRefresh();
      onClose();
    } catch (error) {
      alert(error.response?.data?.error || "Erro ao salvar profissional.");
    } finally {
      setLoading(false);
    }
  };

  const toggleVinculoTemporario = (unidadeId) => {
    if (selectedData) {
      // Se já existe (Edição), vincula direto no banco
      api
        .post("/vinculos", {
          profissional_id: selectedData.id_profissional_saude,
          unidade_id: unidadeId,
        })
        .then(() => fetchVinculos(selectedData.id_profissional_saude))
        .catch(() => alert("Vínculo já existe nesta unidade."));
    } else {
      // Se for novo, apenas marca no estado local (sem atrito!)
      setNovosVinculos((prev) =>
        prev.includes(unidadeId)
          ? prev.filter((id) => id !== unidadeId)
          : [...prev, unidadeId],
      );
    }
  };

  const handleDesvincularReal = async (unidadeId) => {
    if (!window.confirm("Deseja remover este vínculo?")) return;
    try {
      await api.delete(
        `/vinculos/${selectedData.id_profissional_saude}/${unidadeId}`,
      );
      setVinculosAtuais((prev) =>
        prev.filter((v) => v.unidade_id !== unidadeId),
      );
    } catch {
      alert("Erro ao remover vínculo.");
    }
  };

  // MÁSCARAS
  const handleDataInput = (e) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length > 8) v = v.slice(0, 8);
    if (v.length > 4) v = v.replace(/(\d{2})(\d{2})(\d{1,4})/, "$1/$2/$3");
    else if (v.length > 2) v = v.replace(/(\d{2})(\d{1,2})/, "$1/$2");
    setFormData({ ...formData, data_nascimento: v });
  };

  const handleCPFInput = (e) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    setFormData({ ...formData, cpf: v });
  };

  const handlePhoneInput = (e) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
    v = v.replace(/(\d{5})(\d)/, "$1-$2");
    setFormData({ ...formData, telefone: v });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
          <h2 className="font-bold text-xl text-slate-800">
            {selectedData ? "Editar Profissional" : "Novo Profissional"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-8 space-y-4 max-h-[85vh] overflow-y-auto"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-400 uppercase">
                Nome Completo
              </label>
              <input
                required
                type="text"
                value={formData.nome_completo}
                className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-blue"
                onChange={(e) =>
                  setFormData({ ...formData, nome_completo: e.target.value })
                }
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">
                CPF
              </label>
              <input
                required
                type="text"
                placeholder="000.000.000-00"
                value={formData.cpf}
                className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                onChange={handleCPFInput}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">
                Especialidade
              </label>
              <input
                required
                type="text"
                value={formData.especialidade}
                className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                onChange={(e) =>
                  setFormData({ ...formData, especialidade: e.target.value })
                }
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">
                Data de Nascimento
              </label>
              <div className="relative">
                <input
                  required
                  type="text"
                  placeholder="DD/MM/AAAA"
                  value={formData.data_nascimento}
                  className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  onChange={handleDataInput}
                />
                <Calendar
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300"
                  size={18}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">
                RQE (Opcional)
              </label>
              <input
                type="text"
                value={formData.rqe}
                className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                onChange={(e) =>
                  setFormData({ ...formData, rqe: e.target.value })
                }
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">
                Telefone
              </label>
              <input
                type="text"
                placeholder="(00) 00000-0000"
                value={formData.telefone}
                className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                onChange={handlePhoneInput}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">
                E-mail
              </label>
              <input
                type="email"
                value={formData.email}
                className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-4 gap-3 col-span-2">
              <div className="col-span-1">
                <label className="text-xs font-bold text-slate-400 uppercase">
                  Conselho
                </label>
                <input
                  required
                  type="text"
                  value={formData.conselho}
                  className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl uppercase"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      conselho: e.target.value.toUpperCase(),
                    })
                  }
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-400 uppercase">
                  Nº Registro
                </label>
                <input
                  required
                  type="text"
                  value={formData.numero_conselho}
                  className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      numero_conselho: e.target.value,
                    })
                  }
                />
              </div>
              <div className="col-span-1">
                <label className="text-xs font-bold text-slate-400 uppercase">
                  UF
                </label>
                <input
                  required
                  type="text"
                  maxLength={2}
                  value={formData.uf_conselho}
                  className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl uppercase text-center outline-none"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      uf_conselho: e.target.value.toUpperCase(),
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 py-4 border-t border-b">
            <input
              type="checkbox"
              id="telemedicina"
              checked={formData.permite_telemedicina}
              className="w-5 h-5 rounded border-slate-300 text-brand-blue"
              onChange={(e) =>
                setFormData({
                  ...formData,
                  permite_telemedicina: e.target.checked,
                })
              }
            />
            <label
              htmlFor="telemedicina"
              className="text-sm font-medium text-slate-600 cursor-pointer"
            >
              Este profissional realiza Telemedicina
            </label>
          </div>

          {/* SEÇÃO DE VÍNCULOS DINÂMICA */}
          <div className="pt-4 border-t">
            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-4">
              <Link2 size={14} /> Unidades de Atendimento (Vínculo)
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {unidades.map((unidade) => {
                const isVinculado = selectedData
                  ? vinculosAtuais.some(
                      (v) => v.unidade_id === unidade.id_unidade,
                    )
                  : novosVinculos.includes(unidade.id_unidade);

                return (
                  <button
                    key={unidade.id_unidade}
                    type="button"
                    onClick={() => {
                      if (selectedData && isVinculado)
                        handleDesvincularReal(unidade.id_unidade);
                      else toggleVinculoTemporario(unidade.id_unidade);
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                      isVinculado
                        ? "border-brand-blue bg-blue-50 text-brand-blue"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <span className="text-sm font-medium truncate">
                      {unidade.nome_fantasia}
                    </span>
                    {isVinculado ? (
                      <Check size={16} />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-300" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 font-bold text-slate-400 hover:text-slate-600"
            >
              Cancelar
            </button>
            <button
              disabled={loading}
              className="bg-brand-blue text-white px-10 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-brand-accent transition-all shadow-lg shadow-brand-blue/20"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Save size={20} />
              )}
              {selectedData ? "Atualizar Dados" : "Salvar Profissional"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
