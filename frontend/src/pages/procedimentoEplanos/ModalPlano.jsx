import { useEffect, useState } from "react";
import api from "../../services/api";
import { X, Save, Loader2, LayoutGrid } from "lucide-react";

export default function ModalPlano({
  isOpen,
  onClose,
  onRefresh,
  selectedData,
  convenioId,
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome_plano: "",
    ativo: true,
  });

  useEffect(() => {
    if (selectedData && isOpen) {
      setFormData({
        nome_plano: selectedData.nome_plano,
        ativo: selectedData.ativo ?? true,
      });
    } else {
      setFormData({ nome_plano: "", ativo: true });
    }
  }, [selectedData, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      nome_plano: formData.nome_plano,
      convenio_id: convenioId, 
      ativo: formData.ativo, // AGORA USA O ESTADO DO CHECKBOX
    };

    try {
      if (selectedData?.id_plano) {
        await api.put(`/planos/${selectedData.id_plano}`, payload);
      } else {
        await api.post("/planos", payload);
      }
      onRefresh();
      onClose();
    } catch (error) {
      alert("Erro ao salvar plano.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
          <h2 className="font-bold text-xl text-slate-800 flex items-center gap-2">
            <LayoutGrid className="text-brand-blue" />
            {selectedData ? "Editar Plano" : "Novo Plano"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase">
              Nome do Plano
            </label>
            <input
              required
              type="text"
              className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-blue"
              value={formData.nome_plano}
              onChange={(e) =>
                setFormData({ ...formData, nome_plano: e.target.value })
              }
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.ativo}
              onChange={(e) =>
                setFormData({ ...formData, ativo: e.target.checked })
              }
            />
            <label className="text-sm font-medium text-slate-600">
              Plano Ativo
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 font-bold text-slate-400"
            >
              Cancelar
            </button>
            <button
              disabled={loading}
              className="bg-brand-blue text-white px-10 py-3 rounded-2xl font-bold flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Save size={20} />
              )}
              Salvar Plano
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
