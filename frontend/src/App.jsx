import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Login from "./pages/Login";
import Monitor from "./pages/Monitor";
import Layout from "./layouts/DefaultLayout";
import Config from "./pages/config/Config";
import Pacientes from "./pages/pacientes/Pacientes";
import ProcedimentosEPlanos from "./pages/procedimentoEplanos/Procedimento";
import Agenda from "./pages/agenda/AgendaCalendar";
import Dashboard from "./pages/Dashboard";
import PatientChatPage from "./pages/PatientChatPage.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { UnidadeProvider } from "./context/UnidadeContext.jsx";
import RecuperarSenha from "./pages/RecuperarSenha";

const PrivateRoute = ({ children }) => {
  const { authenticated, loading } = useAuth();
  if (loading) return null;
  return authenticated ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <UnidadeProvider>
        {/* 2. COLOQUE O COMPONENTE AQUI (Entre os Providers e o Router) */}
        <Toaster
          position="top-right"
          toastOptions={{
            className: "text-sm font-medium text-slate-700",
            style: {
              background: "#fff",
              color: "#334155",
              boxShadow:
                "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
              borderRadius: "0.75rem",
              border: "1px solid #f1f5f9",
            },
            success: {
              iconTheme: { primary: "#10b981", secondary: "#fff" },
            },
            error: {
              iconTheme: { primary: "#ef4444", secondary: "#fff" },
            },
          }}
        />

        <BrowserRouter>
          <Routes>
            {/* --- ROTAS PÚBLICAS --- */}
            <Route path="/login" element={<Login />} />
            <Route path="/recuperar-senha" element={<RecuperarSenha />} />

            {/* ESTA É A REDUNDÂNCIA DO CLIENTE: 
                Acessível via app.confirmarmed.com.br/chat/UUID-DA-SESSAO 
                Sem login, apenas com o token/id da sessão no link. */}
            <Route path="/chat/:sessionId" element={<PatientChatPage />} />

            {/* --- ROTAS PRIVADAS (ADMIN) --- */}
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="agenda" element={<Agenda />} />
              <Route path="monitor" element={<Monitor />} />
              <Route path="monitor/:sessionId" element={<Monitor />} />
              <Route path="pacientes" element={<Pacientes />} />
              <Route path="procedimentos" element={<ProcedimentosEPlanos />} />
              <Route path="config" element={<Config />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </UnidadeProvider>
    </AuthProvider>
  );
}

export default App;
