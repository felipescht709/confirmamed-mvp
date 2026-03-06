import {
  Bot,
  Home,
  MessageSquare,
  Calendar,
  Users,
  ClipboardList,
  Settings,
  LogOut,
} from "lucide-react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom"; // Outlet adicionado
import logo from "../assets/logo.png";
import { useUnidade } from "../context/UnidadeContext.jsx"; // Importação do contexto
import { useAuth } from "../context/AuthContext.jsx"; // Importação do auth

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
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth(); // Usando função de logout global
  const { unidadeSelecionada } = useUnidade(); // Consumindo unidade real do banco

  return (
    <div className="flex h-screen bg-brand-light overflow-hidden font-sans text-brand-dark">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm">
        <div className="p-6 mb-2">
          <img
            src={logo}
            alt="ConfirmaMED"
            className="h-12 w-auto object-contain"
          />
        </div>

        <nav className="flex-1 overflow-y-auto px-4 space-y-6">
          {menuGroups.map((group) => (
            <div key={group.title}>
              <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-bold mb-3 px-2">
                {group.title}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all text-sm font-medium ${
                      location.pathname === item.path
                        ? "bg-brand-blue text-white shadow-md shadow-brand-blue/20"
                        : "text-slate-500 hover:bg-slate-50 hover:text-brand-blue"
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

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={logout}
            className="flex items-center gap-3 p-3 w-full text-slate-400 hover:text-red-500 transition-colors text-sm font-semibold"
          >
            <LogOut size={18} />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto px-10 py-8">
        <header className="flex justify-between items-center mb-10">
          <h2 className="font-display text-xl font-bold text-slate-800">
            {menuGroups
              .flatMap((g) => g.items)
              .find((i) => i.path === location.pathname)?.name || "Painel"}
          </h2>
          <div className="flex items-center gap-3 bg-white p-1.5 pr-4 rounded-full border border-slate-200 shadow-sm">
            <div className="w-8 h-8 rounded-full bg-brand-green flex items-center justify-center text-white font-bold text-xs uppercase">
              AD
            </div>
            <span className="text-xs font-bold text-slate-600">
              {/* Exibe o nome da unidade vindo do contexto global */}
              {unidadeSelecionada?.nome_fantasia || "Selecione uma Unidade"}
            </span>
          </div>
        </header>

        {/* IMPORTANTE: O Outlet é o espaço onde as sub-rotas (Agenda, Monitor, etc) 
            são renderizadas quando o roteamento do App.jsx define este Layout como pai.
        */}
        <Outlet />
      </main>
    </div>
  );
}
