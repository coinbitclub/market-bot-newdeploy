/**
 * 🔐 API KEY ENCRYPTION SERVICE
 * Secure encryption/decryption of user API secrets using AES-256-GCM
 */

const crypto = require('crypto');

class APIKeyEncryption {
    constructor() {
        // Use ENCRYPTION_KEY from environment (must be 32 bytes for AES-256)
        this.encryptionKey = this.getEncryptionKey();
        this.algorithm = 'aes-256-gcm';
        this.ivLength = 16; // For GCM
        this.saltLength = 64;
        this.tagLength = 16; // Authentication tag
    }

    /**
     * Get or generate encryption key from environment
     */
    getEncryptionKey() {
        const envKey = process.env.ENCRYPTION_KEY || process.env.API_KEY_ENCRYPTION_SECRET;

        if (!envKey) {
            console.warn('⚠️ ENCRYPTION_KEY not set in environment! Using temporary key (NOT SECURE FOR PRODUCTION)');
            // In production, this should throw an error
            return crypto.randomBytes(32);
        }

        // Derive 32-byte key from environment variable using PBKDF2
        return crypto.pbkdf2Sync(envKey, 'api-key-salt', 100000, 32, 'sha256');
    }

    /**
     * Encrypt API secret
     * @param {string} plaintext - The API secret to encrypt
     * @returns {string} Encrypted string in format: iv:encrypted:authTag
     */
    encrypt(plaintext) {
        try {
            if (!plaintext) {
                throw new Error('Cannot encrypt empty value');
            }

            // Generate random IV (Initialization Vector)
            const iv = crypto.randomBytes(this.ivLength);

            // Create cipher
            const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

            // Encrypt
            let encrypted = cipher.update(plaintext, 'utf8', 'hex');
            encrypted += cipher.final('hex');

            // Get authentication tag
            const authTag = cipher.getAuthTag();

            // Return as combined string: iv:encrypted:authTag (all in hex)
            return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;

        } catch (error) {
            console.error('❌ Encryption error:', error.message);
            throw new Error('Failed to encrypt API secret');
        }
    }

    /**
     * Decrypt API secret
     * @param {string} encryptedData - Encrypted string from database
     * @returns {string} Decrypted API secret
     */
    decrypt(encryptedData) {
        try {
            if (!encryptedData) {
                console.warn('⚠️ Cannot decrypt empty value');
                return null;
            }

            // Split the encrypted data
            const parts = encryptedData.split(':');
            if (parts.length !== 3) {
                console.warn('⚠️ Invalid encrypted data format');
                return null;
            }

            const iv = Buffer.from(parts[0], 'hex');
            const encrypted = parts[1];
            const authTag = Buffer.from(parts[2], 'hex');

            // Create decipher
            const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
            decipher.setAuthTag(authTag);

            // Decrypt
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;

        } catch (error) {
            console.warn('⚠️ Decryption failed, API key may be corrupted or encryption key changed:', error.message);
            return null; // Return null instead of throwing error
        }
    }

    /**
     * Hash API key for verification (one-way, can't be reversed)
     * Used to detect if user changed their API key
     */
    hashAPIKey(apiKey) {
        return crypto.createHash('sha256').update(apiKey).digest('hex');
    }

    /**
     * Securely compare two strings (prevents timing attacks)
     */
    secureCompare(a, b) {
        if (typeof a !== 'string' || typeof b !== 'string') {
            return false;
        }
        if (a.length !== b.length) {
            return false;
        }
        return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    }

    /**
     * Generate secure random API key (for testing purposes)
     */
    generateTestAPIKey() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Validate API key format
     */
    validateAPIKeyFormat(apiKey, exchange) {
        if (!apiKey || typeof apiKey !== 'string') {
            return { valid: false, error: 'API key is required' };
        }

        // Exchange-specific validation
        switch (exchange.toLowerCase()) {
            case 'bybit':
                // Bybit API keys are typically alphanumeric, length varies
                if (apiKey.length < 10 || apiKey.length > 100) {
                    return { valid: false, error: 'Invalid Bybit API key length' };
                }
                if (!/^[a-zA-Z0-9]+$/.test(apiKey)) {
                    return { valid: false, error: 'Invalid Bybit API key format' };
                }
                break;

            case 'binance':
                // Binance API keys are exactly 64 characters
                if (apiKey.length !== 64) {
                    return { valid: false, error: 'Binance API key must be 64 characters' };
                }
                if (!/^[a-zA-Z0-9]+$/.test(apiKey)) {
                    return { valid: false, error: 'Invalid Binance API key format' };
                }
                break;

            default:
                return { valid: false, error: 'Unsupported exchange' };
        }

        return { valid: true };
    }

    /**
     * Mask API key for display (show only first/last chars)
     */
    maskAPIKey(apiKey) {
        if (!apiKey || apiKey.length < 8) {
            return '***';
        }
        return `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
    }
}

// Singleton instance
const apiKeyEncryption = new APIKeyEncryption();

module.exports = apiKeyEncryption;
