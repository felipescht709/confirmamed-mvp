import React from "react";
import { X, Calendar, Clock, User, Phone, FileText, Edit, Activity } from "lucide-react";
import moment from "moment";

const ConsultaDetailsModal = ({ appointment, onClose, onEdit }) => {
  if (!appointment) return null;
  const { resource } = appointment;

  const renderStatus = () => {
    const statusConfirmacao = resource?.status_confirmacao || "PENDENTE";
    if (appointment.status === "AGENDADO") {
      switch (statusConfirmacao) {
        case "CONFIRMADO":
          return <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full text-xs font-bold">Confirmado</span>;
        case "CANCELADO":
          return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-bold">Cancelado via WhatsApp</span>;
        case "REAGENDAR":
          return <span className="bg-violet-100 text-violet-800 px-2 py-1 rounded-full text-xs font-bold">Solicitou Reagendamento</span>;
        default:
          return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-bold">Aguardando Confirmação</span>;
      }
    }
    return <span className="bg-slate-100 text-slate-800 px-2 py-1 rounded-full text-xs font-bold">{appointment.status}</span>;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 flex flex-col">
        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            Detalhes do Agendamento
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:bg-slate-200 p-1.5 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-600 font-semibold">
              <Calendar size={18} />
              <span>{moment(appointment.start).format("DD/MM/YYYY")}</span>
            </div>
            <div className="flex items-center gap-2 text-indigo-600 font-semibold bg-indigo-50 px-2 py-1 rounded-lg">
              <Clock size={16} />
              <span>{moment(appointment.start).format("HH:mm")} - {moment(appointment.end).format("HH:mm")}</span>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <div className="text-xs text-slate-500 font-bold uppercase mb-1">Status</div>
            {renderStatus()}
          </div>

          <div className="border-t border-slate-100 pt-3">
            <div className="text-xs text-slate-500 font-bold uppercase mb-1 flex items-center gap-1"><User size={14} /> Paciente</div>
            <div className="text-sm font-semibold text-slate-800">{resource?.paciente_nome}</div>
          </div>

          {resource?.solicitante_nome && (
            <div className="bg-orange-50 p-2 rounded-lg border border-orange-100">
              <div className="text-[10px] text-orange-600 font-bold uppercase mb-0.5 flex items-center gap-1"><Phone size={12} /> Solicitado por Terceiro</div>
              <div className="text-sm font-semibold text-orange-800">{resource.solicitante_nome}</div>
            </div>
          )}

          <div className="border-t border-slate-100 pt-3">
            <div className="text-xs text-slate-500 font-bold uppercase mb-1 flex items-center gap-1"><Activity size={14} /> Profissional</div>
            <div className="text-sm text-slate-700">Dr(a). {resource?.profissional_nome}</div>
          </div>

          {resource?.observacoes && (
            <div className="border-t border-slate-100 pt-3">
              <div className="text-xs text-slate-500 font-bold uppercase mb-1 flex items-center gap-1"><FileText size={14} /> Observações</div>
              <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 italic">
                {resource.observacoes}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Edit size={16} /> Editar Agendamento
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsultaDetailsModal;
