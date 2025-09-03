/**
 * 🛡️ SECURITY MIDDLEWARE SYSTEM
 * 
 * Middleware de segurança enterprise
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const { logger } = require('./logger');
const { secretsManager } = require('./secrets');

class SecurityConfig {
    constructor() {
        this.rateLimiters = new Map();
        this.blockedIPs = new Set();
        this.setupRateLimiters();
    }

    setupRateLimiters() {
        // Rate limiter para APIs gerais
        this.rateLimiters.set('general', rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: 100, // 100 requests por IP
            message: {
                error: 'Muitas requisições, tente novamente em 15 minutos',
                code: 'RATE_LIMIT_EXCEEDED'
            },
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => {
                logger.warn('Rate limit exceeded', {
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    url: req.url
                });
                res.status(429).json({
                    error: 'Muitas requisições, tente novamente em 15 minutos',
                    code: 'RATE_LIMIT_EXCEEDED'
                });
            }
        }));

        // Rate limiter para login (mais restritivo)
        this.rateLimiters.set('auth', rateLimit({
            windowMs: 10 * 60 * 1000, // 10 minutos
            max: 5, // 5 tentativas de login por IP
            message: {
                error: 'Muitas tentativas de login, tente novamente em 10 minutos',
                code: 'AUTH_RATE_LIMIT_EXCEEDED'
            }
        }));

        // Rate limiter para trading (crítico)
        this.rateLimiters.set('trading', rateLimit({
            windowMs: 1 * 60 * 1000, // 1 minuto
            max: 30, // 30 operações por minuto
            message: {
                error: 'Limite de operações de trading excedido',
                code: 'TRADING_RATE_LIMIT_EXCEEDED'
            }
        }));

        // Rate limiter para APIs de dados
        this.rateLimiters.set('data', rateLimit({
            windowMs: 1 * 60 * 1000, // 1 minuto
            max: 60, // 60 requests por minuto
            message: {
                error: 'Limite de consultas de dados excedido',
                code: 'DATA_RATE_LIMIT_EXCEEDED'
            }
        }));
    }

    // Configuração do Helmet para segurança
    getHelmetConfig() {
        return helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'"],
                    fontSrc: ["'self'"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'none'"]
                }
            },
            crossOriginEmbedderPolicy: false
        });
    }

    // Configuração do CORS
    getCorsConfig() {
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
        
        return cors({
            origin: (origin, callback) => {
                // Permitir requests sem origin (Postman, mobile apps, etc.)
                if (!origin) return callback(null, true);
                
                if (allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    logger.warn('CORS blocked request', { origin });
                    callback(new Error('Não permitido pelo CORS'));
                }
            },
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
            exposedHeaders: ['X-Total-Count']
        });
    }

    // Middleware de validação de IP
    ipValidationMiddleware() {
        return (req, res, next) => {
            const clientIP = req.ip || req.connection.remoteAddress;
            
            if (this.blockedIPs.has(clientIP)) {
                logger.warn('Blocked IP attempted access', { ip: clientIP });
                return res.status(403).json({
                    error: 'Acesso negado',
                    code: 'IP_BLOCKED'
                });
            }

            // Verificar whitelist em produção
            if (process.env.NODE_ENV === 'production') {
                const whitelist = process.env.IP_WHITELIST?.split(',') || [];
                if (whitelist.length > 0 && !whitelist.includes(clientIP)) {
                    logger.warn('Non-whitelisted IP attempted access', { ip: clientIP });
                    return res.status(403).json({
                        error: 'IP não autorizado',
                        code: 'IP_NOT_WHITELISTED'
                    });
                }
            }

            next();
        };
    }

    // Middleware de autenticação JWT
    jwtAuthMiddleware() {
        const jwt = require('jsonwebtoken');
        
        return (req, res, next) => {
            const token = req.header('Authorization')?.replace('Bearer ', '');
            
            if (!token) {
                return res.status(401).json({
                    error: 'Token de acesso obrigatório',
                    code: 'MISSING_TOKEN'
                });
            }

            try {
                const jwtSecret = secretsManager.getSecret('JWT_SECRET');
                const decoded = jwt.verify(token, jwtSecret);
                req.user = decoded;
                next();
            } catch (error) {
                logger.warn('Invalid JWT token', { error: error.message });
                return res.status(401).json({
                    error: 'Token inválido',
                    code: 'INVALID_TOKEN'
                });
            }
        };
    }

    // Bloquear IP
    blockIP(ip, reason = 'Security violation') {
        this.blockedIPs.add(ip);
        logger.warn(`IP blocked: ${ip}`, { reason });
    }

    // Desbloquear IP
    unblockIP(ip) {
        this.blockedIPs.delete(ip);
        logger.info(`IP unblocked: ${ip}`);
    }

    // Obter rate limiter específico
    getRateLimiter(type = 'general') {
        return this.rateLimiters.get(type) || this.rateLimiters.get('general');
    }
}

// Instância global
const securityConfig = new SecurityConfig();

module.exports = { SecurityConfig, securityConfig };
