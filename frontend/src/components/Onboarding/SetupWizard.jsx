import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useUnidade } from "../../context/UnidadeContext";
import api from "../../services/api";
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  User,
  Building2,
  Stethoscope,
  Bot,
  Users,
  ClipboardList,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export default function SetupWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { unidades, unidadeSelecionada, unidadeId } = useUnidade();

  const [loading, setLoading] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem("onboarding_dismissed") === "true";
  });

  const [steps, setSteps] = useState({
    perfil: false,
    unidade: false,
    profissional: false,
    ia: false,
    paciente: false,
    procedimento: false,
  });

  const fetchOnboardingStatus = async () => {
    if (!unidadeId) return;
    try {
      setLoading(true);

      // 1. Checagem do perfil (Nome e email preenchidos)
      const perfilOk = !!user?.nome && !!user?.email;

      // 2. Checagem de unidades (Pelo menos 1 cadastrada)
      const unidadeOk = unidades.length > 0;

      // 3. Checagem de profissional (Pelo menos 1 no banco da unidade)
      let profissionalOk = false;
      try {
        const resProf = await api.get(`/profissionais/unidade/${unidadeId}`);
        profissionalOk = resProf.data && resProf.data.length > 0;
      } catch (e) {
        console.error("Erro ao verificar profissionais para onboarding", e);
      }

      // 4. Checagem de regras de IA (Configurações do bot na unidade ativa)
      let iaOk = false;
      if (unidadeSelecionada?.configuracoes_ia) {
        try {
          const config = typeof unidadeSelecionada.configuracoes_ia === "string"
            ? JSON.parse(unidadeSelecionada.configuracoes_ia)
            : unidadeSelecionada.configuracoes_ia;
          iaOk = !!config?.regras && config.regras.trim().length > 10;
        } catch (e) {
          // Se não for JSON válido mas tiver algum conteúdo string
          iaOk = typeof unidadeSelecionada.configuracoes_ia === "string" && unidadeSelecionada.configuracoes_ia.length > 10;
        }
      }

      // 5. Checagem de paciente (Pelo menos 1 no banco da unidade)
      let pacienteOk = false;
      try {
        const resPac = await api.get("/pacientes");
        pacienteOk = resPac.data && resPac.data.length > 0;
      } catch (e) {
        console.error("Erro ao verificar pacientes para onboarding", e);
      }

      // 6. Checagem de procedimentos (Pelo menos 1 cadastrado para a unidade)
      let procedimentoOk = false;
      try {
        const resProc = await api.get(`/procedimentos/unidade/${unidadeId}`);
        procedimentoOk = resProc.data && resProc.data.length > 0;
      } catch (e) {
        console.error("Erro ao verificar procedimentos para onboarding", e);
      }

      setSteps({
        perfil: perfilOk,
        unidade: unidadeOk,
        profissional: profissionalOk,
        ia: iaOk,
        paciente: pacienteOk,
        procedimento: procedimentoOk,
      });
    } catch (error) {
      console.error("Erro ao carregar status de onboarding:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnboardingStatus();
  }, [unidadeId, unidades, unidadeSelecionada, user]);

  const handleDismiss = () => {
    localStorage.setItem("onboarding_dismissed", "true");
    setIsDismissed(true);
  };

  const startTutorial = () => {
    localStorage.setItem("active_tour_step", "perfil_nome");
    navigate("/config?tab=perfil");
  };

  // Calcula a porcentagem concluída
  const stepList = [
    {
      id: "perfil",
      label: "Meu Perfil",
      desc: "Confirme seus dados e senha de acesso",
      icon: <User size={16} />,
      status: steps.perfil,
      path: "/config?tab=perfil"
    },
    {
      id: "unidade",
      label: "Unidade de Atendimento",
      desc: "Cadastre ou edite sua clínica e telefone",
      icon: <Building2 size={16} />,
      status: steps.unidade,
      path: "/config?tab=unidades"
    },
    {
      id: "profissional",
      label: "Profissional de Saúde",
      desc: "Cadastre pelo menos 1 médico com horários",
      icon: <Stethoscope size={16} />,
      status: steps.profissional,
      path: "/config?tab=profissionais"
    },
    {
      id: "ia",
      label: "Configuração da IA",
      desc: "Defina o tom de voz e regras do robô",
      icon: <Bot size={16} />,
      status: steps.ia,
      path: "/config?tab=ia"
    },
    {
      id: "paciente",
      label: "Cadastrar Paciente",
      desc: "Adicione seu primeiro paciente de teste",
      icon: <Users size={16} />,
      status: steps.paciente,
      path: "/pacientes"
    },
    {
      id: "procedimento",
      label: "Cadastrar Procedimento",
      desc: "Configure exames e consultas oferecidas",
      icon: <ClipboardList size={16} />,
      status: steps.procedimento,
      path: "/procedimentos"
    }
  ];

  const completedCount = stepList.filter(s => s.status).length;
  const progressPercent = Math.round((completedCount / stepList.length) * 100);

  if (isDismissed || (completedCount === stepList.length && !loading)) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-sky-500/5 dark:from-slate-800 dark:via-slate-800/80 dark:to-slate-900 border border-blue-200/50 dark:border-slate-800 rounded-3xl p-6 shadow-sm transition-all animate-in duration-300">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-brand-blue/10 dark:bg-brand-blue/20 rounded-xl text-brand-blue shrink-0">
            <Sparkles size={20} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-black text-slate-800 dark:text-slate-100 tracking-tight">
              Guia de Configuração Inicial
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
              Complete estes passos para ativar a Inteligência Artificial e destravar o LTV da plataforma.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={startTutorial}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-blue hover:bg-brand-accent text-white rounded-xl text-[10px] md:text-xs font-bold transition-all shadow-sm shadow-brand-blue/10 cursor-pointer"
          >
            🎮 Modo Game Tutorial
          </button>

          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors cursor-pointer"
            title={isMinimized ? "Expandir" : "Minimizar"}
          >
            {isMinimized ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 rounded-lg transition-colors cursor-pointer"
            title="Ocultar Permanentemente"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-5">
        <div className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
          <span>Progresso de Configuração</span>
          <span>{progressPercent}% Concluído</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-brand-blue to-brand-accent h-full rounded-full transition-all duration-700"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {!isMinimized && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {stepList.map((step) => (
            <div
              key={step.id}
              onClick={() => navigate(step.path)}
              className={`flex items-start gap-3 p-4 bg-white dark:bg-slate-800/60 border rounded-2xl cursor-pointer hover:shadow-md hover:border-brand-blue/30 transition-all group ${
                step.status
                  ? "border-emerald-100 dark:border-emerald-950 bg-emerald-50/20 dark:bg-emerald-950/10"
                  : "border-slate-100 dark:border-slate-800/80"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {step.status ? (
                  <CheckCircle2 size={18} className="text-emerald-500" />
                ) : (
                  <Circle size={18} className="text-slate-300 dark:text-slate-600 group-hover:text-brand-blue transition-colors" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`text-xs font-bold truncate transition-colors ${
                  step.status
                    ? "text-slate-500 dark:text-slate-400 line-through font-medium"
                    : "text-slate-700 dark:text-slate-200 group-hover:text-brand-blue dark:group-hover:text-brand-accent"
                }`}>
                  {step.label}
                </h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                  {step.desc}
                </p>
              </div>
              <div className="text-slate-300 dark:text-slate-600 group-hover:text-brand-blue dark:group-hover:text-brand-accent group-hover:translate-x-0.5 transition-all shrink-0">
                <ArrowRight size={14} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
