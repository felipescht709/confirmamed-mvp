import { useEffect, useState } from "react";
import api from "../services/api";
import { useUnidade } from "../context/UnidadeContext";
import {
  CheckCircle2,
  Clock,
  Zap,
  Users,
  Bot,
  RefreshCw,
  TrendingUp,
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

  const kpisHoje = [
    {
      label: "Consultas Hoje",
      val: data?.operacao?.consultasHoje,
      icon: <Users />,
      color: "text-blue-500",
      bg: "bg-blue-50",
    },
    {
      label: "Comparecimento",
      val: data?.operacao?.showRate,
      suf: "%",
      icon: <CheckCircle2 />,
      color: "text-emerald-500",
      bg: "bg-emerald-50",
    },
    {
      label: "Ocupação Agenda",
      val: data?.agenda?.ocupacao,
      suf: "%",
      icon: <TrendingUp />,
      color: "text-amber-500",
      bg: "bg-amber-50",
    },
    {
      label: "Horários Livres",
      val: data?.agenda?.slotsLivres,
      icon: <Clock />,
      color: "text-purple-500",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="space-y-10 p-6">
      {/* HEADER */}
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Painel ConfirmaMED
          </h1>
          <p className="text-slate-500 font-medium">
            {unidadeSelecionada?.nome || "Selecione uma unidade"}
          </p>
        </div>

        <button
          onClick={fetchStats}
          className="p-3 bg-white border rounded-2xl hover:bg-slate-50 transition-all"
        >
          <RefreshCw
            size={20}
            className={
              loading ? "animate-spin text-brand-blue" : "text-slate-400"
            }
          />
        </button>
      </header>

      {/* ================= HERO — ÍNDICE CONFIRMAMED ================= */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-[3rem] p-10 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">
            Índice ConfirmaMED™
          </p>

          <div className="flex items-end gap-6 mt-2">
            <h2 className="text-6xl font-black">
              {loading ? "..." : data?.indice?.score || 0}
            </h2>
            <span className="pb-3 text-emerald-400 font-bold text-sm">
              ↑ {data?.indice?.evolucao || 0}% últimos 30 dias
            </span>
          </div>

          <div className="w-full bg-white/10 rounded-full h-3 mt-6">
            <div
              className="bg-emerald-400 h-3 rounded-full transition-all duration-1000"
              style={{
                width: `${data?.indice?.score || 0}%`,
              }}
            />
          </div>
        </div>

        <Bot
          size={260}
          className="absolute -right-20 -bottom-20 text-white/[0.04]"
        />
      </div>

      {/* ================= KPIs DO DIA ================= */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {kpisHoje.map((kpi, i) => (
          <div
            key={i}
            className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm"
          >
            <div
              className={`w-12 h-12 ${kpi.bg} ${kpi.color} rounded-2xl flex items-center justify-center mb-4`}
            >
              {kpi.icon}
            </div>

            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">
              {kpi.label}
            </h3>

            <p className="text-3xl font-black text-slate-800 tracking-tighter">
              {loading ? "..." : `${kpi.val || 0}${kpi.suf || ""}`}
            </p>
          </div>
        ))}
      </div>

      {/* ================= GRID PRINCIPAL ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* EVOLUÇÃO AGENDA */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-10">
            Evolução da Agenda
          </h3>

          <div className="h-64 flex items-end gap-3 px-2">
            {data?.chartData?.map((d, i) => (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-3 h-full justify-end group"
              >
                <div
                  className="w-full bg-slate-900 rounded-2xl transition-all duration-1000 relative"
                  style={{
                    height: `${d.percentual || 5}%`,
                    minHeight: "8px",
                  }}
                >
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    {d.total}
                  </div>
                </div>

                <span className="text-[9px] font-black text-slate-400 uppercase">
                  {d.dia}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ASSISTENTE VIRTUAL */}
        <div className="bg-slate-950 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10">
            <Bot size={40} className="text-blue-500 mb-6" />

            <h3 className="text-2xl font-black tracking-tight mb-2">
              Assistente Virtual Hoje
            </h3>

            <div className="space-y-6 mt-8">
              <Metric
                label="Pacientes atendidos"
                value={data?.assistente?.pacientes}
              />

              <Metric
                label="Resolução automática"
                value={`${data?.assistente?.resolucao}%`}
              />

              <Metric
                label="Tempo economizado"
                value={`${data?.assistente?.tempoEconomizado} min`}
              />

              <Metric
                label="Consultas recuperadas"
                value={data?.assistente?.recuperadas}
              />
            </div>
          </div>

          <Bot
            size={240}
            className="absolute -bottom-24 -right-24 text-white/[0.02] rotate-12"
          />
        </div>
      </div>
    </div>
  );
}

/* ================= COMPONENTE AUXILIAR ================= */

function Metric({ label, value }) {
  return (
    <div className="flex justify-between items-end border-b border-white/5 pb-4">
      <span className="text-[10px] font-bold text-slate-500 uppercase">
        {label}
      </span>
      <span className="text-xl font-black">{value || 0}</span>
    </div>
  );
}
