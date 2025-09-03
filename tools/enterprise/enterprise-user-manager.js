/**
 * SISTEMA ENTERPRISE - USER PROFILE MANAGER
 * CoinBitClub Market Bot v6.0.0 Enterprise
 * 
 * Gerenciador completo de perfis de usuário enterprise
 * Integração com Twilio, Stripe e sistema de validação
 */

const { Pool } = require('pg');
const twilio = require('twilio');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class EnterpriseUserManager {
    constructor() {
        // Configurações do banco de dados
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
            ssl: { rejectUnauthorized: false }
        });

        // Cliente Twilio (opcional para demo)
        this.twilioClient = null;
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            try {
                this.twilioClient = twilio(
                    process.env.TWILIO_ACCOUNT_SID,
                    process.env.TWILIO_AUTH_TOKEN
                );
                console.log('✅ Twilio configurado');
            } catch (error) {
                console.log('⚠️ Twilio não configurado - modo demo');
            }
        } else {
            console.log('⚠️ Credenciais Twilio não encontradas - modo demo');
        }

        // Templates SMS por perfil
        this.smsTemplates = {
            basic: 'Bem-vindo ao CoinBitClub! Código: {code}',
            premium: '🎯 Bem-vindo Premium! Seu código: {code}',
            enterprise: '🏢 Cadastro Enterprise. Código: {code}',
            affiliate_normal: '🤝 Bem-vindo Afiliado! Código: {code}',
            affiliate_vip: '💎 Bem-vindo Afiliado VIP! Código: {code}',
            admin: '👑 Acesso Admin. Código: {code}'
        };

        // Configurações de perfil
        this.profileConfigs = {
            basic: {
                limits: { maxDailyWithdrawal: 1000, maxOperationAmount: 500, maxConcurrentTrades: 2 },
                requiredFields: ['nome_completo', 'whatsapp', 'pais'],
                dashboardAccess: ['trading', 'operations', 'profile']
            },
            premium: {
                limits: { maxDailyWithdrawal: 5000, maxOperationAmount: 2000, maxConcurrentTrades: 5 },
                requiredFields: ['nome_completo', 'whatsapp', 'pais', 'cpf'],
                dashboardAccess: ['trading', 'operations', 'profile', 'analytics', 'reports']
            },
            enterprise: {
                limits: { maxDailyWithdrawal: 50000, maxOperationAmount: 20000, maxConcurrentTrades: 10 },
                requiredFields: ['nome_completo', 'whatsapp', 'pais', 'cpf', 'banco', 'conta'],
                dashboardAccess: ['trading', 'operations', 'profile', 'analytics', 'reports', 'admin', 'compliance']
            },
            affiliate_normal: {
                limits: { maxDailyWithdrawal: 2000, maxOperationAmount: 1000, maxConcurrentTrades: 3 },
                requiredFields: ['nome_completo', 'whatsapp', 'pais', 'cpf', 'chave_pix'],
                dashboardAccess: ['trading', 'operations', 'profile', 'affiliate', 'commissions']
            },
            affiliate_vip: {
                limits: { maxDailyWithdrawal: 10000, maxOperationAmount: 5000, maxConcurrentTrades: 7 },
                requiredFields: ['nome_completo', 'whatsapp', 'pais', 'cpf', 'banco', 'conta'],
                dashboardAccess: ['trading', 'operations', 'profile', 'affiliate', 'commissions', 'vip-tools']
            },
            admin: {
                limits: { maxDailyWithdrawal: 100000, maxOperationAmount: 50000, maxConcurrentTrades: 20 },
                requiredFields: ['nome_completo', 'whatsapp'],
                dashboardAccess: ['*']
            }
        };
    }

    /**
     * Registrar novo usuário enterprise
     */
    async registerEnterpriseUser(userData) {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');

            console.log('🚀 Iniciando registro enterprise...', userData.profile_type);

            // 1. Validar dados do perfil
            const validation = this.validateProfileData(userData);
            if (!validation.valid) {
                throw new Error(`Dados inválidos: ${validation.errors.join(', ')}`);
            }

            // 2. Verificar se email já existe
            const emailCheck = await client.query(
                'SELECT id FROM users WHERE email = $1',
                [userData.email]
            );

            if (emailCheck.rows.length > 0) {
                throw new Error('Email já cadastrado no sistema');
            }

            // 3. Hash da senha
            const passwordHash = await bcrypt.hash(userData.password, 10);

            // 4. Criar usuário principal
            const userResult = await client.query(`
                INSERT INTO users (
                    email, password_hash, name, country, user_type, is_active
                ) VALUES ($1, $2, $3, $4, $5, true)
                RETURNING id, email, name
            `, [
                userData.email,
                passwordHash,
                userData.nome_completo,
                userData.pais,
                userData.profile_type === 'admin' ? 'admin' : 'user'
            ]);

            const userId = userResult.rows[0].id;
            console.log('✅ Usuário criado:', userId);

            // 5. Criar perfil enterprise
            const profileResult = await client.query(`
                INSERT INTO user_profiles_enterprise (
                    user_id, profile_type, nome_completo, cpf, whatsapp, pais,
                    banco, agencia, conta, tipo_conta, chave_pix, tipo_pix,
                    limite_saque_diario, limite_operacao, features_habilitadas, dashboard_access
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                RETURNING id
            `, [
                userId,
                userData.profile_type,
                userData.nome_completo,
                userData.cpf || null,
                userData.whatsapp,
                userData.pais,
                userData.banco || null,
                userData.agencia || null,
                userData.conta || null,
                userData.tipo_conta || null,
                userData.chave_pix || null,
                userData.tipo_pix || null,
                this.profileConfigs[userData.profile_type].limits.maxDailyWithdrawal,
                this.profileConfigs[userData.profile_type].limits.maxOperationAmount,
                this.getProfileFeatures(userData.profile_type),
                this.profileConfigs[userData.profile_type].dashboardAccess
            ]);

            console.log('✅ Perfil enterprise criado:', profileResult.rows[0].id);

            // 6. Se for afiliado, criar nível de afiliado
            if (userData.profile_type.includes('affiliate')) {
                const affiliateLevel = userData.profile_type === 'affiliate_vip' ? 'vip' : 'normal';
                const commissionRate = userData.profile_type === 'affiliate_vip' ? 5.0 : 1.5;

                await client.query(`
                    INSERT INTO affiliate_levels (
                        user_id, level, commission_rate, is_active
                    ) VALUES ($1, $2, $3, true)
                `, [userId, affiliateLevel, commissionRate]);

                console.log('✅ Nível de afiliado criado:', affiliateLevel);
            }

            // 7. Gerar e enviar código SMS
            const smsCode = this.generateSMSCode();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

            await client.query(`
                INSERT INTO sms_verifications (
                    user_id, phone, code, expires_at, purpose
                ) VALUES ($1, $2, $3, $4, 'registration')
            `, [userId, userData.whatsapp, smsCode, expiresAt]);

            // 8. Enviar SMS
            await this.sendWelcomeSMS(userData.whatsapp, smsCode, userData.profile_type);

            await client.query('COMMIT');

            console.log('🎉 Registro enterprise concluído com sucesso!');

            return {
                success: true,
                user: {
                    id: userId,
                    email: userData.email,
                    name: userData.nome_completo,
                    profile_type: userData.profile_type,
                    whatsapp: userData.whatsapp,
                    verification_required: true
                }
            };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Erro no registro enterprise:', error.message);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Verificar código SMS
     */
    async verifySMSCode(userId, code) {
        const client = await this.pool.connect();
        
        try {
            // Verificar código
            const verificationResult = await client.query(`
                SELECT id, expires_at, verified_at 
                FROM sms_verifications 
                WHERE user_id = $1 AND code = $2 AND purpose = 'registration'
                ORDER BY created_at DESC
                LIMIT 1
            `, [userId, code]);

            if (verificationResult.rows.length === 0) {
                throw new Error('Código SMS inválido');
            }

            const verification = verificationResult.rows[0];

            if (verification.verified_at) {
                throw new Error('Código já foi utilizado');
            }

            if (new Date() > verification.expires_at) {
                throw new Error('Código expirado. Solicite um novo código');
            }

            // Marcar como verificado
            await client.query(`
                UPDATE sms_verifications 
                SET verified_at = NOW() 
                WHERE id = $1
            `, [verification.id]);

            // Ativar usuário
            await client.query(`
                UPDATE users 
                SET is_email_verified = true, updated_at = NOW()
                WHERE id = $1
            `, [userId]);

            console.log('✅ SMS verificado com sucesso para usuário:', userId);

            // Gerar token JWT
            const token = this.generateJWT(userId);

            return {
                success: true,
                message: 'Verificação concluída com sucesso',
                token
            };

        } catch (error) {
            console.error('❌ Erro na verificação SMS:', error.message);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Obter perfil completo do usuário
     */
    async getUserProfile(userId) {
        try {
            const result = await this.pool.query(`
                SELECT 
                    u.id, u.email, u.name, u.country, u.is_active, u.created_at,
                    upe.profile_type, upe.nome_completo, upe.cpf, upe.whatsapp, upe.pais,
                    upe.banco, upe.agencia, upe.conta, upe.tipo_conta,
                    upe.chave_pix, upe.tipo_pix, upe.dados_validados,
                    upe.limite_saque_diario, upe.limite_operacao,
                    upe.features_habilitadas, upe.dashboard_access,
                    al.level as affiliate_level, al.commission_rate as affiliate_commission_rate,
                    pe.name as current_plan_name, se.status as subscription_status
                FROM users u
                JOIN user_profiles_enterprise upe ON u.id = upe.user_id
                LEFT JOIN affiliate_levels al ON u.id = al.user_id AND al.is_active = true
                LEFT JOIN subscriptions_enterprise se ON u.id = se.user_id AND se.status = 'active'
                LEFT JOIN plans_enterprise pe ON se.plan_id = pe.id
                WHERE u.id = $1
            `, [userId]);

            if (result.rows.length === 0) {
                throw new Error('Usuário não encontrado');
            }

            return result.rows[0];
        } catch (error) {
            console.error('❌ Erro ao buscar perfil:', error.message);
            throw error;
        }
    }

    /**
     * Atualizar perfil do usuário
     */
    async updateUserProfile(userId, updateData) {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');

            // Validar dados
            const validation = this.validateProfileData(updateData);
            if (!validation.valid) {
                throw new Error(`Dados inválidos: ${validation.errors.join(', ')}`);
            }

            // Campos permitidos para atualização
            const allowedFields = [
                'nome_completo', 'cpf', 'whatsapp', 'pais',
                'banco', 'agencia', 'conta', 'tipo_conta',
                'chave_pix', 'tipo_pix'
            ];

            const updateFields = [];
            const updateValues = [];
            let paramIndex = 1;

            Object.keys(updateData).forEach(field => {
                if (allowedFields.includes(field) && updateData[field] !== undefined) {
                    updateFields.push(`${field} = $${paramIndex}`);
                    updateValues.push(updateData[field]);
                    paramIndex++;
                }
            });

            if (updateFields.length === 0) {
                throw new Error('Nenhum campo válido para atualização');
            }

            updateValues.push(userId);

            await client.query(`
                UPDATE user_profiles_enterprise 
                SET ${updateFields.join(', ')}, updated_at = NOW()
                WHERE user_id = $${paramIndex}
            `, updateValues);

            await client.query('COMMIT');

            console.log('✅ Perfil atualizado:', userId);

            return { success: true, message: 'Perfil atualizado com sucesso' };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Erro ao atualizar perfil:', error.message);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Migrar perfil do usuário
     */
    async migrateUserProfile(userId, newProfileType, adminId = null) {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');

            // Verificar perfil atual
            const currentProfile = await client.query(`
                SELECT profile_type FROM user_profiles_enterprise WHERE user_id = $1
            `, [userId]);

            if (currentProfile.rows.length === 0) {
                throw new Error('Perfil não encontrado');
            }

            const currentType = currentProfile.rows[0].profile_type;

            // Verificar se migração é permitida
            if (!this.isMigrationAllowed(currentType, newProfileType)) {
                throw new Error(`Migração de ${currentType} para ${newProfileType} não é permitida`);
            }

            // Atualizar perfil
            const newConfig = this.profileConfigs[newProfileType];
            
            await client.query(`
                UPDATE user_profiles_enterprise 
                SET 
                    profile_type = $1,
                    limite_saque_diario = $2,
                    limite_operacao = $3,
                    features_habilitadas = $4,
                    dashboard_access = $5,
                    updated_at = NOW()
                WHERE user_id = $6
            `, [
                newProfileType,
                newConfig.limits.maxDailyWithdrawal,
                newConfig.limits.maxOperationAmount,
                this.getProfileFeatures(newProfileType),
                newConfig.dashboardAccess,
                userId
            ]);

            // Log da migração
            await client.query(`
                INSERT INTO audit_logs (
                    user_id, action, table_name, record_id, old_values, new_values, changed_by
                ) VALUES ($1, 'PROFILE_MIGRATION', 'user_profiles_enterprise', $2, $3, $4, $5)
            `, [
                userId,
                userId,
                JSON.stringify({ profile_type: currentType }),
                JSON.stringify({ profile_type: newProfileType }),
                adminId
            ]);

            await client.query('COMMIT');

            console.log(`✅ Perfil migrado de ${currentType} para ${newProfileType}:`, userId);

            return { success: true, message: 'Migração realizada com sucesso' };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Erro na migração:', error.message);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Validar dados do perfil
     */
    validateProfileData(data) {
        const errors = [];

        if (!data.profile_type) {
            errors.push('Tipo de perfil é obrigatório');
        }

        if (!data.nome_completo || data.nome_completo.length < 3) {
            errors.push('Nome completo é obrigatório (mínimo 3 caracteres)');
        }

        if (!data.whatsapp) {
            errors.push('WhatsApp é obrigatório');
        } else if (!/^\+\d{10,15}$/.test(data.whatsapp)) {
            errors.push('WhatsApp deve estar no formato +5511999999999');
        }

        if (!data.pais) {
            errors.push('País é obrigatório');
        }

        // Validações específicas por perfil
        if (data.profile_type && this.profileConfigs[data.profile_type]) {
            const requiredFields = this.profileConfigs[data.profile_type].requiredFields;
            
            requiredFields.forEach(field => {
                if (!data[field]) {
                    errors.push(`${field} é obrigatório para o perfil ${data.profile_type}`);
                }
            });
        }

        // Validação de CPF (Brasil)
        if (data.cpf && data.pais === 'BR') {
            if (!/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(data.cpf)) {
                errors.push('CPF deve estar no formato XXX.XXX.XXX-XX');
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Enviar SMS de boas-vindas
     */
    async sendWelcomeSMS(phone, code, profileType) {
        try {
            const template = this.smsTemplates[profileType] || this.smsTemplates.basic;
            const message = template.replace('{code}', code);

            const result = await this.twilioClient.messages.create({
                body: message,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: phone
            });

            console.log('✅ SMS enviado:', result.sid);
            return result;
        } catch (error) {
            console.error('❌ Erro ao enviar SMS:', error.message);
            throw error;
        }
    }

    /**
     * Gerar código SMS
     */
    generateSMSCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Gerar token JWT
     */
    generateJWT(userId) {
        return jwt.sign(
            { id: userId, type: 'enterprise' },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );
    }

    /**
     * Obter features do perfil
     */
    getProfileFeatures(profileType) {
        const features = {
            basic: ['trading', 'operations'],
            premium: ['trading', 'operations', 'analytics', 'reports'],
            enterprise: ['trading', 'operations', 'analytics', 'reports', 'api', 'compliance'],
            affiliate_normal: ['trading', 'operations', 'affiliate', 'commissions'],
            affiliate_vip: ['trading', 'operations', 'affiliate', 'commissions', 'vip-tools'],
            admin: ['admin', 'reports', 'users', 'financial', 'system']
        };

        return features[profileType] || [];
    }

    /**
     * Verificar se migração é permitida
     */
    isMigrationAllowed(fromProfile, toProfile) {
        const allowedMigrations = {
            basic: ['premium', 'affiliate_normal'],
            premium: ['enterprise'],
            affiliate_normal: ['affiliate_vip'] // Apenas com aprovação admin
        };

        return allowedMigrations[fromProfile]?.includes(toProfile) || false;
    }

    /**
     * Obter estatísticas por perfil
     */
    async getProfileStatistics() {
        try {
            const result = await this.pool.query(`
                SELECT 
                    COALESCE(upe.profile_type, 'basic') as profile_type,
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN u.is_active = true THEN 1 END) as active_users,
                    COUNT(CASE WHEN upe.verification_status = 'verified' THEN 1 END) as verified_users
                FROM users u
                LEFT JOIN user_profiles_enterprise upe ON u.id = upe.user_id
                GROUP BY upe.profile_type
                ORDER BY total_users DESC
            `);

            return result.rows;
        } catch (error) {
            console.error('❌ Erro ao obter estatísticas:', error.message);
            // Retornar dados demo em caso de erro
            return [
                { profile_type: 'basic', total_users: 0, active_users: 0, verified_users: 0 },
                { profile_type: 'enterprise', total_users: 0, active_users: 0, verified_users: 0 }
            ];
        }
    }
}

module.exports = EnterpriseUserManager;
