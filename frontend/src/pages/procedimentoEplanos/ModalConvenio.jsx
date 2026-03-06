// frontend/src/pages/procedimentoEplanos/ModalConvenio.jsx
import { useEffect, useState } from "react";
import api from "../../services/api";
import { X, Save, Loader2, CreditCard } from "lucide-react";

export default function ModalConvenio({ isOpen, onClose, onRefresh, selectedData }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    registro_ans: "",
    ativo: true,
  });

  useEffect(() => {
    if (selectedData && isOpen) {
      setFormData({
        nome: selectedData.nome || "",
        registro_ans: selectedData.registro_ans || "",
        ativo: selectedData.ativo ?? true,
      });
    } else {
      setFormData({ nome: "", registro_ans: "", ativo: true });
    }
  }, [selectedData, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (selectedData?.id_convenio) {
        await api.put(`/convenios/${selectedData.id_convenio}`, formData);
      } else {
        await api.post("/convenios", formData);
      }
      onRefresh();
      onClose();
    } catch (error) {
      console.error(error);
      alert("Erro ao processar convênio.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
          <h2 className="font-bold text-xl text-slate-800 flex items-center gap-2">
            <CreditCard className="text-brand-blue" />
            {selectedData ? "Editar Convênio" : "Novo Convênio"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase">Nome da Operadora</label>
            <input
              required
              className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-blue"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase">Registro ANS</label>
            <input
              className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
              value={formData.registro_ans}
              onChange={(e) => setFormData({ ...formData, registro_ans: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
             <input 
               type="checkbox" 
               checked={formData.ativo} 
               onChange={e => setFormData({...formData, ativo: e.target.checked})}
             />
             <label className="text-sm font-medium text-slate-600">Ativo</label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-6 py-3 font-bold text-slate-400">Cancelar</button>
            <button disabled={loading} className="bg-brand-blue text-white px-10 py-3 rounded-2xl font-bold flex items-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}