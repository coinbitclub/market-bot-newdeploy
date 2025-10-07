/**
 * 🔒 SECRETS MANAGEMENT SYSTEM
 * 
 * Sistema de gerenciamento seguro de secrets
 */

const crypto = require('crypto');
const { logger } = require('./logger');

class SecretsManager {
    constructor() {
        this.secrets = new Map();
        this.encryptionKey = this.getEncryptionKey();
        this.requiredSecrets = [
            'POSTGRES_URL',
            'OPENAI_API_KEY',
            'JWT_SECRET'
        ];
    }

    getEncryptionKey() {
        const key = process.env.ENCRYPTION_KEY;
        if (!key) {
            // Gerar chave temporária para desenvolvimento
            if (process.env.NODE_ENV === 'development') {
                logger.warn('Usando chave de encriptação temporária para desenvolvimento');
                return crypto.createHash('sha256').update('dev-encryption-key').digest();
            }
            throw new Error('ENCRYPTION_KEY não definida para ambiente de produção');
        }
        return crypto.createHash('sha256').update(key).digest();
    }

    encrypt(text) {
        // SECURITY FIX: Use authenticated encryption (AES-256-GCM) with proper IV
        const iv = crypto.randomBytes(16);
        const algorithm = 'aes-256-gcm';

        const cipher = crypto.createCipheriv(algorithm, this.encryptionKey, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // Get authentication tag for integrity verification
        const authTag = cipher.getAuthTag();

        // Format: IV:AuthTag:EncryptedData
        return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    }

    decrypt(encryptedText) {
        try {
            const parts = encryptedText.split(':');

            // Handle both old format (IV:Encrypted) and new format (IV:AuthTag:Encrypted)
            if (parts.length === 2) {
                // Old format - attempt legacy decryption (for backward compatibility)
                logger.warn('Decrypting data with legacy format - please re-encrypt');
                return this.decryptLegacy(encryptedText);
            }

            const iv = Buffer.from(parts[0], 'hex');
            const authTag = Buffer.from(parts[1], 'hex');
            const encrypted = parts[2];
            const algorithm = 'aes-256-gcm';

            const decipher = crypto.createDecipheriv(algorithm, this.encryptionKey, iv);
            decipher.setAuthTag(authTag);

            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            logger.error('Decryption failed', { error: error.message });
            throw new Error('Failed to decrypt data - data may be corrupted or tampered');
        }
    }

    /**
     * Legacy decryption for backward compatibility (DEPRECATED)
     * Should only be used during migration period
     */
    decryptLegacy(encryptedText) {
        try {
            const parts = encryptedText.split(':');
            const encrypted = parts[1];

            // Use ECB mode for legacy data (insecure but needed for migration)
            const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            logger.warn('Legacy decryption used - please re-encrypt this secret');
            return decrypted;
        } catch (error) {
            throw new Error('Failed to decrypt legacy data');
        }
    }

    setSecret(key, value, encrypt = false) {
        const secretValue = encrypt ? this.encrypt(value) : value;
        this.secrets.set(key, {
            value: secretValue,
            encrypted: encrypt,
            createdAt: new Date(),
            accessCount: 0
        });
        
        logger.info(`Secret '${key}' stored`, { encrypted });
    }

    getSecret(key) {
        const secret = this.secrets.get(key);
        if (!secret) {
            // Tentar obter da variável de ambiente
            const envValue = process.env[key];
            if (envValue) {
                this.setSecret(key, envValue, false);
                return envValue;
            }
            return null;
        }

        secret.accessCount++;
        secret.lastAccessed = new Date();

        return secret.encrypted ? this.decrypt(secret.value) : secret.value;
    }

    hasSecret(key) {
        return this.secrets.has(key) || !!process.env[key];
    }

    validateRequiredSecrets() {
        const missing = [];
        
        for (const secretKey of this.requiredSecrets) {
            if (!this.hasSecret(secretKey)) {
                missing.push(secretKey);
            }
        }

        if (missing.length > 0) {
            throw new Error(`Secrets obrigatórios não encontrados: ${missing.join(', ')}`);
        }

        logger.info('Todos os secrets obrigatórios estão disponíveis');
    }

    // Rotação de secrets (para implementação futura)
    rotateSecret(key, newValue) {
        const oldSecret = this.secrets.get(key);
        if (oldSecret) {
            // Manter histórico para rollback
            this.secrets.set(`${key}_previous`, oldSecret);
        }
        
        this.setSecret(key, newValue, true);
        logger.info(`Secret '${key}' rotacionado`);
    }

    // Auditoria de acesso a secrets
    getAuditLog() {
        const auditLog = [];
        
        for (const [key, secret] of this.secrets.entries()) {
            auditLog.push({
                key,
                createdAt: secret.createdAt,
                lastAccessed: secret.lastAccessed,
                accessCount: secret.accessCount,
                encrypted: secret.encrypted
            });
        }
        
        return auditLog;
    }

    // Limpar secrets sensíveis da memória
    clearSecrets() {
        this.secrets.clear();
        logger.info('Secrets limpos da memória');
    }
}

// Instância global
const secretsManager = new SecretsManager();

module.exports = { SecretsManager, secretsManager };
