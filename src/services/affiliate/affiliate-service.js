/**
 * 🤝 AFFILIATE SERVICE - COINBITCLUB ENTERPRISE v6.0.0
 * Sistema completo de afiliação com comissões e tracking
 * 
 * ✅ FUNCIONALIDADES IMPLEMENTADAS:
 * 👥 Gestão completa de afiliados
 * 💰 Comissões automáticas (1.5% / 5%)
 * 🔗 Geração de links personalizados
 * 📊 Dashboard de performance
 * 🎯 Tracking de conversões
 * 📈 Relatórios detalhados
 * 🎁 Sistema de bônus e recompensas
 */

const crypto = require('crypto');
const { createLogger } = require('../shared/utils/logger');

class AffiliateService {
    constructor() {
        this.logger = createLogger('affiliate-service');
        this.isRunning = false;
        
        // Base de dados temporária (em produção usar PostgreSQL)
        this.affiliates = new Map();
        this.referrals = new Map();
        this.commissions = new Map();
        this.campaigns = new Map();
        this.clicks = new Map();
        this.conversions = new Map();
        
        // Configurações
        this.config = {
            commissionRates: {
                tier1: 0.015, // 1.5% para novos afiliados
                tier2: 0.025, // 2.5% para afiliados intermediários
                tier3: 0.05,  // 5% para afiliados premium
                tier4: 0.075  // 7.5% para afiliados VIP
            },
            bonusThresholds: {
                bronze: { referrals: 10, bonus: 100 },
                silver: { referrals: 25, bonus: 500 },
                gold: { referrals: 50, bonus: 1000 },
                diamond: { referrals: 100, bonus: 5000 }
            },
            cookieExpiry: 30 * 24 * 60 * 60 * 1000, // 30 dias
            minimumWithdrawal: 50,
            conversionBonusPercentage: 0.10 // +10% bonus na conversão
        };
        
        this.initializeDefaultData();
        this.logger.info('🤝 Affiliate Service initialized');
    }

    /**
     * 🚀 Inicializar serviço
     */
    async start() {
        try {
            this.logger.info('🚀 Starting Affiliate Service...');
            
            // Iniciar processamento de comissões
            this.startCommissionProcessing();
            
            // Iniciar limpeza de dados antigos
            this.startDataCleanup();
            
            this.isRunning = true;
            this.logger.info('✅ Affiliate Service started successfully');
            
        } catch (error) {
            this.logger.error('❌ Failed to start Affiliate Service:', error);
            throw error;
        }
    }

    /**
     * 🛑 Parar serviço
     */
    async stop() {
        try {
            this.logger.info('🛑 Stopping Affiliate Service...');
            
            if (this.commissionInterval) {
                clearInterval(this.commissionInterval);
            }
            
            if (this.cleanupInterval) {
                clearInterval(this.cleanupInterval);
            }
            
            this.isRunning = false;
            this.logger.info('✅ Affiliate Service stopped successfully');
            
        } catch (error) {
            this.logger.error('❌ Error stopping Affiliate Service:', error);
            throw error;
        }
    }

    /**
     * 🔍 Health check
     */
    async healthCheck() {
        return this.isRunning;
    }

    /**
     * 🏗️ Inicializar dados padrão
     */
    initializeDefaultData() {
        // Afiliados padrão
        const defaultAffiliates = [
            {
                id: 'aff-001',
                userId: 'affiliate-001',
                code: 'CBC001',
                name: 'Demo Affiliate',
                email: 'affiliate@coinbitclub.com',
                tier: 'tier2',
                status: 'active',
                totalReferrals: 15,
                totalEarnings: 2500,
                currentBalance: 500,
                withdrawnAmount: 2000,
                joinedAt: Date.now() - (30 * 24 * 60 * 60 * 1000),
                lastActivityAt: Date.now()
            }
        ];

        defaultAffiliates.forEach(affiliate => {
            this.affiliates.set(affiliate.id, affiliate);
        });

        // Campanhas padrão
        this.campaigns.set('default', {
            id: 'default',
            name: 'Campanha Padrão',
            description: 'Campanha principal de afiliados',
            status: 'active',
            createdAt: Date.now()
        });

        this.campaigns.set('welcome', {
            id: 'welcome',
            name: 'Bem-vindos',
            description: 'Campanha de boas-vindas com bônus',
            status: 'active',
            bonusRate: 0.05, // 5% extra
            createdAt: Date.now()
        });

        this.logger.info(`🤝 Initialized ${defaultAffiliates.length} default affiliates`);
        this.logger.info(`🎯 Initialized ${this.campaigns.size} campaigns`);
    }

    /**
     * 👥 Criar novo afiliado
     */
    async createAffiliate(userId, userData) {
        try {
            this.logger.info(`👥 Creating affiliate for user: ${userId}`);

            // Verificar se já é afiliado
            const existingAffiliate = Array.from(this.affiliates.values())
                .find(aff => aff.userId === userId);
            
            if (existingAffiliate) {
                throw new Error('Usuário já é afiliado');
            }

            // Gerar código único
            const affiliateCode = await this.generateUniqueCode();
            
            const affiliate = {
                id: crypto.randomUUID(),
                userId,
                code: affiliateCode,
                name: userData.name,
                email: userData.email,
                tier: 'tier1', // Começar no tier básico
                status: 'active',
                totalReferrals: 0,
                totalEarnings: 0,
                currentBalance: 0,
                withdrawnAmount: 0,
                joinedAt: Date.now(),
                lastActivityAt: Date.now(),
                bankDetails: userData.bankDetails || null,
                socialLinks: userData.socialLinks || {},
                preferences: userData.preferences || {}
            };

            this.affiliates.set(affiliate.id, affiliate);

            this.logger.info(`✅ Affiliate created: ${affiliateCode} for user ${userId}`);

            return {
                success: true,
                affiliate: {
                    id: affiliate.id,
                    code: affiliate.code,
                    tier: affiliate.tier,
                    commissionRate: this.config.commissionRates[affiliate.tier]
                }
            };

        } catch (error) {
            this.logger.error('❌ Error creating affiliate:', error);
            throw error;
        }
    }

    /**
     * 🔗 Gerar link de afiliado
     */
    async generateAffiliateLink(affiliateId, campaign = 'default', customParams = {}) {
        try {
            const affiliate = this.affiliates.get(affiliateId);
            if (!affiliate) {
                throw new Error('Afiliado não encontrado');
            }

            const baseUrl = process.env.FRONTEND_URL || 'https://coinbitclub.com';
            const params = new URLSearchParams({
                ref: affiliate.code,
                campaign,
                ...customParams
            });

            const link = `${baseUrl}/register?${params.toString()}`;

            this.logger.info(`🔗 Affiliate link generated for ${affiliate.code}: ${campaign}`);

            return {
                success: true,
                link,
                code: affiliate.code,
                campaign,
                shortLink: this.generateShortLink(link)
            };

        } catch (error) {
            this.logger.error('❌ Error generating affiliate link:', error);
            throw error;
        }
    }

    /**
     * 📊 Dashboard do afiliado
     */
    async getAffiliateDashboard(affiliateId, period = '30d') {
        try {
            const affiliate = this.affiliates.get(affiliateId);
            if (!affiliate) {
                throw new Error('Afiliado não encontrado');
            }

            const periodMs = this.parsePeriod(period);
            const since = Date.now() - periodMs;

            // Referrals no período
            const periodReferrals = Array.from(this.referrals.values())
                .filter(ref => ref.affiliateId === affiliateId && ref.createdAt >= since);

            // Comissões no período
            const periodCommissions = Array.from(this.commissions.values())
                .filter(comm => comm.affiliateId === affiliateId && comm.createdAt >= since);

            // Clicks no período
            const periodClicks = Array.from(this.clicks.values())
                .filter(click => click.affiliateCode === affiliate.code && click.createdAt >= since);

            // Conversões no período
            const periodConversions = Array.from(this.conversions.values())
                .filter(conv => conv.affiliateId === affiliateId && conv.createdAt >= since);

            // Calcular métricas
            const totalClicks = periodClicks.length;
            const totalConversions = periodConversions.length;
            const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
            
            const totalCommissions = periodCommissions.reduce((sum, comm) => sum + comm.amount, 0);
            const pendingCommissions = periodCommissions
                .filter(comm => comm.status === 'pending')
                .reduce((sum, comm) => sum + comm.amount, 0);

            // Próximo tier
            const nextTier = this.getNextTier(affiliate.tier);
            const progressToNextTier = this.calculateTierProgress(affiliate);

            const dashboard = {
                affiliate: {
                    id: affiliate.id,
                    code: affiliate.code,
                    name: affiliate.name,
                    tier: affiliate.tier,
                    currentRate: this.config.commissionRates[affiliate.tier],
                    status: affiliate.status
                },
                period: {
                    name: period,
                    clicks: totalClicks,
                    conversions: totalConversions,
                    conversionRate: Math.round(conversionRate * 100) / 100,
                    referrals: periodReferrals.length,
                    commissions: totalCommissions,
                    pendingCommissions
                },
                totals: {
                    allTimeReferrals: affiliate.totalReferrals,
                    allTimeEarnings: affiliate.totalEarnings,
                    currentBalance: affiliate.currentBalance,
                    withdrawnAmount: affiliate.withdrawnAmount
                },
                progress: {
                    currentTier: affiliate.tier,
                    nextTier,
                    progressToNext: progressToNextTier,
                    bonusesEarned: this.calculateBonusesEarned(affiliate)
                },
                topCampaigns: this.getTopCampaigns(affiliateId, since),
                recentActivity: this.getRecentActivity(affiliateId, 10)
            };

            return dashboard;

        } catch (error) {
            this.logger.error('❌ Error getting affiliate dashboard:', error);
            throw error;
        }
    }

    /**
     * 📈 Processar clique
     */
    async trackClick(affiliateCode, source, userAgent, ip, campaign = 'default') {
        try {
            const affiliate = Array.from(this.affiliates.values())
                .find(aff => aff.code === affiliateCode);
            
            if (!affiliate) {
                this.logger.warn(`🚫 Unknown affiliate code: ${affiliateCode}`);
                return { success: false, error: 'Código de afiliado inválido' };
            }

            const clickId = crypto.randomUUID();
            const click = {
                id: clickId,
                affiliateId: affiliate.id,
                affiliateCode,
                campaign,
                source,
                userAgent,
                ip,
                createdAt: Date.now(),
                converted: false,
                conversionId: null
            };

            this.clicks.set(clickId, click);

            // Atualizar última atividade do afiliado
            affiliate.lastActivityAt = Date.now();

            this.logger.info(`📈 Click tracked for affiliate ${affiliateCode}: ${clickId}`);

            return {
                success: true,
                clickId,
                affiliateCode,
                campaign
            };

        } catch (error) {
            this.logger.error('❌ Error tracking click:', error);
            throw error;
        }
    }

    /**
     * 💰 Processar conversão
     */
    async processConversion(userId, affiliateCode, transactionValue, currency = 'BRL') {
        try {
            this.logger.info(`💰 Processing conversion: ${affiliateCode}, value: ${transactionValue}`);

            const affiliate = Array.from(this.affiliates.values())
                .find(aff => aff.code === affiliateCode);
            
            if (!affiliate) {
                throw new Error('Afiliado não encontrado');
            }

            // Calcular comissão
            const commissionRate = this.config.commissionRates[affiliate.tier];
            const baseCommission = transactionValue * commissionRate;

            // Verificar bônus de campanha
            let campaignBonus = 0;
            const recentClick = Array.from(this.clicks.values())
                .filter(click => click.affiliateCode === affiliateCode && !click.converted)
                .sort((a, b) => b.createdAt - a.createdAt)[0];

            if (recentClick && recentClick.campaign) {
                const campaign = this.campaigns.get(recentClick.campaign);
                if (campaign && campaign.bonusRate) {
                    campaignBonus = baseCommission * campaign.bonusRate;
                }
            }

            const totalCommission = baseCommission + campaignBonus;

            // Criar conversão
            const conversionId = crypto.randomUUID();
            const conversion = {
                id: conversionId,
                affiliateId: affiliate.id,
                userId,
                transactionValue,
                currency,
                baseCommission,
                campaignBonus,
                totalCommission,
                commissionRate,
                clickId: recentClick?.id || null,
                campaign: recentClick?.campaign || 'direct',
                createdAt: Date.now(),
                status: 'pending'
            };

            this.conversions.set(conversionId, conversion);

            // Marcar click como convertido
            if (recentClick) {
                recentClick.converted = true;
                recentClick.conversionId = conversionId;
            }

            // Criar comissão
            const commissionId = crypto.randomUUID();
            const commission = {
                id: commissionId,
                affiliateId: affiliate.id,
                conversionId,
                amount: totalCommission,
                currency,
                status: 'pending',
                createdAt: Date.now(),
                paidAt: null,
                description: `Comissão da conversão ${conversionId.substring(0, 8)}`
            };

            this.commissions.set(commissionId, commission);

            // Atualizar estatísticas do afiliado
            affiliate.totalReferrals++;
            affiliate.currentBalance += totalCommission;
            affiliate.totalEarnings += totalCommission;
            affiliate.lastActivityAt = Date.now();

            // Verificar upgrade de tier
            await this.checkTierUpgrade(affiliate.id);

            this.logger.info(`✅ Conversion processed: ${conversionId}, commission: ${totalCommission}`);

            return {
                success: true,
                conversionId,
                commissionId,
                commission: {
                    base: baseCommission,
                    bonus: campaignBonus,
                    total: totalCommission,
                    rate: commissionRate
                },
                newTier: affiliate.tier
            };

        } catch (error) {
            this.logger.error('❌ Error processing conversion:', error);
            throw error;
        }
    }

    /**
     * 💸 Converter comissão para saldo
     */
    async convertCommissionToBalance(affiliateId, amount, currency = 'BRL') {
        try {
            const affiliate = this.affiliates.get(affiliateId);
            if (!affiliate) {
                throw new Error('Afiliado não encontrado');
            }

            if (affiliate.currentBalance < amount) {
                throw new Error('Saldo de comissão insuficiente');
            }

            // Aplicar bônus de conversão
            const bonusAmount = amount * this.config.conversionBonusPercentage;
            const totalAmount = amount + bonusAmount;

            // Debitar da comissão
            affiliate.currentBalance -= amount;

            // Criar transação (integrar com FinancialService)
            const transactionId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            this.logger.info(`💸 Commission converted: ${amount} + ${bonusAmount} bonus = ${totalAmount}`);

            return {
                success: true,
                transactionId,
                converted: amount,
                bonus: bonusAmount,
                total: totalAmount,
                remainingCommission: affiliate.currentBalance
            };

        } catch (error) {
            this.logger.error('❌ Error converting commission:', error);
            throw error;
        }
    }

    /**
     * 🎯 Verificar upgrade de tier
     */
    async checkTierUpgrade(affiliateId) {
        try {
            const affiliate = this.affiliates.get(affiliateId);
            if (!affiliate) return;

            const currentTier = affiliate.tier;
            let newTier = currentTier;

            // Critérios para upgrade baseados em referrals e earnings
            if (affiliate.totalReferrals >= 100 && affiliate.totalEarnings >= 10000) {
                newTier = 'tier4'; // VIP
            } else if (affiliate.totalReferrals >= 50 && affiliate.totalEarnings >= 5000) {
                newTier = 'tier3'; // Premium
            } else if (affiliate.totalReferrals >= 20 && affiliate.totalEarnings >= 1000) {
                newTier = 'tier2'; // Intermediário
            }

            if (newTier !== currentTier) {
                affiliate.tier = newTier;
                
                this.logger.info(`🎯 Tier upgraded: ${affiliate.code} from ${currentTier} to ${newTier}`);
                
                // Aplicar bônus de upgrade
                const upgradeBonus = this.getTierUpgradeBonus(currentTier, newTier);
                if (upgradeBonus > 0) {
                    affiliate.currentBalance += upgradeBonus;
                    
                    this.logger.info(`🎁 Tier upgrade bonus: ${upgradeBonus} for ${affiliate.code}`);
                }

                return { upgraded: true, oldTier: currentTier, newTier, bonus: upgradeBonus };
            }

            return { upgraded: false };

        } catch (error) {
            this.logger.error('❌ Error checking tier upgrade:', error);
            return { upgraded: false };
        }
    }

    /**
     * 🔄 Processamento automático de comissões
     */
    startCommissionProcessing() {
        this.commissionInterval = setInterval(async () => {
            try {
                // Processar comissões pendentes (após período de carência)
                const carencyPeriod = 3 * 24 * 60 * 60 * 1000; // 3 dias
                const now = Date.now();

                for (const [id, commission] of this.commissions) {
                    if (commission.status === 'pending' && 
                        (now - commission.createdAt) >= carencyPeriod) {
                        
                        commission.status = 'approved';
                        commission.paidAt = now;
                        
                        this.logger.info(`💰 Commission approved: ${id}`);
                    }
                }

            } catch (error) {
                this.logger.error('❌ Commission processing error:', error);
            }
        }, 60 * 60 * 1000); // A cada hora
    }

    /**
     * 🧹 Limpeza de dados antigos
     */
    startDataCleanup() {
        this.cleanupInterval = setInterval(() => {
            try {
                const now = Date.now();
                const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 ano

                // Limpar clicks antigos
                let cleaned = 0;
                for (const [id, click] of this.clicks) {
                    if ((now - click.createdAt) > maxAge) {
                        this.clicks.delete(id);
                        cleaned++;
                    }
                }

                if (cleaned > 0) {
                    this.logger.info(`🧹 Cleaned ${cleaned} old clicks`);
                }

            } catch (error) {
                this.logger.error('❌ Data cleanup error:', error);
            }
        }, 24 * 60 * 60 * 1000); // Diário
    }

    /**
     * 🛠️ Utilitários
     */
    async generateUniqueCode() {
        let code;
        let attempts = 0;
        
        do {
            code = `CBC${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
            attempts++;
        } while (
            Array.from(this.affiliates.values()).some(aff => aff.code === code) && 
            attempts < 10
        );
        
        return code;
    }

    generateShortLink(fullLink) {
        const shortCode = Math.random().toString(36).substr(2, 6);
        return `${process.env.FRONTEND_URL || 'https://coinbitclub.com'}/s/${shortCode}`;
    }

    parsePeriod(period) {
        const units = {
            'd': 24 * 60 * 60 * 1000,
            'h': 60 * 60 * 1000,
            'm': 60 * 1000
        };
        
        const match = period.match(/^(\d+)([dhm])$/);
        if (!match) return 30 * units.d;
        
        const [, amount, unit] = match;
        return parseInt(amount) * units[unit];
    }

    getNextTier(currentTier) {
        const tiers = ['tier1', 'tier2', 'tier3', 'tier4'];
        const currentIndex = tiers.indexOf(currentTier);
        return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
    }

    calculateTierProgress(affiliate) {
        const requirements = {
            tier2: { referrals: 20, earnings: 1000 },
            tier3: { referrals: 50, earnings: 5000 },
            tier4: { referrals: 100, earnings: 10000 }
        };

        const nextTier = this.getNextTier(affiliate.tier);
        if (!nextTier || !requirements[nextTier]) return 100;

        const req = requirements[nextTier];
        const referralProgress = Math.min(100, (affiliate.totalReferrals / req.referrals) * 100);
        const earningsProgress = Math.min(100, (affiliate.totalEarnings / req.earnings) * 100);

        return Math.min(referralProgress, earningsProgress);
    }

    calculateBonusesEarned(affiliate) {
        const bonuses = [];
        const thresholds = this.config.bonusThresholds;

        for (const [level, threshold] of Object.entries(thresholds)) {
            if (affiliate.totalReferrals >= threshold.referrals) {
                bonuses.push({
                    level,
                    amount: threshold.bonus,
                    achieved: true
                });
            }
        }

        return bonuses;
    }

    getTierUpgradeBonus(oldTier, newTier) {
        const bonuses = {
            'tier1->tier2': 250,
            'tier2->tier3': 500,
            'tier3->tier4': 1000
        };

        return bonuses[`${oldTier}->${newTier}`] || 0;
    }

    getTopCampaigns(affiliateId, since) {
        const affiliateClicks = Array.from(this.clicks.values())
            .filter(click => click.affiliateId === affiliateId && click.createdAt >= since);

        const campaignStats = {};
        affiliateClicks.forEach(click => {
            if (!campaignStats[click.campaign]) {
                campaignStats[click.campaign] = { clicks: 0, conversions: 0 };
            }
            campaignStats[click.campaign].clicks++;
            if (click.converted) {
                campaignStats[click.campaign].conversions++;
            }
        });

        return Object.entries(campaignStats)
            .map(([campaign, stats]) => ({
                campaign,
                ...stats,
                conversionRate: stats.clicks > 0 ? (stats.conversions / stats.clicks) * 100 : 0
            }))
            .sort((a, b) => b.clicks - a.clicks)
            .slice(0, 5);
    }

    getRecentActivity(affiliateId, limit = 10) {
        const activities = [];

        // Conversões recentes
        const recentConversions = Array.from(this.conversions.values())
            .filter(conv => conv.affiliateId === affiliateId)
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, limit);

        recentConversions.forEach(conv => {
            activities.push({
                type: 'conversion',
                description: `Nova conversão de ${conv.transactionValue} ${conv.currency}`,
                amount: conv.totalCommission,
                createdAt: conv.createdAt
            });
        });

        return activities.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
    }

    /**
     * 📊 Estatísticas do serviço
     */
    getStats() {
        const totalAffiliates = this.affiliates.size;
        const activeAffiliates = Array.from(this.affiliates.values())
            .filter(aff => aff.status === 'active').length;
        
        const totalReferrals = Array.from(this.affiliates.values())
            .reduce((sum, aff) => sum + aff.totalReferrals, 0);
        
        const totalCommissions = Array.from(this.commissions.values())
            .reduce((sum, comm) => sum + comm.amount, 0);
        
        const totalClicks = this.clicks.size;
        const totalConversions = this.conversions.size;
        const overallConversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

        return {
            totalAffiliates,
            activeAffiliates,
            totalReferrals,
            totalCommissions,
            totalClicks,
            totalConversions,
            overallConversionRate: Math.round(overallConversionRate * 100) / 100,
            activeCampaigns: this.campaigns.size
        };
    }

    /**
     * 📨 Handle messages from orchestrator
     */
    async handleMessage(action, payload, metadata) {
        try {
            switch (action) {
                case 'createAffiliate':
                    return await this.createAffiliate(payload.userId, payload.userData);

                case 'generateLink':
                    return await this.generateAffiliateLink(payload.affiliateId, payload.campaign, payload.customParams);

                case 'getDashboard':
                    return await this.getAffiliateDashboard(payload.affiliateId, payload.period);

                case 'trackClick':
                    return await this.trackClick(
                        payload.affiliateCode,
                        payload.source,
                        payload.userAgent,
                        payload.ip,
                        payload.campaign
                    );

                case 'processConversion':
                    return await this.processConversion(
                        payload.userId,
                        payload.affiliateCode,
                        payload.transactionValue,
                        payload.currency
                    );

                case 'convertCommission':
                    return await this.convertCommissionToBalance(
                        payload.affiliateId,
                        payload.amount,
                        payload.currency
                    );

                case 'getStats':
                    return this.getStats();

                default:
                    throw new Error(`Unknown action: ${action}`);
            }
        } catch (error) {
            this.logger.error(`❌ Error handling message ${action}:`, error);
            throw error;
        }
    }
}

module.exports = AffiliateService;
