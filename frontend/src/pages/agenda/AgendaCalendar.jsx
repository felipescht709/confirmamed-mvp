// AgendaCalendar.jsx
import React, { useState, useMemo } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import moment from "moment";
import "moment/locale/pt-br";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import { useAgenda } from "../../hooks/useAgenda";
import AppointmentModal from "../../components/AppointmentModal";
import CustomAgendaEvent from "../../components/CustomAgendaEvent"; // Importe o novo componente
import { Plus, Filter, RefreshCw } from "lucide-react";

moment.locale("pt-br");
const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);

const AgendaCalendar = () => {
  const { events, filters, setFilters, profissionais, refreshAgenda, loading } =
    useAgenda();
  const [showModal, setShowModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Estilização dinâmica dos eventos
  const eventPropGetter = (event) => {
    const isBlock = event.resource?.type === "BLOQUEIO";
    const status = event.status || event.resource?.status;

    let className =
      "border-l-4 shadow-sm text-xs transition-all hover:brightness-95";
    let style = { color: "#fff" };

    if (isBlock) {
      style = {
        backgroundColor: "#f1f5f9", 
        color: "#64748b", 
        backgroundImage:
          "repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.05) 5px, rgba(0,0,0,0.05) 10px)",
        borderLeftColor: "#94a3b8",
      };
      return { className: "rounded-md border-none opacity-80", style };
    }

    // Cores baseadas no status (Tailwind palette)
    switch (status) {
      case "CONFIRMADO":
        style.backgroundColor = "#10b981"; // emerald-500
        style.borderLeftColor = "#064e3b"; // Emerald 900 
        break;
      case "CANCELADO":
        style.backgroundColor = "#ef4444"; // red-500
        style.borderLeftColor = "#7f1d1d"; // red-900
        break;
      case "EM_ATENDIMENTO":
        style.backgroundColor = "#f59e0b"; // amber-500
        style.borderLeftColor = "#78350f"; // amber-900
        break;
      case "AGENDADO":
      default:
        style.backgroundColor = "#3b82f6"; // blue-500
        style.borderLeftColor = "#1e3a8a"; // blue-900
        break;
    }

    return { className, style };
  };

  const handleSelectSlot = ({ start, end }) => {
    setSelectedEvent(null);
    setSelectedSlot({ start, end });
    setShowModal(true);
  };

  const handleSelectEvent = (event) => {
    if (event.resource?.type === "BLOQUEIO") return;
    setSelectedEvent(event);
    setSelectedSlot(null);
    setShowModal(true);
  };

  // Componentes customizados do calendário
  const components = useMemo(
    () => ({
      event: CustomAgendaEvent, // Usa nosso card bonitão
    }),
    [],
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 p-6 relative">
      {/* Loading Overlay Sutil */}
      {loading && (
        <div className="absolute top-0 left-0 w-full h-1 bg-indigo-100 overflow-hidden z-50">
          <div className="w-full h-full bg-indigo-600 origin-left animate-progress"></div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            Agenda Médica
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Gestão inteligente de disponibilidade
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filtro de Profissional */}
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors">
            <Filter size={16} className="text-indigo-500" />
            <select
              className="bg-transparent text-sm border-none focus:ring-0 text-slate-700 font-semibold cursor-pointer min-w-[180px]"
              value={filters.profissional_id}
              onChange={(e) =>
                setFilters({ ...filters, profissional_id: e.target.value })
              }
            >
              <option value="todos">Visão Geral (Todos)</option>
              {profissionais.map((p) => (
                <option
                  key={p.id_profissional_saude}
                  value={p.id_profissional_saude}
                >
                  Dr(a). {p.nome_completo}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={refreshAgenda}
            className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm"
            title="Atualizar Agenda"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>

          <button
            onClick={() => {
              setSelectedEvent(null);
              setSelectedSlot(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-all shadow-md font-semibold text-sm hover:shadow-lg hover:-translate-y-0.5"
          >
            <Plus size={18} /> Novo Agendamento
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <DnDCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={filters.view}
          onView={(v) => setFilters({ ...filters, view: v })}
          date={filters.date}
          onNavigate={(d) => setFilters({ ...filters, date: d })}
          selectable
          resizable={false} // MVP: sem resize por enquanto
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventPropGetter}
          components={components}
          step={15} // Precisão de 15 min
          timeslots={4} // 4 slots por hora (visualização)
          min={new Date(0, 0, 0, 7, 0, 0)} // Começa as 07:00
          max={new Date(0, 0, 0, 20, 0, 0)} // Termina as 20:00
          popup
          className="p-4 font-sans text-slate-600"
          messages={{
            next: "Próximo",
            previous: "Anterior",
            today: "Hoje",
            month: "Mês",
            week: "Semana",
            day: "Dia",
            noEventsInRange: "Nenhum agendamento neste período.",
          }}
        />
      </div>

      {showModal && (
        <AppointmentModal
          appointment={selectedEvent}
          initialSlot={selectedSlot}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            refreshAgenda();
          }}
        />
      )}
    </div>
  );
};

export default AgendaCalendar;
