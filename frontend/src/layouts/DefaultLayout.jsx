import {
  Home,
  MessageSquare,
  Calendar,
  Users,
  ClipboardList,
  Settings,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { Clock, Info } from "lucide-react";
// Importação do componente de redundância
import logo from "../assets/logo.png";
import { useUnidade } from "../context/UnidadeContext.jsx";
import WebChatWidget from "../components/Chat/WebChatWidget";
import InteractiveTour from "../components/Onboarding/InteractiveTour";
import api from "../services/api";
import { toast } from "react-hot-toast";


const menuGroups = [
  {
    title: "Visão Geral",
    items: [{ name: "Home", path: "/", icon: <Home size={18} /> }],
  },
  {
    title: "Operacional",
    items: [
      { name: "Agenda", path: "/agenda", icon: <Calendar size={18} /> },
      {
        name: "Monitor de IA",
        path: "/monitor",
        icon: <MessageSquare size={18} />,
      },
    ],
  },
  {
    title: "Cadastros & Regras",
    items: [
      { name: "Pacientes", path: "/pacientes", icon: <Users size={18} /> },
      {
        name: "Procedimentos & Planos",
        path: "/procedimentos",
        icon: <ClipboardList size={18} />,
      },
    ],
  },
  {
    title: "Administrativo",
    items: [
      { name: "Configurações", path: "/config", icon: <Settings size={18} /> },
    ],
  },
];

export default function DefaultLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const { unidadeSelecionada } = useUnidade();

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const isDark = saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const getInitials = (name) => {
    if (!name) return "CM";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const initials = unidadeSelecionada?.nome_fantasia ? getInitials(unidadeSelecionada.nome_fantasia) : "CM";

  const notifiedAppointments = useRef(new Set());
  const notifiedTransbordos = useRef(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    if (!unidadeSelecionada || !user) return;

    const pollNotifications = async () => {
      try {
        const { data } = await api.get("/ia/notifications/recent");
        
        // 1. Notificar Consultas Agendadas
        if (data.consultas && data.consultas.length > 0) {
          data.consultas.forEach((c) => {
            if (!notifiedAppointments.current.has(c.id_consulta)) {
              notifiedAppointments.current.add(c.id_consulta);
              
              toast((t) => (
                <div className="flex flex-col gap-1 text-left">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100 text-xs">
                    📅 Nova Consulta IA!
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    O paciente <b>{c.paciente_name || "Identificado"}</b> foi agendado automaticamente.
                  </div>
                  <button
                    onClick={() => {
                      toast.dismiss(t.id);
                      navigate("/agenda");
                    }}
                    className="mt-1 bg-brand-blue text-white text-[10px] font-bold px-2.5 py-1 rounded-lg w-max hover:bg-brand-accent transition-all cursor-pointer"
                  >
                    Ver Agenda
                  </button>
                </div>
              ), { duration: 6000 });
            }
          });
        }

        // 2. Notificar Solicitações de Transbordo (Humano)
        if (data.transbordos && data.transbordos.length > 0) {
          data.transbordos.forEach((tb) => {
            if (!notifiedTransbordos.current.has(tb.session_id)) {
              notifiedTransbordos.current.add(tb.session_id);
              
              toast((t) => (
                <div className="flex flex-col gap-1 text-left">
                  <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400 text-xs animate-pulse">
                    🚨 Suporte Humano Solicitado!
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    O paciente <b>{tb.nome_paciente || tb.paciente_telefone.split("@")[0]}</b> precisa de ajuda.
                  </div>
                  <button
                    onClick={() => {
                      toast.dismiss(t.id);
                      navigate(`/monitor/${tb.session_id}`);
                    }}
                    className="mt-1 bg-amber-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg w-max hover:bg-amber-650 transition-all cursor-pointer"
                  >
                    Atender Agora
                  </button>
                </div>
              ), { duration: 8000 });
            }
          });
        }
      } catch (err) {
        console.error("Erro no polling de notificações:", err);
      }
    };

    pollNotifications();
    const intervalId = setInterval(pollNotifications, 5000);

    return () => clearInterval(intervalId);
  }, [unidadeSelecionada, user, navigate]);

  const permissoes = user?.permissoes || {};
  const isGestor = user?.role === "GESTOR" || user?.role === "ADMIN";

  const filteredMenuGroups = menuGroups.map(group => {
    return {
      ...group,
      items: group.items.filter(item => {
        if (isGestor) return true; // Gestor vê tudo
        
        if (item.path === "/") return permissoes.ver_indicadores;
        if (item.path === "/monitor") return permissoes.acessar_monitor_ia;
        if (item.path === "/pacientes") return permissoes.ver_pacientes;
        if (item.path === "/procedimentos") return permissoes.gerenciar_procedimentos;
        return true; // Agenda and Configurações always visible
      })
    };
  }).filter(group => group.items.length > 0);

  const getTrialDays = () => {
    if (!unidadeSelecionada || unidadeSelecionada.subscription_status !== 'TRIAL' || !unidadeSelecionada.trial_ends_at) return null;
    const now = new Date();
    const end = new Date(unidadeSelecionada.trial_ends_at);
    const diffTime = end - now;
    if (diffTime <= 0) return 0;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const trialDays = getTrialDays();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-brand-light font-sans text-brand-dark">
      {/* Banner Global de Trial */}
      {trialDays !== null && (
        <div className="bg-amber-100 border-b border-amber-200 px-4 py-2 md:py-3 flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3 text-amber-800 z-50 text-center">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-amber-600 shrink-0" />
            <span className="text-xs md:text-sm font-semibold">
              {trialDays > 0 
                ? `Período de Testes: ${trialDays} dia(s) restante(s).` 
                : "Seu teste expirou. Assine para continuar."}
            </span>
          </div>
          <Link to="/config" className="text-[10px] md:text-xs font-bold bg-amber-200 px-3 py-1 md:py-1.5 rounded-full hover:bg-amber-300 transition-colors w-full md:w-auto mt-1 md:mt-0">
            Assinar Agora
          </Link>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        {/* Overlay do Mobile */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar Lateral */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shadow-xl lg:shadow-sm
          transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}>
          <div className="flex justify-between items-center p-6 mb-2">
            <img
              src={logo}
              alt="ConfirmaMED"
              className="h-10 md:h-12 w-auto object-contain"
            />
            <button 
              className="lg:hidden text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 p-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 space-y-6 custom-scrollbar">
          {filteredMenuGroups.map((group) => (
            <div key={group.title}>
              <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 font-bold mb-3 px-2">
                {group.title}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all text-sm font-medium ${
                      location.pathname === item.path
                        ? "bg-brand-blue text-white shadow-md shadow-brand-blue/20"
                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-brand-blue dark:hover:text-brand-blue"
                    }`}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={logout}
            className="flex items-center gap-3 p-3 w-full text-slate-400 dark:text-slate-500 hover:text-red-500 transition-colors text-sm font-semibold"
          >
            <LogOut size={18} />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>

      {/* Área Principal de Conteúdo */}
      <main className="flex-1 overflow-y-auto px-4 md:px-10 py-6 md:py-8 relative w-full">
        <header className="flex justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <button 
              className="lg:hidden text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h2 className="font-display text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100 truncate">
              {filteredMenuGroups
                .flatMap((g) => g.items)
                .find((i) => i.path === location.pathname)?.name || "Painel"}
            </h2>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">

            <Link 
              to="/config"
              className="flex items-center gap-2 md:gap-3 bg-white dark:bg-slate-800 p-1 md:p-1.5 pr-3 md:pr-4 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-brand-blue/30 transition-all cursor-pointer group shrink-0"
            >
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-brand-blue dark:bg-brand-accent flex items-center justify-center text-white font-bold text-[10px] md:text-xs uppercase transition-colors">
                {initials}
              </div>
              <span className="text-[10px] md:text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-brand-blue transition-colors max-w-[100px] md:max-w-none truncate hidden sm:block">
                {unidadeSelecionada?.nome_fantasia || "Selecione uma Unidade"}
              </span>
            </Link>
          </div>
        </header>

          {/* Renderização das Páginas Filhas */}
          <Outlet />
        </main>
      </div>
      <InteractiveTour />
    </div>
  );
}
