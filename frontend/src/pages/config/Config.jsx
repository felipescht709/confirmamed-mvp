// config/Config.jsx (Atualizado)
import { useState } from "react";
import { Stethoscope, Building2, Bot, CalendarDays } from "lucide-react";
import ConfigIA from "./tabs/ConfigIA";
import GradeHoraria from "./tabs/AgendaConfigController"; 
import Profissionais from "./tabs/Profissionais";
import Unidades from "./tabs/Unidades";

export default function Config() {
  const [activeTab, setActiveTab] = useState("profissionais");

  const tabs = [
    {
      id: "profissionais",
      label: "Profissionais",
      icon: <Stethoscope size={18} />,
    },
    { id: "unidades", label: "Unidades", icon: <Building2 size={18} /> },
    { id: "ia", label: "Configuração da IA", icon: <Bot size={18} /> },
    {
      id: "agenda",
      label: "Regras da Agenda",
      icon: <CalendarDays size={18} />,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl font-bold text-slate-800 font-display">
          Configurações do Sistema
        </h1>
        <p className="text-slate-500 text-sm">
          Gerencie a infraestrutura e a inteligência da sua clínica.
        </p>
      </header>

      {/* Navegação por Abas */}
      <nav className="flex border-b border-slate-200 gap-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 py-4 text-sm font-semibold transition-all border-b-2 ${
              activeTab === tab.id
                ? "border-brand-blue text-brand-blue"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Conteúdo Dinâmico das Abas */}
      <section className="py-2">
        {activeTab === "profissionais" && <Profissionais />}
        {activeTab === "ia" && <ConfigIA />}
        {activeTab === "unidades" && <Unidades />}

        {/* AQUI ESTÁ A MUDANÇA: Usamos o componente real agora */}
        {activeTab === "agenda" && <GradeHoraria />}
      </section>
    </div>
  );
}
