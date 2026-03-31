// backend/src/middlewares/authMiddleware.js
const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  if (req.path.includes("/login")) {
    return next();
  }
  const authHeader = req.headers.authorization;

  // 1. Verifica se o header existe
  if (!authHeader) {
    return res.status(401).json({ error: "Token não fornecido." });
  }

  // 2. O formato deve ser "Bearer <token>"
  const parts = authHeader.split(" ");
  if (parts.length !== 2) {
    return res.status(401).json({ error: "Erro no formato do token." });
  }

  const [scheme, token] = parts;
  if (!/^Bearer$/i.test(scheme)) {
    return res.status(401).json({ error: "Token malformatado." });
  }

  // 3. Validação do Token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Injetamos o objeto completo conforme esperado pelos controllers
    req.usuario = {
      id: decoded.id,
      role: decoded.role,
      profissional_id: decoded.profissional_id,
      unidade_id: decoded.unidade_id,
    };

    // Mantemos os antigos para não quebrar nada legado
    req.usuarioId = decoded.id;
    req.unidadeId = decoded.unidade_id;

    return next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }
};
