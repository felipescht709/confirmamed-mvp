import { useEffect, useState } from "react";
import api from "../services/api";
import {
  RefreshCw,
  MessageCircle,
  Info,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Cpu,
  Zap,
  Search,
  X,
  ExternalLink,
  Bot,
  User,
  Sparkles,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import WebChatWidget from "../components/Chat/WebChatWidget";

export default function Monitor() {
  const navigate = useNavigate();
  const { sessionId: urlSessionId } = useParams();
  const [conversas, setConversas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditFilter, setAuditFilter] = useState("TODOS"); // "TODOS", "REPROVADO", "APROVADO", "HUMANO"
  const [filtro, setFiltro] = useState("");

  const getDecisionExplanation = (log) => {
    const input = (log.input_usuario || "").toLowerCase();
    const output = (log.output_ia || "").toLowerCase();
    
    if (log.risco_detectado || log.veredicto_auditoria === "REPROVADO") {
      return {
        tipo: "INTERVENCAO_RISCO",
        badge: "Risco Clínico Interceptado",
        cor: "border-red-200 bg-red-50 text-red-700",
        descricao: "O SupervisorNode barrou a resposta para evitar diagnósticos indevidos ou preparos não chancelados."
      };
    }
    if (log.provider_usado === "HUMAN_OPERATOR" || log.input_usuario === "[ADMIN]" || log.veredicto_auditoria === "HUMANO") {
      return {
        tipo: "HUMAN_IN_THE_LOOP",
        badge: "Soberania do Operador",
        cor: "border-amber-200 bg-amber-50 text-amber-700",
        descricao: "Transbordo assumido manualmente pelo operador / atendente."
      };
    }
    if (output.includes("agendada com sucesso") || output.includes("id da sua consulta")) {
      return {
        tipo: "AGENDAMENTO",
        badge: "Tool: criar_agendamento",
        cor: "border-emerald-200 bg-emerald-50 text-emerald-700",
        descricao: "Validação de dados cadastrais, alocação de vaga e inserção na grade médica."
      };
    }
    if (output.includes("reagendada com sucesso") || input.includes("reagendar") || input.includes("não vou conseguir ir")) {
      return {
        tipo: "REAGENDAMENTO",
        badge: "Tool: reagendar_consulta (Gap Filling)",
        cor: "border-purple-200 bg-purple-50 text-purple-700",
        descricao: "Cancelamento da consulta original, oferta na fila de espera e remanejamento com vaga liberada."
      };
    }
    if (output.includes("horários disponíveis") || output.includes("disponibilidade") || input.includes("vaga")) {
      return {
        tipo: "DISPONIBILIDADE",
        badge: "Tool: verificar_disponibilidade",
        cor: "border-blue-200 bg-blue-50 text-blue-700",
        descricao: "Consulta em tempo real à grade horária livre do médico especialista."
      };
    }
    if (output.includes("presença está confirmada") || input.includes("confirmo")) {
      return {
        tipo: "CONFIRMACAO",
        badge: "Tool: confirmar_presenca",
        cor: "border-emerald-200 bg-emerald-50 text-emerald-700",
        descricao: "Atualização atômica do status da consulta na rede pública de PENDENTE para CONFIRMADA."
      };
    }
    if (output.includes("termos de uso") || output.includes("lgpd")) {
      return {
        tipo: "LGPD",
        badge: "Gatekeeper: Termos LGPD",
        cor: "border-slate-200 bg-slate-100 text-slate-700",
        descricao: "Coleta e registro de consentimento expresso de dados pessoais e de saúde."
      };
    }
    return {
      tipo: "CONVERSACIONAL",
      badge: "BrainNode: Raciocínio Clínico",
      cor: "border-indigo-200 bg-indigo-50 text-indigo-700",
      descricao: "Triagem conversacional direcionando o paciente para a especialidade correta."
    };
  };

  const formatPhone = (phoneStr) => {
    if (!phoneStr) return "";
    const raw = phoneStr.replace(/\D/g, "");
    let num = raw;
    if (num.startsWith("55") && num.length >= 12) {
      num = num.substring(2);
    }
    if (num.length === 11) {
      return `(${num.substring(0,2)}) ${num.substring(2,7)}-${num.substring(7)}`;
    } else if (num.length === 10) {
      return `(${num.substring(0,2)}) ${num.substring(2,6)}-${num.substring(6)}`;
    }
    return phoneStr.split('@')[0];
  };

  const assumirControle = async (sessionId) => {
    try {
      // Chama o backend para travar a IA
      await api.post("/ia/intervir", { session_id: sessionId });

      toast.success("Você assumiu o atendimento!");

      // Navega para a tela de monitoramento/chat específica
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
      const { data } = await api.get(
        `/ia/audit-logs?session_id=${sessionId}&limit=100&order=asc`,
      );
      if (data && data.length > 0) {
        setAuditLogs(data);
        setSelectedAudit(data[data.length - 1]);
      } else {
        // Fallback: busca últimos logs da unidade para manter a apresentação fluida
        const resGeral = await api.get(`/ia/audit-logs?limit=20&order=asc`);
        if (resGeral.data && resGeral.data.length > 0) {
          setAuditLogs(resGeral.data);
          setSelectedAudit(resGeral.data[resGeral.data.length - 1]);
        } else {
          toast.error("Nenhum detalhe técnico encontrado para esta interação.");
        }
      }
    } catch {
      toast.error("Erro ao carregar auditoria.");
    }
  };

  useEffect(() => {
    fetchConversas();
    // Refresh automático a cada 3s para atualizações instantâneas no painel
    const interval = setInterval(fetchConversas, 3000);
    return () => clearInterval(interval);
  }, []);

  const conversasFiltradas = conversas.filter(
    (c) =>
      c.paciente_telefone?.includes(filtro) ||
      c.nome_paciente?.toLowerCase().includes(filtro.toLowerCase()),
  );

  return (
    <div className="h-[calc(100vh-160px)] flex flex-col gap-6 animate-in fade-in duration-500 overflow-hidden pr-2">
      {/* HEADER & FILTROS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-none">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Monitor de Operação IA
          </h1>
          <p className="text-slate-500 text-xs flex items-center gap-1 font-medium mt-0.5">
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
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
          </div>
          <button
            onClick={fetchConversas}
            disabled={loading}
            className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 disabled:opacity-50 transition-all shadow-sm"
          >
            <RefreshCw
              size={16}
              className={
                loading ? "animate-spin text-indigo-600" : "text-slate-500"
              }
            />
          </button>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden">
        {/* LISTA DE SESSÕES (Estilo WhatsApp) */}
        <div className={`flex flex-col transition-all duration-300 min-h-0 ${urlSessionId ? "lg:w-[350px] lg:flex-none" : "flex-1"}`}>
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
            {/* Cabecalho da lista */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between items-center flex-none">
              <span>Conversas Recentes</span>
              <span>{conversasFiltradas.length} ativas</span>
            </div>

            {/* Corpo da lista (Scrollable) */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-0 pr-1">
              {conversasFiltradas.length === 0 && !loading && (
                <div className="p-12 text-center text-slate-400 text-sm font-semibold">
                  Nenhuma interação ativa.
                </div>
              )}
              {conversasFiltradas.map((c) => (
                <div
                  key={c.session_id}
                  onClick={() => navigate(`/monitor/${c.session_id}`)}
                  className={`p-4 cursor-pointer hover:bg-slate-50/80 transition-all border-l-4 flex flex-col gap-2 relative group ${
                    urlSessionId === c.session_id
                      ? "bg-indigo-50/30 border-indigo-600"
                      : "border-transparent"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs uppercase shadow-sm">
                        {c.nome_paciente ? c.nome_paciente.substring(0, 2).toUpperCase() : "PA"}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm tracking-tight truncate max-w-[140px]">
                          {c.nome_paciente || formatPhone(c.paciente_telefone)}
                        </h4>
                        <p className="text-xs text-slate-400 font-semibold truncate max-w-[140px]">
                          {c.nome_paciente ? formatPhone(c.paciente_telefone) : "Não cadastrado"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                        c.estado_atual === "TRANSBORDO"
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          : c.estado_atual === "AGENDAMENTO"
                          ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
                          : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      }`}>
                        {c.estado_atual}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[10px] text-slate-400 font-bold">
                      Ativa {new Date(c.updated_at).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {/* Ações Rápidas */}
                    <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          const link = `${window.location.origin}/chat/${c.session_id}`;
                          navigator.clipboard.writeText(link);
                          toast.success("Link do Chat Web copiado!");
                        }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        title="Copiar Link do Chat Web"
                      >
                        <ExternalLink size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); verAuditoria(c.session_id); }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        title="Trilha de Auditoria Clínica (ISO 42001)"
                      >
                        <ShieldCheck size={14} className="text-emerald-600" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); assumirControle(c.session_id); }}
                        className={`p-1.5 rounded-lg transition-all ${
                          c.estado_atual === "TRANSBORDO" 
                            ? "text-amber-500 bg-amber-50" 
                            : "text-indigo-600 hover:bg-indigo-50"
                        }`}
                        title="Assumir Controle (Human-in-the-Loop)"
                      >
                        <MessageCircle size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* JANELA DE CHAT (Lado Direito) */}
        {urlSessionId ? (
          (() => {
            const selected = conversas.find(c => c.session_id === urlSessionId);
            return (
              <div className="flex-1 flex flex-col h-full animate-in slide-in-from-right duration-300 overflow-hidden shadow-lg rounded-3xl border border-slate-100 bg-white">
                <div className="flex-1 relative h-full">
                  <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                    <a
                      href={`/chat/${urlSessionId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 px-3 bg-white/90 hover:bg-white shadow-sm border border-slate-200 rounded-full text-slate-600 hover:text-brand-blue text-[11px] font-bold transition-all flex items-center gap-1.5"
                      title="Abrir como o paciente vê em nova aba"
                    >
                      <ExternalLink size={12} />
                      <span>Ver Visão do Paciente</span>
                    </a>
                    <button 
                      onClick={() => navigate('/monitor')}
                      className="p-2 bg-white/80 hover:bg-white shadow-sm border border-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-all active:scale-95"
                      title="Fechar chat"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <WebChatWidget 
                    sessionId={urlSessionId} 
                    isAdmin={true} 
                    pacienteNome={selected?.nome_paciente}
                    pacienteTelefone={selected?.paciente_telefone}
                  />
                </div>
              </div>
            );
          })()
        ) : (
          <div className="hidden lg:flex flex-1 flex-col items-center justify-center bg-slate-50 border border-slate-100 rounded-3xl p-8 text-center text-slate-400">
            <MessageCircle size={48} className="text-slate-300 mb-3" />
            <h3 className="text-sm font-bold">Selecione um Atendimento</h3>
            <p className="text-xs text-slate-400 mt-1">Clique em uma conversa na lista para acompanhar e intervir em tempo real.</p>
          </div>
        )}
      </div>

      {/* MODAL DE AUDITORIA COMPLETO COM TIMELINE E DECISÕES */}
      {selectedAudit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl p-6 md:p-8 overflow-y-auto animate-in slide-in-from-right duration-300 flex flex-col">
            {/* CABEÇALHO */}
            <div className="flex justify-between items-start mb-5 border-b border-slate-100 pb-5 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={24} className="text-emerald-500" />
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">Trilha de Auditoria Clínica e Decisão</h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  ISO/IEC 42001 • Rastreabilidade ponta a ponta do motor conversacional
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-bold">
                    Sessão: {selectedAudit.session_id ? selectedAudit.session_id.substring(0, 18) + "..." : "Sessão Ativa"}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase">
                    {auditLogs.length} Interações Registradas
                  </span>
                  {auditLogs.some(l => l.veredicto_auditoria === "REPROVADO" || l.risco_detectado) && (
                    <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200/50 px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1">
                      <AlertOctagon size={12} /> Risco Interceptado
                    </span>
                  )}
                </div>
              </div>
              <button 
                onClick={() => { setSelectedAudit(null); setAuditLogs([]); }} 
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* FILTROS DE AUDITORIA */}
            <div className="flex items-center gap-2 mb-4 shrink-0 overflow-x-auto pb-1">
              {[
                { id: "TODOS", label: `Todas as Decisões (${auditLogs.length})` },
                { id: "REPROVADO", label: `Risco / Reprovado (${auditLogs.filter(l => l.veredicto_auditoria === 'REPROVADO' || l.risco_detectado).length})` },
                { id: "APROVADO", label: `Aprovados (${auditLogs.filter(l => l.veredicto_auditoria === 'APROVADO' && !l.risco_detectado).length})` },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setAuditFilter(f.id)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                    auditFilter === f.id
                      ? "bg-slate-800 text-white shadow-sm"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200/70"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* TIMELINE DE DECISÕES */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
              {auditLogs
                .filter(log => {
                  if (auditFilter === "REPROVADO") return log.veredicto_auditoria === "REPROVADO" || log.risco_detectado;
                  if (auditFilter === "APROVADO") return log.veredicto_auditoria === "APROVADO" && !log.risco_detectado;
                  return true;
                })
                .map((log, index) => {
                  const explanation = getDecisionExplanation(log);
                  const isReprovado = log.veredicto_auditoria === "REPROVADO" || !!log.risco_detectado;
                  const isHumano = log.provider_usado === "HUMAN_OPERATOR" || log.input_usuario === "[ADMIN]" || log.veredicto_auditoria === "HUMANO";

                  return (
                    <div 
                      key={log.id_log || index}
                      className={`p-5 rounded-3xl border transition-all ${
                        isReprovado 
                          ? "bg-red-50/40 border-red-200 shadow-xs" 
                          : isHumano 
                          ? "bg-amber-50/30 border-amber-200" 
                          : "bg-slate-50/60 border-slate-200/80"
                      }`}
                    >
                      {/* HEADER DO TURNO */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/60 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider bg-white px-2.5 py-0.5 rounded-md border border-slate-200 text-slate-700 shadow-2xs">
                            Turno #{index + 1}
                          </span>
                          
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1 border ${
                            isReprovado
                              ? "bg-red-100 text-red-700 border-red-200 animate-pulse"
                              : isHumano
                              ? "bg-amber-100 text-amber-800 border-amber-200"
                              : "bg-emerald-100 text-emerald-800 border-emerald-200"
                          }`}>
                            {isReprovado ? <AlertOctagon size={12} /> : isHumano ? <User size={12} /> : <CheckCircle2 size={12} />}
                            {isReprovado ? "Bloqueado pelo Supervisor" : isHumano ? "Operador Humano" : "Aprovado ISO 42001"}
                          </span>
                        </div>

                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                          <span>{log.data_hora ? new Date(log.data_hora).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ""}</span>
                          <span>•</span>
                          <span className="font-bold text-slate-600">{log.provider_usado || "OPENAI"}</span>
                          {log.latency_ms && (
                            <>
                              <span>•</span>
                              <span>{log.latency_ms}ms</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* COMO A IA CHEGOU NA DECISÃO (MECANISMO DO GRAFO) */}
                      <div className="mb-3.5 p-3 rounded-2xl border text-xs flex items-start gap-2.5 bg-white shadow-2xs">
                        <Sparkles size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                              Decisão / Raciocínio da IA:
                            </span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase border ${explanation.cor}`}>
                              {explanation.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                            {explanation.descricao}
                          </p>
                        </div>
                      </div>

                      {/* INPUT DO PACIENTE */}
                      {log.input_usuario && log.input_usuario !== "[SISTEMA]" && log.input_usuario !== "[ADMIN]" && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Entrada do Paciente (WhatsApp / Web):
                            </span>
                            <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                              LGPD Anonimizado
                            </span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-200/60 text-xs font-medium text-slate-800">
                            {log.input_usuario}
                          </div>
                        </div>
                      )}

                      {/* JUSTIFICATIVA DE RISCO (SE HOUVER REPROVAÇÃO) */}
                      {log.risco_detectado && (
                        <div className="mb-3 p-3.5 bg-red-100/90 rounded-2xl border border-red-200 text-xs text-red-950">
                          <div className="flex items-center gap-1.5 font-bold mb-1 text-[11px] text-red-800 uppercase">
                            <AlertTriangle size={14} className="text-red-600" />
                            Justificativa Clínica do Supervisor Adversarial (Anti-Alucinação):
                          </div>
                          <p className="font-medium text-red-900 leading-relaxed pl-5">
                            "{log.risco_detectado}"
                          </p>
                        </div>
                      )}

                      {/* RESPOSTA GERADA / ENTREGUE */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                            {isReprovado ? "Resposta Proposta (Interceptada antes do envio):" : "Resposta Auditada Entregue:"}
                          </span>
                          <span className="text-[9px] font-mono text-slate-400">
                            Hash: {log.prompt_hash || "v3.0-langgraph"}
                          </span>
                        </div>
                        <div className={`p-3.5 rounded-2xl border text-xs font-medium leading-relaxed ${
                          isReprovado 
                            ? "bg-red-50 text-red-900 border-red-200/80 line-through opacity-80" 
                            : "bg-white text-indigo-950 border-indigo-100/80 shadow-2xs"
                        }`}>
                          {log.output_ia || "[Sem saída textual registrada]"}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}   
