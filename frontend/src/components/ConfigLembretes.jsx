// src/components/ConfigLembretes.jsx
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { Bell, Clock, CheckCircle2, Loader2 } from 'lucide-react';

export default function ConfigLembretes({ unidade }) {
  // Estado que guarda as horas ativas. Ex: [48, 24, 2]
  const [horasAtivas, setHorasAtivas] = useState([24]);
  const [loading, setLoading] = useState(false);

  // Opções de régua de disparos proativos
  const opcoesLembrete = [
    { label: "Antecedência de 2 Dias (48h)", descricao: "Primeira checagem de confirmação ativa via WhatsApp", valor: 48 },
    { label: "Véspera do Procedimento (24h)", descricao: "Confirmação mandatória e orientação de comparecimento", valor: 24 },
    { label: "No Dia - Lembrete (2h antes)", descricao: "Aviso de reforço para pontualidade e endereço da unidade", valor: 2 }
  ];

  useEffect(() => {
    if (unidade && Array.isArray(unidade.lembretes_config_horas) && unidade.lembretes_config_horas.length > 0) {
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
    if (!unidade?.id_unidade) {
      toast.error("Nenhuma unidade selecionada.");
      return;
    }
    setLoading(true);
    try {
      await api.put(`/unidades/${unidade.id_unidade}`, {
        lembretes_config_horas: horasAtivas
      });
      toast.success("Régua de lembretes atualizada com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar lembretes:", error);
      toast.error("Erro ao salvar configurações de lembrete.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-slate-800 flex items-center gap-2">
          <div className="p-2 bg-brand-blue/10 rounded-lg text-brand-blue">
            <Bell size={20} />
          </div>
          Régua de Lembretes & Confirmações Automáticas
        </h3>

      </div>

      <p className="text-sm text-slate-500">
        Defina os momentos em que o robô envia mensagens automáticas no WhatsApp para confirmar presenças e reduzir vagas ociosas.
      </p>

      <div className="space-y-3 pt-1">
        {opcoesLembrete.map(opcao => {
          const isAtivo = horasAtivas.includes(opcao.valor);
          return (
            <label
              key={opcao.valor}
              onClick={() => toggleHora(opcao.valor)}
              className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${isAtivo
                ? "border-brand-blue/30 bg-blue-50/20 shadow-xs"
                : "border-slate-200/70 bg-slate-50/50 hover:bg-slate-50"
                }`}
            >
              <div className="space-y-0.5 pr-4">
                <span className="text-sm font-bold text-slate-800 block">
                  {opcao.label}
                </span>
                <span className="text-xs text-slate-400">
                  {opcao.descricao}
                </span>
              </div>

              <div className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 shrink-0 ${isAtivo ? "bg-emerald-500" : "bg-slate-300"
                }`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${isAtivo ? "translate-x-6" : "translate-x-0"
                  }`} />
              </div>
            </label>
          );
        })}
      </div>

      <div className="pt-2 flex justify-end">
        <button
          onClick={salvarConfiguracao}
          disabled={loading}
          className="bg-brand-blue text-white px-6 py-3 rounded-xl font-bold text-xs hover:bg-brand-accent transition-all flex items-center gap-2 shadow-md shadow-brand-blue/15 disabled:opacity-50 cursor-pointer"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
          {loading ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}