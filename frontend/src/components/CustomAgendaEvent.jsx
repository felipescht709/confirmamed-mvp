// components/CustomAgendaEvent.jsx
import React from "react";
import {
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Lock,
} from "lucide-react";
import moment from "moment";

const CustomAgendaEvent = ({ event }) => {
  const { resource, title, start } = event;
  const isBlock = resource?.type === "BLOQUEIO";

  // GARANTIA: Busca o status do nível superior (ajustado no useAgenda)
  // ou do resource como fallback
  const status = event.status || resource?.status;

  // Ícones baseados no status real vindo do banco
  const getStatusIcon = () => {
    if (isBlock) return <Lock size={12} className="text-slate-400" />;

    switch (status) {
      case "CONFIRMADO":
        return <CheckCircle size={12} className="text-white" />; // Branco destaca mais no fundo verde
      case "CANCELADO":
        return <XCircle size={12} className="text-white" />;
      case "EM_ATENDIMENTO":
        return <Clock size={12} className="text-white animate-pulse" />;
      case "AGENDADO":
      default:
        return <AlertCircle size={12} className="text-white/80" />;
    }
  };

  if (isBlock) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-slate-100/10 p-1 text-slate-500 italic text-[10px] font-semibold tracking-wider">
        <Lock size={10} className="mr-1" /> BLOQUEADO
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full px-1.5 py-0.5 overflow-hidden leading-tight">
      {/* Header do Card: Horário + Ícone de Status */}
      <div className="flex items-center justify-between mb-0.5 border-b border-white/20 pb-0.5">
        <span className="text-[9px] font-black opacity-90 truncate">
          {moment(start).format("HH:mm")}
        </span>
        <div title={status}>{getStatusIcon()}</div>
      </div>

      {/* Corpo: Nome do Paciente (Destaque) */}
      <div className="flex items-center gap-1 font-bold text-[10px] truncate mt-0.5">
        <User size={9} className="opacity-70 shrink-0" />
        <span className="truncate uppercase">
          {resource?.paciente_nome || title.split(" - ")[0]}
        </span>
      </div>

      {/* Rodapé: Procedimento ou Profissional */}
      <div className="text-[8px] font-medium opacity-90 truncate pl-3 mt-auto">
        {resource?.profissional_nome
          ? `Dr(a). ${resource.profissional_nome.split(" ")[0]}`
          : "Consulta"}
      </div>
    </div>
  );
};

export default CustomAgendaEvent;
