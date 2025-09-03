const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Configurações JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Gera hash da senha usando bcrypt
 * @param {string} password - Senha em texto plano
 * @returns {Promise<string>} Hash da senha
 */
async function hashPassword(password) {
  try {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  } catch (error) {
    throw new Error('Erro ao gerar hash da senha');
  }
}

/**
 * Verifica se a senha corresponde ao hash
 * @param {string} password - Senha em texto plano
 * @param {string} hash - Hash armazenado no banco
 * @returns {Promise<boolean>} True se a senha estiver correta
 */
async function verifyPassword(password, hash) {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    throw new Error('Erro ao verificar senha');
  }
}

/**
 * Gera token JWT para o usuário
 * @param {Object} user - Dados do usuário
 * @returns {string} Token JWT
 */
function generateToken(user) {
  try {
    const payload = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.isAdmin ? 'admin' : (user.affiliateType !== 'none' ? 'affiliate' : 'user'),
      status: user.isActive ? 'active' : 'inactive'
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'market-bot-api',
      audience: 'market-bot-users'
    });
  } catch (error) {
    throw new Error('Erro ao gerar token JWT');
  }
}

/**
 * Verifica e decodifica token JWT
 * @param {string} token - Token JWT
 * @returns {Object} Dados decodificados do token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'market-bot-api',
      audience: 'market-bot-users'
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expirado');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Token inválido');
    } else {
      throw new Error('Erro ao verificar token');
    }
  }
}

/**
 * Extrai token do header Authorization
 * @param {string} authHeader - Header Authorization
 * @returns {string|null} Token extraído ou null
 */
function extractTokenFromHeader(authHeader) {
  if (!authHeader) {
    return null;
  }
  
  // Normalizar o header para case-insensitive e remover espaços extras
  const normalizedHeader = authHeader.trim();
  
  // Verificar se começa com 'Bearer ' (case-insensitive)
  if (!normalizedHeader.toLowerCase().startsWith('bearer ')) {
    return null;
  }
  
  // Extrair o token removendo 'Bearer ' e espaços extras
  const token = normalizedHeader.substring(7).trim();
  
  return token || null;
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  extractTokenFromHeader
};