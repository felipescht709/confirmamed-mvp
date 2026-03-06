import React, { useState, useEffect } from "react";
import { useUnidade } from "../../../context/UnidadeContext";
import api from "../../../services/api";
import {
  Save,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  User,
} from "lucide-react";
import { toast } from "react-hot-toast";

const DIAS_SEMANA = [
  { id: 0, label: "Domingo" },
  { id: 1, label: "Segunda-feira" },
  { id: 2, label: "Terça-feira" },
  { id: 3, label: "Quarta-feira" },
  { id: 4, label: "Quinta-feira" },
  { id: 5, label: "Sexta-feira" },
  { id: 6, label: "Sábado" },
];

const GradeHoraria = () => {
  const { unidadeId } = useUnidade();
  const [profissionais, setProfissionais] = useState([]);
  const [selectedProfissional, setSelectedProfissional] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null); // ID do dia sendo salvo

  // Estado da grade (Objeto onde a chave é o dia da semana 0-6)
  const [grade, setGrade] = useState({});

  // 1. Carregar Profissionais da Unidade
  useEffect(() => {
    if (unidadeId) {
      api
        .get(`/profissionais/unidade/${unidadeId}`)
        .then((res) => {
          setProfissionais(res.data);
          // Seleciona o primeiro automaticamente se houver
          if (res.data.length > 0)
            setSelectedProfissional(res.data[0].id_profissional_saude);
        })
        .catch(() => toast.error("Erro ao carregar equipe."));
    }
  }, [unidadeId]);

  // 2. Carregar Configuração do Profissional Selecionado
  useEffect(() => {
    if (selectedProfissional && unidadeId) {
      setLoading(true);

      // Busca a configuração existente
      api
        .get(`/agenda/config`, {
          params: {
            profissional_id: selectedProfissional,
            unidade_id: unidadeId,
          },
        })
        .then((res) => {
          // Cria um mapa padrão vazio
          const configMap = {};
          DIAS_SEMANA.forEach((d) => {
            configMap[d.id] = {
              ativo: false,
              hora_inicio: "08:00",
              hora_fim: "18:00",
              duracao_slot_minutos: 30,
              id_config_agenda: null, // Se null, é create. Se tem ID, é update.
            };
          });

          // Preenche com o que veio do banco
          res.data.forEach((conf) => {
            configMap[conf.dia_semana] = {
              ativo: conf.ativo,
              // Corta os segundos (08:00:00 -> 08:00) para o input type="time" aceitar
              hora_inicio: conf.hora_inicio?.slice(0, 5) || "08:00",
              hora_fim: conf.hora_fim?.slice(0, 5) || "18:00",
              duracao_slot_minutos: conf.duracao_slot_minutos || 30,
              id_config_agenda: conf.id_config_agenda,
            };
          });
          setGrade(configMap);
        })
        .catch((err) => {
          console.error(err);
          toast.error("Erro ao carregar grade horária.");
        })
        .finally(() => setLoading(false));
    }
  }, [selectedProfissional, unidadeId]);

  // Atualiza o estado local ao digitar
  const handleChange = (dia, field, value) => {
    setGrade((prev) => ({
      ...prev,
      [dia]: { ...prev[dia], [field]: value },
    }));
  };

  // Salva a linha específica no banco
  const handleSave = async (dia) => {
    const config = grade[dia];

    // Validação básica
    if (config.ativo && config.hora_inicio >= config.hora_fim) {
      toast.error("A hora de início deve ser menor que a hora fim.");
      return;
    }

    const payload = {
      profissional_id: selectedProfissional,
      unidade_id: unidadeId,
      dia_semana: dia,
      hora_inicio: config.hora_inicio,
      hora_fim: config.hora_fim,
      duracao_slot_minutos: config.duracao_slot_minutos,
      ativo: config.ativo,
    };

    setSavingId(dia);
    try {
      if (config.id_config_agenda) {
        // Update
        await api.put(`/agenda/config/${config.id_config_agenda}`, payload);
      } else {
        // Create
        const res = await api.post("/agenda/config", payload);
        // Atualiza o ID localmente para futuros updates sem recarregar tela
        handleChange(dia, "id_config_agenda", res.data.id_config_agenda);
      }
      toast.success("Horário salvo!");
    } catch (error) {
      toast.error(error.response?.data?.error || "Erro ao salvar.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Seletor de Profissional */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="text-brand-blue" size={20} />
            Definição de Turnos
          </h2>
          <p className="text-sm text-slate-500">
            Escolha o profissional para configurar seus dias de atendimento.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto bg-slate-50 p-2 rounded-lg border border-slate-200">
          <User size={18} className="text-slate-400 ml-2" />
          <select
            className="bg-transparent border-none text-slate-700 text-sm font-semibold focus:ring-0 w-full md:w-64 cursor-pointer"
            value={selectedProfissional}
            onChange={(e) => setSelectedProfissional(e.target.value)}
            disabled={profissionais.length === 0}
          >
            {profissionais.length === 0 && (
              <option>Nenhum profissional cadastrado</option>
            )}
            {profissionais.map((p) => (
              <option
                key={p.id_profissional_saude}
                value={p.id_profissional_saude}
              >
                {p.nome_completo} - {p.especialidade}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid de Dias */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-6 h-6 border-2 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm">Carregando horários...</span>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {/* Cabeçalho da Tabela */}
            <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <div className="col-span-3 md:col-span-2">Dia / Status</div>
              <div className="col-span-9 md:col-span-10 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>Início</div>
                <div>Fim</div>
                <div>Duração (min)</div>
                <div className="text-right">Ação</div>
              </div>
            </div>

            {/* Linhas */}
            {DIAS_SEMANA.map((dia) => {
              const config = grade[dia.id] || {};
              const isAtivo = config.ativo;

              return (
                <div
                  key={dia.id}
                  className={`grid grid-cols-12 gap-4 p-4 items-center transition-all duration-300 ${isAtivo ? "bg-white" : "bg-slate-50/50 grayscale opacity-80"}`}
                >
                  {/* Coluna Dia + Toggle */}
                  <div className="col-span-3 md:col-span-2 flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={isAtivo}
                        onChange={(e) =>
                          handleChange(dia.id, "ativo", e.target.checked)
                        }
                      />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-blue"></div>
                    </label>
                    <span
                      className={`text-sm font-semibold ${isAtivo ? "text-slate-700" : "text-slate-400"}`}
                    >
                      {dia.label.split("-")[0]}
                    </span>
                  </div>

                  {/* Inputs */}
                  <div className="col-span-9 md:col-span-10 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                    <div className="relative">
                      <input
                        type="time"
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-brand-blue focus:border-brand-blue block p-2 disabled:cursor-not-allowed"
                        value={config.hora_inicio}
                        onChange={(e) =>
                          handleChange(dia.id, "hora_inicio", e.target.value)
                        }
                        disabled={!isAtivo}
                      />
                    </div>
                    <div className="relative">
                      <input
                        type="time"
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-brand-blue focus:border-brand-blue block p-2 disabled:cursor-not-allowed"
                        value={config.hora_fim}
                        onChange={(e) =>
                          handleChange(dia.id, "hora_fim", e.target.value)
                        }
                        disabled={!isAtivo}
                      />
                    </div>
                    <div className="relative flex items-center">
                      <Clock
                        size={16}
                        className="absolute left-3 text-slate-400"
                      />
                      <select
                        className="w-full pl-9 bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-brand-blue focus:border-brand-blue block p-2 disabled:cursor-not-allowed appearance-none"
                        value={config.duracao_slot_minutos}
                        onChange={(e) =>
                          handleChange(
                            dia.id,
                            "duracao_slot_minutos",
                            parseInt(e.target.value),
                          )
                        }
                        disabled={!isAtivo}
                      >
                        <option value={15}>15 min</option>
                        <option value={20}>20 min</option>
                        <option value={30}>30 min (Padrão)</option>
                        <option value={40}>40 min</option>
                        <option value={45}>45 min</option>
                        <option value={60}>1 hora</option>
                      </select>
                    </div>

                    {/* Botão Salvar */}
                    <div className="text-right">
                      <button
                        onClick={() => handleSave(dia.id)}
                        disabled={savingId === dia.id || !selectedProfissional}
                        className={`inline-flex items-center justify-center p-2 rounded-lg transition-all shadow-sm ${
                          isAtivo
                            ? "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md"
                            : "bg-white border border-slate-200 text-slate-400 hover:text-slate-600"
                        }`}
                        title="Salvar alterações deste dia"
                      >
                        {savingId === dia.id ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                          <Save size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default GradeHoraria;
