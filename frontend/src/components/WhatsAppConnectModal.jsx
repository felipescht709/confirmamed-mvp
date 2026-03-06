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

  const conectarInstancia = async () => {
    setLoading(true);
    setError("");
    try {
      // Endpoint que deves criar no Backend para bater na EvolutionAPI
      const response = await api.post("/whatsapp/connect", {
        id_unidade: unidade.id_unidade,
      });

      // A Evolution devolve o QR Code em base64
      if (response.data.qrcode) {
        setQrCode(response.data.qrcode);
      } else {
        setError("QR Code não retornado. A instância já pode estar conectada.");
      }
    } catch (err) {
      console.error(err);
      setError(
        "Erro ao gerar QR Code. Verifica se a EvolutionAPI está a correr.",
      );
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
          <div className="my-8 text-red-600">{error}</div>
        ) : (
          qrCode && (
            <img
              src={qrCode}
              alt="WhatsApp QR Code"
              className="mx-auto mb-4 w-64 h-64"
            />
          )
        )}

        <button
          onClick={onClose}
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
