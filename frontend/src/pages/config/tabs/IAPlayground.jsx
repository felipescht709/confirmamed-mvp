//src/pages/config/tabs/IAPlayground.jsx
import { useState } from "react";
import api from "../../../services/api";
import {
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  MessageCircle,
} from "lucide-react";

export default function IAPlayground({ currentConfig }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Olá! Eu sou a ${currentConfig.nome_bot || "IA"}. Pode me testar enviando uma mensagem abaixo.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      // Rota POST /ia/test-prompt enviando a config atual (mesmo sem salvar no banco)
      const { data } = await api.post("/ia/test-prompt", {
        message: userMsg,
        config: currentConfig, // Enviamos o estado atual do ConfigIA.jsx
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "⚠️ Erro ao simular resposta. Verifique a rota /ia/test-prompt.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* HEADER DO CHAT */}
      <div className="p-4 bg-slate-800/50 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-brand-blue rounded-lg">
            <MessageCircle size={16} className="text-white" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Simulador de Agente
            </h4>
            <p className="text-[10px] text-slate-400">
              Modo de Teste (ISO 42001)
            </p>
          </div>
        </div>
        <Sparkles size={16} className="text-brand-blue animate-pulse" />
      </div>

      {/* ÁREA DE MENSAGENS */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed ${
                m.role === "user"
                  ? "bg-brand-blue text-white rounded-tr-none"
                  : "bg-slate-800 text-slate-200 rounded-tl-none border border-white/5"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1 opacity-50 text-[9px] font-bold uppercase">
                {m.role === "user" ? <User size={10} /> : <Bot size={10} />}
                {m.role === "user" ? "Você" : currentConfig.nome_bot}
              </div>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 p-3 rounded-2xl rounded-tl-none border border-white/5">
              <Loader2 size={16} className="text-brand-blue animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* INPUT */}
      <form
        onSubmit={handleSendMessage}
        className="p-4 bg-slate-800/30 border-t border-white/5 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite um teste (ex: quero agendar)..."
          className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:ring-1 focus:ring-brand-blue outline-none transition-all"
        />
        <button
          disabled={loading}
          className="p-2 bg-brand-blue text-white rounded-xl hover:bg-brand-accent transition-all disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
