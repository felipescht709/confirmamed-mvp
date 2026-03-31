import React, { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import api from "../../services/api"; // Seu serviço axios já configurado
import { Send, Bot, X, MessageCircle } from "lucide-react";

const WebChatWidget = ({ unidadeId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // UUID para manter a sessão da IA no Postgres (tabela chat_sessions)
  const [sessionId] = useState(() => {
    const saved = sessionStorage.getItem("confirmamed_web_session");
    if (saved) return saved;
    const newId = uuidv4();
    sessionStorage.setItem("confirmamed_web_session", newId);
    return newId;
  });

  const scrollRef = useRef();
  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const text = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);

    try {
      // REAPROVEITANDO SEU CONTROLLER EXISTENTE
      const { data } = await api.post("/ai/analyze", {
        messageText: text, // O campo que seu iaController espera
        clientId: sessionId, // O UUID que o Orchestrator usará para o histórico
        unidadeId: unidadeId,
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.response },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Erro na conexão com a IA de redundância." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-[999]">
      {isOpen ? (
        <div className="w-80 sm:w-96 h-[500px] bg-white shadow-2xl rounded-2xl flex flex-col border border-slate-200 overflow-hidden shadow-brand-blue/20">
          <div className="bg-brand-blue p-4 text-white flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Bot size={18} className="text-brand-green" /> REDUNDÂNCIA IA
            </div>
            <button onClick={() => setIsOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 font-sans"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`p-3 rounded-xl text-sm max-w-[85%] ${
                    m.role === "user"
                      ? "bg-brand-blue text-white"
                      : "bg-white border border-slate-200"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-[10px] text-slate-400 animate-pulse font-bold uppercase tracking-widest">
                Processando...
              </div>
            )}
          </div>

          <div className="p-3 border-t bg-white flex gap-2">
            <input
              className="flex-1 text-sm p-2 bg-slate-100 rounded-lg outline-none focus:ring-1 focus:ring-brand-blue"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Digite aqui..."
            />
            <button
              onClick={handleSend}
              className="bg-brand-blue text-white p-2 rounded-lg hover:bg-opacity-90 transition-all"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-brand-blue p-4 rounded-full text-white shadow-xl hover:scale-110 transition-all border-2 border-white relative"
        >
          <MessageCircle size={24} />
          <span className="absolute top-0 right-0 w-3 h-3 bg-brand-green rounded-full border-2 border-white"></span>
        </button>
      )}
    </div>
  );
};

export default WebChatWidget;
