// frontend/src/pages/config/tabs/ModalUsuario.jsx
import { useState, useEffect } from "react";
import api from "../../../services/api";
import { X, Check } from "lucide-react";
import { toast } from "react-hot-toast";

const ALL_PERMISSIONS = [
  { id: "ver_agenda_geral", label: "Ver Agenda Geral", desc: "Visualiza agendas de todos os profissionais." },
  { id: "editar_agenda_geral", label: "Editar Agenda Geral", desc: "Cria e bloqueia agendamentos de outros." },
  { id: "gerenciar_fila_espera", label: "Gerenciar Fila de Espera", desc: "Aprova pacientes aguardando vaga." },
  { id: "ver_pacientes", label: "Ver Pacientes", desc: "Acessa a lista de pacientes." },
  { id: "editar_pacientes", label: "Editar Pacientes", desc: "Altera e exclui dados de pacientes (LGPD)." },
  { id: "acessar_monitor_ia", label: "Acessar Monitor IA", desc: "Lê conversas do WhatsApp." },
  { id: "intervir_ia", label: "Intervir IA", desc: "Envia mensagens manuais pelo Chatbot." },
  { id: "configurar_ia", label: "Configurar IA", desc: "Edita prompt e sincroniza celular." },
  { id: "ver_indicadores", label: "Ver Indicadores", desc: "Visualiza faturamento e métricas da Home." },
  { id: "gerenciar_assinatura_app", label: "Gerenciar Plano (Stripe)", desc: "Altera plano e cartão de crédito." },
  { id: "gerenciar_procedimentos", label: "Gerenciar Procedimentos", desc: "Edita convênios e valores." },
  { id: "gerenciar_profissionais", label: "Gerenciar Profissionais", desc: "Cadastra médicos e regras de horário." },
  { id: "gerenciar_usuarios", label: "Gerenciar Usuários", desc: "Chave mestre: Cria usuários e dá permissões." },
];

const DEFAULT_PERMISSIONS = {
  GESTOR: ALL_PERMISSIONS.reduce((acc, p) => ({ ...acc, [p.id]: true }), {}),
  PROFISSIONAL: {
    ver_agenda_geral: false, editar_agenda_geral: false, gerenciar_fila_espera: false,
    ver_pacientes: true, editar_pacientes: true, acessar_monitor_ia: false, intervir_ia: false,
    configurar_ia: false, ver_indicadores: false, gerenciar_assinatura_app: false,
    gerenciar_procedimentos: false, gerenciar_profissionais: false, gerenciar_usuarios: false
  },
  RECEPCAO: {
    ver_agenda_geral: true, editar_agenda_geral: true, gerenciar_fila_espera: true,
    ver_pacientes: true, editar_pacientes: true, acessar_monitor_ia: true, intervir_ia: true,
    configurar_ia: false, ver_indicadores: false, gerenciar_assinatura_app: false,
    gerenciar_procedimentos: false, gerenciar_profissionais: false, gerenciar_usuarios: false
  }
};

export default function ModalUsuario({ isOpen, onClose, userToEdit, onSuccess }) {
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    senha: "",
    role: "RECEPCAO",
    profissional_id: "",
    permissoes: DEFAULT_PERMISSIONS["RECEPCAO"],
  });

  const [profissionais, setProfissionais] = useState([]);

  useEffect(() => {
    if (isOpen) {
      api.get("/profissionais").then((res) => setProfissionais(res.data));

      if (userToEdit) {
        let parsedPerms = userToEdit.permissoes;
        if (typeof parsedPerms === 'string') parsedPerms = JSON.parse(parsedPerms);

        setFormData({
          nome: userToEdit.nome,
          email: userToEdit.email,
          senha: "", // Não mostra a senha
          role: userToEdit.role || "RECEPCAO",
          profissional_id: userToEdit.profissional_id || "",
          permissoes: parsedPerms || DEFAULT_PERMISSIONS[userToEdit.role || "RECEPCAO"],
        });
      } else {
        setFormData({
          nome: "",
          email: "",
          senha: "",
          role: "RECEPCAO",
          profissional_id: "",
          permissoes: DEFAULT_PERMISSIONS["RECEPCAO"],
        });
      }
    }
  }, [isOpen, userToEdit]);

  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    setFormData((prev) => ({
      ...prev,
      role: newRole,
      permissoes: DEFAULT_PERMISSIONS[newRole] || DEFAULT_PERMISSIONS["RECEPCAO"],
    }));
  };

  const handleToggle = (id) => {
    setFormData((prev) => ({
      ...prev,
      permissoes: {
        ...prev.permissoes,
        [id]: !prev.permissoes[id],
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = { ...formData };
      if (!dataToSend.profissional_id) dataToSend.profissional_id = null;

      if (userToEdit) {
        if (!dataToSend.senha) delete dataToSend.senha;
        await api.put(`/usuarios/${userToEdit.id_usuario}`, dataToSend);
        toast.success("Usuário atualizado com sucesso!");
      } else {
        await api.post("/usuarios", dataToSend);
        toast.success("Usuário criado com sucesso!");
      }
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.error || "Erro ao salvar usuário");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <header className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 font-display">
            {userToEdit ? "Editar Acesso" : "Novo Acesso"}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-100 hover:bg-slate-200 p-2 rounded-full"
          >
            <X size={20} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-8">
          
          {/* Lado Esquerdo: Dados Básicos */}
          <div className="flex-1 space-y-5">
            <h3 className="font-semibold text-slate-700 border-b pb-2">Informações Base</h3>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Nome Completo
              </label>
              <input
                type="text"
                required
                className="w-full border-slate-200 rounded-xl px-4 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                E-mail (Login)
              </label>
              <input
                type="email"
                required
                className="w-full border-slate-200 rounded-xl px-4 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Senha {userToEdit && <span className="text-xs text-slate-400 font-normal">(Deixe em branco para manter)</span>}
              </label>
              <input
                type="password"
                required={!userToEdit}
                className="w-full border-slate-200 rounded-xl px-4 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                value={formData.senha}
                onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Perfil Template (Preenche as chaves ao lado)
              </label>
              <select
                className="w-full border-slate-200 rounded-xl px-4 py-2 bg-slate-50 focus:ring-2 focus:ring-brand-blue/20"
                value={formData.role}
                onChange={handleRoleChange}
              >
                <option value="GESTOR">Gestor / Administrador</option>
                <option value="PROFISSIONAL">Profissional de Saúde</option>
                <option value="RECEPCAO">Recepção / Atendimento</option>
              </select>
            </div>

            {formData.role === "PROFISSIONAL" && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Vincular ao Profissional
                </label>
                <select
                  required
                  className="w-full border-slate-200 rounded-xl px-4 py-2 bg-slate-50 focus:ring-2 focus:ring-brand-blue/20"
                  value={formData.profissional_id}
                  onChange={(e) => setFormData({ ...formData, profissional_id: e.target.value })}
                >
                  <option value="">Selecione quem é o médico...</option>
                  {profissionais.map((p) => (
                    <option key={p.id_profissional_saude} value={p.id_profissional_saude}>
                      {p.nome_completo}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Lado Direito: Permissões Granulares (Switches) */}
          <div className="flex-1 space-y-4">
            <h3 className="font-semibold text-slate-700 border-b pb-2 flex items-center justify-between">
              Permissões Modulares
              <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                Customizável
              </span>
            </h3>
            
            <div className="space-y-3 pr-2 custom-scrollbar">
              {ALL_PERMISSIONS.map((perm) => (
                <div 
                  key={perm.id} 
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    formData.permissoes[perm.id] 
                      ? "border-brand-blue/30 bg-blue-50/50" 
                      : "border-slate-100 bg-white hover:bg-slate-50"
                  }`}
                  onClick={() => handleToggle(perm.id)}
                >
                  <div className="pr-4">
                    <p className={`text-sm font-bold ${formData.permissoes[perm.id] ? "text-brand-blue" : "text-slate-700"}`}>
                      {perm.label}
                    </p>
                    <p className="text-xs text-slate-500 leading-tight mt-0.5">{perm.desc}</p>
                  </div>
                  
                  {/* Switch */}
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.permissoes[perm.id] ? "bg-brand-blue" : "bg-slate-200"
                  }`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.permissoes[perm.id] ? "translate-x-6" : "translate-x-1"
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </form>

        <footer className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 bg-brand-green text-white px-8 py-2.5 rounded-xl hover:bg-green-600 transition-colors font-bold shadow-md shadow-brand-green/20"
          >
            <Check size={18} />
            Salvar Acesso
          </button>
        </footer>
      </div>
    </div>
  );
}
