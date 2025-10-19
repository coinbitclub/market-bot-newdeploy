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
        this.affiliateService = null; // Will be set later

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
        this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
        this.jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

        if (!this.jwtSecret || !this.jwtRefreshSecret) {
            throw new Error('FATAL: JWT secrets not configured');
        }

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

    /**
     * 🔧 Set affiliate service
     */
    setAffiliateService(affiliateService) {
        this.affiliateService = affiliateService;
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

        // 👤 Get User Profile
        this.router.get('/profile', this.getUserProfile.bind(this));

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
                'SELECT * FROM users WHERE email = $1',
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

            // Update last login time
            await this.dbPoolManager.executeWrite(
                'UPDATE users SET last_login_at = NOW() WHERE id = $1',
                [user.id]
            );

            // Gerar tokens
            const tokens = this.generateTokens(user);

            // Create session log entry
            let sessionId = null;
            try {
                sessionId = crypto.randomUUID();
                await this.dbPoolManager.executeWrite(`
                    INSERT INTO user_sessions (
                        id,
                        user_id, 
                        session_token, 
                        device_info,
                        ip_address, 
                        user_agent,
                        login_at,
                        expires_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW() + INTERVAL '24 hours')
                `, [
                    sessionId,
                    user.id,
                    tokens.refreshToken.substring(0, 50), // Store partial token for identification
                    req.headers['user-agent'] || 'Unknown',
                    req.ip || req.connection.remoteAddress,
                    req.headers['user-agent'] || 'Unknown'
                ]);
            } catch (sessionError) {
                // Non-critical - continue even if session logging fails
                console.log('⚠️ Session logging failed (non-critical):', sessionError.message);
            }

            res.json({
                success: true,
                ...(sessionId && { sessionId }),
                ...tokens,
                user: {
                    id: user.id,
                    email: user.email,
                username: user.username,
                full_name: user.full_name,
                role: user.role,
                is_admin: user.role === 'admin',
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

            const { email, password, username, full_name, role = 'user', referralCode } = req.body;

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
                    email, username, full_name, role, password_hash, trading_enabled
                ) VALUES (
                    $1, $2, $3, $4, $5, $6
                ) RETURNING *
            `, [
                email, username, full_name, role, passwordHash, true
            ]);

            const user = newUser.rows[0];
            const tokens = this.generateTokens(user);

            // Track affiliate conversion if referral code provided
            if (referralCode && this.affiliateService) {
                try {
                    await this.affiliateService.trackConversion(referralCode, user.id, 0);
                    console.log(`✅ Affiliate conversion tracked: ${referralCode} -> User ${user.id}`);
                } catch (affiliateError) {
                    console.warn('⚠️ Failed to track affiliate conversion:', affiliateError.message);
                    // Don't fail registration if affiliate tracking fails
                }
            }

            res.status(201).json({
                success: true,
                ...tokens,
                user: {
                    id: user.id,
                    email: user.email,
                username: user.username,
                full_name: user.full_name,
                role: user.role,
                is_admin: user.role === 'admin',
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
                'SELECT * FROM users WHERE id = $1',
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
                'SELECT id, email, username, role FROM users WHERE id = $1',
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
            role: user.role,
            isAdmin: user.role === 'admin',
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
     * 👤 Get User Profile
     */
    async getUserProfile(req, res) {
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

            // Verify token
            const decoded = jwt.verify(token, this.jwtSecret);

            // Get user from database
            const userResult = await this.dbPoolManager.executeRead(
                `SELECT
                    id, uuid, email, username, full_name, phone, country, language,
                    role, two_factor_enabled,
                    balance_real_brl, balance_real_usd, balance_admin_brl,
                    balance_admin_usd, balance_commission_brl, balance_commission_usd,
                    plan_type, subscription_status, subscription_start_date, subscription_end_date,
                    affiliate_type, affiliate_code, affiliate_id,
                    max_open_positions, max_position_size,
                    default_leverage, risk_level,
                    created_at, last_login_at, last_activity_at
                FROM users WHERE id = $1`,
                [decoded.userId]
            );

            if (userResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Usuário não encontrado'
                });
            }

            const user = userResult.rows[0];

            // Return formatted user profile
            res.json({
                success: true,
                user: {
                    id: user.id,
                    uuid: user.uuid,
                    email: user.email,
                    username: user.username,
                    full_name: user.full_name,
                    phone: user.phone,
                    country: user.country,
                    language: user.language,
                    role: user.role,
                    is_admin: user.role === 'admin',
                    two_factor_enabled: user.two_factor_enabled,
                    balances: {
                        real_brl: parseFloat(user.balance_real_brl || 0),
                        real_usd: parseFloat(user.balance_real_usd || 0),
                        admin_brl: parseFloat(user.balance_admin_brl || 0),
                        admin_usd: parseFloat(user.balance_admin_usd || 0),
                        commission_brl: parseFloat(user.balance_commission_brl || 0),
                        commission_usd: parseFloat(user.balance_commission_usd || 0)
                    },
                    subscription: {
                        plan_type: user.plan_type,
                        status: user.subscription_status,
                        start_date: user.subscription_start_date,
                        end_date: user.subscription_end_date
                    },
                    affiliate: {
                        type: user.affiliate_type,
                        code: user.affiliate_code,
                        referrer_id: user.affiliate_id
                    },
                    trading_settings: {
                        enabled: user.trading_enabled,
                        max_open_positions: user.max_open_positions,
                        max_position_size: parseFloat(user.max_position_size || 0.3),
                        default_leverage: user.default_leverage,
                        risk_level: user.risk_level
                    },
                    timestamps: {
                        created_at: user.created_at,
                        last_login_at: user.last_login_at,
                        last_activity_at: user.last_activity_at
                    }
                }
            });

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
            } else {
                console.error('❌ Get user profile error:', error);
                return res.status(500).json({
                    success: false,
                    error: 'Erro interno do servidor'
                });
            }
        }
    }

    /**
     * 🔌 Get Router
     */
    getRouter() {
        return this.router;
    }
}

module.exports = AuthRoutes;




