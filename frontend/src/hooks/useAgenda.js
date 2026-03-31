//hooks/useAgenda.js
import { useState, useEffect, useCallback, useRef } from "react";
import { useUnidade } from "../context/UnidadeContext.jsx";
import api from "../services/api";
import moment from "moment";

export const useAgenda = () => {
  const { unidadeId } = useUnidade();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [profissionais, setProfissionais] = useState([]);

  // Filtros persistentes na sessão (opcional, aqui mantive state simples)
  const [filters, setFilters] = useState({
    profissional_id: "todos",
    date: new Date(),
    view: "week",
  });

  // Ref para evitar loops infinitos no setInterval
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // Carrega lista de profissionais
  useEffect(() => {
    if (unidadeId) {
      api
        .get(`/profissionais/unidade/${unidadeId}`)
        .then((res) => setProfissionais(res.data))
        .catch((err) => console.error("Erro ao carregar equipe:", err));
    }
  }, [unidadeId]);

  const fetchAgenda = useCallback(
    async (isBackground = false) => {
      if (!unidadeId) return;
      if (!isBackground) setLoading(true);

      try {
        const currentFilters = filtersRef.current;
        const start = moment(currentFilters.date)
          .startOf("month")
          .subtract(7, "days")
          .toISOString();
        const end = moment(currentFilters.date)
          .endOf("month")
          .add(7, "days")
          .toISOString();

        const params = {
          unidade_id: unidadeId,
          start,
          end,
          profissional_id:
            currentFilters.profissional_id !== "todos"
              ? currentFilters.profissional_id
              : undefined,
        };

        const [resConsultas, resBloqueios] = await Promise.all([
          api.get("/consultas", { params }),
          api.get("/agenda/bloqueios", {
            params: {
              unidade_id: unidadeId,
              profissional_id: params.profissional_id,
            },
          }),
        ]);

        const consultasMap = resConsultas.data.map((evt) => ({
          id: evt.id_consulta,
          paciente_id: evt.paciente_id,
          profissional_id: evt.profissional_id,
          id_procedimento: evt.id_procedimento,
          status: evt.status,
          title: `${evt.paciente_nome} - ${evt.procedimento_nome || "Consulta"}`,
          start: new Date(evt.data_hora_inicio),
          end: new Date(evt.data_hora_fim),
          resource: {
            type: "CONSULTA",
            status: evt.status,
            profissional_nome: evt.profissional_nome,
            paciente_nome: evt.paciente_nome,
          },
        }));

        const bloqueiosMap = resBloqueios.data.map((blq) => ({
          id: `blq-${blq.id_bloqueio}`,
          title: `BLOQUEIO: ${blq.motivo || "Ausência"}`,
          start: new Date(blq.data_inicio),
          end: new Date(blq.data_fim),
          allDay: blq.bloqueio_dia_inteiro,
          resource: { type: "BLOQUEIO", status: "BLOQUEADO" },
        }));

        setEvents([...consultasMap, ...bloqueiosMap]);
      } catch (error) {
        console.error("Erro ao sincronizar agenda:", error);
      } finally {
        if (!isBackground) setLoading(false);
      }
    },
    [unidadeId],
  );

  // Busca inicial e quando filtros mudam
  useEffect(() => {
    fetchAgenda();
  }, [fetchAgenda, filters.date, filters.profissional_id, filters.view]);

  // Polling: Atualiza a agenda a cada 30 segundos silenciosamente
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAgenda(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchAgenda]);

  return {
    events,
    loading,
    filters,
    setFilters,
    profissionais,
    refreshAgenda: () => fetchAgenda(false),
  };
};
