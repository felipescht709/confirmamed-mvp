import React, { useState, useEffect, useRef } from "react";
import api from "../../services/api";
import { Send, Bot, User, Loader2, Phone } from "lucide-react";

const WebChatWidget = ({ sessionId: externalSessionId, isAdmin = false, unidadeId, pacienteNome, pacienteTelefone }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(false);

  const sessionId = externalSessionId;

  const scrollRef = useRef();
  
  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  // Carregar histórico e iniciar polling
  useEffect(() => {
    if (!sessionId) return;

    fetchHistory();

    const interval = setInterval(() => {
      fetchHistorySilent();
    }, 2000);

    return () => clearInterval(interval);
  }, [sessionId]);

  const mapLogsToMessages = (logs) => {
    return logs.reverse().map(log => {
      const msgs = [];
      if (log.input_usuario && log.input_usuario !== "[SISTEMA]" && log.input_usuario !== "[ADMIN]") {
        msgs.push({ role: "user", text: log.input_usuario });
      }
      if (log.output_ia && !log.output_ia.includes("Resultado processado")) {
        msgs.push({ 
          role: log.provider_usado === "HUMAN_OPERATOR" ? "admin" : "assistant", 
          text: log.output_ia 
        });
      }
      return msgs;
    }).flat();
  };

  const fetchHistory = async () => {
    try {
      setFetchingHistory(true);
      const { data } = await api.get(`/ia/audit-logs?session_id=${sessionId}`);
      const history = mapLogsToMessages(data);
      setMessages(history);
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
    } finally {
      setFetchingHistory(false);
    }
  };

  const fetchHistorySilent = async () => {
    if (loading) return; // Não atualizar enquanto estiver enviando para evitar conflito
    try {
      const { data } = await api.get(`/ia/audit-logs?session_id=${sessionId}`);
      const history = mapLogsToMessages(data);
      
      // Compara se o histórico mudou antes de atualizar o estado
      setMessages(prev => {
        const hasChanged = JSON.stringify(prev) !== JSON.stringify(history);
        return hasChanged ? history : prev;
      });
    } catch (err) {
      console.error("Erro silencioso ao carregar histórico:", err);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const text = input;
    setInput("");
    
    // Otimista: adiciona a mensagem na tela
    setMessages((prev) => [...prev, { role: isAdmin ? "admin" : "user", text }]);
    setLoading(true);

    try {
      if (isAdmin) {
        // Enviar como Admin (Intervenção)
        await api.post(`/ia/chat/${sessionId}/send`, {
          messageText: text
        });
      } else {
        // Enviar como IA (Redundância Web)
        const { data } = await api.post("/ai/analyze", {
          messageText: text,
          clientId: sessionId,
          unidadeId: unidadeId,
        });
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: data.response },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Erro na conexão. Tente novamente." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (fetchingHistory) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-brand-blue" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Header opcional ou título */}
      <div className="bg-white border-b border-slate-100 p-4 px-6 flex items-center justify-between shadow-sm z-10 relative">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-black text-sm uppercase shadow-sm border border-indigo-100">
            {pacienteNome ? pacienteNome.substring(0, 2).toUpperCase() : "PA"}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              {pacienteNome || "Paciente Não Cadastrado"}
            </h3>
            <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <Phone size={12} className="text-slate-300" />
              {pacienteTelefone || "Telefone Desconhecido"}
            </p>
          </div>
        </div>
      </div>

      {/* Mensagens */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex w-full ${m.role === "user" ? "justify-start pr-12" : "justify-end pl-12"}`}
          >
            <div className={`flex flex-col gap-1 max-w-[85%] ${m.role === "user" ? "items-start" : "items-end"}`}>
                <div
                    className={`p-3.5 px-4 text-[13px] leading-relaxed shadow-sm ${
                        m.role === "user"
                        ? "bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-tl-sm font-medium"
                        : m.role === "admin"
                        ? "bg-amber-500 text-white rounded-2xl rounded-tr-sm font-medium shadow-amber-500/20"
                        : "bg-indigo-600 text-white rounded-2xl rounded-tr-sm font-medium shadow-indigo-600/20"
                    }`}
                >
                    {m.text}
                </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-end">
            <div className="text-[10px] text-slate-400 animate-pulse font-bold uppercase tracking-widest">
                Enviando...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 px-6 bg-white border-t border-slate-100 z-10 relative">
        <div className="flex gap-2">
            <input
                className="flex-1 text-sm p-3 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium placeholder-slate-400"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Digite sua mensagem..."
                disabled={loading}
            />
            <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="bg-indigo-600 text-white p-3 px-4 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-600/20 flex items-center justify-center"
            >
                <Send size={18} />
            </button>
        </div>
      </div>
    </div>
  );
};

export default WebChatWidget;
