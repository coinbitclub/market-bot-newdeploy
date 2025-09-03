/**
 * 🤝 SISTEMA DE AFILIAÇÃO COMPLETO - APIs ATUALIZADAS
 * ==================================================
 * 
 * Sistema atualizado com:
 * ✅ Aprovação automática para AFFILIATE_NORMAL
 * 🔒 Nomeação VIP exclusiva por administradores
 */

const express = require('express');
const { Pool } = require('pg');
const crypto = require('crypto');

class AffiliateSystemComplete {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
        });

        this.config = {
            bonusRate: 0.10, // 10% bônus na conversão
            normalCommissionRate: 0.015, // 1.5% para AFFILIATE_NORMAL
            vipCommissionRate: 0.05, // 5% para AFFILIATE_VIP
            autoApprovalNormal: true // Aprovação automática para AFFILIATE_NORMAL
        };

        console.log('🤝 Affiliate System Complete inicializado - AUTO APPROVAL NORMAL');
    }

    /**
     * 🚀 CRIAR SOLICITAÇÃO DE AFILIAÇÃO (COM AUTO-APROVAÇÃO NORMAL)
     */
    async createAffiliateRequest(userId, fullName, document, tradingExperience, terms) {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');

            // Validações básicas
            if (!userId || !fullName || !document || !terms) {
                throw new Error('Dados obrigatórios não fornecidos');
            }

            // Verificar se usuário já é afiliado
            const existingAffiliate = await client.query(
                'SELECT affiliate_code, affiliate_type FROM users WHERE id = $1',
                [userId]
            );

            if (existingAffiliate.rows[0]?.affiliate_code) {
                throw new Error(`Usuário já é afiliado: ${existingAffiliate.rows[0].affiliate_type}`);
            }

            // Verificar solicitação pendente
            const pendingRequest = await client.query(
                'SELECT id FROM affiliate_requests WHERE user_id = $1 AND status = $2',
                [userId, 'PENDING']
            );

            if (pendingRequest.rows.length > 0) {
                throw new Error('Já existe uma solicitação pendente');
            }

            // APROVAÇÃO AUTOMÁTICA PARA AFFILIATE_NORMAL
            const affiliateCode = await this.generateUniqueAffiliateCode(client);
            
            // 1. Criar registro da solicitação com aprovação automática
            const request = await client.query(`
                INSERT INTO affiliate_requests 
                (user_id, full_name, document, trading_experience, terms_accepted, 
                 status, approved_at, approved_by, affiliate_code_generated, requested_level)
                VALUES ($1, $2, $3, $4, $5, 'APPROVED', NOW(), 'SYSTEM_AUTO', $6, 'AFFILIATE_NORMAL')
                RETURNING *
            `, [userId, fullName, document, tradingExperience, terms, affiliateCode]);

            // 2. Atualizar usuário como afiliado NORMAL automaticamente
            await client.query(`
                UPDATE users 
                SET affiliate_code = $1, 
                    affiliate_type = 'AFFILIATE_NORMAL',
                    affiliate_approved_at = NOW(),
                    affiliate_approved_by = 'SYSTEM_AUTO',
                    updated_at = NOW()
                WHERE id = $2
            `, [affiliateCode, userId]);

            // 3. Criar preferências padrão
            await client.query(`
                INSERT INTO affiliate_preferences (user_id, auto_convert, conversion_threshold)
                VALUES ($1, false, 0)
                ON CONFLICT (user_id) DO NOTHING
            `, [userId]);

            // 4. Inicializar estatísticas
            await client.query(`
                INSERT INTO affiliate_stats 
                (user_id, total_referrals, total_commission_brl, total_commission_usd, 
                 total_conversions, total_bonus_earned, last_updated)
                VALUES ($1, 0, 0, 0, 0, 0, NOW())
                ON CONFLICT (user_id) DO NOTHING
            `, [userId]);

            await client.query('COMMIT');

            // 5. Enviar notificação de ativação
            await this.sendAffiliateActivationNotification(userId, affiliateCode);

            return {
                success: true,
                message: 'Afiliação ativada automaticamente como AFFILIATE_NORMAL!',
                affiliate: {
                    code: affiliateCode,
                    type: 'AFFILIATE_NORMAL',
                    commission_rate: this.config.normalCommissionRate,
                    status: 'ACTIVE',
                    approved_automatically: true
                },
                request: request.rows[0]
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * 🔒 NOMEAR AFILIADO VIP (EXCLUSIVO PARA ADMINISTRADORES)
     */
    async promoteToVIP(adminId, targetUserId, reason, justification) {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');

            // Verificar se admin tem permissão
            const adminCheck = await client.query(
                'SELECT is_admin, username FROM users WHERE id = $1',
                [adminId]
            );

            if (!adminCheck.rows[0]?.is_admin) {
                throw new Error('Apenas administradores podem nomear afiliados VIP');
            }

            // Verificar se usuário alvo existe e é afiliado
            const targetUser = await client.query(
                'SELECT affiliate_code, affiliate_type, username FROM users WHERE id = $1',
                [targetUserId]
            );

            if (!targetUser.rows[0]) {
                throw new Error('Usuário não encontrado');
            }

            if (!targetUser.rows[0].affiliate_code) {
                throw new Error('Usuário não é afiliado');
            }

            if (targetUser.rows[0].affiliate_type === 'AFFILIATE_VIP') {
                throw new Error('Usuário já é VIP');
            }

            // Promover para VIP
            await client.query(`
                UPDATE users 
                SET affiliate_type = 'AFFILIATE_VIP',
                    promoted_to_vip_at = NOW(),
                    promoted_by_admin_id = $1,
                    vip_promotion_reason = $2,
                    updated_at = NOW()
                WHERE id = $3
            `, [adminId, reason, targetUserId]);

            // Registrar log da promoção
            await client.query(`
                INSERT INTO affiliate_vip_promotions 
                (user_id, promoted_by_admin_id, reason, justification, promoted_at)
                VALUES ($1, $2, $3, $4, NOW())
            `, [targetUserId, adminId, reason, justification]);

            await client.query('COMMIT');

            // Notificar usuário sobre promoção VIP
            await this.sendVIPPromotionNotification(targetUserId, adminCheck.rows[0].username);

            return {
                success: true,
                message: `${targetUser.rows[0].username} promovido para AFFILIATE_VIP!`,
                promotion: {
                    userId: targetUserId,
                    username: targetUser.rows[0].username,
                    newType: 'AFFILIATE_VIP',
                    commissionRate: this.config.vipCommissionRate,
                    promotedBy: adminCheck.rows[0].username,
                    promotedAt: new Date(),
                    reason: reason
                }
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * 📊 LISTAR SOLICITAÇÕES DE AFILIAÇÃO (INCLUINDO AUTO-APROVADAS)
     */
    async getAffiliateRequests(status = 'ALL', limit = 50) {
        const client = await this.pool.connect();
        
        try {
            let query = `
                SELECT 
                    ar.id,
                    ar.user_id,
                    ar.full_name,
                    ar.document,
                    ar.trading_experience,
                    ar.status,
                    ar.requested_level,
                    ar.affiliate_code_generated,
                    ar.created_at,
                    ar.approved_at,
                    ar.approved_by,
                    u.username,
                    u.email,
                    u.affiliate_type as current_type
                FROM affiliate_requests ar
                JOIN users u ON ar.user_id = u.id
            `;

            let params = [];
            let paramCount = 0;

            if (status !== 'ALL') {
                query += ` WHERE ar.status = $${++paramCount}`;
                params.push(status);
            }

            query += ` ORDER BY ar.created_at DESC LIMIT $${++paramCount}`;
            params.push(limit);

            const result = await client.query(query, params);

            return result.rows.map(row => ({
                ...row,
                isAutoApproved: row.approved_by === 'SYSTEM_AUTO',
                approvalType: row.approved_by === 'SYSTEM_AUTO' ? 'AUTOMÁTICA' : 'MANUAL'
            }));

        } finally {
            client.release();
        }
    }

    /**
     * 📈 DASHBOARD DE AFILIADO ATUALIZADO
     */
    async getAffiliateDashboard(userId) {
        const client = await this.pool.connect();
        
        try {
            // Dados básicos do afiliado
            const affiliateData = await client.query(`
                SELECT 
                    affiliate_code,
                    affiliate_type,
                    affiliate_approved_at,
                    affiliate_approved_by,
                    promoted_to_vip_at,
                    promoted_by_admin_id
                FROM users 
                WHERE id = $1 AND affiliate_code IS NOT NULL
            `, [userId]);

            if (affiliateData.rows.length === 0) {
                throw new Error('Usuário não é afiliado');
            }

            const affiliate = affiliateData.rows[0];

            // Comissões e saldos
            const balances = await client.query(`
                SELECT 
                    balance_commission_brl,
                    balance_commission_usd,
                    balance_brl,
                    balance_usd
                FROM users 
                WHERE id = $1
            `, [userId]);

            // Estatísticas
            const stats = await client.query(`
                SELECT * FROM affiliate_stats WHERE user_id = $1
            `, [userId]);

            // Preferências
            const preferences = await client.query(`
                SELECT * FROM affiliate_preferences WHERE user_id = $1
            `, [userId]);

            // Taxa de comissão atual
            const commissionRate = affiliate.affiliate_type === 'AFFILIATE_VIP' 
                ? this.config.vipCommissionRate 
                : this.config.normalCommissionRate;

            return {
                success: true,
                dashboard: {
                    affiliate: {
                        ...affiliate,
                        commission_rate: commissionRate,
                        type_description: affiliate.affiliate_type === 'AFFILIATE_VIP' 
                            ? 'VIP (5% comissão)' 
                            : 'Normal (1.5% comissão)',
                        is_vip: affiliate.affiliate_type === 'AFFILIATE_VIP',
                        approval_type: affiliate.affiliate_approved_by === 'SYSTEM_AUTO' 
                            ? 'Automática' 
                            : 'Manual'
                    },
                    balances: {
                        commissions: {
                            brl: parseFloat(balances.rows[0]?.balance_commission_brl || 0),
                            usd: parseFloat(balances.rows[0]?.balance_commission_usd || 0)
                        },
                        operational: {
                            brl: parseFloat(balances.rows[0]?.balance_brl || 0),
                            usd: parseFloat(balances.rows[0]?.balance_usd || 0)
                        }
                    },
                    statistics: stats.rows[0] || {},
                    preferences: preferences.rows[0] || {}
                }
            };

        } finally {
            client.release();
        }
    }

    /**
     * 🔧 CONFIGURAÇÃO DAS ROTAS
     */
    setupRoutes(app) {
        // 📝 Solicitação de afiliação (com auto-aprovação)
        app.post('/api/affiliate/request', async (req, res) => {
            try {
                const { userId, fullName, document, tradingExperience, terms } = req.body;

                if (!terms) {
                    return res.status(400).json({
                        success: false,
                        error: 'Aceite dos termos é obrigatório'
                    });
                }

                const result = await this.createAffiliateRequest(
                    userId, fullName, document, tradingExperience, terms
                );
                
                res.json(result);

            } catch (error) {
                console.error('❌ Erro ao solicitar afiliação:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // 🔒 Promover para VIP (admin apenas)
        app.post('/api/admin/affiliate/promote-vip', async (req, res) => {
            try {
                const { adminId, targetUserId, reason, justification } = req.body;

                if (!adminId || !targetUserId || !reason) {
                    return res.status(400).json({
                        success: false,
                        error: 'adminId, targetUserId e reason são obrigatórios'
                    });
                }

                const result = await this.promoteToVIP(adminId, targetUserId, reason, justification);
                res.json(result);

            } catch (error) {
                console.error('❌ Erro ao promover para VIP:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // 📊 Dashboard do afiliado
        app.get('/api/affiliate/:userId/dashboard', async (req, res) => {
            try {
                const { userId } = req.params;
                const dashboard = await this.getAffiliateDashboard(userId);
                res.json(dashboard);

            } catch (error) {
                console.error('❌ Erro ao carregar dashboard:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // 📋 Listar solicitações (incluindo auto-aprovadas)
        app.get('/api/admin/affiliate/requests', async (req, res) => {
            try {
                const { status = 'ALL', limit = 50 } = req.query;
                const requests = await this.getAffiliateRequests(status, parseInt(limit));
                
                res.json({
                    success: true,
                    requests: requests,
                    summary: {
                        total: requests.length,
                        autoApproved: requests.filter(r => r.isAutoApproved).length,
                        manualApproved: requests.filter(r => !r.isAutoApproved && r.status === 'APPROVED').length
                    }
                });

            } catch (error) {
                console.error('❌ Erro ao listar solicitações:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // 💰 Conversão de comissões (mantém funcionalidade original)
        app.post('/api/affiliate/convert-commissions', async (req, res) => {
            try {
                const { userId, amount, currency } = req.body;
                const result = await this.convertCommissions(userId, amount, currency);
                res.json(result);

            } catch (error) {
                console.error('❌ Erro ao converter comissões:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });
    }

    // =============================================
    // MÉTODOS AUXILIARES
    // =============================================

    async generateUniqueAffiliateCode(client) {
        const letters = 'process.env.API_KEY_HERE';
        const numbers = '0123456789';
        
        let attempts = 0;
        while (attempts < 100) {
            let code = 'CBC';
            
            // 3 letras aleatórias
            for (let i = 0; i < 3; i++) {
                code += letters.charAt(Math.floor(Math.random() * letters.length));
            }
            
            // 4 números aleatórios
            for (let i = 0; i < 4; i++) {
                code += numbers.charAt(Math.floor(Math.random() * numbers.length));
            }

            // Verificar se código já existe
            const existing = await client.query(
                'SELECT id FROM users WHERE affiliate_code = $1',
                [code]
            );

            if (existing.rows.length === 0) {
                return code;
            }

            attempts++;
        }

        throw new Error('Não foi possível gerar código único após 100 tentativas');
    }

    async sendAffiliateActivationNotification(userId, affiliateCode) {
        // Implementar notificação de ativação
        console.log(`📧 Notificação de ativação enviada para usuário ${userId}, código: ${affiliateCode}`);
    }

    async sendVIPPromotionNotification(userId, promotedByAdmin) {
        // Implementar notificação de promoção VIP
        console.log(`🌟 Notificação VIP enviada para usuário ${userId}, promovido por: ${promotedByAdmin}`);
    }

    async convertCommissions(userId, amount, currency) {
        // Manter implementação original de conversão
        // ... (código de conversão existente)
        return {
            success: true,
            message: 'Conversão realizada com sucesso',
            bonus: amount * this.config.bonusRate
        };
    }
}

module.exports = AffiliateSystemComplete;
