import React from "react";
import { User, Clock, CheckCircle, XCircle, AlertCircle, Lock } from "lucide-react";
import moment from 'moment';

const CustomAgendaEvent = ({ event }) => {
  const { resource, title } = event;
  const isBlock = resource?.type === "BLOQUEIO";

  // Ícones e cores baseados no status
  const getStatusIcon = () => {
    if (isBlock) return <Lock size={12} className="text-slate-400" />;
    
    switch (resource?.status) {
      case "CONFIRMADO": return <CheckCircle size={12} className="text-emerald-100" />;
      case "CANCELADO": return <XCircle size={12} className="text-red-100" />;
      case "EM_ATENDIMENTO": return <Clock size={12} className="text-amber-100 animate-pulse" />;
      default: return <AlertCircle size={12} className="text-blue-100" />; // Agendado
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
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] font-bold opacity-90 truncate flex-1">
          {moment(event.start).format("HH:mm")}
        </span>
        {getStatusIcon()}
      </div>
      
      <div className="flex items-center gap-1 font-semibold text-[11px] truncate">
        <User size={10} className="opacity-70 min-w-[10px]" />
        <span className="truncate">{title.split(" - ")[0]}</span>
      </div>
      
      <div className="text-[9px] opacity-80 truncate pl-3.5">
        {title.split(" - ")[1] || "Consulta"}
      </div>
    </div>
  );
};

export default CustomAgendaEvent;