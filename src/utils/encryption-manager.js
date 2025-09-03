#!/usr/bin/env node

/**
 * 🔐 SISTEMA DE CRIPTOGRAFIA PARA CHAVES DE API
 * ============================================
 * 
 * Gerenciamento seguro de chaves das exchanges dos usuários
 */

const crypto = require('crypto');

class EncryptionManager {
    constructor() {
        // Chave de criptografia do sistema (em produção deve vir do .env)
        this.secretKey = process.env.ENCRYPTION_SECRET || 'coinbitclub-encryption-secret-2025-super-secure-key';
        this.algorithm = 'aes-256-gcm';
        this.ivLength = 16; // For GCM, this is 16 bytes
        this.tagLength = 16; // For GCM, this is 16 bytes
    }

    encrypt(text) {
        if (!text) return null;
        
        try {
            const iv = crypto.randomBytes(this.ivLength);
            const cipher = crypto.createCipher(this.algorithm, this.secretKey);
            cipher.setAAD(Buffer.from('coinbitclub-api-keys', 'utf8'));
            
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const tag = cipher.getAuthTag();
            
            // Combinar IV + tag + dados criptografados
            return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
            
        } catch (error) {
            console.error('❌ Erro ao criptografar:', error.message);
            return null;
        }
    }

    decrypt(encryptedData) {
        if (!encryptedData) return null;
        
        try {
            const parts = encryptedData.split(':');
            if (parts.length !== 3) {
                throw new Error('Formato de dados criptografados inválido');
            }
            
            const iv = Buffer.from(parts[0], 'hex');
            const tag = Buffer.from(parts[1], 'hex');
            const encrypted = parts[2];
            
            const decipher = crypto.createDecipher(this.algorithm, this.secretKey);
            decipher.setAAD(Buffer.from('coinbitclub-api-keys', 'utf8'));
            decipher.setAuthTag(tag);
            
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
            
        } catch (error) {
            console.error('❌ Erro ao descriptografar:', error.message);
            return null;
        }
    }

    // Método simplificado para compatibilidade
    encryptSimple(text) {
        if (!text) return null;
        
        try {
            const algorithm = 'aes-256-cbc';
            const key = crypto.scryptSync(this.secretKey, 'salt', 32);
            const iv = crypto.randomBytes(16);
            
            const cipher = crypto.createCipheriv(algorithm, key, iv);
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            return iv.toString('hex') + ':' + encrypted;
        } catch (error) {
            console.error('❌ Erro ao criptografar (simples):', error.message);
            return null;
        }
    }

    decryptSimple(encryptedData) {
        if (!encryptedData) return null;
        
        try {
            const algorithm = 'aes-256-cbc';
            const key = crypto.scryptSync(this.secretKey, 'salt', 32);
            
            const textParts = encryptedData.split(':');
            const iv = Buffer.from(textParts.shift(), 'hex');
            const encryptedText = textParts.join(':');
            
            const decipher = crypto.createDecipheriv(algorithm, key, iv);
            let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            console.error('❌ Erro ao descriptografar (simples):', error.message);
            return null;
        }
    }
}

module.exports = EncryptionManager;
