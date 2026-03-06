import { useState, useEffect } from "react";
import api from "../../../services/api";
import ModalProfissional from "./ModalProfissional";
// 1. Adicionamos o ícone Pencil (ou Edit3)
import { UserPlus, Stethoscope, Trash2, Pencil } from "lucide-react";

export default function Profissionais() {
  const [data, setData] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  // 2. Criamos um estado para armazenar o profissional que está sendo editado
  const [selectedPro, setSelectedPro] = useState(null);

  const fetchProfissionais = async () => {
    try {
      const response = await api.get("/profissionais");
      setData(response.data);
    } catch (err) {
      console.error("Erro ao buscar dados");
    }
  };

  useEffect(() => {
    fetchProfissionais();
  }, []);

  // 3. Função para abrir o modal em modo de edição
  const handleEdit = (pro) => {
    setSelectedPro(pro);
    setModalOpen(true);
  };

  // 4. Função para fechar o modal e limpar o selecionado
  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedPro(null);
  };

  const handleDelete = async (id) => {
    if (confirm("Deseja realmente desativar este profissional?")) {
      await api.delete(`/profissionais/${id}`);
      fetchProfissionais();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Stethoscope className="text-brand-blue" /> Profissionais Ativos
        </h2>
        {/* Ao clicar em Novo, garantimos que o selectedPro seja null */}
        <button
          onClick={() => {
            setSelectedPro(null);
            setModalOpen(true);
          }}
          className="bg-brand-blue text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"
        >
          <UserPlus size={18} /> Novo Cadastro
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
            <tr>
              <th className="p-6">Nome</th>
              <th className="p-6">Especialidade</th>
              <th className="p-6">Conselho</th>
              <th className="p-6 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.map((pro) => (
              <tr
                key={pro.id_profissional_saude}
                className="hover:bg-slate-50 transition-all"
              >
                <td className="p-6 font-bold text-slate-700">
                  {pro.nome_completo}
                </td>
                <td className="p-6 text-slate-500">{pro.especialidade}</td>
                <td className="p-6 text-xs text-slate-400">
                  {pro.conselho} {pro.numero_conselho}/{pro.uf_conselho}
                </td>
                <td className="p-6 text-right flex justify-end gap-3">
                  {/* BOTÃO DE EDITAR */}
                  <button
                    onClick={() => handleEdit(pro)}
                    className="text-slate-300 hover:text-brand-blue transition-colors"
                  >
                    <Pencil size={18} />
                  </button>

                  <button
                    onClick={() => handleDelete(pro.id_profissional_saude)}
                    className="text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PASSAMOS O selectedData PARA O MODAL */}
      <ModalProfissional
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onRefresh={fetchProfissionais}
        selectedData={selectedPro}
      />
    </div>
  );
}
