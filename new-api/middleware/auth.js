const { verifyToken, extractTokenFromHeader } = require('../utils/auth');
const { PrismaClient } = require('../generated/prisma');

const prisma = new PrismaClient();

// Middleware de autenticação JWT
const authMiddleware = async (req, res, next) => {
  try {
    console.log('🔍 [AUTH DEBUG] Iniciando middleware de autenticação');
    const authHeader = req.headers.authorization;
    console.log('🔍 [AUTH DEBUG] Header authorization:', authHeader ? `"${authHeader.substring(0, 20)}..."` : 'AUSENTE');
    
    if (!authHeader) {
      console.log('❌ [AUTH DEBUG] Header authorization não encontrado');
      return res.status(401).json({
        success: false,
        message: 'Token de acesso requerido',
        error: 'Missing authorization header'
      });
    }
    
    const token = extractTokenFromHeader(authHeader);
    console.log('🔍 [AUTH DEBUG] Token extraído:', token ? `"${token.substring(0, 20)}..."` : 'FALHOU');
    if (!token) {
      console.log('❌ [AUTH DEBUG] Falha na extração do token');
      return res.status(401).json({
        success: false,
        message: 'Formato de token inválido',
        error: 'Invalid token format'
      });
    }
    
    // Verificar e decodificar o token
    console.log('🔍 [AUTH DEBUG] Verificando token JWT...');
    const decoded = verifyToken(token);
    console.log('✅ [AUTH DEBUG] Token decodificado:', { id: decoded.id, email: decoded.email });
    
    // Verificar se o usuário ainda existe e está ativo
    console.log('🔍 [AUTH DEBUG] Buscando usuário no banco...');
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        email: true,
        isActive: true,
        isAdmin: true,
        affiliateType: true
      }
    });
    
    if (!user) {
      console.log('❌ [AUTH DEBUG] Usuário não encontrado no banco');
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado',
        error: 'User not found'
      });
    }
    
    console.log('✅ [AUTH DEBUG] Usuário encontrado:', { id: user.id, email: user.email, isActive: user.isActive });
    
    if (!user.isActive) {
      console.log('❌ [AUTH DEBUG] Usuário inativo');
      return res.status(401).json({
        success: false,
        message: 'Conta desativada',
        error: 'Account disabled'
      });
    }
    
    // Adicionar informações do usuário à requisição
    const userRole = user.isAdmin ? 'admin' : (user.affiliateType !== 'none' ? 'affiliate' : 'user');
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: userRole,
      isAdmin: user.isAdmin,
      isActive: user.isActive
    };
    
    console.log('✅ [AUTH DEBUG] Autenticação bem-sucedida! Usuário:', { id: user.id, role: userRole });
    next();
    
  } catch (error) {
    console.error('❌ [AUTH DEBUG] Erro na autenticação:', error.message);
    console.error('❌ [AUTH DEBUG] Stack trace:', error.stack);
    
    if (error.message === 'Token expirado') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado',
        error: 'Token expired'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Token inválido',
      error: 'Invalid token'
    });
  }
};

// Middleware para verificar se o usuário é admin
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado. Privilégios de administrador requeridos.',
      error: 'Admin privileges required'
    });
  }
  next();
};

// Middleware para verificar roles específicos
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado',
        error: 'User not authenticated'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Privilégios insuficientes.',
        error: 'Insufficient privileges'
      });
    }
    
    next();
  };
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
  requireAdmin,
  requireRole,
  validateUser,
  rateLimiter
};