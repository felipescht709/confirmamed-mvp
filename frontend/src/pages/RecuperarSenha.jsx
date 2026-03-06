// src/pages/RecuperarSenha.jsx
import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Mail, Lock, Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../services/api";

export default function RecuperarSenha() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Se existir "?token=" na URL, estamos na fase de redefinição
  const tokenUrl = searchParams.get("token");
  
  const [fase, setFase] = useState(tokenUrl ? "REDEFINIR" : "SOLICITAR");
  const [loading, setLoading] = useState(false);
  const [sucessoMsg, setSucessoMsg] = useState("");

  // States para os forms
  const [email, setEmail] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");

  // FASE 1: Solicitar Link
  const handleSolicitar = async (e) => {
    e.preventDefault();
    if (!email) return toast.error("Informe seu e-mail.");

    setLoading(true);
    try {
      // Endpoint criado na nossa conversa anterior
      await api.post("/auth/forgot-password", { email });
      setSucessoMsg("Se o e-mail existir, você receberá um link de recuperação em instantes.");
      toast.success("Solicitação enviada!");
    } catch (error) {
      // Para não enumerar e-mails, o back sempre retorna 200, mas no caso de um 500:
      toast.error(error.response?.data?.error || "Erro ao solicitar recuperação.");
    } finally {
      setLoading(false);
    }
  };

  // FASE 2: Redefinir Senha
  const handleRedefinir = async (e) => {
    e.preventDefault();
    if (novaSenha.length < 6) return toast.error("A senha deve ter no mínimo 6 caracteres.");
    if (novaSenha !== confirmaSenha) return toast.error("As senhas não coincidem.");

    setLoading(true);
    try {
      // Endpoint criado na nossa conversa anterior
      await api.post("/auth/reset-password", { token: tokenUrl, novaSenha });
      toast.success("Senha atualizada com sucesso!");
      // Redireciona para o login após 2 segundos
      setTimeout(() => navigate("/login"), 2000);
    } catch (error) {
      toast.error(error.response?.data?.error || "Erro ao redefinir. Token inválido/expirado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div className="p-8 pb-4 text-center">
          <div className="mx-auto bg-brand-blue/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
             {fase === "SOLICITAR" ? <Mail className="text-brand-blue" size={32} /> : <Lock className="text-brand-blue" size={32} />}
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            {fase === "SOLICITAR" ? "Esqueceu a senha?" : "Criar Nova Senha"}
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            {fase === "SOLICITAR" 
              ? "Digite seu e-mail cadastrado e enviaremos instruções para recuperar o acesso."
              : "Crie uma nova senha forte para acessar sua conta."}
          </p>
        </div>

        <div className="p-8 pt-4">
          {sucessoMsg ? (
            <div className="text-center space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 text-emerald-700 text-sm">
                <CheckCircle size={20} className="shrink-0" />
                <p className="text-left">{sucessoMsg}</p>
              </div>
              <Link to="/login" className="text-brand-blue font-bold text-sm hover:underline flex items-center justify-center gap-2">
                <ArrowLeft size={16} /> Voltar para o Login
              </Link>
            </div>
          ) : (
            <form onSubmit={fase === "SOLICITAR" ? handleSolicitar : handleRedefinir} className="space-y-5">
              
              {fase === "SOLICITAR" && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">E-mail</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@clinica.com"
                    className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                  />
                </div>
              )}

              {fase === "REDEFINIR" && (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Nova Senha</label>
                    <input
                      type="password"
                      required
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      placeholder="••••••••"
                      className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-blue"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Confirmar Nova Senha</label>
                    <input
                      type="password"
                      required
                      value={confirmaSenha}
                      onChange={(e) => setConfirmaSenha(e.target.value)}
                      placeholder="••••••••"
                      className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-blue"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-blue text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-opacity-90 transition-colors"
              >
                {loading && <Loader2 className="animate-spin" size={20} />}
                {fase === "SOLICITAR" ? "Enviar Link" : "Salvar Nova Senha"}
              </button>

              <div className="text-center pt-2">
                <Link to="/login" className="text-sm font-semibold text-slate-400 hover:text-brand-blue transition-colors">
                  Cancelar e voltar
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}