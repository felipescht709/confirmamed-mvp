// frontend/src/pages/config/tabs/Usuarios.jsx
import { useState, useEffect } from "react";
import api from "../../../services/api";
import { Plus, Edit2, ShieldAlert } from "lucide-react";
import ModalUsuario from "./ModalUsuario";
import { useAuth } from "../../../context/AuthContext";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const { user } = useAuth();

  const loadUsuarios = async () => {
    try {
      const res = await api.get("/usuarios");
      setUsuarios(res.data);
    } catch (err) {
      console.error("Erro ao carregar usuários", err);
    }
  };

  useEffect(() => {
    if (user?.permissoes?.gerenciar_usuarios) {
      loadUsuarios();
    }
  }, [user]);

  if (!user?.permissoes?.gerenciar_usuarios) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <ShieldAlert size={48} className="mb-4 text-red-400" />
        <h2 className="text-xl font-bold text-slate-700">Acesso Restrito</h2>
        <p>Você não tem permissão para gerenciar a equipe e os acessos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Equipe & Acessos</h2>
          <p className="text-sm text-slate-500">
            Gerencie quem pode acessar o sistema e quais permissões cada um tem.
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedUser(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-brand-blue text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors font-semibold"
        >
          <Plus size={18} />
          Novo Acesso
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
              <th className="p-4 font-semibold">Nome</th>
              <th className="p-4 font-semibold">E-mail</th>
              <th className="p-4 font-semibold">Perfil (Template)</th>
              <th className="p-4 font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr
                key={u.id_usuario}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
              >
                <td className="p-4 font-medium text-slate-800">{u.nome}</td>
                <td className="p-4 text-slate-600">{u.email}</td>
                <td className="p-4">
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">
                    {u.role}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => {
                      setSelectedUser(u);
                      setIsModalOpen(true);
                    }}
                    className="text-slate-400 hover:text-brand-blue transition-colors p-2"
                  >
                    <Edit2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td colSpan="4" className="p-8 text-center text-slate-500">
                  Nenhum usuário cadastrado além de você.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      <ModalUsuario
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userToEdit={selectedUser}
        onSuccess={loadUsuarios}
      />
    </div>
  );
}
