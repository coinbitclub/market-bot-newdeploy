// Middleware de autenticação simples (exemplo)
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization;
  
  // Exemplo simples - em produção use JWT ou similar
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token de acesso requerido'
    });
  }
  
  // Simulação de validação de token
  if (token !== 'Bearer valid-token') {
    return res.status(403).json({
      success: false,
      message: 'Token inválido'
    });
  }
  
  // Adiciona informações do usuário à requisição
  req.user = {
    id: 1,
    name: 'Usuário Autenticado',
    role: 'admin'
  };
  
  next();
};

// Middleware de validação de dados
const validateUser = (req, res, next) => {
  const { name, email } = req.body;
  
  if (!name || name.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Nome deve ter pelo menos 2 caracteres'
    });
  }
  
  if (!email || !email.includes('@')) {
    return res.status(400).json({
      success: false,
      message: 'Email deve ser válido'
    });
  }
  
  next();
};

// Middleware de rate limiting simples
const rateLimiter = (() => {
  const requests = new Map();
  
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutos
    const maxRequests = 100;
    
    if (!requests.has(ip)) {
      requests.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    const requestData = requests.get(ip);
    
    if (now > requestData.resetTime) {
      requests.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (requestData.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Muitas requisições. Tente novamente em 15 minutos.'
      });
    }
    
    requestData.count++;
    next();
  };
})();

module.exports = {
  authMiddleware,
  validateUser,
  rateLimiter
};