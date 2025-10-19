/**
 * 🔐 AUTHENTICATION MIDDLEWARE - COINBITCLUB ENTERPRISE v6.0.0
 * Middleware de autenticação e autorização
 */

const jwt = require('jsonwebtoken');
const ConnectionPoolManager = require('../database/connection-pool-manager');

class AuthMiddleware {
    constructor() {
        this.dbPoolManager = new ConnectionPoolManager();

        // CRITICAL: Enforce JWT secrets in production
        if (process.env.NODE_ENV === 'production') {
            if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
                throw new Error('FATAL: JWT_SECRET must be set and at least 32 characters in production');
            }
            if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
                throw new Error('FATAL: JWT_REFRESH_SECRET must be set and at least 32 characters in production');
            }
        }

        this.jwtSecret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'development' ? 'dev-jwt-secret-CHANGE-IN-PRODUCTION' : null);
        this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || (process.env.NODE_ENV === 'development' ? 'dev-refresh-secret-CHANGE-IN-PRODUCTION' : null);

        if (!this.jwtSecret || !this.jwtRefreshSecret) {
            throw new Error('FATAL: JWT secrets not configured');
        }
    }

    /**
     * Set database pool manager
     */
    setDbPoolManager(dbPoolManager) {
        this.dbPoolManager = dbPoolManager;
    }

    /**
     * 🔑 Middleware de autenticação
     */
    async authenticate(req, res, next) {
        try {
            const authHeader = req.headers.authorization;
            
            if (!authHeader) {
                return res.status(401).json({
                    success: false,
                    error: 'Token de acesso necessário'
                });
            }

            const token = authHeader.replace('Bearer ', '');
            
            if (!token) {
                return res.status(401).json({
                    success: false,
                    error: 'Token de acesso necessário'
                });
            }

            // Verificar token
            const decoded = jwt.verify(token, this.jwtSecret);
            
            // Buscar usuário no banco para verificar se ainda está ativo
            const userResult = await this.dbPoolManager.executeRead(
                'SELECT id, email, role FROM users WHERE id = $1',
                [decoded.userId]
            );

            if (userResult.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    error: 'Usuário não encontrado'
                });
            }

            const user = userResult.rows[0];

            // Adicionar informações do usuário ao request
            req.user = {
                id: user.id,
                email: user.email,
                role: user.role,
                is_admin: user.role === 'admin',
                permissions: this.getUserPermissions(user.role)
            };

            // Atualizar última atividade
            await this.dbPoolManager.executeWrite(
                'UPDATE users SET last_activity_at = NOW() WHERE id = $1',
                [user.id]
            );

            next();

        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    error: 'Token expirado',
                    code: 'TOKEN_EXPIRED'
                });
            } else if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    error: 'Token inválido',
                    code: 'TOKEN_INVALID'
                });
            }

            console.error('❌ Authentication middleware error:', error);
            return res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }

    /**
     * 👑 Middleware de autorização por tipo de usuário
     */
    requireUserType(allowedTypes) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: 'Autenticação necessária'
                });
            }

            if (!allowedTypes.includes(req.user.role)) {
                return res.status(403).json({
                    success: false,
                    error: 'Permissão negada',
                    required: allowedTypes,
                    current: req.user.role
                });
            }

            next();
        };
    }

    /**
     * 🔐 Middleware de autorização por permissão
     */
    requirePermission(requiredPermission) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: 'Autenticação necessária'
                });
            }

            if (!req.user.permissions.includes(requiredPermission) && 
                !req.user.permissions.includes('ADMIN')) {
                return res.status(403).json({
                    success: false,
                    error: 'Permissão negada',
                    required: requiredPermission,
                    current: req.user.permissions
                });
            }

            next();
        };
    }

    /**
     * 👨‍💼 Middleware para admin apenas
     */
    requireAdmin(req, res, next) {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Autenticação necessária'
            });
        }

        if (!req.user.is_admin && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Acesso de administrador necessário'
            });
        }

        next();
    }

    /**
     * 🔄 Middleware para verificar sessão ativa
     */
    async requireActiveSession(req, res, next) {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: 'Autenticação necessária'
                });
            }

            // Verificar se a sessão ainda está ativa
            const sessionResult = await this.dbPoolManager.executeRead(
                'SELECT * FROM user_sessions WHERE user_id = $1 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
                [req.user.id]
            );

            if (sessionResult.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    error: 'Sessão expirada',
                    code: 'SESSION_EXPIRED'
                });
            }

            // Atualizar última atividade da sessão
            await this.dbPoolManager.executeWrite(
                'UPDATE user_sessions SET last_activity = NOW() WHERE id = $1',
                [sessionResult.rows[0].id]
            );

            next();

        } catch (error) {
            console.error('❌ Session check error:', error);
            return res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }

    /**
     * 📱 Middleware para verificar 2FA
     */
    async requireTwoFactor(req, res, next) {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: 'Autenticação necessária'
                });
            }

            // Verificar se 2FA está habilitado para este tipo de usuário
            const requires2FA = ['admin', 'affiliate'].includes(req.user.role);

            if (!requires2FA) {
                return next();
            }

            // Buscar status do 2FA do usuário
            const userResult = await this.dbPoolManager.executeRead(
                'SELECT two_factor_enabled FROM users WHERE id = $1',
                [req.user.id]
            );

            if (userResult.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    error: 'Usuário não encontrado'
                });
            }

            const user = userResult.rows[0];

            if (!user.two_factor_enabled) {
                return res.status(403).json({
                    success: false,
                    error: '2FA necessário para este tipo de usuário',
                    code: '2FA_REQUIRED'
                });
            }

            next();

        } catch (error) {
            console.error('❌ 2FA check error:', error);
            return res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }

    /**
     * 🔒 Middleware para verificar trading habilitado
     */
    async requireTradingEnabled(req, res, next) {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: 'Autenticação necessária'
                });
            }

            // Buscar status do trading do usuário
            const userResult = await this.dbPoolManager.executeRead(
                'SELECT trading_enabled FROM users WHERE id = $1',
                [req.user.id]
            );

            if (userResult.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    error: 'Usuário não encontrado'
                });
            }

            const user = userResult.rows[0];

            if (!user.trading_enabled) {
                return res.status(403).json({
                    success: false,
                    error: 'Trading não habilitado para esta conta',
                    code: 'TRADING_DISABLED'
                });
            }

            next();

        } catch (error) {
            console.error('❌ Trading check error:', error);
            return res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }

    /**
     * 🔧 Middleware opcional de autenticação
     */
    async optionalAuth(req, res, next) {
        try {
            const authHeader = req.headers.authorization;
            
            if (!authHeader) {
                return next();
            }

            const token = authHeader.replace('Bearer ', '');
            
            if (!token) {
                return next();
            }

            // Verificar token
            const decoded = jwt.verify(token, this.jwtSecret);
            
            // Buscar usuário no banco
            const userResult = await this.dbPoolManager.executeRead(
                'SELECT id, email, role FROM users WHERE id = $1',
                [decoded.userId]
            );

            if (userResult.rows.length > 0) {
                const user = userResult.rows[0];
                req.user = {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    is_admin: user.role === 'admin',
                    permissions: this.getUserPermissions(user.role)
                };
            }

            next();

        } catch (error) {
            // Se houver erro no token, continuar sem autenticação
            next();
        }
    }

    /**
     * 🔧 Obter permissões por tipo de usuário
     */
    getUserPermissions(userType) {
        const permissions = {
            'ADMIN': ['ADMIN', 'FINANCIAL', 'TRADING', 'AFFILIATE', 'USERS', 'DASHBOARD'],
            'GESTOR': ['FINANCIAL', 'TRADING', 'AFFILIATE', 'USERS', 'DASHBOARD'],
            'OPERADOR': ['TRADING', 'DASHBOARD'],
            'AFFILIATE_VIP': ['AFFILIATE', 'TRADING', 'DASHBOARD'],
            'AFFILIATE': ['AFFILIATE', 'TRADING', 'DASHBOARD'],
            'USER': ['DASHBOARD', 'TRADING']
        };

        return permissions[userType] || permissions['USER'];
    }

    /**
     * 🔍 Extrair token do header
     */
    extractToken(req) {
        const authHeader = req.headers.authorization;
        if (!authHeader) return null;
        
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return null;
        }
        
        return parts[1];
    }

    /**
     * 🔄 Verificar se token está expirado
     */
    isTokenExpired(token) {
        try {
            jwt.verify(token, this.jwtSecret);
            return false;
        } catch (error) {
            return error.name === 'TokenExpiredError';
        }
    }

    /**
     * 🔄 Renovar token
     */
    async refreshAccessToken(refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret);
            
            // Buscar usuário
            const userResult = await this.dbPoolManager.executeRead(
                'SELECT * FROM users WHERE id = $1',
                [decoded.userId]
            );

            if (userResult.rows.length === 0) {
                throw new Error('Usuário não encontrado');
            }

            const user = userResult.rows[0];
            
            // Gerar novo token
            const payload = {
                userId: user.id,
                email: user.email,
                role: user.role,
                affiliateId: user.affiliate_id,
                permissions: this.getUserPermissions(user.role),
                timestamp: Date.now()
            };

            const newAccessToken = jwt.sign(payload, this.jwtSecret, {
                expiresIn: this.jwtExpiresIn || '24h',
                issuer: 'coinbitclub-enterprise',
                audience: 'coinbitclub-frontend'
            });

            return {
                accessToken: newAccessToken,
                expiresIn: this.jwtExpiresIn || '24h',
                tokenType: 'Bearer'
            };

        } catch (error) {
            throw new Error('Token de refresh inválido');
        }
    }
}

module.exports = AuthMiddleware;




