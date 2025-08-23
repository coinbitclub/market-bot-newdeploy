/**
 * 🤝 SISTEMA DE AFILIAÇÃO COMPLETO - APIs
 * =====================================
 * 
 * APIs para completar o sistema de afiliação com:
 * - Solicitação de afiliação por usuários
 * - Aprovação automática para NORMAL
 * - Promoção VIP exclusiva por administradores
 * - Conversão de comissões em créditos (+10% bônus)
 * - Dashboard e preferências de afiliados
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

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
     * Configurar todas as rotas do sistema de afiliação
     */
    setupRoutes(app) {
        // =====================================
        // 📝 SOLICITAÇÕES DE AFILIAÇÃO
        // =====================================

        // Solicitar ser afiliado
        app.post('/api/affiliate/request', async (req, res) => {
            try {
                const { userId, requestedLevel = 'normal', reason } = req.body;

                if (!userId) {
                    return res.status(400).json({
                        success: false,
                        error: 'userId é obrigatório'
                    });
                }

                const result = await this.createAffiliateRequest(userId, requestedLevel, reason);
                res.json(result);

            } catch (error) {
                console.error('❌ Erro ao criar solicitação de afiliado:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Listar solicitações (admin)
        app.get('/api/admin/affiliate/requests', async (req, res) => {
            try {
                const { status = 'pending', limit = 50 } = req.query;
                const requests = await this.getAffiliateRequests(status, limit);
                
                res.json({
                    success: true,
                    requests: requests
                });

            } catch (error) {
                console.error('❌ Erro ao listar solicitações:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Aprovar solicitação (admin)
        app.put('/api/admin/affiliate/request/:id/approve', async (req, res) => {
            try {
                const { id } = req.params;
                const { adminId, adminNotes } = req.body;

                const result = await this.approveAffiliateRequest(id, adminId, adminNotes);
                res.json(result);

            } catch (error) {
                console.error('❌ Erro ao aprovar solicitação:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Rejeitar solicitação (admin)
        app.put('/api/admin/affiliate/request/:id/reject', async (req, res) => {
            try {
                const { id } = req.params;
                const { adminId, adminNotes } = req.body;

                const result = await this.rejectAffiliateRequest(id, adminId, adminNotes);
                res.json(result);

            } catch (error) {
                console.error('❌ Erro ao rejeitar solicitação:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // =====================================
        // 💰 CONVERSÃO DE COMISSÕES
        // =====================================

        // Converter comissões em créditos
        app.post('/api/affiliate/convert-commissions', async (req, res) => {
            try {
                const { userId, amount, currency = 'BRL' } = req.body;

                if (!userId || !amount) {
                    return res.status(400).json({
                        success: false,
                        error: 'userId e amount são obrigatórios'
                    });
                }

                const result = await this.convertCommissionsToCredits(userId, amount, currency);
                res.json(result);

            } catch (error) {
                console.error('❌ Erro ao converter comissões:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Obter histórico de conversões
        app.get('/api/affiliate/:userId/conversions', async (req, res) => {
            try {
                const { userId } = req.params;
                const { limit = 20 } = req.query;

                const conversions = await this.getConversionHistory(userId, limit);
                res.json({
                    success: true,
                    conversions: conversions
                });

            } catch (error) {
                console.error('❌ Erro ao obter histórico:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // =====================================
        // 📊 DASHBOARD E ESTATÍSTICAS
        // =====================================

        // Dashboard do afiliado
        app.get('/api/affiliate/:userId/dashboard', async (req, res) => {
            try {
                const { userId } = req.params;
                const dashboard = await this.getAffiliateDashboard(userId);
                res.json(dashboard);

            } catch (error) {
                console.error('❌ Erro ao obter dashboard:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Atualizar preferências do afiliado
        app.put('/api/affiliate/:userId/preferences', async (req, res) => {
            try {
                const { userId } = req.params;
                const preferences = req.body;

                const result = await this.updateAffiliatePreferences(userId, preferences);
                res.json(result);

            } catch (error) {
                console.error('❌ Erro ao atualizar preferências:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // =====================================
        // 📈 RELATÓRIOS E ANALYTICS
        // =====================================

        // Relatório de performance (admin)
        app.get('/api/admin/affiliate/performance', async (req, res) => {
            try {
                const { period = 'month', limit = 100 } = req.query;
                const performance = await this.getAffiliatePerformanceReport(period, limit);
                
                res.json({
                    success: true,
                    performance: performance
                });

            } catch (error) {
                console.error('❌ Erro ao gerar relatório:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        console.log('✅ Rotas do sistema de afiliação configuradas');
    }

    /**
     * Criar solicitação de afiliação
     */
    async createAffiliateRequest(userId, requestedLevel, reason) {
        const client = await this.pool.connect();
        
        try {
            // Verificar se usuário já é afiliado
            const userCheck = await client.query(
                'SELECT affiliate_type FROM users WHERE id = $1',
                [userId]
            );

            if (userCheck.rows.length === 0) {
                throw new Error('Usuário não encontrado');
            }

            const currentAffiliateType = userCheck.rows[0].affiliate_type;
            if (currentAffiliateType && currentAffiliateType !== 'none') {
                throw new Error('Usuário já é afiliado');
            }

            // Verificar se já tem solicitação pendente
            const pendingCheck = await client.query(
                'SELECT id FROM affiliate_requests WHERE user_id = $1 AND status = $2',
                [userId, 'pending']
            );

            if (pendingCheck.rows.length > 0) {
                throw new Error('Já existe uma solicitação pendente para este usuário');
            }

            // Criar solicitação
            const result = await client.query(`
                INSERT INTO affiliate_requests 
                (user_id, requested_level, reason, status)
                VALUES ($1, $2, $3, $4)
                RETURNING id, requested_at
            `, [userId, requestedLevel, reason, 'pending']);

            const requestId = result.rows[0].id;

            // Se for nível normal e aprovação automática estiver habilitada
            if (requestedLevel === 'normal' && this.config.autoApprovalEnabled) {
                await this.approveAffiliateRequest(requestId, null, 'Aprovação automática para nível normal');
                
                return {
                    success: true,
                    message: 'Solicitação aprovada automaticamente',
                    requestId: requestId,
                    status: 'approved'
                };
            }

            return {
                success: true,
                message: 'Solicitação criada com sucesso',
                requestId: requestId,
                status: 'pending',
                note: requestedLevel === 'vip' ? 'Solicitações VIP requerem aprovação manual' : null
            };

        } finally {
            client.release();
        }
    }

    /**
     * Aprovar solicitação de afiliação
     */
    async approveAffiliateRequest(requestId, adminId = null, adminNotes = '') {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');

            // Obter dados da solicitação
            const requestData = await client.query(`
                SELECT ar.*, u.username 
                FROM affiliate_requests ar
                JOIN users u ON ar.user_id = u.id
                WHERE ar.id = $1 AND ar.status = 'pending'
            `, [requestId]);

            if (requestData.rows.length === 0) {
                throw new Error('Solicitação não encontrada ou já processada');
            }

            const request = requestData.rows[0];

            // Gerar código de afiliado único
            const affiliateCode = await this.generateUniqueAffiliateCode(client, request.username);

            // Atualizar usuário para afiliado
            await client.query(`
                UPDATE users 
                SET affiliate_type = $1, affiliate_code = $2, updated_at = NOW()
                WHERE id = $3
            `, [request.requested_level, affiliateCode, request.user_id]);

            // Atualizar solicitação
            await client.query(`
                UPDATE affiliate_requests 
                SET status = 'approved', 
                    processed_by_admin_id = $1, 
                    admin_notes = $2, 
                    processed_at = NOW()
                WHERE id = $3
            `, [adminId, adminNotes, requestId]);

            // Criar preferências padrão
            await client.query(`
                INSERT INTO affiliate_preferences (user_id)
                VALUES ($1)
                ON CONFLICT (user_id) DO NOTHING
            `, [request.user_id]);

            // Inicializar estatísticas
            await client.query(`
                INSERT INTO affiliate_stats (user_id)
                VALUES ($1)
                ON CONFLICT (user_id) DO NOTHING
            `, [request.user_id]);

            await client.query('COMMIT');

            return {
                success: true,
                message: 'Solicitação aprovada com sucesso',
                affiliateCode: affiliateCode,
                affiliateType: request.requested_level,
                processedAt: new Date()
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Rejeitar solicitação de afiliação
     */
    async rejectAffiliateRequest(requestId, adminId, adminNotes = '') {
        const client = await this.pool.connect();
        
        try {
            const result = await client.query(`
                UPDATE affiliate_requests 
                SET status = 'rejected', 
                    processed_by_admin_id = $1, 
                    admin_notes = $2, 
                    processed_at = NOW()
                WHERE id = $3 AND status = 'pending'
                RETURNING user_id
            `, [adminId, adminNotes, requestId]);

            if (result.rows.length === 0) {
                throw new Error('Solicitação não encontrada ou já processada');
            }

            return {
                success: true,
                message: 'Solicitação rejeitada',
                reason: adminNotes,
                processedAt: new Date()
            };

        } finally {
            client.release();
        }
    }

    /**
     * Converter comissões em créditos com 10% bônus
     */
    async convertCommissionsToCredits(userId, amount, currency) {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');

            // Verificar se é afiliado
            const userCheck = await client.query(`
                SELECT affiliate_type, balance_commission_brl, balance_commission_usd
                FROM users 
                WHERE id = $1 AND affiliate_type IN ('normal', 'vip')
            `, [userId]);

            if (userCheck.rows.length === 0) {
                throw new Error('Usuário não é afiliado');
            }

            const user = userCheck.rows[0];
            const availableBalance = currency === 'BRL' ? 
                user.balance_commission_brl : user.balance_commission_usd;

            if (parseFloat(availableBalance) < amount) {
                throw new Error('Saldo de comissão insuficiente');
            }

            // Calcular bônus e total
            const bonusAmount = amount * this.config.bonusRate;
            const totalCredit = amount + bonusAmount;

            // Subtrair do saldo de comissão
            const commissionColumn = currency === 'BRL' ? 
                'balance_commission_brl' : 'balance_commission_usd';
            const creditColumn = currency === 'BRL' ? 
                'balance_admin_brl' : 'balance_admin_usd';

            await client.query(`
                UPDATE users 
                SET ${commissionColumn} = ${commissionColumn} - $1,
                    ${creditColumn} = ${creditColumn} + $2,
                    updated_at = NOW()
                WHERE id = $3
            `, [amount, totalCredit, userId]);

            // Registrar conversão
            await client.query(`
                INSERT INTO commission_conversions 
                (user_id, commission_amount, bonus_amount, total_credit, currency, 
                 source_balance_type, target_balance_type)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
                userId, amount, bonusAmount, totalCredit, currency,
                `commission_${currency.toLowerCase()}`,
                `admin_${currency.toLowerCase()}`
            ]);

            await client.query('COMMIT');

            return {
                success: true,
                message: 'Comissão convertida com sucesso',
                conversion: {
                    originalAmount: amount,
                    bonusAmount: bonusAmount,
                    totalCredit: totalCredit,
                    currency: currency,
                    bonusRate: this.config.bonusRate * 100 + '%'
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
     * Obter dashboard completo do afiliado
     */
    async getAffiliateDashboard(userId) {
        const client = await this.pool.connect();
        
        try {
            // Dados básicos do afiliado
            const userQuery = await client.query(`
                SELECT 
                    u.username, u.affiliate_code, u.affiliate_type,
                    u.balance_commission_brl, u.balance_commission_usd,
                    u.balance_admin_brl, u.balance_admin_usd,
                    ap.auto_convert_commissions, ap.conversion_threshold,
                    ap.preferred_currency
                FROM users u
                LEFT JOIN affiliate_preferences ap ON u.id = ap.user_id
                WHERE u.id = $1 AND u.affiliate_type IN ('normal', 'vip')
            `, [userId]);

            if (userQuery.rows.length === 0) {
                throw new Error('Usuário não é afiliado');
            }

            const user = userQuery.rows[0];

            // Estatísticas atualizadas
            await client.query('SELECT update_affiliate_stats($1)', [userId]);
            
            const statsQuery = await client.query(`
                SELECT * FROM affiliate_stats WHERE user_id = $1
            `, [userId]);

            const stats = statsQuery.rows[0] || {};

            // Referenciados recentes
            const referralsQuery = await client.query(`
                SELECT username, email, created_at, last_login_at
                FROM users 
                WHERE affiliate_id = $1 
                ORDER BY created_at DESC 
                LIMIT 10
            `, [userId]);

            // Comissões recentes
            const commissionsQuery = await client.query(`
                SELECT amount, currency, created_at, description
                FROM commission_records 
                WHERE user_id = $1 AND type = 'AFFILIATE_COMMISSION'
                ORDER BY created_at DESC 
                LIMIT 10
            `, [userId]);

            // Links de afiliado
            const affiliateLinks = {
                brazil: `${process.env.FRONTEND_URL || 'https://coinbitclub.com'}?ref=${user.affiliate_code}`,
                international: `${process.env.FRONTEND_URL || 'https://coinbitclub.com'}/en?ref=${user.affiliate_code}`
            };

            return {
                success: true,
                dashboard: {
                    affiliate: {
                        username: user.username,
                        code: user.affiliate_code,
                        type: user.affiliate_type,
                        commissionRate: user.affiliate_type === 'vip' ? '5.0%' : '1.5%'
                    },
                    balances: {
                        commissions: {
                            brl: parseFloat(user.balance_commission_brl || 0),
                            usd: parseFloat(user.balance_commission_usd || 0)
                        },
                        credits: {
                            brl: parseFloat(user.balance_admin_brl || 0),
                            usd: parseFloat(user.balance_admin_usd || 0)
                        }
                    },
                    statistics: {
                        totalReferrals: stats.total_referrals || 0,
                        activeReferrals: stats.active_referrals || 0,
                        monthlyReferrals: stats.monthly_referrals || 0,
                        totalCommissions: {
                            brl: parseFloat(stats.total_commissions_brl || 0),
                            usd: parseFloat(stats.total_commissions_usd || 0)
                        },
                        monthlyCommissions: {
                            brl: parseFloat(stats.monthly_commissions_brl || 0),
                            usd: parseFloat(stats.monthly_commissions_usd || 0)
                        },
                        conversionRate: parseFloat(stats.conversion_rate || 0)
                    },
                    recentReferrals: referralsQuery.rows,
                    recentCommissions: commissionsQuery.rows,
                    links: affiliateLinks,
                    preferences: {
                        autoConvert: user.auto_convert_commissions || false,
                        conversionThreshold: parseFloat(user.conversion_threshold || 0),
                        preferredCurrency: user.preferred_currency || 'BRL'
                    }
                }
            };

        } finally {
            client.release();
        }
    }

    /**
     * Gerar código de afiliado único
     */
    async generateUniqueAffiliateCode(client, username) {
        let code;
        let isUnique = false;
        let attempts = 0;

        while (!isUnique && attempts < 10) {
            const prefix = 'CBC';
            const userPart = username.toUpperCase().substring(0, 3).padEnd(3, 'X');
            const randomPart = Math.floor(1000 + Math.random() * 9000);
            code = `${prefix}${userPart}${randomPart}`;

            const existing = await client.query(
                'SELECT id FROM users WHERE affiliate_code = $1',
                [code]
            );

            isUnique = existing.rows.length === 0;
            attempts++;
        }

        if (!isUnique) {
            // Fallback para código totalmente aleatório
            code = `CBC${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        }

        return code;
    }

    /**
     * Obter solicitações de afiliação
     */
    async getAffiliateRequests(status, limit) {
        const client = await this.pool.connect();
        
        try {
            const query = `
                SELECT 
                    ar.id, ar.user_id, ar.requested_level, ar.reason,
                    ar.status, ar.requested_at, ar.processed_at,
                    ar.admin_notes, ar.processed_by_admin_id,
                    u.username, u.email,
                    admin.username as processed_by_admin
                FROM affiliate_requests ar
                JOIN users u ON ar.user_id = u.id
                LEFT JOIN users admin ON ar.processed_by_admin_id = admin.id
                WHERE ($1 = 'all' OR ar.status = $1)
                ORDER BY ar.requested_at DESC
                LIMIT $2
            `;

            const result = await client.query(query, [status, limit]);
            return result.rows;

        } finally {
            client.release();
        }
    }

    /**
     * Obter histórico de conversões
     */
    async getConversionHistory(userId, limit) {
        const client = await this.pool.connect();
        
        try {
            const result = await client.query(`
                SELECT 
                    commission_amount, bonus_amount, total_credit,
                    currency, converted_at
                FROM commission_conversions 
                WHERE user_id = $1 
                ORDER BY converted_at DESC 
                LIMIT $2
            `, [userId, limit]);

            return result.rows;

        } finally {
            client.release();
        }
    }

    /**
     * Atualizar preferências do afiliado
     */
    async updateAffiliatePreferences(userId, preferences) {
        const client = await this.pool.connect();
        
        try {
            const result = await client.query(`
                INSERT INTO affiliate_preferences 
                (user_id, auto_convert_commissions, conversion_threshold, 
                 preferred_currency, notification_email, notification_whatsapp)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (user_id) DO UPDATE SET
                    auto_convert_commissions = $2,
                    conversion_threshold = $3,
                    preferred_currency = $4,
                    notification_email = $5,
                    notification_whatsapp = $6,
                    updated_at = NOW()
                RETURNING *
            `, [
                userId,
                preferences.autoConvert || false,
                preferences.conversionThreshold || 0,
                preferences.preferredCurrency || 'BRL',
                preferences.notificationEmail !== false, // default true
                preferences.notificationWhatsapp || false
            ]);

            return {
                success: true,
                message: 'Preferências atualizadas com sucesso',
                preferences: result.rows[0]
            };

        } finally {
            client.release();
        }
    }

    /**
     * Obter relatório de performance dos afiliados
     */
    async getAffiliatePerformanceReport(period = 'month', limit = 100) {
        const client = await this.pool.connect();
        
        try {
            // Atualizar estatísticas de todos os afiliados
            await client.query(`
                SELECT update_affiliate_stats(id) 
                FROM users 
                WHERE affiliate_type IN ('normal', 'vip')
            `);

            const result = await client.query(`
                SELECT * FROM affiliate_performance 
                ORDER BY total_commissions DESC
                LIMIT $1
            `, [limit]);

            return result.rows;

        } finally {
            client.release();
        }
    }
}

// Inicializar e configurar rotas
const affiliateSystem = new AffiliateSystemComplete();

// 📝 Solicitação de afiliação (com auto-aprovação)
router.post('/request', async (req, res) => {
    try {
        const { userId, fullName, document, tradingExperience, terms } = req.body;

        if (!terms) {
            return res.status(400).json({
                success: false,
                error: 'Aceite dos termos é obrigatório'
            });
        }

        const result = await affiliateSystem.createAffiliateRequest(
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
router.post('/promote-vip', async (req, res) => {
    try {
        const { adminId, targetUserId, reason, justification } = req.body;

        if (!adminId || !targetUserId || !reason) {
            return res.status(400).json({
                success: false,
                error: 'adminId, targetUserId e reason são obrigatórios'
            });
        }

        const result = await affiliateSystem.promoteToVIP(adminId, targetUserId, reason, justification);
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
router.get('/:userId/dashboard', async (req, res) => {
    try {
        const { userId } = req.params;
        const dashboard = await affiliateSystem.getAffiliateDashboard(userId);
        res.json(dashboard);

    } catch (error) {
        console.error('❌ Erro ao carregar dashboard:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 💰 Conversão de comissões
router.post('/convert-commissions', async (req, res) => {
    try {
        const { userId, amount, currency } = req.body;
        const result = await affiliateSystem.convertCommissions(userId, amount, currency);
        res.json(result);

    } catch (error) {
        console.error('❌ Erro ao converter comissões:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
