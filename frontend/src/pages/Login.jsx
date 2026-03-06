import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Lock, Mail, Eye, EyeOff } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/login", {
        email: email.trim(),
        senha: password,
      });

      // 1. AQUI: Agora extraímos o 'usuario' junto com o token
      const { token, usuario } = response.data;

      if (token) {
        // 2. AQUI: Passamos o usuário para o estado global salvar a unidade_id
        login(token, usuario);
        navigate("/");
      }
    } catch (err) {
      const message = err.response?.data?.error || "Falha na autenticação.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-slate-100">
        <div className="text-center">
          <div className="inline-flex bg-sky-500 p-3 rounded-2xl text-white mb-4">
            <Bot size={32} />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 text-center">
            ConfirmaMED
          </h2>
          <p className="mt-2 text-sm text-slate-500 text-center">
            Gestão de Agenda Inteligente
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="relative">
              <Mail
                className="absolute left-3 top-3 text-slate-400"
                size={20}
              />
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                placeholder="Seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="relative">
              <Lock
                className="absolute left-3 top-3 text-slate-400"
                size={20}
              />
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full pl-10 pr-12 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="lembrar"
                className="rounded text-sky-500 focus:ring-sky-500"
              />
              <label
                htmlFor="lembrar"
                className="text-sm text-slate-500 font-medium"
              >
                Lembrar-me
              </label>
            </div>

            <Link
              to="/recuperar-senha"
              className="text-sm font-bold text-sky-500 hover:text-sky-600 hover:underline"
            >
              Esqueceu a senha?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? "Verificando..." : "Acessar Plataforma"}{" "}
            <Bot size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
