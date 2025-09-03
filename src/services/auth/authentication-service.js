/**
 * 🔐 AUTHENTICATION SERVICE - COINBITCLUB ENTERPRISE v6.0.0
 * Serviço completo de autenticação empresarial
 * 
 * ✅ FUNCIONALIDADES IMPLEMENTADAS:
 * 🔑 Login/logout multi-usuário
 * 📱 2FA (Two-Factor Authentication)
 * 🔄 Recuperação de senha
 * 👥 Gestão de usuários e permissões
 * 🛡️ Segurança empresarial
 * 📊 Dashboard de sessões ativas
 */

const JWTService = require('./jwt-service');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { createLogger } = require('../shared/utils/logger');

class AuthenticationService {
    constructor() {
        this.logger = createLogger('auth-service');
        this.jwtService = new JWTService();
        this.isRunning = false;
        
        // Cache de sessões ativas (em produção usar Redis)
        this.activeSessions = new Map();
        this.twoFactorSecrets = new Map();
        this.passwordResetTokens = new Map();
        
        // Configurações de segurança
        this.config = {
            maxLoginAttempts: 5,
            lockoutDuration: 15 * 60 * 1000, // 15 minutos
            sessionTimeout: 24 * 60 * 60 * 1000, // 24 horas
            passwordMinLength: 8,
            requireTwoFactor: process.env.REQUIRE_2FA === 'true'
        };
        
        // Banco de usuários temporário (em produção usar PostgreSQL)
        this.users = new Map();
        this.initializeDefaultUsers();
        
        this.logger.info('🔐 Authentication Service initialized');
    }

    /**
     * 🚀 Inicializar serviço
     */
    async start() {
        try {
            this.logger.info('🚀 Starting Authentication Service...');
            
            // Iniciar JWT Service
            await this.jwtService.start();
            
            // Limpar sessões expiradas
            this.startSessionCleanup();
            
            this.isRunning = true;
            this.logger.info('✅ Authentication Service started successfully');
            
        } catch (error) {
            this.logger.error('❌ Failed to start Authentication Service:', error);
            throw error;
        }
    }

    /**
     * 🛑 Parar serviço
     */
    async stop() {
        try {
            this.logger.info('🛑 Stopping Authentication Service...');
            
            await this.jwtService.stop();
            
            if (this.cleanupInterval) {
                clearInterval(this.cleanupInterval);
            }
            
            this.isRunning = false;
            this.logger.info('✅ Authentication Service stopped successfully');
            
        } catch (error) {
            this.logger.error('❌ Error stopping Authentication Service:', error);
            throw error;
        }
    }

    /**
     * 🔍 Health check
     */
    async healthCheck() {
        const jwtHealthy = await this.jwtService.healthCheck();
        return this.isRunning && jwtHealthy;
    }

    /**
     * 👤 Inicializar usuários padrão
     */
    initializeDefaultUsers() {
        const defaultUsers = [
            {
                id: 'admin-001',
                email: 'admin@coinbitclub.com',
                name: 'CoinBitClub Admin',
                password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPKK6J8fJL.yK', // admin123
                userType: 'ADMIN',
                permissions: ['ADMIN', 'FINANCIAL', 'TRADING', 'AFFILIATE', 'USERS'],
                isActive: true,
                twoFactorEnabled: false,
                createdAt: Date.now()
            },
            {
                id: 'user-001',
                email: 'trader@coinbitclub.com',
                name: 'Demo Trader',
                password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPKK6J8fJL.yK', // trader123
                userType: 'TRADER',
                permissions: ['TRADING', 'DASHBOARD'],
                isActive: true,
                twoFactorEnabled: false,
                createdAt: Date.now()
            },
            {
                id: 'affiliate-001',
                email: 'affiliate@coinbitclub.com',
                name: 'Demo Affiliate',
                password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPKK6J8fJL.yK', // affiliate123
                userType: 'AFFILIATE',
                permissions: ['AFFILIATE', 'DASHBOARD'],
                isActive: true,
                twoFactorEnabled: false,
                affiliateId: 'aff-001',
                createdAt: Date.now()
            }
        ];

        defaultUsers.forEach(user => {
            this.users.set(user.email, user);
        });

        this.logger.info(`👤 Initialized ${defaultUsers.length} default users`);
    }

    /**
     * 🔑 Login de usuário
     */
    async login(email, password, deviceId = null, twoFactorCode = null) {
        try {
            this.logger.info(`🔑 Login attempt for: ${email}`);
            
            // Buscar usuário
            const user = this.users.get(email.toLowerCase());
            if (!user) {
                throw new Error('Usuário não encontrado');
            }

            // Verificar se conta está ativa
            if (!user.isActive) {
                throw new Error('Conta desativada');
            }

            // Verificar senha
            const passwordValid = await bcrypt.compare(password, user.password);
            if (!passwordValid) {
                throw new Error('Senha incorreta');
            }

            // Verificar 2FA se habilitado
            if (user.twoFactorEnabled) {
                if (!twoFactorCode) {
                    return {
                        success: false,
                        requiresTwoFactor: true,
                        message: 'Código 2FA necessário'
                    };
                }

                const twoFactorValid = await this.verifyTwoFactor(user.id, twoFactorCode);
                if (!twoFactorValid) {
                    throw new Error('Código 2FA inválido');
                }
            }

            // Gerar tokens
            const tokens = this.jwtService.generateTokens({
                ...user,
                deviceId
            });

            // Criar sessão
            const sessionId = crypto.randomUUID();
            const session = {
                id: sessionId,
                userId: user.id,
                email: user.email,
                deviceId,
                createdAt: Date.now(),
                lastActivity: Date.now(),
                isActive: true
            };

            this.activeSessions.set(sessionId, session);

            this.logger.info(`✅ Login successful for: ${email}`);

            return {
                success: true,
                sessionId,
                ...tokens,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    userType: user.userType,
                    permissions: user.permissions,
                    isAffiliate: !!user.affiliateId
                }
            };

        } catch (error) {
            this.logger.error(`❌ Login failed for ${email}:`, error.message);
            throw error;
        }
    }

    /**
     * 🚪 Logout de usuário
     */
    async logout(sessionId, refreshToken = null) {
        try {
            // Invalidar sessão
            const session = this.activeSessions.get(sessionId);
            if (session) {
                session.isActive = false;
                this.activeSessions.delete(sessionId);
                
                this.logger.info(`🚪 Session ${sessionId} logged out for user: ${session.email}`);
            }

            // Invalidar refresh token
            if (refreshToken) {
                await this.jwtService.logout(refreshToken);
            }

            return { success: true };

        } catch (error) {
            this.logger.error('❌ Error during logout:', error);
            throw error;
        }
    }

    /**
     * 👤 Registrar novo usuário
     */
    async register(userData) {
        try {
            const { email, password, name, userType = 'USER' } = userData;
            
            this.logger.info(`👤 Registration attempt for: ${email}`);

            // Verificar se usuário já existe
            if (this.users.has(email.toLowerCase())) {
                throw new Error('Usuário já existe');
            }

            // Validar senha
            if (password.length < this.config.passwordMinLength) {
                throw new Error(`Senha deve ter pelo menos ${this.config.passwordMinLength} caracteres`);
            }

            // Hash da senha
            const hashedPassword = await bcrypt.hash(password, 12);

            // Criar usuário
            const newUser = {
                id: crypto.randomUUID(),
                email: email.toLowerCase(),
                name,
                password: hashedPassword,
                userType,
                permissions: this.getDefaultPermissions(userType),
                isActive: true,
                twoFactorEnabled: false,
                createdAt: Date.now()
            };

            this.users.set(email.toLowerCase(), newUser);

            this.logger.info(`✅ User registered successfully: ${email}`);

            return {
                success: true,
                user: {
                    id: newUser.id,
                    email: newUser.email,
                    name: newUser.name,
                    userType: newUser.userType
                }
            };

        } catch (error) {
            this.logger.error(`❌ Registration failed:`, error.message);
            throw error;
        }
    }

    /**
     * 🔐 Configurar 2FA
     */
    async setupTwoFactor(userId) {
        try {
            const user = Array.from(this.users.values()).find(u => u.id === userId);
            if (!user) {
                throw new Error('Usuário não encontrado');
            }

            const secret = speakeasy.generateSecret({
                name: `CoinBitClub (${user.email})`,
                issuer: 'CoinBitClub Enterprise',
                length: 32
            });

            // Armazenar secret temporariamente
            this.twoFactorSecrets.set(userId, {
                secret: secret.base32,
                tempSecret: true,
                createdAt: Date.now()
            });

            // Gerar QR Code
            const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

            return {
                secret: secret.base32,
                qrCode: qrCodeUrl,
                manualEntryKey: secret.base32
            };

        } catch (error) {
            this.logger.error('❌ Error setting up 2FA:', error);
            throw error;
        }
    }

    /**
     * ✅ Verificar e ativar 2FA
     */
    async verifyAndActivateTwoFactor(userId, token) {
        try {
            const secretData = this.twoFactorSecrets.get(userId);
            if (!secretData || !secretData.tempSecret) {
                throw new Error('Setup de 2FA não encontrado');
            }

            const verified = speakeasy.totp.verify({
                secret: secretData.secret,
                encoding: 'base32',
                token,
                window: 2
            });

            if (!verified) {
                throw new Error('Código inválido');
            }

            // Ativar 2FA no usuário
            const user = Array.from(this.users.values()).find(u => u.id === userId);
            if (user) {
                user.twoFactorEnabled = true;
                user.twoFactorSecret = secretData.secret;
            }

            // Remover secret temporário
            this.twoFactorSecrets.delete(userId);

            this.logger.info(`🔐 2FA activated for user: ${userId}`);

            return { success: true };

        } catch (error) {
            this.logger.error('❌ Error activating 2FA:', error);
            throw error;
        }
    }

    /**
     * 🔓 Verificar código 2FA
     */
    async verifyTwoFactor(userId, token) {
        try {
            const user = Array.from(this.users.values()).find(u => u.id === userId);
            if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
                return false;
            }

            return speakeasy.totp.verify({
                secret: user.twoFactorSecret,
                encoding: 'base32',
                token,
                window: 2
            });

        } catch (error) {
            this.logger.error('❌ Error verifying 2FA:', error);
            return false;
        }
    }

    /**
     * 🔄 Solicitar reset de senha
     */
    async requestPasswordReset(email) {
        try {
            const user = this.users.get(email.toLowerCase());
            if (!user) {
                // Por segurança, sempre retornar sucesso
                return { success: true, message: 'Se o email existir, um link será enviado' };
            }

            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetData = {
                userId: user.id,
                email: user.email,
                token: resetToken,
                expiresAt: Date.now() + (60 * 60 * 1000), // 1 hora
                used: false
            };

            this.passwordResetTokens.set(resetToken, resetData);

            this.logger.info(`🔄 Password reset requested for: ${email}`);

            return {
                success: true,
                resetToken, // Em produção, enviar por email
                message: 'Link de reset enviado'
            };

        } catch (error) {
            this.logger.error('❌ Error requesting password reset:', error);
            throw error;
        }
    }

    /**
     * 🔐 Reset de senha
     */
    async resetPassword(token, newPassword) {
        try {
            const resetData = this.passwordResetTokens.get(token);
            if (!resetData) {
                throw new Error('Token inválido');
            }

            if (Date.now() > resetData.expiresAt) {
                this.passwordResetTokens.delete(token);
                throw new Error('Token expirado');
            }

            if (resetData.used) {
                throw new Error('Token já utilizado');
            }

            // Validar nova senha
            if (newPassword.length < this.config.passwordMinLength) {
                throw new Error(`Senha deve ter pelo menos ${this.config.passwordMinLength} caracteres`);
            }

            // Buscar e atualizar usuário
            const user = Array.from(this.users.values()).find(u => u.id === resetData.userId);
            if (!user) {
                throw new Error('Usuário não encontrado');
            }

            // Hash da nova senha
            user.password = await bcrypt.hash(newPassword, 12);

            // Marcar token como usado
            resetData.used = true;

            // Invalidar todas as sessões do usuário
            await this.logoutAllSessions(user.id);

            this.logger.info(`🔐 Password reset completed for: ${user.email}`);

            return { success: true };

        } catch (error) {
            this.logger.error('❌ Error resetting password:', error);
            throw error;
        }
    }

    /**
     * 📊 Obter sessões ativas
     */
    getActiveSessions(userId = null) {
        const sessions = Array.from(this.activeSessions.values()).filter(session => {
            if (userId) {
                return session.userId === userId && session.isActive;
            }
            return session.isActive;
        });

        return sessions.map(session => ({
            id: session.id,
            userId: session.userId,
            email: session.email,
            deviceId: session.deviceId,
            createdAt: session.createdAt,
            lastActivity: session.lastActivity
        }));
    }

    /**
     * 🚪 Logout de todas as sessões
     */
    async logoutAllSessions(userId) {
        let loggedOutCount = 0;

        for (const [sessionId, session] of this.activeSessions) {
            if (session.userId === userId && session.isActive) {
                session.isActive = false;
                this.activeSessions.delete(sessionId);
                loggedOutCount++;
            }
        }

        // Logout de todos os dispositivos no JWT service
        await this.jwtService.logoutAllDevices(userId);

        this.logger.info(`🚪 Logged out ${loggedOutCount} sessions for user: ${userId}`);
        return { success: true, sessionsLoggedOut: loggedOutCount };
    }

    /**
     * 🔧 Obter permissões padrão por tipo de usuário
     */
    getDefaultPermissions(userType) {
        const permissions = {
            'ADMIN': ['ADMIN', 'FINANCIAL', 'TRADING', 'AFFILIATE', 'USERS', 'DASHBOARD'],
            'TRADER': ['TRADING', 'DASHBOARD'],
            'AFFILIATE': ['AFFILIATE', 'DASHBOARD'],
            'USER': ['DASHBOARD']
        };

        return permissions[userType] || permissions['USER'];
    }

    /**
     * 🧹 Limpeza de sessões expiradas
     */
    startSessionCleanup() {
        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            let cleanedCount = 0;

            for (const [sessionId, session] of this.activeSessions) {
                if (!session.isActive || (now - session.lastActivity) > this.config.sessionTimeout) {
                    this.activeSessions.delete(sessionId);
                    cleanedCount++;
                }
            }

            // Limpar tokens de reset expirados
            for (const [token, resetData] of this.passwordResetTokens) {
                if (now > resetData.expiresAt || resetData.used) {
                    this.passwordResetTokens.delete(token);
                }
            }

            if (cleanedCount > 0) {
                this.logger.info(`🧹 Cleaned ${cleanedCount} expired sessions`);
            }
        }, 5 * 60 * 1000); // A cada 5 minutos
    }

    /**
     * 📊 Estatísticas do serviço
     */
    getStats() {
        const jwtStats = this.jwtService.getTokenStats();
        
        return {
            totalUsers: this.users.size,
            activeSessions: this.activeSessions.size,
            activeUsers: new Set(Array.from(this.activeSessions.values()).map(s => s.userId)).size,
            twoFactorEnabled: Array.from(this.users.values()).filter(u => u.twoFactorEnabled).length,
            pendingResets: this.passwordResetTokens.size,
            jwt: jwtStats
        };
    }

    /**
     * 📨 Handle messages from orchestrator
     */
    async handleMessage(action, payload, metadata) {
        try {
            switch (action) {
                case 'login':
                    return await this.login(
                        payload.email,
                        payload.password,
                        payload.deviceId,
                        payload.twoFactorCode
                    );

                case 'logout':
                    return await this.logout(payload.sessionId, payload.refreshToken);

                case 'register':
                    return await this.register(payload.userData);

                case 'resetPassword':
                    if (payload.step === 'request') {
                        return await this.requestPasswordReset(payload.email);
                    } else if (payload.step === 'reset') {
                        return await this.resetPassword(payload.token, payload.newPassword);
                    }
                    break;

                case 'setup2FA':
                    return await this.setupTwoFactor(payload.userId);

                case 'verify2FA':
                    return await this.verifyAndActivateTwoFactor(payload.userId, payload.token);

                case 'getStats':
                    return this.getStats();

                case 'getSessions':
                    return this.getActiveSessions(payload.userId);

                default:
                    throw new Error(`Unknown action: ${action}`);
            }
        } catch (error) {
            this.logger.error(`❌ Error handling message ${action}:`, error);
            throw error;
        }
    }
}

module.exports = AuthenticationService;
