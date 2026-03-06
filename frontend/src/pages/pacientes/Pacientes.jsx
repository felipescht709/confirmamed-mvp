//src/pages/pacientes/Pacientes.jsx
import { useState, useEffect } from 'react';
import api from '../../services/api';
import ModalPaciente from './ModalPaciente';
import { UserCircle, Plus, Pencil, Trash2, Search } from 'lucide-react';

export default function Pacientes() {
  const [data, setData] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchPacientes = async () => {
    try {
      const response = await api.get('/pacientes');
      setData(response.data);
    } catch { console.error("Erro ao carregar pacientes"); }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchPacientes(); }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Deseja realmente excluir este paciente?")) {
      try {
        await api.delete(`/pacientes/${id}`);
        fetchPacientes();
      } catch (error) {
        alert(error.response?.data?.error || "Erro ao excluir paciente.");
      }
    }
  };

  // Filtro simples em tempo real
  const filteredData = data.filter(p => 
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.cpf?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <UserCircle className="text-brand-blue" /> Gestão de Pacientes
        </h2>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar paciente..." 
              className="pl-10 pr-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-brand-blue outline-none"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => { setSelectedPaciente(null); setModalOpen(true); }}
            className="bg-brand-blue text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-opacity-90"
          >
            <Plus size={18} /> Novo Paciente
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
            <tr>
              <th className="p-6">Paciente</th>
              <th className="p-6">CPF / CNS</th>
              <th className="p-6">Contato</th>
              <th className="p-6 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredData.map((p) => (
              <tr key={p.id_paciente} className="hover:bg-slate-50 transition-all">
                <td className="p-6">
                  <div className="font-bold text-slate-700">{p.nome}</div>
                  <div className="text-[10px] text-slate-400">Nasc: {new Date(p.data_nascimento).toLocaleDateString()}</div>
                </td>
                <td className="p-6 text-slate-500 text-sm">
                  <div>{p.cpf || '---'}</div>
                  <div className="text-[10px]">CNS: {p.cns || 'N/I'}</div>
                </td>
                <td className="p-6 text-slate-500 text-sm">{p.telefone}</td>
                <td className="p-6 text-right flex justify-end gap-3">
                  <button onClick={() => { setSelectedPaciente(p); setModalOpen(true); }} className="text-slate-300 hover:text-brand-blue">
                    <Pencil size={18} />
                  </button>
                  <button onClick={() => handleDelete(p.id_paciente)} className="text-slate-300 hover:text-red-500">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ModalPaciente 
        isOpen={modalOpen} 
        onClose={() => { setModalOpen(false); setSelectedPaciente(null); }} 
        onRefresh={fetchPacientes}
        selectedData={selectedPaciente}
      />
    </div>
  );
}