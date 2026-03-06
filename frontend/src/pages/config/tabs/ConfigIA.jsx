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

export default function ConfigIA() {
  const { unidadeSelecionada, unidadeId } = useUnidade();
  const [saving, setSaving] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false); // <- Controle do modal de QR Code

  const [config, setConfig] = useState({
    nome_bot: "",
    tom_de_voz: "Cordial e profissional",
    ramo_atuacao: "",
    regras: "",
  });

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
    }
  }, [unidadeSelecionada]);

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
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-xl">
            <Smartphone size={24} className="text-green-600" />
          </div>
          <div>
            <h3 className="font-display font-bold text-slate-800 text-lg">
              Conexão com WhatsApp
            </h3>
            <p className="text-sm text-slate-500">
              {unidadeSelecionada.whatsapp_instance_name
                ? `Conectado na instância: ${unidadeSelecionada.whatsapp_instance_name}`
                : "Vincule o aparelho da clínica para o robô começar a atender."}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsQrModalOpen(true)}
          className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-green-700 transition-all shadow-lg shadow-green-600/30"
        >
          <QrCode size={18} />
          {unidadeSelecionada.whatsapp_instance_name
            ? "Reconectar / Ver QR Code"
            : "Conectar Aparelho"}
        </button>
      </div>

      {/* COMPONENTE MODAL DE QR CODE */}
      <WhatsAppConnectModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
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
              className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-blue outline-none transition-all font-mono text-sm"
              placeholder="- Não marcamos Unimed às sextas..."
              value={config.regras}
              onChange={(e) => handleConfigChange("regras", e.target.value)}
            />
          </div>
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
