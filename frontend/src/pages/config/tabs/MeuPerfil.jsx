import React, { useState, useEffect } from "react";
import { User, Mail, Phone, CreditCard, ShieldCheck, FileText, CheckCircle, Clock, Sun, Moon } from "lucide-react";
import api from "../../../services/api";
import { toast } from "react-hot-toast";
import { useUnidade } from "../../../context/UnidadeContext";
import { useAuth } from "../../../context/AuthContext";

const formatCPFCNPJ = (value) => {
  if (!value) return "";
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  } else {
    return digits
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
  }
};

const formatPhone = (value) => {
  if (!value) return "";
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  } else {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
  }
};

export default function MeuPerfil() {
  const { unidadeId } = useUnidade();
  const { user } = useAuth();
  const [theme, setTheme] = useState(() => {
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });

  const handleToggleTheme = (newTheme) => {
    setTheme(newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const [loading, setLoading] = useState(false);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [profissionais, setProfissionais] = useState([]);
  const [selectedProId, setSelectedProId] = useState("");
  const [perfil, setPerfil] = useState({
    nome_fantasia: "",
    razao_social: "",
    documento: "",
    email: "",
    email_notificacao: "",
    telefone: "",
    plano_atual: "MVP_FREE",
    status_pagamento: "ATIVO",
    trial_ends_at: null,
    confirmacao_automatica_ativa: true,
    lembretes_config_minutos: [1440]
  });

  useEffect(() => {
    if (unidadeId) {
      api.get(`/unidades/${unidadeId}`).then(res => {
        if(res.data) {
          setPerfil({
            nome_fantasia: res.data.nome_fantasia || "",
            razao_social: res.data.razao_social || "",
            documento: formatCPFCNPJ(res.data.cnpj || res.data.documento || ""),
            email: res.data.email_contato || res.data.email || "",
            email_notificacao: res.data.email_notificacao || "",
            telefone: formatPhone(res.data.telefone_principal || res.data.telefone || ""),
            plano_atual: res.data.plan || "MVP_SINGLE",
            status_pagamento: res.data.subscription_status || "TRIAL",
            trial_ends_at: res.data.trial_ends_at || null,
            confirmacao_automatica_ativa: res.data.confirmacao_automatica_ativa !== undefined ? res.data.confirmacao_automatica_ativa : true,
            lembretes_config_minutos: res.data.lembretes_config_minutos || [1440]
          });
        }
      }).catch(err => console.error("Erro ao carregar perfil:", err));
    }
  }, [unidadeId]);

  useEffect(() => {
    if (unidadeId && !user?.profissional_id) {
      api.get("/profissionais")
        .then(res => {
          setProfissionais(res.data || []);
          if (res.data && res.data.length > 0) {
            setSelectedProId(res.data[0].id_profissional_saude || "");
          }
        })
        .catch(err => console.error("Erro ao buscar profissionais:", err));
    }
  }, [unidadeId, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "documento") {
      setPerfil(prev => ({ ...prev, documento: formatCPFCNPJ(value) }));
    } else if (name === "telefone") {
      setPerfil(prev => ({ ...prev, telefone: formatPhone(value) }));
    } else {
      setPerfil(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cleanDocumento = perfil.documento.replace(/\D/g, "");
      const cleanTelefone = perfil.telefone.replace(/\D/g, "");

      await api.put(`/unidades/${unidadeId}`, {
        nome_fantasia: perfil.nome_fantasia,
        razao_social: perfil.razao_social,
        cnpj: cleanDocumento,
        telefone_principal: cleanTelefone,
        email_contato: perfil.email,
        email_notificacao: perfil.email_notificacao,
        confirmacao_automatica_ativa: perfil.confirmacao_automatica_ativa,
        lembretes_config_minutos: perfil.lembretes_config_minutos
      });
      toast.success("Perfil e regras de lembrete atualizados!");
    } catch (error) {
      toast.error("Erro ao atualizar configurações.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncGoogle = async () => {
    const targetProId = user?.profissional_id || selectedProId;
    if (!targetProId) {
      toast.error("Por favor, selecione um profissional.");
      return;
    }
    try {
      const response = await api.get(`/google/auth?profissional_id=${targetProId}`);
      if (response.data && response.data.authUrl) {
        window.location.href = response.data.authUrl;
      }
    } catch (error) {
      toast.error("Erro ao iniciar sincronização com o Google.");
    }
  };

  const handleBilling = async () => {
    setLoadingBilling(true);
    try {
      const response = await api.post("/pagamento/portal");
      if (response.data && response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.log("Portal indisponível, tentando checkout...", error);
      try {
        const response = await api.post("/pagamento/checkout");
        if (response.data && response.data.url) {
          window.location.href = response.data.url;
        }
      } catch (err) {
        toast.error("Erro ao redirecionar para a Stripe.");
        console.error(err);
      }
    } finally {
      setLoadingBilling(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
      
      {/* Coluna 1: Dados da Clínica e Configurações de Lembrete (Formulário Único) */}
      <form onSubmit={handleSave} className="lg:col-span-2 space-y-6">
        
        {/* Card 1: Dados da Clínica */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-2">
            <User className="text-indigo-600 dark:text-indigo-400" size={20} />
            <h2 className="font-bold text-slate-800 dark:text-white">Dados da Clínica</h2>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Nome Fantasia</label>
                <input 
                  type="text" 
                  id="tut-nome-fantasia"
                  name="nome_fantasia"
                  value={perfil.nome_fantasia} 
                  onChange={handleChange}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Razão Social</label>
                <input 
                  type="text" 
                  id="tut-razao-social"
                  name="razao_social"
                  value={perfil.razao_social} 
                  onChange={handleChange}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                  <FileText size={14}/> CNPJ / CPF
                </label>
                <input 
                  type="text" 
                  id="tut-documento"
                  name="documento"
                  value={perfil.documento} 
                  onChange={handleChange}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                  <Phone size={14}/> Telefone de Contato
                </label>
                <input 
                  type="text" 
                  name="telefone"
                  value={perfil.telefone} 
                  onChange={handleChange}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                  <Mail size={14}/> E-mail Responsável
                </label>
                <input 
                  type="email" 
                  name="email"
                  value={perfil.email} 
                  onChange={handleChange}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                  <Mail size={14}/> E-mail para Disparos da IA
                </label>
                <input 
                  type="email" 
                  name="email_notificacao"
                  value={perfil.email_notificacao} 
                  onChange={handleChange}
                  placeholder="Se diferente do principal..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Regras de Lembretes Automáticos */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-2">
            <Clock className="text-indigo-600 dark:text-indigo-400" size={20} />
            <h2 className="font-bold text-slate-800 dark:text-white">Regras de Lembretes Automáticos</h2>
          </div>

          <div className="p-6 space-y-5">
            {/* Toggle de confirmação automática */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-all">
              <div className="max-w-[75%]">
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">Confirmação Automática via WhatsApp</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Permite que a IA envie lembretes e valide a presença dos pacientes antes da consulta.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  name="confirmacao_automatica_ativa"
                  checked={perfil.confirmacao_automatica_ativa}
                  onChange={(e) => setPerfil(prev => ({ ...prev, confirmacao_automatica_ativa: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Checkboxes de momentos de envio se ativado */}
            {perfil.confirmacao_automatica_ativa && (
              <div className="space-y-3 pt-1 animate-in slide-in-from-top-3 duration-300">
                <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Selecione os momentos de envio dos lembretes
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: "48 horas antes", value: 2880 },
                    { label: "24 horas antes", value: 1440 },
                    { label: "12 horas antes", value: 720 },
                    { label: "1 hora antes", value: 60 },
                    { label: "30 minutos antes", value: 30 },
                    { label: "15 minutos antes", value: 15 },
                  ].map((opt) => {
                    const isChecked = perfil.lembretes_config_minutos.includes(opt.value);
                    return (
                      <label 
                        key={opt.value}
                        className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                          isChecked 
                            ? "bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800 text-indigo-955 dark:text-indigo-200 font-extrabold shadow-sm" 
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => {
                            const newVals = isChecked 
                              ? perfil.lembretes_config_minutos.filter(v => v !== opt.value)
                              : [...perfil.lembretes_config_minutos, opt.value];
                            setPerfil(prev => ({ ...prev, lembretes_config_minutos: newVals }));
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                        />
                        <span className="text-xs">{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button 
                type="submit" 
                id="tut-salvar"
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 cursor-pointer"
              >
                {loading ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </div>
        </div>

      </form>

      {/* Coluna 2: Assinatura e Planos */}
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-xl shadow-lg border border-indigo-800 overflow-hidden text-white">
          <div className="p-5 border-b border-white/10 flex items-center gap-2">
            <ShieldCheck className="text-emerald-400" size={20} />
            <h2 className="font-bold">Meu Plano</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-1">
              <div className="text-indigo-200 text-xs font-bold uppercase tracking-wider">Plano Atual</div>
              <div className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
                {perfil.plano_atual}
              </div>
              <div className="flex flex-col gap-2 mt-2">
                <div className="flex items-center gap-1.5 text-xs font-medium bg-white/10 w-max px-2.5 py-1 rounded-full">
                  {perfil.status_pagamento === 'TRIAL' ? (
                    <Clock size={12} className="text-amber-400" />
                  ) : (
                    <CheckCircle size={12} className="text-emerald-400" />
                  )}
                  <span className={perfil.status_pagamento === 'TRIAL' ? "text-amber-100" : "text-emerald-100"}>
                    {perfil.status_pagamento === 'ACTIVE' ? "Pagamento em dia" :
                     perfil.status_pagamento === 'TRIAL' ? "Período de Testes" : "Pagamento Pendente"}
                  </span>
                </div>

                {perfil.status_pagamento === 'TRIAL' && perfil.trial_ends_at && (
                  <div className="text-[10px] text-indigo-200">
                    Expira em: {new Date(perfil.trial_ends_at).toLocaleDateString('pt-BR')}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <button 
                type="button"
                onClick={handleBilling}
                disabled={loadingBilling}
                className="w-full bg-white text-indigo-900 hover:bg-indigo-50 font-bold py-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loadingBilling ? (
                  "Processando..."
                ) : (
                  <>
                    <CreditCard size={16} />
                    Gerenciar Assinatura
                  </>
                )}
              </button>
              <p className="text-[10px] text-center text-indigo-300 mt-3">
                Gerenciado via Stripe. Você será redirecionado para o portal seguro.
              </p>
            </div>
          </div>
        </div>

        {/* Preferências de Exibição */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm transition-colors">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
            <Sun size={16} className="text-amber-500" />
            Preferências de Exibição
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Escolha como prefere visualizar a interface do ConfirmaMED.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleToggleTheme("light")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                theme === "light"
                  ? "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-extrabold shadow-sm"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <Sun size={14} className="text-amber-500" />
              Claro
            </button>
            <button
              type="button"
              onClick={() => handleToggleTheme("dark")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                theme === "dark"
                  ? "bg-brand-blue border-brand-blue text-white font-extrabold shadow-sm"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <Moon size={14} className="text-indigo-400" />
              Escuro
            </button>
          </div>
        </div>

        {/* Sincronizar Google Agenda */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm transition-colors">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
            <Clock size={16} className="text-blue-600 dark:text-blue-400" />
            Sincronizar Agenda
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Conecte sua conta do Google para espelhar todos os agendamentos automaticamente no Google Calendar.
          </p>

          {!user?.profissional_id ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Selecione o Profissional
                </label>
                {profissionais.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Nenhum profissional cadastrado.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    <select
                      value={selectedProId}
                      onChange={(e) => setSelectedProId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    >
                      {profissionais.map((pro) => (
                        <option key={pro.id_profissional_saude} value={pro.id_profissional_saude}>
                          {pro.nome_completo} ({pro.especialidade})
                        </option>
                      ))}
                    </select>

                    {/* Badge de status do profissional selecionado */}
                    {(() => {
                      const selectedPro = profissionais.find(p => String(p.id_profissional_saude) === String(selectedProId));
                      const isConnected = selectedPro?.google_sync_active;
                      return (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-350"}`} />
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                            {isConnected ? "Google Agenda Conectado" : "Google Agenda Desconectado"}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              <button 
                type="button"
                onClick={handleSyncGoogle}
                disabled={profissionais.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg text-xs transition-all cursor-pointer"
              >
                Conectar Profissional ao Google Calendar
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Para profissionais diretos */}
              <button 
                type="button"
                onClick={handleSyncGoogle}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Conectar com Google Calendar
              </button>
            </div>
          )}
        </div>

        {/* Info Extra */}
        <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-5 transition-colors">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-2">Precisa de Ajuda?</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">
            Nossa equipe de suporte está disponível para te ajudar com as configurações da sua conta ou migração de planos.
          </p>
          <a 
            href="https://wa.me/554999227533" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-indigo-600 dark:text-indigo-400 font-bold text-xs hover:underline inline-flex items-center gap-1"
          >
            Falar com o Suporte &rarr;
          </a>
        </div>
      </div>

    </div>
  );
}
