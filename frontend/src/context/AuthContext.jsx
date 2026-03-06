import React, { createContext, useState, useContext, useEffect } from "react";

export const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Criamos um estado para guardar os dados do usuário logado (nome, role, etc)
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuth = () => {
      const authStatus = localStorage.getItem("auth");
      const token = localStorage.getItem("token");
      const savedUser = localStorage.getItem("@ConfirmaMED:usuario");

      if (authStatus === "true" && token) {
        setAuthenticated(true);
        if (savedUser) setUser(JSON.parse(savedUser));
      } else {
        setAuthenticated(false);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  // Agora o login recebe o token E os dados do usuário vindo do backend
  const login = (token, userData) => {
    localStorage.setItem("token", token);
    localStorage.setItem("auth", "true");

    // Salva o usuário inteiro
    localStorage.setItem("@ConfirmaMED:usuario", JSON.stringify(userData));
    setUser(userData);

    // O PULO DO GATO: Já deixamos a unidade_id setada para o UnidadeContext pegar
    if (userData?.unidade_id) {
      localStorage.setItem("@ConfirmaMED:unidade_id", userData.unidade_id);
    }

    setAuthenticated(true);
  };

  const logout = () => {
    localStorage.clear(); // Isso já limpa o token e as chaves @ConfirmaMED
    setAuthenticated(false);
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{ authenticated, user, login, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);