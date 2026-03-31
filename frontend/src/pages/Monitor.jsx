// Monitor.jsx
import { useEffect, useState } from "react";
import api from "../services/api";
import {
  RefreshCw,
  MessageCircle,
  Info,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Search,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function Monitor() {
  const navigate = useNavigate();
  const [conversas, setConversas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [filtro, setFiltro] = useState("");

  const assumirControle = async (sessionId) => {
    try {
      // Chama o backend para travar a IA
      await api.post("/ia/intervir", { session_id: sessionId });

      toast.success("Você assumiu o atendimento!");

      // Navega para a tela de monitoramento/chat específica
      // Onde você poderá digitar mensagens como humano
      navigate(`/monitor/${sessionId}`);
    } catch (err) {
      toast.error("Erro ao intervir na sessão.");
    }
  };

  // Busca as sessões e tenta enriquecer com dados do último log
  const fetchConversas = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/ia/monitor");

      // O backend agora deve retornar session_id, paciente_telefone, etc.
      setConversas(data);
    } catch (err) {
      console.error("Erro ao buscar monitor:", err);
      toast.error("Erro ao sincronizar dados do servidor.");
    } finally {
      setLoading(false);
    }
  };

  const verAuditoria = async (sessionId) => {
    try {
      // Busca o log mais recente dessa sessão específica
      const { data } = await api.get(
        `/ia/audit-logs?session_id=${sessionId}&limit=1`,
      );
      if (data && data.length > 0) {
        setSelectedAudit(data[0]);
      } else {
        toast.error("Nenhum detalhe técnico encontrado para esta interação.");
      }
    } catch {
      toast.error("Erro ao carregar auditoria.");
    }
  };

  useEffect(() => {
    fetchConversas();
  }, []);

  // Filtro simples para busca na tela
  const conversasFiltradas = conversas.filter(
    (c) =>
      c.paciente_telefone?.includes(filtro) ||
      c.nome_paciente?.toLowerCase().includes(filtro.toLowerCase()),
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* HEADER & FILTROS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Monitor de Operação IA
          </h1>
          <p className="text-slate-500 text-sm flex items-center gap-1">
            <ShieldCheck size={14} className="text-emerald-500" />
            Conformidade ISO 42001: Rastreabilidade total de decisões.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Buscar paciente ou tel..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-blue/20"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
          </div>
          <button
            onClick={fetchConversas}
            disabled={loading}
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-all"
          >
            <RefreshCw
              size={18}
              className={
                loading ? "animate-spin text-brand-blue" : "text-slate-600"
              }
            />
          </button>
        </div>
      </div>

      {/* TABELA DE MONITORAMENTO */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest">
                  Paciente / Origem
                </th>
                <th className="p-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest">
                  Inteligência / Persona
                </th>
                <th className="p-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest">
                  Estado & Fluxo
                </th>
                <th className="p-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest">
                  Performance
                </th>
                <th className="p-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest text-center">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {conversasFiltradas.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan="5"
                    className="p-20 text-center text-slate-400 font-medium"
                  >
                    Nenhuma interação detectada no momento.
                  </td>
                </tr>
              )}
              {conversasFiltradas.map((c) => (
                <tr
                  key={c.session_id}
                  className="hover:bg-slate-50/80 transition-colors group"
                >
                  <td className="p-4">
                    <div className="font-bold text-slate-900">
                      {c.paciente_telefone}
                    </div>
                    <div className="text-xs text-slate-400">
                      {c.nome_paciente || "Paciente não cadastrado"}
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="px-2 py-0.5 bg-brand-blue/10 text-brand-blue border border-brand-blue/10 rounded-md text-[9px] font-black uppercase w-fit tracking-tighter">
                        {c.persona || "NEUTRA"}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        🎯 Intenção:{" "}
                        <b className="text-slate-700">
                          {c.last_intent || "Processando..."}
                        </b>
                      </span>
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${c.estado_atual !== "FINALIZADO" ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`}
                      />
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
                        {c.estado_atual}
                      </span>
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono bg-slate-50 p-2 rounded-xl w-fit group-hover:bg-white group-hover:border-slate-100 border border-transparent transition-all">
                      <span className="flex items-center gap-1 text-amber-600 font-bold">
                        <Zap size={10} /> {c.response_time || 0}ms
                      </span>
                      <span className="border-l pl-2 border-slate-200">
                        Σ {c.total_tokens || 0} tkns
                      </span>
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => verAuditoria(c.session_id)}
                        className="p-2 text-slate-400 hover:text-brand-blue hover:bg-brand-blue/5 rounded-xl transition-all"
                        title="Ver Decisão da IA"
                      >
                        <Info size={20} />
                      </button>
                      <button
                        onClick={() => assumirControle(c.session_id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all active:scale-95 ${
                          c.estado_atual === "TRANSBORDO"
                            ? "bg-amber-500 text-white" // Indica que já tem humano
                            : "bg-brand-blue text-white hover:shadow-lg hover:shadow-brand-blue/20"
                        }`}
                      >
                        <MessageCircle size={14} />
                        {c.estado_atual === "TRANSBORDO"
                          ? "Monitorando"
                          : "Intervir"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE AUDITORIA (Explicabilidade Algorítmica) */}
      {selectedAudit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl p-8 overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-start mb-8 border-b border-slate-50 pb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                  Trilha de Auditoria
                </h2>
                <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase">
                  Log ID: {selectedAudit.id_log}
                </p>
              </div>
              <button
                onClick={() => setSelectedAudit(null)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* STATUS CARD */}
              <div className="p-5 bg-emerald-50 rounded-3xl border border-emerald-100/50 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">
                    Status da Resposta
                  </p>
                  <h4 className="font-bold text-slate-700">
                    {selectedAudit.action}
                  </h4>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">
                    Confiança
                  </p>
                  <h4 className="font-bold text-emerald-600">Alta (98%)</h4>
                </div>
              </div>

              {/* DADOS TÉCNICOS */}
              <div className="space-y-4">
                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase mb-3 flex items-center gap-2">
                    <ShieldCheck size={12} className="text-emerald-500" />
                    Input Higienizado (OpenAI Prompt)
                  </h4>
                  <pre className="text-[11px] text-slate-600 font-mono leading-relaxed bg-white p-4 rounded-xl border border-slate-100 overflow-x-auto">
                    {JSON.stringify(selectedAudit.request_data, null, 2)}
                  </pre>
                </div>

                <div className="p-5 bg-brand-blue/5 rounded-3xl border border-brand-blue/10">
                  <h4 className="text-[10px] font-black text-brand-blue/60 uppercase mb-3 tracking-widest">
                    Veredito do Orquestrador
                  </h4>
                  <pre className="text-[11px] font-mono text-brand-blue/80 bg-white/50 p-4 rounded-xl border border-brand-blue/10 leading-relaxed overflow-x-auto">
                    {JSON.stringify(selectedAudit.response_data, null, 2)}
                  </pre>
                </div>
              </div>

              {selectedAudit.error_message && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 animate-pulse">
                  <AlertTriangle className="text-red-500 shrink-0" size={18} />
                  <div>
                    <p className="text-xs font-bold text-red-700 uppercase italic">
                      Exceção Capturada
                    </p>
                    <p className="text-sm text-red-600 font-medium">
                      {selectedAudit.error_message}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
