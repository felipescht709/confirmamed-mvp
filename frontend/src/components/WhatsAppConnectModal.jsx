// src/components/WhatsAppConnectModal.jsx
import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function WhatsAppConnectModal({ isOpen, onClose, unidade }) {
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && unidade) {
      conectarInstancia();
    }
  }, [isOpen, unidade]);

  const conectarInstancia = async (force = false) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.post(`/whatsapp/connect${force ? "?force=true" : ""}`, {
        id_unidade: unidade.id_unidade,
      });

      if (response.data.qrcode) {
        setQrCode(response.data.qrcode);
      } else if (response.data.state === "open") {
        setError("WhatsApp já está conectado e pronto para uso!");
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
      <div className="bg-white p-6 rounded shadow-lg w-96 text-center">
        <h2 className="text-xl font-bold mb-4">Conectar WhatsApp</h2>
        <p className="text-sm text-gray-600 mb-4">
          Lê o QR Code com o telemóvel da clínica:{" "}
          <b>{unidade.nome_fantasia}</b>
        </p>

        {loading ? (
          <div className="my-8 animate-pulse text-blue-600 font-semibold">
            A gerar QR Code...
          </div>
        ) : error ? (
          <div className="my-8">
            <div className="text-red-600 mb-4">{error}</div>
            <button
              onClick={() => conectarInstancia(true)}
              className="text-xs text-blue-600 underline hover:text-blue-800"
            >
              Forçar reset da instância e tentar novamente
            </button>
          </div>
        ) : (
          qrCode && (
            <img
              src={qrCode}
              alt="WhatsApp QR Code"
              className="mx-auto mb-4 w-64 h-64"
            />
          )
        )}

        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={onClose}
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition"
          >
            Fechar
          </button>
          {!loading && !qrCode && (
             <button
             onClick={() => conectarInstancia(false)}
             className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
           >
             Tentar Novamente
           </button>
          )}
        </div>
      </div>
    </div>
  );
}
