import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Bot, Send, User, AlertCircle } from "lucide-react";
import api from "../services/api";
import axios from "axios";

// Cria uma instância sem interceptors de JWT
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
});

const PatientChatPage = () => {
  const { sessionId } = useParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionStatus, setSessionStatus] = useState("TRIAGEM"); // Para detetar intervenção
  const scrollRef = useRef();

  // 1. Carregar histórico e verificar status da sessão
  useEffect(() => {
    const fetchChatData = async () => {
      try {
        // Endpoint para buscar histórico (precisamos garantir que existe no backend)
        const response = await publicApi.get(`/public/chat/${sessionId}`);
        setMessages(response.data.history);
        setSessionStatus(response.data.status);
      } catch (err) {
        console.error("Erro ao carregar chat:", err);
      }
    };

    fetchChatData();

    // Polling opcional para detetar se o humano assumiu (TRANSBORDO)
    const interval = setInterval(fetchChatData, 5000);
    return () => clearInterval(interval);
  }, [sessionId]);

  // Scroll automático para a última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userText }]);
    setLoading(true);

    try {
      // Usamos o controller de IA que já temos
      const { data } = await publicApi.post(`/public/chat/${sessionId}/send`, {
        messageText: userText,
        clientId: sessionId, // O Orchestrator vincula ao UUID
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
          content: "Desculpe, ocorreu um erro na comunicação. Tente novamente.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
      {/* Header Fixo */}
      <header className="bg-brand-blue p-4 text-white shadow-md flex items-center gap-3">
        <div className="bg-white/20 p-2 rounded-full">
          <Bot size={24} className="text-brand-green" />
        </div>
        <div>
          <h1 className="font-bold text-sm uppercase tracking-tight">
            Atendimento ConfirmaMED
          </h1>
          <p className="text-[10px] opacity-80">Online agora</p>
        </div>
      </header>

      {/* Alerta de Intervenção Humana */}
      {sessionStatus === "TRANSBORDO" && (
        <div className="bg-amber-50 border-b border-amber-200 p-2 flex items-center gap-2 justify-center">
          <AlertCircle size={14} className="text-amber-600" />
          <span className="text-[11px] font-medium text-amber-800">
            Um atendente humano assumiu esta conversa.
          </span>
        </div>
      )}

      {/* Área de Mensagens */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`flex gap-2 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === "user"
                    ? "bg-brand-blue text-white"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div
                className={`p-3 rounded-2xl text-sm shadow-sm ${
                  msg.role === "user"
                    ? "bg-brand-blue text-white rounded-tr-none"
                    : "bg-white text-slate-700 border border-slate-100 rounded-tl-none"
                }`}
              >
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start items-center gap-2">
            <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input de Mensagem */}
      <footer className="p-4 bg-white border-t border-slate-200">
        <form onSubmit={handleSend} className="flex gap-2 max-w-4xl mx-auto">
          <input
            type="text"
            className="flex-1 bg-slate-100 rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 transition-all"
            placeholder="Digite a sua mensagem..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="bg-brand-blue text-white p-3 rounded-full hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:scale-100 active:scale-90 shadow-lg shadow-brand-blue/20"
          >
            <Send size={20} />
          </button>
        </form>
        <p className="text-[9px] text-center text-slate-400 mt-2">
          Tecnologia ConfirmaMED • Agendamento Inteligente
        </p>
      </footer>
    </div>
  );
};

export default PatientChatPage;
