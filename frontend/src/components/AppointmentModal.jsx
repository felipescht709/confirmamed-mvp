// src/components/AppointmentModal.jsx
import React, { useState, useEffect, useContext, useMemo } from "react";
import {
  X,
  Clock,
  User,
  Activity,
  Calendar as CalendarIcon,
  AlertTriangle,
  CheckCircle2,
  Timer,
  CreditCard,
  FileText,
  PlusCircle,
} from "lucide-react";
import AsyncSelect from "react-select/async";
import { components } from "react-select";
import api from "../services/api";
import { UnidadeContext } from "../context/UnidadeContext";
import moment from "moment";
import { toast } from "react-hot-toast";

// Importação correta do Modal de Pacientes
import ModalPaciente from "../pages/pacientes/ModalPaciente";

const AppointmentModal = ({ appointment, initialSlot, onClose, onSave }) => {
  const { unidadeId } = useContext(UnidadeContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Controle do Modal de Pacientes (Nested Modal)
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [profissionais, setProfissionais] = useState([]);
  const [procedimentos, setProcedimentos] = useState([]);
  const [slots, setSlots] = useState([]);

  // Estado visual do Select
  const [selectedPatient, setSelectedPatient] = useState(
    appointment?.paciente_id
      ? {
          value: appointment.paciente_id,
          label:
            appointment.paciente_nome || `Paciente #${appointment.paciente_id}`,
        }
      : null,
  );

  const [formData, setFormData] = useState({
    paciente_id: appointment?.paciente_id || "",
    profissional_id: appointment?.profissional_id || "",
    id_procedimento: appointment?.id_procedimento || "",
    tipo_pagamento: appointment?.tipo_pagamento || "PARTICULAR",
    id_convenio_plano: appointment?.id_convenio_plano || "",
    telemedicina: appointment?.telemedicina || false,
    observacoes: appointment?.observacoes || "",
    data: initialSlot
      ? moment(initialSlot.start).format("YYYY-MM-DD")
      : appointment
        ? moment(appointment.start).format("YYYY-MM-DD")
        : moment().format("YYYY-MM-DD"),
    hora: initialSlot
      ? moment(initialSlot.start).format("HH:mm")
      : appointment
        ? moment(appointment.start).format("HH:mm")
        : "",
  });

  // --- CARREGAMENTO DE DADOS ---
  useEffect(() => {
    if (unidadeId) {
      api
        .get(`/profissionais/unidade/${unidadeId}`)
        .then((res) => setProfissionais(res.data));
      api
        .get(`/procedimentos/unidade/${unidadeId}`)
        .then((res) => setProcedimentos(res.data));
    }
  }, [unidadeId]);

  // --- BUSCA DE SLOTS (Disponibilidade) ---
  useEffect(() => {
    if (formData.profissional_id && formData.data) {
      setSlots([]);
      api
        .get(`/agenda/disponibilidade`, {
          params: {
            profissional_id: formData.profissional_id,
            unidade_id: unidadeId,
            data: formData.data,
          },
        })
        .then((res) => {
          const availableSlots = res.data.slots || [];
          // Se for hoje, filtra horários passados
          if (moment(formData.data).isSame(moment(), "day")) {
            const now = moment().add(5, "minutes");
            const filtered = availableSlots.filter((s) =>
              moment(s.start).isAfter(now),
            );
            setSlots(filtered);
          } else {
            setSlots(availableSlots);
          }
        })
        .catch((err) => console.error(err));
    }
  }, [formData.profissional_id, formData.data, unidadeId]);

  // --- CÁLCULO DE PREVISÃO DE TÉRMINO ---
  const infoProcedimento = useMemo(() => {
    const proc = procedimentos.find(
      (p) => p.id_procedimento === parseInt(formData.id_procedimento),
    );
    if (!proc || !formData.hora) return null;
    const inicio = moment(`${formData.data}T${formData.hora}`);
    const fim = inicio.clone().add(proc.duracao_minutos, "minutes");
    return { duracao: proc.duracao_minutos, horarioFim: fim.format("HH:mm") };
  }, [formData.id_procedimento, formData.hora, procedimentos, formData.data]);

  // --- COMPONENTE CUSTOMIZADO PARA SELECT (Botão de Criar) ---
  const CustomNoOptionsMessage = (props) => {
    return (
      <components.NoOptionsMessage {...props}>
        <div className="flex flex-col items-center gap-2 py-2">
          <span className="text-slate-500 text-xs">
            Paciente não encontrado.
          </span>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowPatientModal(true); // Abre o modal de criação
            }}
            className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-md hover:bg-indigo-100 font-bold border border-indigo-200 transition-colors"
          >
            <PlusCircle size={14} />
            Cadastrar "{searchTerm}"
          </button>
        </div>
      </components.NoOptionsMessage>
    );
  };

  const loadPacientesOptions = async (inputValue) => {
    setSearchTerm(inputValue);
    try {
      const { data } = await api.get(`/pacientes`, {
        params: { search: inputValue },
      });
      return data.map((p) => ({
        value: p.id_paciente,
        label: `${p.nome} ${p.cpf ? `- CPF: ${p.cpf}` : ""}`,
      }));
    } catch (e) {
      return [];
    }
  };

  // --- CALLBACK DE SUCESSO (Ao criar paciente) ---
  const handlePatientCreated = (novoPaciente) => {
    // 1. Define o paciente recém-criado no Select
    const newOption = {
      value: novoPaciente.id_paciente,
      label: novoPaciente.nome,
    };
    setSelectedPatient(newOption);
    setFormData((prev) => ({ ...prev, paciente_id: novoPaciente.id_paciente }));

    // 2. Fecha o modal de paciente
    setShowPatientModal(false);
    toast.success(`Paciente ${novoPaciente.nome} selecionado!`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.paciente_id || !formData.id_procedimento || !formData.hora) {
      return toast.error("Preencha todos os campos obrigatórios.");
    }
    setLoading(true);
    setError(null);
    try {
      const proc = procedimentos.find(
        (p) => p.id_procedimento === parseInt(formData.id_procedimento),
      );
      const dataInicio = moment(`${formData.data}T${formData.hora}:00`);
      const duracao = proc?.duracao_minutos || 30;
      const dataFim = dataInicio.clone().add(duracao, "minutes");

      const payload = {
        ...formData,
        unidade_id: unidadeId,
        data_hora_inicio: dataInicio.format(),
        data_hora_fim: dataFim.format(),
        status: appointment?.status || "AGENDADO",
        id_convenio_plano: formData.id_convenio_plano || null,
        tipo_pagamento: formData.tipo_pagamento || "PARTICULAR",
        observacoes: formData.observacoes || null,
      };

      if (appointment) {
        await api.put(
          `/consultas/${appointment.id_consulta || appointment.id}`,
          payload,
        );
        toast.success("Agendamento atualizado!");
      } else {
        await api.post("/consultas", payload);
        toast.success("Consulta agendada com sucesso!");
      }
      onSave(); // Fecha o modal principal e recarrega a agenda
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao salvar agendamento.");
    } finally {
      setLoading(false);
    }
  };

  const morningSlots = slots.filter(
    (s) => parseInt(s.start.split("T")[1]) < 12,
  );
  const afternoonSlots = slots.filter(
    (s) => parseInt(s.start.split("T")[1]) >= 12,
  );

  return (
    <>
      {/* MODAL PRINCIPAL DE AGENDAMENTO */}
      <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[50] p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col max-h-[95vh]">
          {/* Header */}
          <div className="flex justify-between items-center px-6 py-4 bg-slate-50 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                {appointment ? "Editar Agendamento" : "Novo Agendamento"}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Configure os detalhes da consulta abaixo
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
            >
              <X size={20} />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="overflow-y-auto p-6 space-y-5 flex-1 custom-scrollbar"
          >
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <div>{error}</div>
              </div>
            )}

            {/* SELEÇÃO DE PACIENTE INTELIGENTE */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                <User size={14} className="text-indigo-500" /> Paciente{" "}
                <span className="text-red-500">*</span>
              </label>
              <AsyncSelect
                cacheOptions
                defaultOptions
                loadOptions={loadPacientesOptions}
                value={selectedPatient}
                components={{ NoOptionsMessage: CustomNoOptionsMessage }}
                onChange={(opt) => {
                  setSelectedPatient(opt);
                  setFormData({ ...formData, paciente_id: opt?.value });
                }}
                placeholder="Digite nome ou CPF..."
                className="text-sm"
                loadingMessage={() => "Buscando..."}
                isClearable
              />
            </div>

            {/* CAMPOS DE PROFISSIONAL E PROCEDIMENTO */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                  <Activity size={14} className="text-indigo-500" />{" "}
                  Profissional
                </label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.profissional_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      profissional_id: e.target.value,
                    })
                  }
                  required
                >
                  <option value="">Selecione...</option>
                  {profissionais.map((p) => (
                    <option
                      key={p.id_profissional_saude}
                      value={p.id_profissional_saude}
                    >
                      {p.nome_completo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                  <Timer size={14} className="text-indigo-500" /> Procedimento
                </label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.id_procedimento}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      id_procedimento: e.target.value,
                    })
                  }
                  required
                >
                  <option value="">Selecione...</option>
                  {procedimentos.map((proc) => (
                    <option
                      key={proc.id_procedimento}
                      value={proc.id_procedimento}
                    >
                      {proc.nome_procedimento}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* DADOS FINANCEIROS */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                  <CreditCard size={14} className="text-indigo-500" /> Pagamento
                </label>
                <select
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.tipo_pagamento}
                  onChange={(e) =>
                    setFormData({ ...formData, tipo_pagamento: e.target.value })
                  }
                >
                  <option value="PARTICULAR">Particular</option>
                  <option value="CONVENIO">Convênio</option>
                  <option value="RETORNO">Retorno</option>
                </select>
              </div>
              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                    checked={formData.telemedicina}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        telemedicina: e.target.checked,
                      })
                    }
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Telemedicina
                  </span>
                </label>
              </div>
            </div>

            {formData.tipo_pagamento === "CONVENIO" && (
              <div className="space-y-1.5 animate-in slide-in-from-top-2">
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Código do Convênio
                </label>
                <input
                  type="number"
                  placeholder="ID do Plano"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm"
                  value={formData.id_convenio_plano}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      id_convenio_plano: e.target.value,
                    })
                  }
                />
              </div>
            )}

            {/* OBSERVAÇÕES */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                <FileText size={14} className="text-indigo-500" /> Observações
              </label>
              <textarea
                rows={2}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                placeholder="Ex: Paciente prefere atendimento na sala 2..."
                value={formData.observacoes}
                onChange={(e) =>
                  setFormData({ ...formData, observacoes: e.target.value })
                }
              />
            </div>

            <hr className="border-slate-100" />

            {/* DATA E HORA */}
            <div className="flex gap-4">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                  <CalendarIcon size={14} className="text-indigo-500" /> Data
                </label>
                <input
                  type="date"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.data}
                  min={moment().format("YYYY-MM-DD")}
                  onChange={(e) =>
                    setFormData({ ...formData, data: e.target.value })
                  }
                />
              </div>
              {infoProcedimento && formData.hora && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-2 flex flex-col justify-center min-w-[140px]">
                  <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
                    Previsão
                  </span>
                  <span className="text-sm font-bold text-indigo-700 flex items-center gap-1">
                    {formData.hora} <Clock size={12} />{" "}
                    {infoProcedimento.horarioFim}
                  </span>
                  <span className="text-[9px] text-indigo-500 italic">
                    {infoProcedimento.duracao} min de duração
                  </span>
                </div>
              )}
            </div>

            {/* SLOTS DE HORÁRIO */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                <CheckCircle2 size={14} className="text-indigo-500" /> Horários
                Disponíveis
              </label>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 max-h-40 overflow-y-auto custom-scrollbar">
                {slots.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs italic">
                    {formData.profissional_id
                      ? "Nenhum horário livre."
                      : "Selecione o profissional."}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {morningSlots.length > 0 && (
                      <>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          Manhã
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {morningSlots.map((s) => {
                            const h = moment(s.start).format("HH:mm");
                            return (
                              <button
                                key={s.start}
                                type="button"
                                onClick={() =>
                                  setFormData({ ...formData, hora: h })
                                }
                                className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                                  formData.hora === h
                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-400"
                                }`}
                              >
                                {h}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                    {afternoonSlots.length > 0 && (
                      <>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">
                          Tarde
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {afternoonSlots.map((s) => {
                            const h = moment(s.start).format("HH:mm");
                            return (
                              <button
                                key={s.start}
                                type="button"
                                onClick={() =>
                                  setFormData({ ...formData, hora: h })
                                }
                                className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                                  formData.hora === h
                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-400"
                                }`}
                              >
                                {h}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </form>

          {/* FOOTER */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-200 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading || !formData.hora || !formData.paciente_id}
              className="px-6 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-200 flex items-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : appointment ? (
                "Salvar Alterações"
              ) : (
                "Confirmar Agendamento"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* RENDERIZAÇÃO CONDICIONAL DO MODAL DE PACIENTE SOBREPOSTO */}
      {showPatientModal && (
        <ModalPaciente
          isOpen={showPatientModal}
          onClose={() => setShowPatientModal(false)}
          onRefresh={handlePatientCreated} // Correção: onRefresh em vez de onSave
          initialName={searchTerm}
          isNested={true}
        />
      )}
    </>
  );
};

export default AppointmentModal;
