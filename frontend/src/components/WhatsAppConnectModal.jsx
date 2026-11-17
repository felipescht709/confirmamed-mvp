// src/components/WhatsAppConnectModal.jsx
import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function WhatsAppConnectModal({ isOpen, onClose, unidade }) {
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (isOpen && unidade) {
      setSuccess("");
      setError("");
      setQrCode(null);
      conectarInstancia();
    }
  }, [isOpen, unidade]);

  // Efeito para verificar o status da conexão periodicamente (polling)
  useEffect(() => {
    let interval;
    if (isOpen && qrCode && !loading && !success) {
      const checkStatus = async () => {
        try {
          const response = await api.get("/whatsapp/status");
          if (response.data.connected || response.data.state === "open") {
            setSuccess("WhatsApp conectado com sucesso!");
            setQrCode(null);
            clearInterval(interval);
            setTimeout(() => {
              onClose();
            }, 2000);
          }
        } catch (err) {
          console.error("Erro ao verificar status do WhatsApp:", err);
        }
      };

      interval = setInterval(checkStatus, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, qrCode, loading, success, onClose]);

  const conectarInstancia = async (force = false) => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.post(`/whatsapp/connect${force ? "?force=true" : ""}`, {
        id_unidade: unidade.id_unidade,
      });

      if (response.data.qrcode) {
        setQrCode(response.data.qrcode);
      } else if (response.data.state === "open") {
        setSuccess("WhatsApp conectado com sucesso!");
        setQrCode(null);
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(response.data.error || "Aguardando resposta da Evolution...");
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || "Erro ao gerar QR Code.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-96 text-center">
        <h2 className="text-xl font-display font-bold text-slate-800 dark:text-slate-100 mb-4">
          Conectar WhatsApp
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Lê o QR Code com o telemóvel da clínica:{" "}
          <b className="text-slate-800 dark:text-slate-200">{unidade.nome_fantasia}</b>
        </p>

        {loading ? (
          <div className="my-8 animate-pulse text-brand-blue font-semibold">
            A gerar QR Code...
          </div>
        ) : success ? (
          <div className="my-8 text-emerald-600 dark:text-emerald-400 font-bold flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xl font-bold animate-bounce">
              ✓
            </div>
            <span>{success}</span>
          </div>
        ) : error ? (
          <div className="my-8">
            <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>
            <button
              onClick={() => conectarInstancia(true)}
              className="text-xs text-brand-blue underline hover:text-brand-accent font-semibold cursor-pointer"
            >
              Forçar reset da instância e tentar novamente
            </button>
          </div>
        ) : (
          qrCode && (
            <div className="flex flex-col items-center">
              <img
                src={qrCode}
                alt="WhatsApp QR Code"
                className="mx-auto mb-4 w-64 h-64 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 bg-white"
              />
              <span className="text-xs text-slate-400 dark:text-slate-500 animate-pulse font-medium">
                Aguardando leitura do código...
              </span>
            </div>
          )
        )}

        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={onClose}
            className="bg-slate-150 dark:bg-slate-800 text-slate-700 dark:text-slate-350 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            Fechar
          </button>
          {!loading && !qrCode && !success && (
            <button
              onClick={() => conectarInstancia(false)}
              className="bg-brand-blue text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-brand-accent transition cursor-pointer"
            >
              Tentar Novamente
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
