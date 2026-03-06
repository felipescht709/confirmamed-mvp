import React, { createContext, useState, useContext, useEffect } from "react";
import api from "../services/api";
import { useAuth } from "./AuthContext";

export const UnidadeContext = createContext({});

export const UnidadeProvider = ({ children }) => {
  const [unidadeSelecionada, setUnidadeSelecionada] = useState(null);
  const [unidades, setUnidades] = useState([]);
  const [loadingUnidades, setLoadingUnidades] = useState(true);

  // Helper para o ID direto
  const unidadeId = unidadeSelecionada?.id_unidade || null;
  const { authenticated } = useAuth();
  useEffect(() => {
    async function loadUnidades() {
      const token = localStorage.getItem("token");
      if (!token || !authenticated) {
        // Adicionada checagem de authenticated
        setLoadingUnidades(false);
        return;
      }

      try {
        setLoadingUnidades(true);
        const { data } = await api.get("/unidades");
        setUnidades(data);

        // Tenta pegar o ID que o login acabou de salvar
        const savedId = localStorage.getItem("@ConfirmaMED:unidade_id");

        if (savedId) {
          const found = data.find((u) => u.id_unidade === Number(savedId));
          if (found) {
            setUnidadeSelecionada(found);
          } else if (data.length > 0) {
            mudarUnidade(data[0]);
          }
        } else if (data.length > 0) {
          mudarUnidade(data[0]);
        }
      } catch (error) {
        console.error("Erro ao carregar unidades:", error);
      } finally {
        setLoadingUnidades(false);
      }
    }

    loadUnidades();
  }, [authenticated]);

  const mudarUnidade = (unidade) => {
    if (!unidade) return;
    setUnidadeSelecionada(unidade);
    localStorage.setItem("@ConfirmaMED:unidade_id", unidade.id_unidade);
  };

  return (
    <UnidadeContext.Provider
      value={{
        unidadeSelecionada,
        unidadeId,
        unidades,
        loadingUnidades,
        mudarUnidade,
        isUnidadeSelected: !!unidadeSelecionada,
      }}
    >
      {children}
    </UnidadeContext.Provider>
  );
};

export const useUnidade = () => {
  const context = useContext(UnidadeContext);
  if (!context) {
    throw new Error("useUnidade deve ser usado dentro de um UnidadeProvider");
  }
  return context;
};
