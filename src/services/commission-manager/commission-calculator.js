/**
 * 🧮 COMMISSION CALCULATOR
 * ========================
 * 
 * Microserviço para cálculo de comissões
 * Parte da Etapa 2: Sistema Financeiro Completo
 */

const { createLogger } = require('../../shared/utils/logger');

class CommissionCalculator {
    constructor(config = {}) {
        this.logger = createLogger('process.env.API_KEY_HERE');
        
        this.config = {
            // Taxas de comissão baseadas nas especificações
            commissionRates: {
                MONTHLY: 10,  // Mensal = 10%
                PREPAID: 20   // Pré-pago = 20%
            },
            
            // Taxas de afiliados
            affiliateRates: {
                none: 0,
                normal: 1.5,  // 1.5% da comissão total
                vip: 5.0      // 5.0% da comissão total
            },
            
            // Taxas de câmbio (mock - seria integração real)
            exchangeRates: {
                USDTOBRL: 5.50,
                BRLTOUSD: 0.18
            },
            
            // Configurações
            minimumCommission: 0.01,
            ...config
        };

        this.logger.info('CommissionCalculator inicializado', { config: this.config });
    }

    /**
     * Calcular comissão completa
     */
    async calculateCommission(operationData) {
        try {
            const {
                profit,
                planType,
                country,
                currency = 'USD',
                affiliateType = 'none',
                affiliateId = null,
                userId
            } = operationData;

            this.logger.info('Calculando comissão', { 
                profit, 
                planType, 
                country, 
                currency, 
                affiliateType,
                userId 
            });

            // REGRA FUNDAMENTAL: Apenas cobrar comissão em operações com LUCRO
            if (profit <= 0) {
                this.logger.info('Operação sem lucro - sem cobrança de comissão', { profit });
                return {
                    totalCommission: 0,
                    companyCommission: 0,
                    affiliateCommission: 0,
                    netProfit: profit,
                    currency: currency,
                    reason: 'No commission charged on loss operations',
                    breakdown: {
                        originalProfit: profit,
                        commissionRate: 0,
                        affiliateRate: 0
                    }
                };
            }

            // Obter taxa de comissão baseada no plano
            const commissionRate = this.config.commissionRates[planType] || this.config.commissionRates.PREPAID;
            
            // Calcular comissão total
            const totalCommission = Math.max(
                profit * (commissionRate / 100),
                this.config.minimumCommission
            );

            // Calcular comissão do afiliado
            const affiliateRate = this.config.affiliateRates[affiliateType] || 0;
            const affiliateCommission = affiliateRate > 0 && affiliateId ? 
                totalCommission * (affiliateRate / 100) : 0;

            // Comissão da empresa (total - afiliado)
            const companyCommission = totalCommission - affiliateCommission;

            // Lucro líquido do usuário
            const netProfit = profit - totalCommission;

            // Converter moedas se necessário
            const commissionInBRL = currency === 'USD' && country === 'BR' ?
                totalCommission * this.config.exchangeRates.USDTOBRL : totalCommission;

            const result = {
                // Valores principais
                totalCommission: Math.round(totalCommission * 100) / 100,
                companyCommission: Math.round(companyCommission * 100) / 100,
                affiliateCommission: Math.round(affiliateCommission * 100) / 100,
                netProfit: Math.round(netProfit * 100) / 100,

                // Informações de contexto
                currency: currency,
                commissionCurrency: country === 'BR' ? 'BRL' : 'USD',
                country: country,
                planType: planType,

                // Taxas aplicadas
                rates: {
                    commission: commissionRate,
                    affiliate: affiliateRate
                },

                // Breakdown detalhado
                breakdown: {
                    originalProfit: profit,
                    profitInBRL: currency === 'USD' && country === 'BR' ? 
                        profit * this.config.exchangeRates.USDTOBRL : profit,
                    commissionInBRL: country === 'BR' ? commissionInBRL : null,
                    exchangeRate: currency === 'USD' && country === 'BR' ? 
                        this.config.exchangeRates.USDTOBRL : null
                },

                // Informações do afiliado
                affiliate: {
                    id: affiliateId,
                    type: affiliateType,
                    commission: affiliateCommission,
                    rate: affiliateRate
                },

                // Timestamp
                calculatedAt: new Date().toISOString()
            };

            this.logger.info('Comissão calculada', result);

            return result;

        } catch (error) {
            this.logger.error('Erro ao calcular comissão', { error: error.message, operationData });
            throw error;
        }
    }

    /**
     * Calcular comissão para múltiplas operações
     */
    async calculateBatchCommissions(operations) {
        try {
            this.logger.info('Calculando comissões em lote', { count: operations.length });

            const results = [];
            let totalCommissions = 0;
            let totalAffiliateCommissions = 0;

            for (const operation of operations) {
                const commission = await this.calculateCommission(operation);
                results.push({
                    operationId: operation.id,
                    ...commission
                });

                totalCommissions += commission.totalCommission;
                totalAffiliateCommissions += commission.affiliateCommission;
            }

            const summary = {
                totalOperations: operations.length,
                totalCommissions: Math.round(totalCommissions * 100) / 100,
                totalAffiliateCommissions: Math.round(totalAffiliateCommissions * 100) / 100,
                totalCompanyCommissions: Math.round((totalCommissions - totalAffiliateCommissions) * 100) / 100,
                results
            };

            this.logger.info('Comissões em lote calculadas', summary);

            return summary;

        } catch (error) {
            this.logger.error('Erro ao calcular comissões em lote', { error: error.message });
            throw error;
        }
    }

    /**
     * Simular cálculo de comissão
     */
    async simulateCommission(scenarios) {
        try {
            this.logger.info('Simulando cenários de comissão', { count: scenarios.length });

            const simulations = [];

            for (const scenario of scenarios) {
                const commission = await this.calculateCommission(scenario);
                simulations.push({
                    scenario: scenario.name || `Profit: ${scenario.profit}, Plan: ${scenario.planType}`,
                    input: scenario,
                    output: commission
                });
            }

            return {
                simulations,
                summary: {
                    totalScenarios: scenarios.length,
                    timestamp: new Date().toISOString()
                }
            };

        } catch (error) {
            this.logger.error('Erro na simulação de comissões', { error: error.message });
            throw error;
        }
    }

    /**
     * Obter taxas de câmbio atuais (mock)
     */
    async getExchangeRates() {
        try {
            // Em produção, seria uma integração com API de câmbio real
            // Por enquanto, retorna valores mock
            
            const rates = {
                USD: {
                    BRL: this.config.exchangeRates.USDTOBRL,
                    EUR: 0.85,
                    updatedAt: new Date().toISOString()
                },
                BRL: {
                    USD: this.config.exchangeRates.BRLTOUSD,
                    EUR: 0.15,
                    updatedAt: new Date().toISOString()
                }
            };

            this.logger.info('Taxas de câmbio obtidas', rates);

            return rates;

        } catch (error) {
            this.logger.error('Erro ao obter taxas de câmbio', { error: error.message });
            throw error;
        }
    }

    /**
     * Atualizar configurações de comissão
     */
    updateCommissionRates(newRates) {
        try {
            this.logger.info('Atualizando taxas de comissão', { oldRates: this.config.commissionRates, newRates });

            this.config.commissionRates = {
                ...this.config.commissionRates,
                ...newRates
            };

            this.logger.info('Taxas de comissão atualizadas', { currentRates: this.config.commissionRates });

            return this.config.commissionRates;

        } catch (error) {
            this.logger.error('Erro ao atualizar taxas de comissão', { error: error.message });
            throw error;
        }
    }

    /**
     * Atualizar taxas de afiliados
     */
    updateAffiliateRates(newRates) {
        try {
            this.logger.info('Atualizando taxas de afiliados', { oldRates: this.config.affiliateRates, newRates });

            this.config.affiliateRates = {
                ...this.config.affiliateRates,
                ...newRates
            };

            this.logger.info('Taxas de afiliados atualizadas', { currentRates: this.config.affiliateRates });

            return this.config.affiliateRates;

        } catch (error) {
            this.logger.error('Erro ao atualizar taxas de afiliados', { error: error.message });
            throw error;
        }
    }

    /**
     * Validar dados de entrada
     */
    validateCommissionData(data) {
        const required = ['profit', 'planType', 'country'];
        const missing = required.filter(field => data[field] === undefined);

        if (missing.length > 0) {
            throw new Error(`Campos obrigatórios ausentes: ${missing.join(', ')}`);
        }

        if (typeof data.profit !== 'number') {
            throw new Error('Profit deve ser um número');
        }

        if (!['MONTHLY', 'PREPAID'].includes(data.planType)) {
            throw new Error('PlanType deve ser MONTHLY ou PREPAID');
        }

        if (!['BR', 'FOREIGN'].includes(data.country)) {
            throw new Error('Country deve ser BR ou FOREIGN');
        }

        if (data.affiliateType && !Object.keys(this.config.affiliateRates).includes(data.affiliateType)) {
            throw new Error(`AffiliateType inválido: ${data.affiliateType}`);
        }

        return true;
    }

    /**
     * Obter informações de configuração
     */
    getConfigInfo() {
        return {
            commissionRates: this.config.commissionRates,
            affiliateRates: this.config.affiliateRates,
            exchangeRates: this.config.exchangeRates,
            minimumCommission: this.config.minimumCommission,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = CommissionCalculator;
