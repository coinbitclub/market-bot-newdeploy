/**
 * 🔐 MIDDLEWARE 2FA - AUTENTICAÇÃO DOIS FATORES
 * ============================================
 * 
 * Sistema completo de autenticação dois fatores
 * Conforme especificação técnica CoinBitClub
 * 
 * @author CoinBitClub Enterprise Team
 * @version 6.0.0
 */

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const twilio = require('twilio');

class TwoFactorAuthMiddleware {
    constructor() {
        this.twilioClient = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );
        
        console.log('🔐 Middleware 2FA inicializado');
    }

    /**
     * 📱 Gerar QR Code para Google Authenticator
     */
    async generateQRCode(userId, email) {
        const secret = speakeasy.generateSecret({
            name: `CoinBitClub (${email})`,
            issuer: 'CoinBitClub Enterprise',
            length: 20
        });

        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

        return {
            secret: secret.base32,
            qrCode: qrCodeUrl,
            backupCodes: this.generateBackupCodes()
        };
    }

    /**
     * 📞 Enviar código SMS
     */
    async sendSMSCode(phoneNumber) {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        try {
            await this.twilioClient.messages.create({
                body: `Seu código CoinBitClub: ${code}. Válido por 5 minutos.`,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: phoneNumber
            });

            return code;
        } catch (error) {
            console.error('❌ Erro ao enviar SMS:', error.message);
            throw new Error('Falha no envio do SMS');
        }
    }

    /**
     * ✅ Verificar código 2FA
     */
    verifyTwoFACode(secret, token) {
        return speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: 2 // Permite 60s de tolerância
        });
    }

    /**
     * 🔑 Gerar códigos de backup
     */
    generateBackupCodes() {
        const codes = [];
        for (let i = 0; i < 10; i++) {
            codes.push(Math.random().toString(36).substr(2, 8).toUpperCase());
        }
        return codes;
    }

    /**
     * 🛡️ Middleware principal de validação 2FA
     */
    validateTwoFA() {
        return async (req, res, next) => {
            try {
                const { user } = req;
                const { twofa_code, sms_code } = req.body;

                // Se usuário não tem 2FA ativado, prosseguir
                if (!user.requires_2fa) {
                    return next();
                }

                // Verificar se código foi fornecido
                if (!twofa_code && !sms_code) {
                    return res.status(401).json({
                        error: '2FA requerido',
                        requires_2fa: true,
                        methods: user.twofa_methods || ['app', 'sms']
                    });
                }

                let isValid = false;

                // Verificar código do app
                if (twofa_code && user.twofa_secret) {
                    isValid = this.verifyTwoFACode(user.twofa_secret, twofa_code);
                }

                // Verificar código SMS (se não validou por app)
                if (!isValid && sms_code && user.sms_verification_code) {
                    const now = Date.now();
                    const codeTime = new Date(user.sms_code_generated_at).getTime();
                    
                    // Verificar se código não expirou (5 minutos)
                    if (now - codeTime < 300000) {
                        isValid = sms_code === user.sms_verification_code;
                    }
                }

                // Verificar códigos de backup
                if (!isValid && twofa_code && user.backup_codes) {
                    const backupCodes = JSON.parse(user.backup_codes);
                    const codeIndex = backupCodes.indexOf(twofa_code.toUpperCase());
                    
                    if (codeIndex !== -1) {
                        // Remover código usado
                        backupCodes.splice(codeIndex, 1);
                        user.backup_codes = JSON.stringify(backupCodes);
                        isValid = true;
                        
                        // TODO: Atualizar banco de dados
                        console.log('⚠️ Código de backup utilizado');
                    }
                }

                if (!isValid) {
                    return res.status(401).json({
                        error: '2FA inválido',
                        attempts_remaining: 3 // TODO: Implementar contador
                    });
                }

                // Log de segurança
                console.log(`🔐 2FA validado com sucesso - Usuário: ${user.id}`);
                next();

            } catch (error) {
                console.error('❌ Erro na validação 2FA:', error.message);
                res.status(500).json({ error: 'Erro interno na validação 2FA' });
            }
        };
    }

    /**
     * 📱 Middleware para operações sensíveis
     */
    requireStrongAuth() {
        return async (req, res, next) => {
            const { user } = req;
            
            // Para operações críticas, sempre exigir 2FA
            if (!user.requires_2fa) {
                return res.status(403).json({
                    error: 'Operação sensível requer 2FA',
                    setup_2fa_required: true
                });
            }

            // Aplicar validação 2FA normal
            return this.validateTwoFA()(req, res, next);
        };
    }
}

module.exports = TwoFactorAuthMiddleware;
