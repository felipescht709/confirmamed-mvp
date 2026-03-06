// /src/pages/config/Convenios.jsx
import { useState, useEffect, Fragment } from "react"; // 1. IMPORTAÇÃO DO FRAGMENT CORRIGIDA
import api from "../../services/api";
import {
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
} from "lucide-react";
import ModalConvenio from "./ModalConvenio";
import ModalPlano from "./ModalPlano";

export default function Convenios() {
  const [convenios, setConvenios] = useState([]);
  const [planos, setPlanos] = useState({});
  const [expandedConvenios, setExpandedConvenios] = useState(new Set());

  const [isModalConvOpen, setIsModalConvOpen] = useState(false);
  const [isModalPlanoOpen, setIsModalPlanoOpen] = useState(false);
  const [selectedData, setSelectedData] = useState(null);
  const [targetConvenioId, setTargetConvenioId] = useState(null);

  const fetchConvenios = async () => {
    try {
      const response = await api.get("/convenios");
      setConvenios(response.data);
    } catch (error) {
      console.error("Erro ao carregar convênios", error);
    }
  };

  const fetchPlanos = async (convenioId) => {
    try {
      const response = await api.get(`/convenios/${convenioId}/planos`);
      setPlanos((prev) => ({ ...prev, [convenioId]: response.data }));
    } catch (error) {
      console.error(`Erro ao carregar planos para ${convenioId}`, error);
    }
  };

  useEffect(() => {
    fetchConvenios();
  }, []);

  const toggleConvenio = async (convenioId) => {
    const newSet = new Set(expandedConvenios);

    if (newSet.has(convenioId)) {
      newSet.delete(convenioId);
    } else {
      newSet.add(convenioId);
      // Só busca se ainda não tivermos os planos desse convênio no estado
      if (!planos[convenioId]) {
        await fetchPlanos(convenioId);
      }
    }
    setExpandedConvenios(newSet);
  };

  const handleOpenPlanoModal = (convenioId, plano = null) => {
    setTargetConvenioId(convenioId); // Aqui atrelamos o ID do convênio pai
    setSelectedData(plano);
    setIsModalPlanoOpen(true);
  };

  const handleConvenioDelete = async (id) => {
    if (
      window.confirm(
        "Deseja realmente excluir este convênio e todos os seus planos?",
      )
    ) {
      try {
        await api.delete(`/convenios/${id}`);
        fetchConvenios();
      } catch (error) {
        alert(error.response?.data?.error || "Erro ao excluir convênio.");
      }
    }
  };
  const handlePlanoDelete = async (id, convenioId) => {
    const confirmacao = window.confirm(
      "Deseja realmente desativar este plano? Pacientes vinculados a ele podem perder a cobertura nos próximos agendamentos.",
    );

    if (confirmacao) {
      try {
        // Chama a rota de delete do plano
        await api.delete(`/planos/${id}`);

        // REFRESH INTELIGENTE: Atualiza apenas a lista de planos daquele convênio
        fetchPlanos(convenioId);
      } catch (error) {
        console.error("Erro ao desativar plano:", error);
        alert(
          error.response?.data?.error || "Erro ao processar a desativação.",
        );
      }
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <CreditCard className="text-brand-blue" /> Gestão de Convênios e
          Planos
        </h2>
        <button
          onClick={() => {
            setSelectedData(null);
            setIsModalConvOpen(true);
          }}
          className="bg-brand-blue text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"
        >
          <Plus size={18} /> Novo Convênio
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
            <tr>
              <th className="p-6 w-12"></th>
              <th className="p-6">Convênio / Plano</th>
              <th className="p-6">Registro ANS</th>
              <th className="p-6 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {convenios.map((c) => (
              <Fragment key={c.id_convenio}>
                <tr className="hover:bg-slate-50/80 transition-all group">
                  <td className="p-6">
                    <button onClick={() => toggleConvenio(c.id_convenio)}>
                      {expandedConvenios.has(c.id_convenio) ? (
                        <ChevronDown size={20} />
                      ) : (
                        <ChevronRight size={20} />
                      )}
                    </button>
                  </td>
                  <td className="p-6 font-bold text-slate-700">{c.nome}</td>
                  <td className="p-6 text-slate-500 font-mono text-xs">
                    {c.registro_ans || "---"}
                  </td>
                  <td className="p-6 text-right flex justify-end gap-3">
                    {/* 1. BOTÃO DE ADICIONAR PLANO (Fica aqui, na linha do Convênio!) */}
                    <button
                      onClick={() => handleOpenPlanoModal(c.id_convenio)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-xl transition-colors"
                      title="Adicionar Plano"
                    >
                      <Plus size={20} />
                    </button>

                    {/* Botão de Editar Convênio */}
                    <button
                      onClick={() => {
                        setSelectedData(c);
                        setIsModalConvOpen(true);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                      title="Editar"
                    >
                      <Pencil size={20} />
                    </button>

                    {/* Botão de Excluir Convênio */}
                    <button
                      onClick={() => handleConvenioDelete(c.id_convenio)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>

                {/* Linhas dos Planos (Filhos) */}
                {expandedConvenios.has(c.id_convenio) && (
                  <>
                    {planos[c.id_convenio] &&
                    planos[c.id_convenio].length > 0 ? (
                      planos[c.id_convenio].map((p) => (
                        <tr
                          key={p.id_plano}
                          className="bg-slate-50/40 border-l-4 border-brand-blue/20"
                        >
                          <td></td>
                          <td className="p-4 pl-12 flex items-center gap-2 text-sm text-slate-600">
                            <LayoutGrid size={14} className="text-slate-300" />
                            {p.nome_plano}
                          </td>
                          <td className="p-4 text-xs text-slate-400 italic">
                            ID: {p.id_plano}
                          </td>
                          <td className="p-4 text-right flex justify-end gap-3">
                            {/* EDITAR PLANO */}
                            <button
                              onClick={() =>
                                handleOpenPlanoModal(c.id_convenio, p)
                              }
                              className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar Plano"
                            >
                              <Pencil size={16} />
                            </button>

                            {/* EXCLUIR PLANO (SOFT DELETE) */}
                            <button
                              onClick={() =>
                                handlePlanoDelete(p.id_plano, c.id_convenio)
                              }
                              className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                              title="Desativar Plano"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      // Feedback visual se não houver planos
                      <tr className="bg-slate-50/20 italic">
                        <td></td>
                        <td
                          colSpan="3"
                          className="p-4 pl-12 text-xs text-slate-400"
                        >
                          Nenhum plano cadastrado. Clique no + verde para
                          adicionar.
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <ModalConvenio
        isOpen={isModalConvOpen}
        onClose={() => setIsModalConvOpen(false)}
        onRefresh={fetchConvenios}
        selectedData={selectedData}
      />

      <ModalPlano
        isOpen={isModalPlanoOpen}
        onClose={() => setIsModalPlanoOpen(false)}
        onRefresh={() => fetchPlanos(targetConvenioId)}
        selectedData={selectedData}
        convenioId={targetConvenioId}
      />
    </div>
  );
}
