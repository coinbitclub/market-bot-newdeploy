// COMMISSION SYSTEM
// Sistema de comissões enterprise baseado nas especificações reais

class CommissionSystem {
    constructor() {
        // Configurações das variáveis de ambiente ou valores padrão
        this.commissionRates = {
            MONTHLY_BRAZIL: parseFloat(process.env.COMMISSION_MONTHLY_BRAZIL) || 10,   // 10% para plano mensal Brasil
            MONTHLY_FOREIGN: parseFloat(process.env.COMMISSION_MONTHLY_FOREIGN) || 10, // 10% para plano mensal exterior
            PREPAID_BRAZIL: parseFloat(process.env.COMMISSION_PREPAID_BRAZIL) || 20,   // 20% para plano pré-pago Brasil
            PREPAID_FOREIGN: parseFloat(process.env.COMMISSION_PREPAID_FOREIGN) || 20  // 20% para plano pré-pago exterior
        };

        // Porcentagem da comissão total que o afiliado recebe
        this.affiliateShares = {
            normal: parseFloat(process.env.AFFILIATE_NORMAL_SHARE) || 15,  // 15% da comissão total
            vip: parseFloat(process.env.AFFILIATE_VIP_SHARE) || 25         // 25% da comissão total
        };
        
        this.minimumCommission = 1.0; // Mínimo R$ 1,00
        
        // Cache para taxa de câmbio (válida por 1 hora)
        this.exchangeRateCache = {
            rate: 5.5, // Taxa padrão USD/BRL se API falhar
            timestamp: 0,
            ttl: 3600000 // 1 hora em milliseconds
        };
    }

    async getExchangeRate() {
        const now = Date.now();
        
        // Verificar se o cache ainda é válido
        if (now - this.exchangeRateCache.timestamp < this.exchangeRateCache.ttl) {
            return this.exchangeRateCache.rate;
        }

        try {
            // Tentar buscar taxa atual do USD/BRL
            const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
            const data = await response.json();
            
            if (data && data.rates && data.rates.BRL) {
                this.exchangeRateCache.rate = data.rates.BRL;
                this.exchangeRateCache.timestamp = now;
                console.log(`💱 Taxa de câmbio atualizada: USD/BRL ${data.rates.BRL.toFixed(4)}`);
                return data.rates.BRL;
            }
        } catch (error) {
            console.warn('⚠️ Erro ao buscar taxa de câmbio, usando cache:', error.message);
        }

        // Se falhar, usar taxa do cache ou padrão
        return this.exchangeRateCache.rate;
    }

    async calculateCommission(data) {
        const {
            profit = 0,
            plan = 'MONTHLY_BRAZIL',
            affiliateType = 'none',
            country = 'BR',
            currency = 'USD', // Operações são sempre em USD
            profitCurrency = 'USD' // Especificar moeda do lucro
        } = data;

        if (profit <= 0) {
            return {
                totalCommission: 0,
                companyCommission: 0,
                affiliateCommission: 0,
                netProfit: profit,
                rate: 0,
                currency: {
                    operation: currency,
                    commission: country === 'BR' ? 'BRL' : 'USD'
                },
                details: 'Sem lucro para calcular comissão'
            };
        }

        // Buscar taxa de câmbio se necessário
        let exchangeRate = 1;
        let profitInBRL = profit;
        
        if (country === 'BR' && currency === 'USD') {
            exchangeRate = await this.getExchangeRate();
            profitInBRL = profit * exchangeRate;
        }

        // Determinar taxa de comissão da empresa baseada no plano e país
        let planKey = plan;
        if (plan === 'MONTHLY') {
            planKey = country === 'BR' ? 'MONTHLY_BRAZIL' : 'MONTHLY_FOREIGN';
        } else if (plan === 'PREPAID') {
            planKey = country === 'BR' ? 'PREPAID_BRAZIL' : 'PREPAID_FOREIGN';
        }

        const companyRate = this.commissionRates[planKey] || this.commissionRates.MONTHLY_BRAZIL;
        
        // Calcular comissão baseada na moeda do plano
        const profitForCommission = country === 'BR' ? profitInBRL : profit;
        const totalCommission = Math.max(profitForCommission * (companyRate / 100), this.minimumCommission);

        // Calcular comissão do afiliado (porcentagem da comissão total)
        let affiliateCommission = 0;
        let companyCommission = totalCommission;
        
        if (affiliateType !== 'none' && this.affiliateShares[affiliateType]) {
            const affiliateShare = this.affiliateShares[affiliateType];
            affiliateCommission = totalCommission * (affiliateShare / 100);
            companyCommission = totalCommission - affiliateCommission;
        }

        // Net profit sempre na moeda original da operação
        const netProfitUSD = profit - (country === 'BR' ? totalCommission / exchangeRate : totalCommission);
        const netProfitBRL = country === 'BR' ? profitInBRL - totalCommission : netProfitUSD * exchangeRate;

        return {
            totalCommission: Math.round(totalCommission * 100) / 100,
            companyCommission: Math.round(companyCommission * 100) / 100,
            affiliateCommission: Math.round(affiliateCommission * 100) / 100,
            netProfit: Math.round(netProfitUSD * 100) / 100,
            currency: {
                operation: currency,
                commission: country === 'BR' ? 'BRL' : 'USD',
                exchangeRate: country === 'BR' ? exchangeRate : null
            },
            breakdown: {
                profitUSD: `$${profit.toFixed(2)}`,
                profitBRL: country === 'BR' ? `R$ ${profitInBRL.toFixed(2)}` : null,
                totalCommission: country === 'BR' ? `R$ ${totalCommission.toFixed(2)}` : `$${totalCommission.toFixed(2)}`,
                companyShare: country === 'BR' ? `R$ ${companyCommission.toFixed(2)}` : `$${companyCommission.toFixed(2)}`,
                affiliateShare: country === 'BR' ? `R$ ${affiliateCommission.toFixed(2)}` : `$${affiliateCommission.toFixed(2)}`,
                netProfitUSD: `$${netProfitUSD.toFixed(2)}`,
                netProfitBRL: country === 'BR' ? `R$ ${netProfitBRL.toFixed(2)}` : null,
                exchangeRate: country === 'BR' ? `1 USD = R$ ${exchangeRate.toFixed(4)}` : null
            },
            rates: {
                total: companyRate + '%',
                company: Math.round((companyCommission / totalCommission * 100) * 100) / 100 + '%',
                affiliate: affiliateType !== 'none' ? this.affiliateShares[affiliateType] + '%' : '0%'
            },
            details: country === 'BR' ? 
                `Comissão de ${companyRate}% sobre lucro de $${profit.toFixed(2)} (R$ ${profitInBRL.toFixed(2)} na cotação ${exchangeRate.toFixed(4)})` :
                `Comissão de ${companyRate}% sobre lucro de $${profit.toFixed(2)}`,
            plan: planKey,
            affiliateType: affiliateType
        };
    }

    getCommissionInfo() {
        return {
            companyRates: {
                monthly_brazil: this.commissionRates.MONTHLY_BRAZIL + '%',
                monthly_foreign: this.commissionRates.MONTHLY_FOREIGN + '%',
                prepaid_brazil: this.commissionRates.PREPAID_BRAZIL + '%',
                prepaid_foreign: this.commissionRates.PREPAID_FOREIGN + '%'
            },
            affiliateShares: {
                normal: this.affiliateShares.normal + '% da comissão total',
                vip: this.affiliateShares.vip + '% da comissão total'
            },
            minimum: `R$ ${this.minimumCommission.toFixed(2)}`,
            description: 'Sistema de comissões enterprise: empresa fica com 85%/75% e afiliado recebe 15%/25% da comissão total'
        };
    }

    getPlansInfo() {
        return {
            commission_structure: this.getCommissionInfo(),
            calculation_rules: {
                company_commission: 'Calculada sobre o lucro bruto',
                affiliate_commission: 'Calculada como porcentagem da comissão total (15% ou 25%)',
                minimum_commission: 'Valor mínimo garantido',
                plan_differentiation: 'Baseado em localização e tipo de assinatura'
            }
        };
    }

    validateCommissionData(data) {
        const errors = [];

        if (!data.profit || data.profit < 0) {
            errors.push('Lucro deve ser maior que zero');
        }

        const validPlans = ['MONTHLY', 'PREPAID', 'MONTHLY_BRAZIL', 'MONTHLY_FOREIGN', 'PREPAID_BRAZIL', 'PREPAID_FOREIGN'];
        if (!validPlans.includes(data.plan)) {
            errors.push('Plano deve ser um dos valores válidos: ' + validPlans.join(', '));
        }

        const validAffiliateTypes = ['none', 'normal', 'vip'];
        if (!validAffiliateTypes.includes(data.affiliateType)) {
            errors.push('Tipo de afiliado deve ser: none, normal ou vip');
        }

        const validCountries = ['BR', 'US', 'CA', 'UK', 'EU'];
        if (data.country && !validCountries.includes(data.country)) {
            errors.push('País deve ser um código válido: ' + validCountries.join(', '));
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}

module.exports = CommissionSystem;
