import { useState, useEffect } from 'react';
import api from '../../services/api';
import ModalProcedimento from './ModalProcedimento';
import Convenios from './Convenios';
import { ClipboardList, Plus, Pencil, Trash2, Building, CreditCard } from 'lucide-react';

const TabButton = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
            active ? 'bg-brand-blue text-white' : 'text-slate-500 hover:bg-slate-100'
        }`}
    >
        {children}
    </button>
);

function ProcedimentosContent() {
    const [procedimentos, setProcedimentos] = useState([]);
    const [unidades, setUnidades] = useState([]);
    const [selectedUnidade, setSelectedUnidade] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedProcedimento, setSelectedProcedimento] = useState(null);

    const fetchUnidades = async () => {
        try {
            const response = await api.get('/unidades');
            setUnidades(response.data);
            if (response.data.length > 0) {
                setSelectedUnidade(response.data[0].id_unidade);
            }
        } catch {
            console.error("Erro ao carregar unidades");
        }
    };

    const fetchProcedimentos = async (unidadeId) => {
        if (!unidadeId) return;
        try {
            const response = await api.get(`/unidades/${unidadeId}/procedimentos`);
            setProcedimentos(response.data);
        } catch {
            console.error("Erro ao carregar procedimentos");
            setProcedimentos([]);
        }
    };

    useEffect(() => {
        fetchUnidades();
    }, []);

    useEffect(() => {
        fetchProcedimentos(selectedUnidade);
    }, [selectedUnidade]);

    const handleDelete = async (id) => {
        if (window.confirm("Deseja realmente excluir este procedimento?")) {
            try {
                await api.delete(`/procedimentos/${id}`);
                fetchProcedimentos(selectedUnidade);
            } catch (error) {
                alert(error.response?.data?.error || "Erro ao excluir procedimento.");
            }
        }
    };

    return (
        <div className="space-y-6 mt-6">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <ClipboardList className="text-brand-blue" /> Gestão de Procedimentos
                </h2>
                <div className="flex gap-4">
                    <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select
                            value={selectedUnidade}
                            onChange={(e) => setSelectedUnidade(e.target.value)}
                            className="pl-10 pr-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-brand-blue outline-none appearance-none"
                        >
                            {unidades.map(unidade => (
                                <option key={unidade.id_unidade} value={unidade.id_unidade}>
                                    {unidade.nome_fantasia}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={() => { setSelectedProcedimento(null); setModalOpen(true); }}
                        disabled={!selectedUnidade}
                        className="bg-brand-blue text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-opacity-90 disabled:bg-opacity-50"
                    >
                        <Plus size={18} /> Novo Procedimento
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                        <tr>
                            <th className="p-6">Nome do Procedimento</th>
                            <th className="p-6">Duração (min)</th>
                            <th className="p-6">Tipo</th>
                            <th className="p-6 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {procedimentos.map((p) => (
                            <tr key={p.id_procedimento} className="hover:bg-slate-50 transition-all">
                                <td className="p-6 font-bold text-slate-700">{p.nome_procedimento}</td>
                                <td className="p-6 text-slate-500 text-sm">{p.duracao_minutos}</td>
                                <td className="p-6 text-slate-500 text-sm">{p.tipo}</td>
                                <td className="p-6 text-right flex justify-end gap-3">
                                    <button onClick={() => { setSelectedProcedimento(p); setModalOpen(true); }} className="text-slate-300 hover:text-brand-blue">
                                        <Pencil size={18} />
                                    </button>
                                    <button onClick={() => handleDelete(p.id_procedimento)} className="text-slate-300 hover:text-red-500">
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {procedimentos.length === 0 && (
                    <div className="text-center p-10 text-slate-500">
                        Nenhum procedimento encontrado para esta unidade.
                    </div>
                )}
            </div>

            <ModalProcedimento
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setSelectedProcedimento(null); }}
                onRefresh={() => fetchProcedimentos(selectedUnidade)}
                selectedData={selectedProcedimento}
                unidadeId={selectedUnidade}
            />
        </div>
    );
}


export default function ProcedimentosEPlanos() {
    const [activeTab, setActiveTab] = useState('procedimentos');

    return (
        <div className="space-y-6">
            <div className="bg-white p-2 rounded-full shadow-sm border border-slate-100 flex items-center gap-2 max-w-md">
                <TabButton active={activeTab === 'procedimentos'} onClick={() => setActiveTab('procedimentos')}>
                    Procedimentos
                </TabButton>
                <TabButton active={activeTab === 'convenios'} onClick={() => setActiveTab('convenios')}>
                    Convênios e Planos
                </TabButton>
            </div>

            <div>
                {activeTab === 'procedimentos' && <ProcedimentosContent />}
                {activeTab === 'convenios' && <Convenios />}
            </div>
        </div>
    )
}
