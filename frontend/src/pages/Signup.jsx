import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { LogIn, Building, User, Mail, Lock, Phone } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome_clinica: "",
    nome_admin: "",
    email: "",
    senha: "",
    telefone: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Chama a nova API pública de registro
      const response = await api.post("/auth/register", formData);
      
      const { token, usuario } = response.data;
      
      // Auto-Login usando o AuthContext global
      login(token, usuario);

      toast.success("Conta criada! Seu Trial de 7 dias começou.");
      
      // Redireciona para o painel principal (rotas privadas)
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.error || "Erro ao criar conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 w-64 opacity-10">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <path fill="#4F46E5" d="M42.7,-73.2C54.1,-65.4,61.4,-51.7,68.9,-38.3C76.4,-24.9,84.1,-11.8,85.6,1.9C87.1,15.6,82.4,29.9,74.5,42.4C66.6,54.9,55.5,65.6,42.3,71.7C29.1,77.8,13.8,79.3,-1.2,81.4C-16.2,83.5,-31.9,86.2,-44.6,79.9C-57.3,73.6,-67,58.3,-74.6,43.2C-82.2,28.1,-87.7,13.2,-86.6,-1.3C-85.5,-15.8,-77.8,-29.9,-68.2,-41.3C-58.6,-52.7,-47.1,-61.4,-34.5,-68.5C-21.9,-75.6,-8.2,-81.1,3.4,-86C15,-90.9,29.9,-85.2,42.7,-73.2Z" transform="translate(100 100)" />
        </svg>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8 relative z-10">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-600/30">
            <LogIn className="text-white" size={24} />
          </div>
          <h1 className="text-2xl font-black text-slate-800">Crie sua Conta</h1>
          <p className="text-slate-500 text-sm mt-2">Comece seu Trial gratuito de 7 dias hoje.</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Building size={14}/> Nome da Clínica</label>
            <input
              name="nome_clinica"
              value={formData.nome_clinica}
              onChange={handleChange}
              type="text"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="Ex: Clínica Saúde Integrada"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><User size={14}/> Seu Nome</label>
            <input
              name="nome_admin"
              value={formData.nome_admin}
              onChange={handleChange}
              type="text"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="Ex: João da Silva"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Phone size={14}/> Telefone</label>
            <input
              name="telefone"
              value={formData.telefone}
              onChange={handleChange}
              type="text"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="(11) 99999-9999"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Mail size={14}/> E-mail</label>
            <input
              name="email"
              value={formData.email}
              onChange={handleChange}
              type="email"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="contato@clinica.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Lock size={14}/> Senha</label>
            <input
              name="senha"
              value={formData.senha}
              onChange={handleChange}
              type="password"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg p-3 font-bold text-sm shadow-md transition-all mt-4"
          >
            {loading ? "Criando conta..." : "Criar Conta e Iniciar Trial"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          Já tem uma conta?{" "}
          <Link to="/login" className="text-indigo-600 font-bold hover:underline">
            Faça login aqui
          </Link>
        </div>
      </div>
    </div>
  );
}
