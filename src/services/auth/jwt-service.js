/**
 * 🔐 JWT SERVICE - ENTERPRISE AUTHENTICATION
 * Sistema completo de autenticação JWT para frontend
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

class JWTService {
    constructor() {
        this.secretKey = process.env.JWT_SECRET || 'coinbitclub_enterprise_secret_2025';
        this.refreshSecret = process.env.JWT_REFRESH_SECRET || 'coinbitclub_refresh_secret_2025';
        this.expiresIn = process.env.JWT_EXPIRES_IN || '24h';
        this.refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    }

    /**
     * Gerar token de acesso e refresh token
     */
    generateTokens(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            userType: user.userType || 'USER',
            affiliateId: user.affiliateId || null,
            permissions: user.permissions || [],
            timestamp: Date.now()
        };

        const accessToken = jwt.sign(payload, this.secretKey, {
            expiresIn: this.expiresIn,
            issuer: 'coinbitclub-enterprise',
            audience: 'coinbitclub-frontend'
        });

        const refreshToken = jwt.sign(
            { userId: user.id, tokenId: crypto.randomUUID() },
            this.refreshSecret,
            { expiresIn: this.refreshExpiresIn }
        );

        return {
            accessToken,
            refreshToken,
            expiresIn: this.expiresIn,
            tokenType: 'Bearer',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                userType: user.userType,
                isAffiliate: !!user.affiliateId,
                permissions: user.permissions || []
            }
        };
    }

    /**
     * Verificar e decodificar token
     */
    verifyToken(token) {
        try {
            const decoded = jwt.verify(token, this.secretKey);
            return { valid: true, decoded };
        } catch (error) {
            return { 
                valid: false, 
                error: error.name,
                message: error.message 
            };
        }
    }

    /**
     * Renovar token usando refresh token
     */
    refreshAccessToken(refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, this.refreshSecret);
            
            // Aqui você buscaria o usuário no banco de dados
            // Por agora, retornamos um usuário mock
            const user = {
                id: decoded.userId,
                email: 'user@coinbitclub.com',
                name: 'Enterprise User',
                userType: 'USER'
            };

            return this.generateTokens(user);
        } catch (error) {
            throw new Error('Invalid refresh token');
        }
    }

    /**
     * Hash de senha
     */
    async hashPassword(password) {
        const saltRounds = 12;
        return await bcrypt.hash(password, saltRounds);
    }

    /**
     * Verificar senha
     */
    async comparePassword(password, hashedPassword) {
        return await bcrypt.compare(password, hashedPassword);
    }

    /**
     * Gerar token de reset de senha
     */
    generateResetToken(email) {
        const payload = {
            email,
            purpose: 'password_reset',
            timestamp: Date.now()
        };

        return jwt.sign(payload, this.secretKey, {
            expiresIn: '1h',
            issuer: 'coinbitclub-enterprise'
        });
    }

    /**
     * Verificar token de reset
     */
    verifyResetToken(token) {
        try {
            const decoded = jwt.verify(token, this.secretKey);
            if (decoded.purpose !== 'password_reset') {
                throw new Error('Invalid token purpose');
            }
            return { valid: true, email: decoded.email };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    /**
     * Extrair token do header Authorization
     */
    extractTokenFromHeader(authHeader) {
        if (!authHeader) return null;
        
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return null;
        }
        
        return parts[1];
    }

    /**
     * Verificar permissões do usuário
     */
    hasPermission(userPermissions, requiredPermission) {
        if (!userPermissions || !Array.isArray(userPermissions)) {
            return false;
        }
        
        return userPermissions.includes(requiredPermission) || 
               userPermissions.includes('ADMIN');
    }

    /**
     * Gerar API Key para usuário
     */
    generateApiKey(userId) {
        const apiKey = crypto.randomBytes(32).toString('hex');
        const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
        
        return {
            apiKey: `cbk_${apiKey}`,
            hashedKey,
            userId,
            createdAt: new Date().toISOString()
        };
    }
}

module.exports = JWTService;
