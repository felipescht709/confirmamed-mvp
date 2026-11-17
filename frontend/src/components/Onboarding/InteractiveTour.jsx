import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X, ChevronRight, CheckCircle } from "lucide-react";
import { toast } from "react-hot-toast";

const TOUR_STEPS = [
  // 1. Meu Perfil
  {
    id: "perfil_nome",
    path: "/config",
    tab: "perfil",
    selector: "#tut-nome-fantasia",
    title: "Nome Fantasia",
    text: "Olá! Sou a Maya, assistente virtual do ConfirmaMED. Vamos começar configurando o Nome Fantasia da sua clínica no campo destacado.",
    nextStep: "perfil_salvar"
  },
  {
    id: "perfil_salvar",
    path: "/config",
    tab: "perfil",
    selector: "#tut-salvar",
    title: "Salvar Alterações",
    text: "Agora clique em 'Salvar Alterações' para gravar os dados do seu perfil.",
    nextStep: "unidade_btn"
  },
  // 2. Unidade de Atendimento
  {
    id: "unidade_btn",
    path: "/config",
    tab: "unidades",
    selector: "#tut-nova-unidade",
    title: "Nova Unidade",
    text: "Muito bem! Agora vamos para as Unidades de Atendimento. Clique em 'Nova Unidade' para abrir o cadastro da sua filial.",
    nextStep: "unidade_nome"
  },
  {
    id: "unidade_nome",
    path: "/config",
    tab: "unidades",
    selector: "#tut-nome-unidade",
    title: "Nome da Unidade",
    text: "Escreva o nome fantasia que identifica esta unidade de atendimento.",
    nextStep: "unidade_telefone"
  },
  {
    id: "unidade_telefone",
    path: "/config",
    tab: "unidades",
    selector: "#tut-telefone-unidade",
    title: "Telefone da Unidade",
    text: "Preencha o telefone de contato direto desta unidade.",
    nextStep: "unidade_salvar"
  },
  {
    id: "unidade_salvar",
    path: "/config",
    tab: "unidades",
    selector: "#tut-salvar-unidade",
    title: "Salvar Unidade",
    text: "Pronto! Clique em 'Salvar Unidade' para cadastrá-la no sistema.",
    nextStep: "profissional_btn"
  },
  // 3. Profissionais de Saúde
  {
    id: "profissional_btn",
    path: "/config",
    tab: "profissionais",
    selector: "#tut-novo-profissional",
    title: "Novo Profissional",
    text: "Excelente! O próximo passo é cadastrar a equipe médica. Clique em 'Novo Cadastro' para registrar o primeiro profissional.",
    nextStep: "profissional_nome"
  },
  {
    id: "profissional_nome",
    path: "/config",
    tab: "profissionais",
    selector: "#tut-nome-completo-profissional",
    title: "Nome do Profissional",
    text: "Insira o nome completo do profissional de saúde neste campo.",
    nextStep: "profissional_especialidade"
  },
  {
    id: "profissional_especialidade",
    path: "/config",
    tab: "profissionais",
    selector: "#tut-especialidade-profissional",
    title: "Especialidade",
    text: "Informe a especialidade médica deste profissional (ex: Pediatria, Cardiologia).",
    nextStep: "profissional_telefone"
  },
  {
    id: "profissional_telefone",
    path: "/config",
    tab: "profissionais",
    selector: "#tut-telefone-profissional",
    title: "Telefone do Profissional",
    text: "Insira o telefone ou celular para contato deste profissional.",
    nextStep: "profissional_salvar"
  },
  {
    id: "profissional_salvar",
    path: "/config",
    tab: "profissionais",
    selector: "#tut-salvar-profissional",
    title: "Salvar Profissional",
    text: "Clique em 'Salvar Profissional' para registrar este membro da equipe e seus horários.",
    nextStep: "ia_nome"
  },
  // 4. Configuração da IA
  {
    id: "ia_nome",
    path: "/config",
    tab: "ia",
    selector: "#tut-nome-bot",
    title: "Nome do Robô",
    text: "Vamos agora configurar o cérebro da Inteligência Artificial. Defina o nome do seu robô no campo indicado.",
    nextStep: "ia_regras"
  },
  {
    id: "ia_regras",
    path: "/config",
    tab: "ia",
    selector: "#tut-regras-ia",
    title: "Regras do Robô",
    text: "Escreva as regras específicas de atendimento da clínica (como restrições ou convênios atendidos) no campo de texto.",
    nextStep: "ia_salvar"
  },
  {
    id: "ia_salvar",
    path: "/config",
    tab: "ia",
    selector: "#tut-salvar-ia",
    title: "Salvar Configurações da IA",
    text: "Clique no botão 'Salvar Configurações' para treinar a inteligência com as regras fornecidas.",
    nextStep: "paciente_btn"
  },
  // 5. Cadastrar Paciente
  {
    id: "paciente_btn",
    path: "/pacientes",
    selector: "#tut-novo-paciente",
    title: "Novo Paciente",
    text: "Excelente! Vamos cadastrar um paciente de teste para podermos simular agendamentos. Clique em 'Novo Paciente'.",
    nextStep: "paciente_nome"
  },
  {
    id: "paciente_nome",
    path: "/pacientes",
    selector: "#tut-nome-paciente",
    title: "Nome do Paciente",
    text: "Digite o nome completo do paciente neste campo destacado.",
    nextStep: "paciente_telefone"
  },
  {
    id: "paciente_telefone",
    path: "/pacientes",
    selector: "#tut-telefone-paciente",
    title: "Telefone do Paciente",
    text: "Preencha o celular/WhatsApp do paciente para que ele possa receber as mensagens da IA.",
    nextStep: "paciente_salvar"
  },
  {
    id: "paciente_salvar",
    path: "/pacientes",
    selector: "#tut-salvar-paciente",
    title: "Salvar Paciente",
    text: "Preencha as informações básicas do paciente de teste e clique no botão 'Salvar Paciente'.",
    nextStep: "procedimento_btn"
  },
  // 6. Cadastrar Procedimento
  {
    id: "procedimento_btn",
    path: "/procedimentos",
    selector: "#tut-novo-procedimento",
    title: "Novo Procedimento",
    text: "Por fim, configure os exames e procedimentos médicos oferecidos pela clínica. Clique em 'Novo Procedimento'.",
    nextStep: "procedimento_nome"
  },
  {
    id: "procedimento_nome",
    path: "/procedimentos",
    selector: "#tut-nome-procedimento",
    title: "Nome do Procedimento",
    text: "Preencha o nome do exame ou consulta oferecida (ex: Consulta Pediatria, Ultrassom Abdominal).",
    nextStep: "procedimento_valor"
  },
  {
    id: "procedimento_valor",
    path: "/procedimentos",
    selector: "#tut-valor-procedimento",
    title: "Valor do Procedimento",
    text: "Insira o valor particular deste procedimento (em R$).",
    nextStep: "procedimento_salvar"
  },
  {
    id: "procedimento_salvar",
    path: "/procedimentos",
    selector: "#tut-salvar-procedimento",
    title: "Salvar Procedimento",
    text: "Pronto! Clique em 'Salvar' para concluir o cadastro do procedimento.",
    nextStep: "finish"
  }
];

export default function InteractiveTour() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeStepId, setActiveStepId] = useState(() => {
    return localStorage.getItem("active_tour_step") || null;
  });

  const [coords, setCoords] = useState(null);

  const activeStep = TOUR_STEPS.find(s => s.id === activeStepId);

  // Monitor e atualiza o estado de ativação do tutorial do localStorage
  useEffect(() => {
    const checkTour = () => {
      const step = localStorage.getItem("active_tour_step");
      if (step !== activeStepId) {
        setActiveStepId(step);
      }
    };

    const interval = setInterval(checkTour, 500);
    return () => clearInterval(interval);
  }, [activeStepId]);

  // Monitora coordenadas do elemento focado
  useEffect(() => {
    if (!activeStep?.selector) {
      setCoords(null);
      return;
    }

    const updateCoords = () => {
      const element = document.querySelector(activeStep.selector);
      if (element) {
        const rect = element.getBoundingClientRect();
        setCoords({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        });
      } else {
        setCoords(null);
      }
    };

    updateCoords();
    const timer = setInterval(updateCoords, 300);
    window.addEventListener("resize", updateCoords);
    window.addEventListener("scroll", updateCoords);

    return () => {
      clearInterval(timer);
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords);
    };
  }, [activeStep]);

  // Redireciona o usuário para a página e aba correta se necessário
  useEffect(() => {
    if (activeStep) {
      const currentParams = new URLSearchParams(location.search);
      const currentTab = currentParams.get("tab");
      
      if (location.pathname !== activeStep.path || (activeStep.tab && currentTab !== activeStep.tab)) {
        let dest = activeStep.path;
        if (activeStep.tab) {
          dest += `?tab=${activeStep.tab}`;
        }
        navigate(dest);
      }
    }
  }, [activeStep, location.pathname, location.search, navigate]);

  if (!activeStep) return null;

  const handleNext = () => {
    if (activeStep.nextStep === "finish") {
      handleClose();
      toast.success("Parabéns! Você concluiu todas as etapas do tutorial de onboarding!");
    } else {
      localStorage.setItem("active_tour_step", activeStep.nextStep);
      setActiveStepId(activeStep.nextStep);
    }
  };

  const handleClose = () => {
    localStorage.removeItem("active_tour_step");
    setActiveStepId(null);
    setCoords(null);
  };

  return (
    <>
      {/* 🎯 pulsing target indicator */}
      {coords && (
        <div
          className="absolute pointer-events-none z-[9999] transition-all duration-300"
          style={{
            top: coords.top,
            left: coords.left,
            width: coords.width,
            height: coords.height
          }}
        >
          {/* Anel pulsante */}
          <div className="absolute inset-0 border-2 border-brand-accent rounded-lg animate-ping opacity-75" />
          <div className="absolute inset-0 border-2 border-brand-accent rounded-lg shadow-[0_0_15px_rgba(0,174,239,0.5)]" />
          
          {/* Bouncing Target Indicator */}
          <div className="absolute -top-3.5 -left-3.5 w-7 h-7 bg-brand-accent flex items-center justify-center rounded-full text-white text-[10px] font-bold shadow-lg border-2 border-white dark:border-slate-900 animate-bounce">
            ✨
          </div>
        </div>
      )}

      {/* 💬 Mentora Maya Floating Bubble */}
      <div className="fixed bottom-6 right-6 w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl z-[99999] animate-in slide-in-from-bottom-5 duration-500">
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-center gap-3">
            {/* Avatar da Maya */}
            <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-blue to-brand-accent flex items-center justify-center text-white font-bold text-base shadow-md shrink-0">
              M
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-display font-bold text-slate-800 dark:text-slate-100 text-sm">
                  Maya
                </h4>
                <span className="text-[9px] font-black bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue dark:text-brand-accent uppercase tracking-widest px-2 py-0.5 rounded-full">
                  Guia AI
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Tutorial Interativo
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-500 transition-colors cursor-pointer"
            title="Encerrar Tutorial"
          >
            <X size={16} />
          </button>
        </div>

        {/* Mensagem e Instrução */}
        <div className="mt-4 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-900">
          <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-medium">
            {activeStep.text}
          </p>
        </div>

        {/* Ações */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold italic flex items-center gap-1">
            <CheckCircle size={10} className="text-emerald-500" />
            Interaja com o elemento destacado
          </div>

          <button
            onClick={handleNext}
            className="flex items-center gap-1 bg-brand-blue text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-brand-accent transition-all shadow-md shadow-brand-blue/15 cursor-pointer"
          >
            {activeStep.nextStep === "finish" ? "Concluir" : "Próximo"}
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </>
  );
}
