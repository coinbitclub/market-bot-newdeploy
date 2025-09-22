/**
 * 🔐 AUTHENTICATION ROUTES - COINBITCLUB ENTERPRISE v6.0.0
 * Rotas de autenticação integradas com PostgreSQL
 */

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// Middleware para validação
const { body, validationResult } = require('express-validator');

class AuthRoutes {
    constructor() {
        this.dbPoolManager = null; // Will be set later
        this.jwtSecret = process.env.JWT_SECRET || 'coinbitclub_enterprise_secret_2025';
        this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'coinbitclub_refresh_secret_2025';
        this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
        this.jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
        
        // Create router inside the class
        this.router = express.Router();
        
        this.setupRoutes();
    }

    /**
     * 🔧 Set database pool manager
     */
    setDbPoolManager(dbPoolManager) {
        this.dbPoolManager = dbPoolManager;
    }

    setupRoutes() {
        console.log('🔐 Setting up auth routes...');
        
        // 🔑 Login
        this.router.post('/login', [
            body('email').isEmail().normalizeEmail(),
            body('password').isLength({ min: 6 })
        ], this.login.bind(this));

        // 👤 Register
        this.router.post('/register', [
            body('email').isEmail().normalizeEmail(),
            body('password').isLength({ min: 8 }),
            body('username').isLength({ min: 3, max: 50 }),
            body('full_name').isLength({ min: 2, max: 100 })
        ], this.register.bind(this));

        // 🔄 Refresh Token
        this.router.post('/refresh', this.refreshToken.bind(this));

        // 🚪 Logout
        this.router.post('/logout', this.logout.bind(this));

        // 🔍 Validate Token
        this.router.get('/validate', this.validateToken.bind(this));
        
        console.log('✅ Auth routes setup complete');
    }

    /**
     * 🔑 Login
     */
    async login(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Dados inválidos',
                    details: errors.array()
                });
            }

            const { email, password, twoFactorCode } = req.body;

            // Buscar usuário no banco
            const userResult = await this.dbPoolManager.executeRead(
                'SELECT * FROM users WHERE email = $1 AND is_active = true',
                [email]
            );

            if (userResult.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    error: 'Credenciais inválidas'
                });
            }

            const user = userResult.rows[0];

            // Verificar senha
            const passwordValid = await bcrypt.compare(password, user.password_hash);
            if (!passwordValid) {
                return res.status(401).json({
                    success: false,
                    error: 'Credenciais inválidas'
                });
            }

            // Verificar 2FA se habilitado
            if (user.two_factor_enabled && user.two_factor_secret) {
                if (!twoFactorCode) {
                    return res.status(200).json({
                        success: false,
                        requiresTwoFactor: true,
                        message: 'Código 2FA necessário'
                    });
                }

                const verified = speakeasy.totp.verify({
                    secret: user.two_factor_secret,
                    encoding: 'base32',
                    token: twoFactorCode,
                    window: 2
                });

                if (!verified) {
                    return res.status(401).json({
                        success: false,
                        error: 'Código 2FA inválido'
                    });
                }
            }

            // Reset login attempts
            await this.dbPoolManager.executeWrite(
                'UPDATE users SET login_attempts = 0, last_login_at = NOW() WHERE id = $1',
                [user.id]
            );

            // Gerar tokens
            const tokens = this.generateTokens(user);

            // Criar sessão
            const sessionId = crypto.randomUUID();
            await this.dbPoolManager.executeWrite(
                'INSERT INTO user_sessions (id, user_id, device_info, ip_address, expires_at) VALUES ($1, $2, $3, $4, $5)',
                [
                    sessionId,
                    user.id,
                    req.headers['user-agent'] || '',
                    req.ip || req.connection.remoteAddress,
                    new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
                ]
            );

            res.json({
                success: true,
                sessionId,
                ...tokens,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    full_name: user.full_name,
                    user_type: user.user_type,
                    is_admin: user.is_admin,
                    trading_enabled: user.trading_enabled,
                    two_factor_enabled: user.two_factor_enabled
                }
            });

        } catch (error) {
            console.error('❌ Login error:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }

    /**
     * 👤 Register
     */
    async register(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Dados inválidos',
                    details: errors.array()
                });
            }

            const { email, password, username, full_name, user_type = 'USER' } = req.body;

            // Verificar se usuário já existe
            const existingUser = await this.dbPoolManager.executeRead(
                'SELECT id FROM users WHERE email = $1',
                [email]
            );

            if (existingUser.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    error: 'Email já cadastrado'
                });
            }

            // Verificar se username já existe
            const existingUsername = await this.dbPoolManager.executeRead(
                'SELECT id FROM users WHERE username = $1',
                [username]
            );

            if (existingUsername.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    error: 'Username já cadastrado'
                });
            }

            // Hash da senha
            const passwordHash = await bcrypt.hash(password, 10);

            // Criar usuário - usando apenas campos obrigatórios e deixando defaults funcionarem
            const newUser = await this.dbPoolManager.executeWrite(`
                INSERT INTO users (
                    email, username, full_name, user_type, password_hash,
                    is_admin, trading_enabled
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7
                ) RETURNING *
            `, [
                email, username, full_name, user_type, passwordHash,
                user_type === 'ADMIN', true
            ]);

            const user = newUser.rows[0];
            const tokens = this.generateTokens(user);

            res.status(201).json({
                success: true,
                ...tokens,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    full_name: user.full_name,
                    user_type: user.user_type,
                    is_admin: user.is_admin,
                    trading_enabled: user.trading_enabled,
                    two_factor_enabled: user.two_factor_enabled
                }
            });

        } catch (error) {
            console.error('❌ Registration error:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }

    /**
     * 🔄 Refresh Token
     */
    async refreshToken(req, res) {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(401).json({
                    success: false,
                    error: 'Refresh token necessário'
                });
            }

            const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret);
            const userId = decoded.userId;

            // Buscar usuário
            const userResult = await this.dbPoolManager.executeRead(
                'SELECT * FROM users WHERE id = $1 AND is_active = true',
                [userId]
            );

            if (userResult.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    error: 'Token inválido'
                });
            }

            const user = userResult.rows[0];
            const tokens = this.generateTokens(user);

            res.json({
                success: true,
                ...tokens
            });

        } catch (error) {
            console.error('❌ Token refresh error:', error);
            res.status(401).json({
                success: false,
                error: 'Token inválido ou expirado'
            });
        }
    }

    /**
     * 🚪 Logout
     */
    async logout(req, res) {
        try {
            const { sessionId } = req.body;

            if (sessionId) {
                await this.dbPoolManager.executeWrite(
                    'DELETE FROM user_sessions WHERE id = $1',
                    [sessionId]
                );
            }

            res.json({
                success: true,
                message: 'Logout realizado com sucesso'
            });

        } catch (error) {
            console.error('❌ Logout error:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }

    /**
     * 🔍 Validate Token
     */
    async validateToken(req, res) {
        try {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];

            if (!token) {
                return res.status(401).json({
                    success: false,
                    error: 'Token necessário'
                });
            }

            const decoded = jwt.verify(token, this.jwtSecret);
            
            // Verificar se usuário ainda existe e está ativo
            const userResult = await this.dbPoolManager.executeRead(
                'SELECT id, email, username, user_type, is_admin FROM users WHERE id = $1 AND is_active = true',
                [decoded.userId]
            );

            if (userResult.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    valid: false,
                    error: 'Usuário não encontrado'
                });
            }

            res.json({
                success: true,
                valid: true,
                user: userResult.rows[0]
            });

        } catch (error) {
            console.error('❌ Token validation error:', error);
            res.status(401).json({
                success: false,
                valid: false,
                error: 'Token inválido ou expirado'
            });
        }
    }

    /**
     * 🔑 Generate JWT Tokens
     */
    generateTokens(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            userType: user.user_type,
            isAdmin: user.is_admin,
            timestamp: Date.now()
        };

        const accessToken = jwt.sign(payload, this.jwtSecret, {
            expiresIn: this.jwtExpiresIn,
            issuer: 'coinbitclub-enterprise',
            audience: 'coinbitclub-frontend'
        });

        const refreshToken = jwt.sign(
            { userId: user.id, tokenId: crypto.randomUUID() },
            this.jwtRefreshSecret,
            { expiresIn: this.jwtRefreshExpiresIn }
        );

        return {
            accessToken,
            refreshToken,
            expiresIn: this.jwtExpiresIn,
            tokenType: 'Bearer'
        };
    }

    /**
     * 🔌 Get Router
     */
    getRouter() {
        return this.router;
    }
}

module.exports = AuthRoutes;
