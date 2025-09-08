/**
 * 💱 CURRENCY CONVERTER - CONVERSÃO USD/BRL ENTERPRISE
 * ===================================================
 * 
 * Sistema robusto de conversão de moedas
 * Conforme especificação técnica para comissões
 * 
 * @author CoinBitClub Enterprise Team
 * @version 6.0.0
 */

const axios = require('axios');
const { Pool } = require('pg');

class CurrencyConverter {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });

        this.cache = new Map();
        this.lastUpdate = null;
        this.updateInterval = 15 * 60 * 1000; // 15 minutos
        
        // APIs de câmbio (fallback múltiplo)
        this.exchangeAPIs = [
            {
                name: 'ExchangeRate-API',
                url: 'https://api.exchangerate-api.com/v4/latest/USD',
                parse: (data) => data.rates.BRL
            },
            {
                name: 'Fixer.io',
                url: `https://api.fixer.io/latest?access_key=${process.env.FIXER_API_KEY}&base=USD&symbols=BRL`,
                parse: (data) => data.rates.BRL
            },
            {
                name: 'CurrencyAPI',
                url: `https://api.currencyapi.com/v3/latest?apikey=${process.env.CURRENCY_API_KEY}&base_currency=USD&currencies=BRL`,
                parse: (data) => data.data.BRL.value
            }
        ];

        console.log('💱 Currency Converter inicializado');
        this.startAutoUpdate();
    }

    /**
     * 📈 Obter taxa de câmbio atual USD/BRL
     */
    async getExchangeRate() {
        try {
            // Verificar cache primeiro
            const cached = this.cache.get('USD_BRL');
            if (cached && Date.now() - cached.timestamp < this.updateInterval) {
                return cached.rate;
            }

            // Tentar APIs em sequência
            for (const api of this.exchangeAPIs) {
                try {
                    console.log(`💱 Consultando ${api.name}...`);
                    
                    const response = await axios.get(api.url, { timeout: 5000 });
                    const rate = api.parse(response.data);
                    
                    if (rate && rate > 0) {
                        // Validar se taxa está em range aceitável (R$4.50 - R$7.00)
                        if (rate >= 4.5 && rate <= 7.0) {
                            await this.saveExchangeRate(rate, api.name);
                            
                            this.cache.set('USD_BRL', {
                                rate: rate,
                                timestamp: Date.now(),
                                source: api.name
                            });
                            
                            console.log(`✅ Taxa obtida: $1 USD = R$${rate.toFixed(4)} (${api.name})`);
                            return rate;
                        } else {
                            console.warn(`⚠️ Taxa suspeita de ${api.name}: R$${rate}`);
                        }
                    }
                } catch (error) {
                    console.warn(`⚠️ Falha em ${api.name}: ${error.message}`);
                    continue;
                }
            }

            // Fallback: buscar última taxa salva no banco
            const lastRate = await this.getLastSavedRate();
            if (lastRate) {
                console.log(`🔄 Usando última taxa salva: R$${lastRate.rate}`);
                return lastRate.rate;
            }

            // Fallback final: taxa fixa conservadora
            const fallbackRate = 5.25;
            console.log(`⚠️ Usando taxa fallback: R$${fallbackRate}`);
            return fallbackRate;

        } catch (error) {
            console.error('❌ Erro ao obter taxa de câmbio:', error.message);
            return 5.25; // Taxa de segurança
        }
    }

    /**
     * 💰 Converter comissão conforme especificação
     */
    async convertCommission(amountUSD, userCountry, operationType = 'TRADING') {
        try {
            const result = {
                original_amount_usd: amountUSD,
                converted_amount_brl: null,
                exchange_rate: null,
                conversion_date: new Date(),
                user_country: userCountry,
                operation_type: operationType,
                requires_conversion: userCountry === 'BR'
            };

            if (userCountry === 'BR') {
                // Usuário brasileiro - converter para BRL
                const rate = await this.getExchangeRate();
                const convertedBRL = amountUSD * rate;
                
                result.converted_amount_brl = convertedBRL;
                result.exchange_rate = rate;
                result.final_amount = convertedBRL;
                result.currency = 'BRL';

                console.log(`💱 Conversão: $${amountUSD} USD → R$${convertedBRL.toFixed(2)} BRL (Taxa: ${rate.toFixed(4)})`);
                
                // Salvar conversão no banco
                await this.saveConversion(result);
                
            } else {
                // Usuário internacional - manter em USD
                result.final_amount = amountUSD;
                result.currency = 'USD';
                
                console.log(`💵 Mantido em USD: $${amountUSD}`);
            }

            return result;

        } catch (error) {
            console.error('❌ Erro na conversão de comissão:', error.message);
            throw error;
        }
    }

    /**
     * 📊 Calcular comissão conforme especificação
     */
    async calculateCommission(tradeProfitUSD, userPlan, userCountry, affiliateType = null) {
        try {
            // Aplicar taxa de comissão conforme especificação
            const commissionRates = {
                'MONTHLY': 0.10,    // 10% plano mensal
                'PREPAID': 0.20     // 20% plano pré-pago
            };

            const companyCommissionRate = commissionRates[userPlan] || 0.10;
            const companyCommissionUSD = tradeProfitUSD * companyCommissionRate;

            // Converter comissão da empresa
            const companyCommission = await this.convertCommission(companyCommissionUSD, userCountry, 'COMPANY_COMMISSION');

            const result = {
                trade_profit_usd: tradeProfitUSD,
                user_plan: userPlan,
                user_country: userCountry,
                company_commission: companyCommission,
                affiliate_commission: null,
                total_deducted: companyCommission.final_amount
            };

            // Calcular comissão de afiliado se aplicável
            if (affiliateType) {
                const affiliateRates = {
                    'AFFILIATE': 0.015,      // 1.5% da comissão da empresa
                    'AFFILIATE_VIP': 0.05    // 5.0% da comissão da empresa
                };

                const affiliateRate = affiliateRates[affiliateType] || 0;
                const affiliateCommissionUSD = companyCommissionUSD * affiliateRate;
                
                const affiliateCommission = await this.convertCommission(
                    affiliateCommissionUSD, 
                    userCountry, 
                    'AFFILIATE_COMMISSION'
                );

                result.affiliate_commission = affiliateCommission;
                
                console.log(`🤝 Comissão afiliado (${affiliateType}): ${(affiliateRate * 100)}% = ${affiliateCommission.currency} ${affiliateCommission.final_amount.toFixed(2)}`);
            }

            console.log(`💰 Comissão empresa (${userPlan}): ${(companyCommissionRate * 100)}% = ${companyCommission.currency} ${companyCommission.final_amount.toFixed(2)}`);
            
            return result;

        } catch (error) {
            console.error('❌ Erro no cálculo de comissão:', error.message);
            throw error;
        }
    }

    /**
     * 💾 Salvar taxa de câmbio no banco
     */
    async saveExchangeRate(rate, source) {
        try {
            await this.pool.query(`
                INSERT INTO exchange_rates (
                    from_currency, to_currency, rate, source, created_at
                ) VALUES ($1, $2, $3, $4, $5)
            `, ['USD', 'BRL', rate, source, new Date()]);
        } catch (error) {
            console.error('❌ Erro ao salvar taxa:', error.message);
        }
    }

    /**
     * 📊 Buscar última taxa salva
     */
    async getLastSavedRate() {
        try {
            const result = await this.pool.query(`
                SELECT rate, created_at, source
                FROM exchange_rates 
                WHERE from_currency = 'USD' AND to_currency = 'BRL'
                ORDER BY created_at DESC 
                LIMIT 1
            `);

            return result.rows[0] || null;
        } catch (error) {
            console.error('❌ Erro ao buscar última taxa:', error.message);
            return null;
        }
    }

    /**
     * 💾 Salvar conversão no banco
     */
    async saveConversion(conversionData) {
        try {
            await this.pool.query(`
                INSERT INTO currency_conversions (
                    original_amount_usd, converted_amount_brl, exchange_rate,
                    user_country, operation_type, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                conversionData.original_amount_usd,
                conversionData.converted_amount_brl,
                conversionData.exchange_rate,
                conversionData.user_country,
                conversionData.operation_type,
                conversionData.conversion_date
            ]);
        } catch (error) {
            console.error('❌ Erro ao salvar conversão:', error.message);
        }
    }

    /**
     * 🔄 Auto-atualização de taxas
     */
    startAutoUpdate() {
        setInterval(async () => {
            try {
                await this.getExchangeRate();
                console.log('🔄 Taxa de câmbio atualizada automaticamente');
            } catch (error) {
                console.error('❌ Erro na atualização automática:', error.message);
            }
        }, this.updateInterval);
    }

    /**
     * 📊 Obter estatísticas de conversão
     */
    async getConversionStats() {
        try {
            const stats = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_conversions,
                    SUM(original_amount_usd) as total_usd_converted,
                    SUM(converted_amount_brl) as total_brl_converted,
                    AVG(exchange_rate) as avg_exchange_rate,
                    MAX(created_at) as last_conversion
                FROM currency_conversions 
                WHERE created_at > NOW() - INTERVAL '24 hours'
            `);

            return stats.rows[0];
        } catch (error) {
            console.error('❌ Erro ao obter estatísticas:', error.message);
            return null;
        }
    }
}

module.exports = CurrencyConverter;
