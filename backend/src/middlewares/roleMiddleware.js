const ROLES = require("../constants/roles");

const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    // req.usuarioRole vem lá do seu authMiddleware (JWT)
    if (!allowedRoles.includes(req.usuarioRole)) {
      return res.status(403).json({
        error: "Acesso negado. Você não tem permissão para realizar esta ação.",
      });
    }
    next();
  };
};

module.exports = authorize;
