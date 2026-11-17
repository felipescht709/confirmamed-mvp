import { useState, useEffect, useCallback } from "react";
import api from "../../../services/api";
import { useUnidade } from "../../../context/UnidadeContext";
import {
  Bot,
  Save,
  MessageSquareText,
  History,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Smartphone,
  QrCode,
} from "lucide-react";
import { toast } from "react-hot-toast";
import IAPlayground from "./IAPlayground";
import WhatsAppConnectModal from "../../../components/WhatsAppConnectModal"; // <- Importe o modal que vamos criar/usar
import ConfigLembretes from "../../../components/ConfigLembretes";

export default function ConfigIA() {
  const { unidadeSelecionada, unidadeId, atualizarConfiguracaoIAUnidade } = useUnidade();
  const [saving, setSaving] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [checkingWhatsapp, setCheckingWhatsapp] = useState(true);
  const [whatsappState, setWhatsappState] = useState({
    connected: false,
    state: "checking",
    phone: null
  });

  const [config, setConfig] = useState({
    nome_bot: "",
    tom_de_voz: "Cordial e profissional",
    ramo_atuacao: "",
    regras: "",
  });

  const checkWhatsappStatus = useCallback(async () => {
    if (!unidadeId) return;
    setCheckingWhatsapp(true);
    try {
      const { data } = await api.get("/whatsapp/status");
      setWhatsappState({
        connected: data.connected,
        state: data.state,
        phone: data.phone,
        instanceName: data.instanceName
      });
    } catch (err) {
      console.error("Erro ao verificar status do WhatsApp:", err);
      setWhatsappState({ connected: false, state: "error", phone: null });
    } finally {
      setCheckingWhatsapp(false);
    }
  }, [unidadeId]);

  const handleDisconnect = async () => {
    if (!window.confirm("Deseja realmente desconectar este aparelho de WhatsApp? A IA não poderá mais responder as mensagens nesta unidade.")) return;
    try {
      await api.post("/whatsapp/disconnect");
      toast.success("WhatsApp desconectado com sucesso.");
      checkWhatsappStatus();
    } catch (err) {
      toast.error("Erro ao desconectar WhatsApp.");
    }
  };

  const handleConfigChange = useCallback((field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  }, []);

  useEffect(() => {
    if (unidadeSelecionada) {
      const cfg = unidadeSelecionada.configuracoes_ia;
      const parsed =
        typeof cfg === "string" ? JSON.parse(cfg || "{}") : cfg || {};

      setConfig({
        nome_bot: parsed.nome_bot || "",
        tom_de_voz: parsed.tom_de_voz || "Cordial e profissional",
        ramo_atuacao: parsed.ramo_atuacao || "",
        regras: parsed.regras || "",
      });

      checkWhatsappStatus();
    }
  }, [unidadeSelecionada, checkWhatsappStatus]);

  const validateConfig = () => {
    if (!config.nome_bot.trim()) {
      toast.error("O nome do robô é obrigatório.");
      return false;
    }
    if (config.regras.length > 3000) {
      toast.error("As regras são muito longas (máx 3000 caracteres).");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!unidadeId) return toast.error("Selecione uma unidade válida.");
    if (!validateConfig()) return;

    setSaving(true);
    try {
      await api.put(`/unidades/${unidadeId}/config-ia`, {
        config_ia: config,
      });
      atualizarConfiguracaoIAUnidade(config);
      toast.success("Inteligência Artificial atualizada com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar Config IA:", error);
      const msg =
        error.response?.data?.error || "Erro ao conectar com o servidor.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!unidadeSelecionada) {
    return (
      <div className="flex flex-col items-center justify-center h-80 border-2 border-dashed border-slate-100 rounded-3xl">
        <AlertCircle size={48} className="mb-4 text-slate-200" />
        <p className="text-slate-400 font-medium text-center px-10">
          Selecione uma unidade de atendimento para configurar o cérebro da IA e
          o WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* NOVO BLOCO: CONEXÃO COM WHATSAPP */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl ${
            checkingWhatsapp ? "bg-slate-100 text-slate-400 border border-slate-200/50" :
            whatsappState.connected ? "bg-emerald-50 text-emerald-600 border border-emerald-100/50" : 
            "bg-slate-50 text-slate-500 border border-slate-200/50"
          }`}>
            <Smartphone size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-slate-800 text-lg">
                Conexão com WhatsApp
              </h3>
              {checkingWhatsapp ? (
                <span className="px-2 py-0.5 text-[9px] font-black text-slate-400 bg-slate-100 uppercase tracking-widest rounded-full">
                  Verificando...
                </span>
              ) : whatsappState.connected ? (
                <span className="px-2 py-0.5 text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100/50 uppercase tracking-widest rounded-full">
                  Conectado
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[9px] font-black text-slate-400 bg-slate-50 border border-slate-200/50 uppercase tracking-widest rounded-full">
                  Desconectado
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              {checkingWhatsapp ? "Verificando status de conexão na Evolution API..." :
               whatsappState.connected 
                ? `Instância ativa (${whatsappState.instanceName || `clinica_${unidadeId}`})${whatsappState.phone ? ` vinculada ao número: +${whatsappState.phone}` : ""}.`
                : "Vincule o aparelho da clínica para o robô começar a atender os pacientes."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto self-stretch sm:self-auto justify-end">
          {checkingWhatsapp ? (
            <div className="p-3">
              <Loader2 className="animate-spin text-brand-blue" size={20} />
            </div>
          ) : whatsappState.connected ? (
            <button
              onClick={handleDisconnect}
              className="px-5 py-3 border border-red-200 hover:border-red-300 text-red-650 hover:bg-red-50/50 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Desconectar WhatsApp
            </button>
          ) : (
            <button
              onClick={() => setIsQrModalOpen(true)}
              className="bg-brand-blue text-white px-5 py-3 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-brand-accent transition-all shadow-md shadow-brand-blue/15 cursor-pointer"
            >
              <QrCode size={14} />
              Conectar Aparelho
            </button>
          )}
        </div>
      </div>

      {/* COMPONENTE MODAL DE QR CODE */}
      <WhatsAppConnectModal
        isOpen={isQrModalOpen}
        onClose={() => {
          setIsQrModalOpen(false);
          checkWhatsappStatus();
        }}
        unidade={unidadeSelecionada}
      />

      {/* ---------------------------------------------------------------- */}
      {/* GRID PRINCIPAL: 2 colunas para campos de IA, 1 para Playground */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUNA 1 & 2: CONFIGURAÇÕES DA IA */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-slate-800 flex items-center gap-2">
                <div className="p-2 bg-brand-blue/10 rounded-lg">
                  <MessageSquareText size={20} className="text-brand-blue" />
                </div>
                Personalidade do Agente
              </h3>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                <ShieldCheck size={14} className="text-green-500" />
                ISO 42001 COMPLIANT
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider">
                  Nome do Robô
                </label>
                <input
                  type="text"
                  id="tut-nome-bot"
                  placeholder="Ex: Maya"
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-blue outline-none transition-all font-medium"
                  value={config.nome_bot}
                  onChange={(e) =>
                    handleConfigChange("nome_bot", e.target.value)
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider">
                  Tom de Voz
                </label>
                <select
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-blue outline-none transition-all font-medium"
                  value={config.tom_de_voz}
                  onChange={(e) =>
                    handleConfigChange("tom_de_voz", e.target.value)
                  }
                >
                  <option value="Cordial e profissional">
                    Cordial e Profissional
                  </option>
                  <option value="Empático e acolhedor">
                    Empático e Acolhedor
                  </option>
                  <option value="Formal e técnico">Formal e Técnico</option>
                  <option value="Direto e objetivo">Direto e Objetivo</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider">
                Especialidades Atendidas
              </label>
              <input
                type="text"
                placeholder="Ex: Cardiologia, Pediatria..."
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-blue outline-none transition-all"
                value={config.ramo_atuacao}
                onChange={(e) =>
                  handleConfigChange("ramo_atuacao", e.target.value)
                }
              />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-display font-bold text-slate-800 flex items-center gap-2">
              <Bot size={20} className="text-brand-blue" />
              Regras Específicas (System Prompt)
            </h3>
            <textarea
              rows="8"
              id="tut-regras-ia"
              className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-blue outline-none transition-all font-mono text-sm"
              placeholder="- Não marcamos Unimed às sextas..."
              value={config.regras}
              onChange={(e) => handleConfigChange("regras", e.target.value)}
            />
          </div>

          {/* RÉGUA DE LEMBRETES & AUTOMAÇÕES */}
          <ConfigLembretes unidade={unidadeSelecionada} />
        </div>

        {/* COLUNA 3: PLAYGROUND & STATUS */}
        <div className="flex flex-col gap-6">
          <IAPlayground currentConfig={config} />

          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
            <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <History size={14} /> Histórico Recente
            </h5>
            <div className="space-y-3">
              <div className="text-[11px] text-slate-500 flex justify-between border-b border-slate-200/50 pb-2">
                <span>Versão Atual</span>
                <span className="font-mono">Hoje</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* FECHAMENTO DO GRID PRINCIPAL */}

      {/* FOOTER ACTION */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-100">
        <p className="text-xs text-slate-400 font-medium">
          Dica: Teste no <b>Playground</b> antes de publicar.
        </p>
        <button
          onClick={handleSave}
          disabled={saving}
          id="tut-salvar-ia"
          className="bg-brand-blue text-white px-12 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-brand-accent transition-all shadow-lg shadow-brand-blue/30 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <Save size={20} />
          )}
          {saving ? "Salvando..." : "Salvar Configurações"}
        </button>
      </div>
    </div>
  );
}
