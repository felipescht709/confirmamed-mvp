import { useState, useEffect } from "react";
import api from "../../../services/api";
import ModalUnidade from "./ModalUnidade";
import { Building2, Plus, Pencil, Trash2 } from "lucide-react";

export default function Unidades() {
  const [unidades, setUnidades] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUnidade, setSelectedUnidade] = useState(null);

  const fetchUnidades = async () => {
    try {
      const response = await api.get("/unidades");
      setUnidades(response.data);
    } catch (err) {
      console.error(err);
      console.error("Erro ao carregar unidades");
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUnidades();
  }, []);

  const handleEdit = (unidade) => {
    setSelectedUnidade(unidade);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (confirm("Deseja realmente desativar esta unidade?")) {
      try {
        await api.delete(`/unidades/${id}`);
        fetchUnidades();
      } catch (err) {
        console.error(err);
        alert("Erro ao excluir unidade.");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Building2 className="text-brand-blue" /> Unidades de Atendimento
        </h2>
        <button
          onClick={() => {
            setSelectedUnidade(null);
            setModalOpen(true);
          }}
          className="bg-brand-blue text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-opacity-90 transition-all"
        >
          <Plus size={18} /> Nova Unidade
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
            <tr>
              <th className="p-6">Nome Fantasia</th>
              <th className="p-6">Cidade/UF</th>
              <th className="p-6">Telefone</th>
              <th className="p-6 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {unidades.map((un) => (
              <tr
                key={un.id_unidade}
                className="hover:bg-slate-50 transition-all"
              >
                <td className="p-6 font-bold text-slate-700">
                  {un.nome_fantasia}
                </td>
                <td className="p-6 text-slate-500">
                  {un.cidade} / {un.uf}
                </td>
                <td className="p-6 text-slate-500">{un.telefone_principal}</td>
                <td className="p-6 text-right flex justify-end gap-3">
                  <button
                    onClick={() => handleEdit(un)}
                    className="text-slate-300 hover:text-brand-blue"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(un.id_unidade)}
                    className="text-slate-300 hover:text-red-500"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ModalUnidade
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedUnidade(null);
        }}
        onRefresh={fetchUnidades}
        selectedData={selectedUnidade}
      />
    </div>
  );
}
