import React from "react";
import { useUnidade } from "../contexts/UnidadeContext";

const UnidadeSelector = () => {
  const { unidades, unidadeSelecionada, mudarUnidade, loadingUnidades } =
    useUnidade();

  if (loadingUnidades)
    return <div className="text-sm text-gray-500">Carregando unidades...</div>;

  if (unidades.length === 0)
    return <div className="text-sm text-red-500">Sem unidades vinculadas</div>;

  return (
    <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-md border border-gray-200">
      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
        Unidade:
      </span>
      <select
        className="bg-transparent font-semibold text-gray-700 outline-none cursor-pointer text-sm"
        value={unidadeSelecionada?.id || ""}
        onChange={(e) => {
          const id = Number(e.target.value);
          const unidade = unidades.find((u) => u.id === id);
          mudarUnidade(unidade);
        }}
      >
        {unidades.map((u) => (
          <option key={u.id} value={u.id}>
            {u.nome}
          </option>
        ))}
      </select>
    </div>
  );
};

export default UnidadeSelector;
