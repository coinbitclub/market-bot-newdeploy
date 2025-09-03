const express = require('express');
const { PrismaClient } = require('../generated/prisma');
const { verifyPassword, generateToken } = require('../utils/auth');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/auth/login
 * Endpoint de login do usuário
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validação dos campos obrigatórios
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email e senha são obrigatórios',
        error: 'Missing required fields'
      });
    }

    // Validação básica do formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de email inválido',
        error: 'Invalid email format'
      });
    }

    // Buscar usuário no banco de dados
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        username: true,
        email: true,
        passwordHash: true,
        fullName: true,
        isActive: true,
        isAdmin: true,
        affiliateType: true,
        lastLogin: true
      }
    });

    // Verificar se o usuário existe
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas',
        error: 'Invalid credentials'
      });
    }

    // Verificar se a conta está ativa
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Conta desativada. Entre em contato com o suporte.',
        error: 'Account disabled'
      });
    }

    // Verificar a senha
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas',
        error: 'Invalid credentials'
      });
    }

    // Gerar token JWT
    const token = generateToken(user);

    // Atualizar último login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Determinar role do usuário
    let role = 'user';
    if (user.isAdmin) {
      role = 'admin';
    } else if (user.affiliateType && user.affiliateType !== 'none') {
      role = 'affiliate';
    }

    // Resposta de sucesso
    res.json({
      success: true,
      token: token,
      user: {
        id: user.id.toString(),
        email: user.email,
        name: user.fullName || user.username,
        role: role,
        status: 'active'
      },
      message: 'Login realizado com sucesso'
    });

  } catch (error) {
    console.error('Erro no login:', error);
    
    // Erro interno do servidor
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/auth/logout
 * Endpoint de logout (opcional - JWT é stateless)
 */
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout realizado com sucesso'
  });
});

/**
 * GET /api/auth/me
 * Endpoint para obter dados do usuário autenticado
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    // Este endpoint requer autenticação (middleware será aplicado)
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Token de acesso requerido',
        error: 'Unauthorized'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        isActive: true,
        isAdmin: true,
        affiliateType: true,
        createdAt: true,
        lastLogin: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado',
        error: 'User not found'
      });
    }

    let role = 'user';
    if (user.isAdmin) {
      role = 'admin';
    } else if (user.affiliateType && user.affiliateType !== 'none') {
      role = 'affiliate';
    }

    res.json({
      success: true,
      user: {
        id: user.id.toString(),
        email: user.email,
        name: user.fullName || user.username,
        role: role,
        status: user.isActive ? 'active' : 'inactive',
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    console.error('Erro ao buscar dados do usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: 'Internal server error'
    });
  }
});

module.exports = router;