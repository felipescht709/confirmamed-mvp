// backend/src/middlewares/checkPermission.js

const checkPermission = (permissionKey) => {
  return (req, res, next) => {
    // Permissão vazia ou middleware mal configurado
    if (!permissionKey) return next();

    const usuario = req.usuario; // Vem do authMiddleware

    if (!usuario) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    // Se o usuário é o ADMIN (Owner da clínica), ele passa direto
    if (usuario.role === "ADMIN" || usuario.role === "GESTOR") {
      return next();
    }

    // Verifica se tem permissões e se a permissão solicitada é verdadeira
    const permissoes = usuario.permissoes;
    
    if (!permissoes) {
      return res.status(403).json({ error: "Acesso negado. Nenhuma permissão configurada." });
    }

    // A permissão deve ser explicitamente true
    if (permissoes[permissionKey] === true) {
      return next();
    } else {
      return res.status(403).json({ 
        error: "Acesso negado. Você não tem permissão para acessar este recurso.",
        requiredPermission: permissionKey
      });
    }
  };
};

module.exports = checkPermission;
