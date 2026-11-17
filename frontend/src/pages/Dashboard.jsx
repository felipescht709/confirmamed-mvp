import { useEffect, useState } from "react";
import api from "../services/api";
import { useUnidade } from "../context/UnidadeContext";
import SetupWizard from "../components/Onboarding/SetupWizard";
import {
  CheckCircle2,
  Clock,
  Zap,
  Users,
  Bot,
  RefreshCw,
  TrendingUp,
  Activity,
  ShieldAlert,
} from "lucide-react";

export default function Dashboard() {
  const { unidadeId, unidadeSelecionada } = useUnidade();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    if (!unidadeId) return;
    setLoading(true);

    try {
      const res = await api.get(`/ia/dashboard-stats?unidade_id=${unidadeId}`);
      setData(res.data);
    } catch (err) {
      console.error("Erro ao carregar dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [unidadeId]);

  // Cálculo Dinâmico do Índice ConfirmaMED™ baseado em dados reais do banco
  const getIndiceScore = () => {
    if (!data) return 0;
    const taxa = data.kpis?.taxaConfirmacao || 0;
    const total = data.kpis?.pacientesAtendidos || 0;
    const iaBookings = data.kpis?.agendamentosIA || 0;
    const iaRatio = total > 0 ? (iaBookings / total) * 100 : 0;
    
    // Peso: 50% taxa de confirmação + 50% proporção de atendimentos pela IA
    const score = Math.round(taxa * 0.5 + iaRatio * 0.5);
    return Math.min(100, Math.max(0, score || 10)); // Default min de 10 se ativo
  };

  // Cálculo da evolução fictícia baseada no score real
  const getEvolucao = () => {
    const score = getIndiceScore();
    return Math.round(score * 0.15 + 2);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const formattedTimeSaved = (mins) => {
    if (!mins) return "0 min";
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  };

  const kpisHoje = [
    {
      label: "Total de Agendamentos",
      val: data?.kpis?.pacientesAtendidos || 0,
      icon: <Users size={18} />,
      color: "text-blue-600",
      bg: "bg-blue-50/80 border border-blue-100",
    },
    {
      label: "Taxa de Confirmação",
      val: data?.kpis?.taxaConfirmacao || 0,
      suf: "%",
      icon: <CheckCircle2 size={18} />,
      color: "text-emerald-600",
      bg: "bg-emerald-50/80 border border-emerald-100",
    },
    {
      label: "Agendamentos por IA",
      val: data?.kpis?.agendamentosIA || 0,
      icon: <Bot size={18} />,
      color: "text-indigo-600",
      bg: "bg-indigo-50/80 border border-indigo-100",
    },
    {
      label: "Tempo Economizado",
      customVal: formattedTimeSaved(data?.kpis?.tempoEconomizado),
      icon: <Clock size={18} />,
      color: "text-amber-600",
      bg: "bg-amber-50/80 border border-amber-100",
    },
  ];

  const chartMaxVal = data?.chartData?.length > 0 
    ? Math.max(...data.chartData.map(d => d.total)) 
    : 1;

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto animate-in text-slate-800 dark:text-slate-100">
      {/* HEADER */}
      <header className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <span className="text-[10px] font-bold text-brand-blue dark:text-brand-accent uppercase tracking-widest bg-brand-blue/5 dark:bg-brand-blue/20 px-2.5 py-1 rounded-md">
            {getGreeting()}, Administrador
          </span>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight mt-2">
            Painel de Controle
          </h1>
          <p className="text-slate-400 dark:text-slate-500 text-xs font-semibold mt-0.5">
            {unidadeSelecionada?.nome || "Selecione uma unidade"}
          </p>
        </div>

        <button
          onClick={fetchStats}
          disabled={loading}
          className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 disabled:opacity-50 transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <RefreshCw
            size={16}
            className={
              loading ? "animate-spin text-brand-blue" : "text-slate-500 dark:text-slate-400"
            }
          />
        </button>
      </header>

      {/* SETUP WIZARD */}
      <SetupWizard />

      {/* METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CARD 1: INDEX CONFIRMAMED */}
        <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[200px]">
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-brand-blue uppercase tracking-wider bg-brand-blue/5 border border-brand-blue/10 px-2.5 py-1 rounded-full">
                Eficiência Operacional
              </span>
              <span className="text-emerald-500 font-extrabold text-[10px] bg-emerald-50 px-2 py-0.5 rounded">
                ↑ {loading ? 0 : getEvolucao()}%
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-800 mt-4 tracking-tight">
              Índice ConfirmaMED™
            </h3>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-black text-slate-800">
                {loading ? "..." : `${getIndiceScore()}`}
              </span>
              <span className="text-slate-400 font-bold text-sm">/ 100</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-brand-blue h-1.5 rounded-full transition-all duration-1000"
                style={{
                  width: `${loading ? 0 : getIndiceScore()}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-extrabold text-slate-400 mt-2 uppercase tracking-wider">
              <span>Performance Atual</span>
              <span>Meta: 90/100</span>
            </div>
          </div>
        </div>

        {/* CARD 2: AGENDAMENTOS & CONVERSÃO */}
        <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[200px]">
          <div>
            <span className="text-[9px] font-bold text-brand-green uppercase tracking-wider bg-brand-green/5 border border-brand-green/10 px-2.5 py-1 rounded-full">
              Volume & Conversão
            </span>
            <div className="grid grid-cols-2 gap-4 mt-5">
              <div>
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  Agendamentos
                </span>
                <span className="text-2xl font-black text-slate-800">
                  {loading ? "..." : data?.kpis?.pacientesAtendidos || 0}
                </span>
              </div>
              <div>
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  Confirmados por IA
                </span>
                <span className="text-2xl font-black text-indigo-600">
                  {loading ? "..." : data?.kpis?.agendamentosIA || 0}
                </span>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">
              Taxa de Confirmação
            </span>
            <span className="font-extrabold text-emerald-600">
              {loading ? "..." : `${data?.kpis?.taxaConfirmacao || 0}%`}
            </span>
          </div>
        </div>

        {/* CARD 3: ASSISTENTE IA & SAÚDE */}
        <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[200px]">
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider bg-amber-50 border border-amber-100/50 px-2.5 py-1 rounded-full">
                Assistente IA
              </span>
              <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Ativo
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-5">
              <div>
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  Latência Média
                </span>
                <span className="text-xl font-black text-slate-800">
                  {loading
                    ? "..."
                    : data?.iaHealth?.mediaLatenciaMs
                    ? `${(data.iaHealth.mediaLatenciaMs / 1000).toFixed(1)}s`
                    : "0.0s"}
                </span>
              </div>
              <div>
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  Tempo Economizado
                </span>
                <span className="text-xl font-black text-slate-800">
                  {loading
                    ? "..."
                    : formattedTimeSaved(data?.kpis?.tempoEconomizado)}
                </span>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">
              Uptime Geral / Interações
            </span>
            <span className="font-extrabold text-slate-700">
              {loading
                ? "..."
                : `${data?.iaHealth?.uptime || "100%"} (${
                    data?.iaHealth?.interacoesSucesso || 0
                  })`}
            </span>
          </div>
        </div>
      </div>

      {/* CHART SECTION */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm">
        <div className="mb-6">
          <h3 className="text-sm font-bold text-slate-800 tracking-wide">
            Volume de Agendamentos (7 dias)
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Tendência diária de consultas cadastradas no sistema
          </p>
        </div>

        {loading ? (
          <div className="h-48 flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-wider">
            Sincronizando dados...
          </div>
        ) : data?.chartData?.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-2xl p-6">
            <ShieldAlert size={24} className="text-slate-300 mb-2" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Nenhum agendamento recente
            </span>
            <span className="text-[10px] text-slate-400 mt-1">
              As consultas cadastradas nos últimos 7 dias aparecerão aqui.
            </span>
          </div>
        ) : (
          <div className="h-48 flex items-end gap-3 px-2 border-b border-slate-100 pb-2">
            {data?.chartData?.map((d, i) => {
              const heightPercent = Math.max(
                8,
                Math.round((d.total / chartMaxVal) * 100)
              );
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-2 h-full justify-end group"
                >
                  <div className="w-full relative flex justify-center">
                    <div
                      className="w-full sm:w-10 bg-gradient-to-t from-brand-blue to-brand-blue/80 rounded-t-lg group-hover:from-brand-blue/90 transition-all duration-300"
                      style={{
                        height: `${(heightPercent * 130) / 100}px`,
                      }}
                    />
                    {/* Tooltip */}
                    <div className="absolute -top-9 scale-0 group-hover:scale-100 bg-slate-800 text-white text-[9px] font-black px-2 py-1.5 rounded-lg shadow-md border border-slate-700 transition-all duration-200 z-20 pointer-events-none uppercase tracking-wider">
                      {d.total} {d.total === 1 ? "consulta" : "consultas"}
                    </div>
                  </div>

                  <span className="text-[9px] font-bold text-slate-400 tracking-wider">
                    {d.dia}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

