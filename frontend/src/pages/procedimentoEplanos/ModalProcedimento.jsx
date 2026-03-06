// ModalProcedimento.jsx
import { useEffect, useState } from "react";
import api from "../../services/api";
import { X, Save, Loader2, ClipboardList, Globe, Info } from "lucide-react"; // Adicionei Info

export default function ModalProcedimento({
  isOpen,
  onClose,
  onRefresh,
  selectedData,
  unidadeId,
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome_procedimento: "",
    duracao_minutos: "",
    tipo: "",
    codigo_sus: "",
    valor: "0,00",
    permite_telemedicina: false,
    descricao: "",
    // ALTERAÇÃO IA: Inicializando campos para não dar erro de input uncontrolled
    preparo_obrigatorio: "",
    contraindicacoes: "",
    pos_procedimento: "",
    documentos_necessarios: "",
  });

  // Helper para formatar string para Moeda BRL
  const formatCurrency = (value) => {
    if (!value) return "0,00";
    const cleanValue = value.toString().replace(/\D/g, "");
    const options = { minimumFractionDigits: 2 };
    const result = new Intl.NumberFormat("pt-BR", options).format(
      parseFloat(cleanValue) / 100,
    );
    return cleanValue ? result : "0,00";
  };

  useEffect(() => {
    if (selectedData && isOpen) {
      const valorFormatado = new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(selectedData.valor || 0);

      setFormData({
        ...selectedData,
        valor: valorFormatado,
        // ALTERAÇÃO IA: Garante que se vier nulo do banco, vire string vazia no front
        preparo_obrigatorio: selectedData.preparo_obrigatorio || "",
        contraindicacoes: selectedData.contraindicacoes || "",
        pos_procedimento: selectedData.pos_procedimento || "",
        documentos_necessarios: selectedData.documentos_necessarios || "",
      });
    } else {
      setFormData({
        nome_procedimento: "",
        duracao_minutos: "",
        tipo: "",
        codigo_sus: "",
        valor: "0,00",
        permite_telemedicina: false,
        descricao: "",
        preparo_obrigatorio: "",
        contraindicacoes: "",
        pos_procedimento: "",
        documentos_necessarios: "",
      });
    }
  }, [selectedData, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!unidadeId) {
      alert("Nenhuma unidade selecionada.");
      return;
    }
    setLoading(true);

    const valorFloat = parseFloat(
      formData.valor.replace(/\./g, "").replace(",", "."),
    );

    // ALTERAÇÃO IA: Montando o payload garantindo os campos novos
    const payload = {
      ...formData,
      unidade_id: unidadeId,
      duracao_minutos: parseInt(formData.duracao_minutos, 10),
      valor: valorFloat || 0,
    };

    const {
      id_procedimento,
      criado_em,
      atualizado_em,
      deleted_at,
      ...dataToSubmit
    } = payload;

    try {
      if (selectedData) {
        await api.put(
          `/procedimentos/${selectedData.id_procedimento}`,
          dataToSubmit,
        );
      } else {
        await api.post("/procedimentos", dataToSubmit);
      }
      onRefresh();
      onClose();
    } catch (error) {
      console.error("ERRO NO SUBMIT:", error.response?.data || error.message);
      alert(error.response?.data?.error || "Erro ao processar requisição.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
          <h2 className="font-bold text-xl text-slate-800 flex items-center gap-2">
            <ClipboardList className="text-brand-blue" />
            {selectedData ? "Editar Procedimento" : "Novo Procedimento"}
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
          className="p-8 space-y-4 max-h-[80vh] overflow-y-auto"
        >
          {/* Seção de Dados Básicos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase">
                Nome do Procedimento
              </label>
              <input
                required
                type="text"
                value={formData.nome_procedimento}
                className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-blue"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    nome_procedimento: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">
                Código SUS
              </label>
              <input
                type="text"
                value={formData.codigo_sus || ""}
                className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                onChange={(e) =>
                  setFormData({ ...formData, codigo_sus: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">
                Duração (min)
              </label>
              <input
                required
                type="number"
                value={formData.duracao_minutos}
                className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                onChange={(e) =>
                  setFormData({ ...formData, duracao_minutos: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">
                Valor
              </label>
              <div className="relative">
                <span className="absolute left-3 top-4 text-slate-400 text-sm font-bold">
                  R$
                </span>
                <input
                  type="text"
                  value={formData.valor}
                  className="w-full mt-1 p-3 pl-10 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-blue font-mono"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      valor: formatCurrency(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">
                Tipo
              </label>
              <select
                required
                value={formData.tipo}
                className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                onChange={(e) =>
                  setFormData({ ...formData, tipo: e.target.value })
                }
              >
                <option value="">Selecione...</option>
                <option value="CONSULTA">Consulta</option>
                <option value="EXAME">Exame</option>
                <option value="RETORNO">Retorno</option>
                <option value="CIRURGIA">Cirurgia</option>
              </select>
            </div>
          </div>

          {/* ALTERAÇÃO IA: Nova Seção Visual para Protocolos de IA */}
          <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 space-y-4">
            <h3 className="text-sm font-bold text-blue-700 flex items-center gap-2">
              <Info size={16} /> Orientações Clínicas para Inteligência
              Artificial
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-blue-400 uppercase">
                  Preparo Obrigatório
                </label>
                <textarea
                  className="w-full p-3 bg-white border border-blue-100 rounded-xl text-sm outline-none focus:border-blue-300"
                  placeholder="Ex: Jejum de 8h, não tomar café..."
                  value={formData.preparo_obrigatorio}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      preparo_obrigatorio: e.target.value,
                    })
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-blue-400 uppercase">
                  Contraindicações
                </label>
                <textarea
                  className="w-full p-3 bg-white border border-blue-100 rounded-xl text-sm outline-none focus:border-blue-300"
                  placeholder="Ex: Não indicado para gestantes..."
                  value={formData.contraindicacoes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contraindicacoes: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-blue-400 uppercase">
                  Documentos Necessários
                </label>
                <textarea
                  className="w-full p-3 bg-white border border-blue-100 rounded-xl text-sm outline-none focus:border-blue-300"
                  placeholder="Ex: Pedido médico, RG e CPF..."
                  value={formData.documentos_necessarios}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      documentos_necessarios: e.target.value,
                    })
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-blue-400 uppercase">
                  Cuidados Pós-Procedimento
                </label>
                <textarea
                  className="w-full p-3 bg-white border border-blue-100 rounded-xl text-sm outline-none focus:border-blue-300"
                  placeholder="Ex: Não dirigir por 2h..."
                  value={formData.pos_procedimento}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pos_procedimento: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase">
              Descrição Geral / Observações Internas
            </label>
            <textarea
              rows="2"
              value={formData.descricao || ""}
              className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              onChange={(e) =>
                setFormData({ ...formData, descricao: e.target.value })
              }
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
            <input
              type="checkbox"
              id="telemedicina"
              checked={formData.permite_telemedicina}
              className="w-5 h-5 accent-brand-blue cursor-pointer"
              onChange={(e) =>
                setFormData({
                  ...formData,
                  permite_telemedicina: e.target.checked,
                })
              }
            />
            <label
              htmlFor="telemedicina"
              className="text-sm font-semibold text-slate-700 cursor-pointer flex items-center gap-2"
            >
              <Globe size={16} className="text-brand-blue" />
              Permite Telemedicina
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 font-bold text-slate-400 hover:text-slate-600"
            >
              Cancelar
            </button>
            <button
              disabled={loading}
              className="bg-brand-blue text-white px-10 py-3 rounded-2xl font-bold flex items-center gap-2 hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Save size={20} />
              )}
              {selectedData ? "Atualizar" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
