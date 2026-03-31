// src/components/ConfigLembretes.jsx
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

export default function ConfigLembretes({ unidade }) {
  // Estado que guarda as horas ativas. Ex: [24, 2]
  const [horasAtivas, setHorasAtivas] = useState([]);
  const [loading, setLoading] = useState(false);

  // Opções premium que vamos vender
  const opcoesLembrete = [
    { label: "2 Dias antes (48h)", valor: 48 },
    { label: "Véspera (24h)", valor: 24 },
    { label: "No dia (2h antes)", valor: 2 }
  ];

  useEffect(() => {
    if (unidade && unidade.lembretes_config_horas) {
      setHorasAtivas(unidade.lembretes_config_horas);
    }
  }, [unidade]);

  const toggleHora = (valor) => {
    setHorasAtivas(prev => 
      prev.includes(valor) 
        ? prev.filter(h => h !== valor) // Remove
        : [...prev, valor] // Adiciona
    );
  };

  const salvarConfiguracao = async () => {
    setLoading(true);
    try {
      // Atualiza a unidade no backend
      await api.put(`/unidades/${unidade.id_unidade}`, {
        lembretes_config_horas: horasAtivas
      });
      toast.success("Regras de lembrete atualizadas! O robô já vai seguir esses horários.");
    } catch (error) {
      toast.error("Erro ao salvar configurações.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-md">
      <h3 className="text-lg font-bold text-slate-800 mb-1">Motor de Lembretes Automáticos</h3>
      <p className="text-sm text-slate-500 mb-6">Escolha quando o robô deve tentar confirmar a consulta com o paciente.</p>

      <div className="space-y-4 mb-6">
        {opcoesLembrete.map(opcao => (
          <label key={opcao.valor} className="flex items-center justify-between cursor-pointer group">
            <span className="text-sm font-medium text-slate-700 group-hover:text-brand-blue transition-colors">
              {opcao.label}
            </span>
            <div className={`w-11 h-6 rounded-full transition-colors flex items-center px-1 ${
              horasAtivas.includes(opcao.valor) ? "bg-emerald-500" : "bg-slate-300"
            }`}>
              <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${
                horasAtivas.includes(opcao.valor) ? "translate-x-5" : "translate-x-0"
              }`} />
            </div>
            {/* Input escondido para acessibilidade */}
            <input 
              type="checkbox" 
              className="hidden" 
              checked={horasAtivas.includes(opcao.valor)} 
              onChange={() => toggleHora(opcao.valor)} 
            />
          </label>
        ))}
      </div>

      <button 
        onClick={salvarConfiguracao} 
        disabled={loading}
        className="w-full bg-brand-blue text-white py-3 rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50"
      >
        {loading ? "Salvando..." : "Salvar Automações"}
      </button>
    </div>
  );
}