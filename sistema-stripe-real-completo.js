// 🚀 SISTEMA STRIPE REAL - LINKS COMPLETOS
// =====================================
//
// IMPLEMENTAÇÃO COMPLETA:
// ✅ Links reais Stripe com chaves LIVE
// ✅ 2 Links de recarga: BRL e USD
// ✅ Sistema de afiliados automático
// ✅ Créditos administrativos (min R$200/USD35)
// ✅ Integração PostgreSQL completa

const express = require('express');
const Stripe = require('stripe');
const { Pool } = require('pg');
const crypto = require('crypto');

class SistemaStripeRealCompleto {
    constructor() {
        console.log('🚀 INICIANDO SISTEMA STRIPE REAL COMPLETO');
        console.log('=========================================');
        
        // ✅ CHAVES STRIPE REAIS (LIVE)
        this.stripe = Stripe('sk_live_STRIPE_SECRET_KEY_HERE');
        
        // ✅ POSTGRESQL REAL
        this.pool = new Pool({
            connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
            ssl: { rejectUnauthorized: false }
        });

        this.config = {
            // Planos de assinatura
            subscriptions: {
                brazil: {
                    price: 29700,     // R$ 297,00
                    currency: 'BRL',
                    name: 'CoinBitClub - Plano Mensal Brasil'
                },
                foreign: {
                    price: 5000,      // $50,00
                    currency: 'USD', 
                    name: 'CoinBitClub - Monthly Plan International'
                }
            },
            
            // Recargas
            recharges: {
                brl: {
                    minimum: 10000,   // R$ 100,00
                    currency: 'BRL',
                    name: 'CoinBitClub - Recarga Brasil'
                },
                usd: {
                    minimum: 2000,    // $20,00
                    currency: 'USD',
                    name: 'CoinBitClub - Recarga Internacional'
                }
            },
            
            // Créditos administrativos
            adminCredits: {
                brl: {
                    minimum: 20000,   // R$ 200,00
                    currency: 'BRL'
                },
                usd: {
                    minimum: 3500,    // $35,00
                    currency: 'USD'
                }
            },
            
            // URLs base
            frontend: process.env.FRONTEND_URL || 'https://coinbitclub.com',
            backend: process.env.BACKEND_URL || 'https://coinbitclub-backend.railway.app'
        };
    }

    // =======================================
    // 🗄️ CRIAÇÃO DAS TABELAS POSTGRESQL
    // =======================================
    
    async criarTabelasCompletas() {
        console.log('🗄️ Criando estrutura completa do banco...');
        
        const client = await this.pool.connect();
        
        try {
            // Tabela de códigos de afiliados
            await client.query(`
                CREATE TABLE IF NOT EXISTS affiliate_codes (
                    id SERIAL PRIMARY KEY,
                    code VARCHAR(20) UNIQUE NOT NULL,
                    user_id INTEGER REFERENCES users(id),
                    type VARCHAR(10) DEFAULT 'normal', -- normal, vip
                    commission_rate DECIMAL(5,2) DEFAULT 1.5,
                    clicks INTEGER DEFAULT 0,
                    conversions INTEGER DEFAULT 0,
                    total_earned DECIMAL(15,2) DEFAULT 0,
                    currency VARCHAR(3) DEFAULT 'USD',
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);

            // Tabela de códigos de créditos administrativos
            await client.query(`
                CREATE TABLE IF NOT EXISTS admin_credit_codes (
                    id SERIAL PRIMARY KEY,
                    code VARCHAR(30) UNIQUE NOT NULL,
                    amount DECIMAL(15,2) NOT NULL,
                    currency VARCHAR(3) NOT NULL,
                    created_by_admin INTEGER REFERENCES users(id),
                    used_by_user INTEGER REFERENCES users(id),
                    stripe_payment_link VARCHAR(500),
                    stripe_session_id VARCHAR(200),
                    is_used BOOLEAN DEFAULT false,
                    used_at TIMESTAMP,
                    expires_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);

            // Tabela de tracking de afiliados
            await client.query(`
                CREATE TABLE IF NOT EXISTS affiliate_tracking (
                    id SERIAL PRIMARY KEY,
                    affiliate_code VARCHAR(20) REFERENCES affiliate_codes(code),
                    visitor_ip VARCHAR(45),
                    user_agent TEXT,
                    referrer_url TEXT,
                    conversion_user_id INTEGER REFERENCES users(id),
                    conversion_amount DECIMAL(15,2),
                    commission_earned DECIMAL(15,2),
                    clicked_at TIMESTAMP DEFAULT NOW(),
                    converted_at TIMESTAMP
                )
            `);

            // Tabela de links Stripe gerados
            await client.query(`
                CREATE TABLE IF NOT EXISTS stripe_links (
                    id SERIAL PRIMARY KEY,
                    type VARCHAR(20) NOT NULL, -- subscription_br, subscription_usd, recharge_br, recharge_usd, admin_credit
                    stripe_url TEXT NOT NULL,
                    stripe_session_id VARCHAR(200),
                    user_id INTEGER REFERENCES users(id),
                    affiliate_code VARCHAR(20) REFERENCES affiliate_codes(code),
                    amount DECIMAL(15,2),
                    currency VARCHAR(3),
                    metadata JSONB,
                    is_completed BOOLEAN DEFAULT false,
                    created_at TIMESTAMP DEFAULT NOW(),
                    completed_at TIMESTAMP
                )
            `);

            console.log('✅ Tabelas criadas com sucesso');

        } finally {
            client.release();
        }
    }

    // =======================================
    // 🤝 SISTEMA DE AFILIADOS AUTOMÁTICO
    // =======================================
    
    async gerarCodigoAfiliado(userId, type = 'normal') {
        console.log(`🤝 Gerando código de afiliado para usuário ${userId}...`);
        
        const client = await this.pool.connect();
        
        try {
            // Gerar código único
            let code;
            let exists = true;
            
            while (exists) {
                code = `CBC${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
                const check = await client.query(
                    'SELECT id FROM affiliate_codes WHERE code = $1', 
                    [code]
                );
                exists = check.rows.length > 0;
            }

            // Definir taxa de comissão
            const commissionRate = type === 'vip' ? 5.0 : 1.5;

            // Inserir código na base
            const result = await client.query(`
                INSERT INTO affiliate_codes 
                (code, user_id, type, commission_rate, is_active)
                VALUES ($1, $2, $3, $4, true)
                RETURNING *
            `, [code, userId, type, commissionRate]);

            console.log(`✅ Código gerado: ${code} (${type} - ${commissionRate}%)`);
            
            return result.rows[0];

        } finally {
            client.release();
        }
    }

    // =======================================
    // 💳 CRÉDITOS ADMINISTRATIVOS
    // =======================================
    
    async gerarCreditoAdministrativo(adminId, amount, currency) {
        console.log(`💳 Gerando crédito administrativo: ${amount/100} ${currency}...`);
        
        // Validar valor mínimo
        const minimum = currency === 'BRL' ? 
            this.config.adminCredits.brl.minimum : 
            this.config.adminCredits.usd.minimum;
            
        if (amount < minimum) {
            throw new Error(`Valor mínimo: ${minimum/100} ${currency}`);
        }

        const client = await this.pool.connect();
        
        try {
            // Gerar código único
            let code;
            let exists = true;
            
            while (exists) {
                code = `ADMIN${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
                const check = await client.query(
                    'SELECT id FROM admin_credit_codes WHERE code = $1', 
                    [code]
                );
                exists = check.rows.length > 0;
            }

            // Criar Payment Link na Stripe
            const paymentLink = await this.stripe.paymentLinks.create({
                line_items: [{
                    price_data: {
                        currency: currency.toLowerCase(),
                        product_data: {
                            name: `CoinBitClub - Crédito Administrativo`,
                            description: `Crédito de ${(amount/100).toFixed(2)} ${currency} - Código: ${code}`
                        },
                        unit_amount: amount
                    },
                    quantity: 1
                }],
                metadata: {
                    type: 'admin_credit',
                    code: code,
                    amount: amount.toString(),
                    currency: currency,
                    created_by_admin: adminId.toString()
                }
            });

            // Salvar no banco
            const result = await client.query(`
                INSERT INTO admin_credit_codes 
                (code, amount, currency, created_by_admin, stripe_payment_link, expires_at)
                VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '30 days')
                RETURNING *
            `, [code, amount, currency, adminId, paymentLink.url]);

            console.log(`✅ Crédito gerado: ${code} - ${paymentLink.url}`);
            
            return {
                ...result.rows[0],
                payment_url: paymentLink.url
            };

        } finally {
            client.release();
        }
    }

    // =======================================
    // 🔗 LINKS STRIPE REAIS
    // =======================================
    
    setupRoutes(app) {
        console.log('🔗 Configurando links Stripe REAIS...');

        // 📋 ASSINATURA BRASIL - R$ 297,00
        app.post('/api/stripe/subscription/brazil', async (req, res) => {
            try {
                const { userId, customerEmail, customerName, affiliateCode } = req.body;

                const session = await this.stripe.checkout.sessions.create({
                    payment_method_types: ['card', 'boleto'],
                    mode: 'subscription',
                    customer_email: customerEmail,
                    line_items: [{
                        price_data: {
                            currency: 'brl',
                            product_data: {
                                name: this.config.subscriptions.brazil.name,
                                description: 'Acesso completo + 10% comissão sobre lucros'
                            },
                            unit_amount: this.config.subscriptions.brazil.price,
                            recurring: { interval: 'month' }
                        },
                        quantity: 1
                    }],
                    success_url: `${this.config.frontend}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `${this.config.frontend}/subscription/cancel`,
                    metadata: {
                        userId: userId.toString(),
                        type: 'subscription_brazil',
                        affiliateCode: affiliateCode || '',
                        customerName: customerName || ''
                    },
                    locale: 'pt-BR'
                });

                // Salvar link no banco
                await this.salvarLinkStripe('subscription_br', session.url, session.id, userId, affiliateCode, this.config.subscriptions.brazil.price, 'BRL');

                res.json({
                    success: true,
                    checkout_url: session.url,
                    session_id: session.id,
                    plan: 'Brasil R$ 297,00/mês'
                });

            } catch (error) {
                console.error('❌ Erro assinatura Brasil:', error);
                res.status(400).json({ error: error.message });
            }
        });

        // 📋 ASSINATURA EXTERIOR - $50,00
        app.post('/api/stripe/subscription/foreign', async (req, res) => {
            try {
                const { userId, customerEmail, customerName, affiliateCode } = req.body;

                const session = await this.stripe.checkout.sessions.create({
                    payment_method_types: ['card'],
                    mode: 'subscription',
                    customer_email: customerEmail,
                    line_items: [{
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: this.config.subscriptions.foreign.name,
                                description: 'Full access + 10% commission on profits'
                            },
                            unit_amount: this.config.subscriptions.foreign.price,
                            recurring: { interval: 'month' }
                        },
                        quantity: 1
                    }],
                    success_url: `${this.config.frontend}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `${this.config.frontend}/subscription/cancel`,
                    metadata: {
                        userId: userId.toString(),
                        type: 'subscription_foreign',
                        affiliateCode: affiliateCode || '',
                        customerName: customerName || ''
                    },
                    locale: 'en'
                });

                // Salvar link no banco
                await this.salvarLinkStripe('subscription_usd', session.url, session.id, userId, affiliateCode, this.config.subscriptions.foreign.price, 'USD');

                res.json({
                    success: true,
                    checkout_url: session.url,
                    session_id: session.id,
                    plan: 'International $50.00/month'
                });

            } catch (error) {
                console.error('❌ Erro assinatura exterior:', error);
                res.status(400).json({ error: error.message });
            }
        });

        // 💳 RECARGA BRASIL (BRL)
        app.post('/api/stripe/recharge/brazil', async (req, res) => {
            try {
                const { userId, amount, customerEmail, customerName, affiliateCode } = req.body;

                if (amount < this.config.recharges.brl.minimum) {
                    return res.status(400).json({
                        error: `Valor mínimo: R$ ${(this.config.recharges.brl.minimum/100).toFixed(2)}`
                    });
                }

                const session = await this.stripe.checkout.sessions.create({
                    payment_method_types: ['card', 'boleto'],
                    mode: 'payment',
                    customer_email: customerEmail,
                    line_items: [{
                        price_data: {
                            currency: 'brl',
                            product_data: {
                                name: this.config.recharges.brl.name,
                                description: `Recarga de R$ ${(amount/100).toFixed(2)}`
                            },
                            unit_amount: amount
                        },
                        quantity: 1
                    }],
                    success_url: `${this.config.frontend}/recharge/success?session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `${this.config.frontend}/recharge/cancel`,
                    metadata: {
                        userId: userId.toString(),
                        type: 'recharge_brazil',
                        amount: amount.toString(),
                        affiliateCode: affiliateCode || '',
                        customerName: customerName || ''
                    },
                    locale: 'pt-BR'
                });

                // Salvar link no banco
                await this.salvarLinkStripe('recharge_br', session.url, session.id, userId, affiliateCode, amount, 'BRL');

                res.json({
                    success: true,
                    checkout_url: session.url,
                    session_id: session.id,
                    amount: `R$ ${(amount/100).toFixed(2)}`,
                    currency: 'BRL'
                });

            } catch (error) {
                console.error('❌ Erro recarga Brasil:', error);
                res.status(400).json({ error: error.message });
            }
        });

        // 💳 RECARGA EXTERIOR (USD)
        app.post('/api/stripe/recharge/foreign', async (req, res) => {
            try {
                const { userId, amount, customerEmail, customerName, affiliateCode } = req.body;

                if (amount < this.config.recharges.usd.minimum) {
                    return res.status(400).json({
                        error: `Minimum amount: $${(this.config.recharges.usd.minimum/100).toFixed(2)}`
                    });
                }

                const session = await this.stripe.checkout.sessions.create({
                    payment_method_types: ['card'],
                    mode: 'payment',
                    customer_email: customerEmail,
                    line_items: [{
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: this.config.recharges.usd.name,
                                description: `Recharge $${(amount/100).toFixed(2)}`
                            },
                            unit_amount: amount
                        },
                        quantity: 1
                    }],
                    success_url: `${this.config.frontend}/recharge/success?session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `${this.config.frontend}/recharge/cancel`,
                    metadata: {
                        userId: userId.toString(),
                        type: 'recharge_foreign',
                        amount: amount.toString(),
                        affiliateCode: affiliateCode || '',
                        customerName: customerName || ''
                    },
                    locale: 'en'
                });

                // Salvar link no banco
                await this.salvarLinkStripe('recharge_usd', session.url, session.id, userId, affiliateCode, amount, 'USD');

                res.json({
                    success: true,
                    checkout_url: session.url,
                    session_id: session.id,
                    amount: `$${(amount/100).toFixed(2)}`,
                    currency: 'USD'
                });

            } catch (error) {
                console.error('❌ Erro recarga exterior:', error);
                res.status(400).json({ error: error.message });
            }
        });

        // 🤝 GERAR CÓDIGO DE AFILIADO
        app.post('/api/affiliate/generate-code', async (req, res) => {
            try {
                const { userId, type = 'normal' } = req.body;
                
                const affiliate = await this.gerarCodigoAfiliado(userId, type);
                
                res.json({
                    success: true,
                    affiliate_code: affiliate.code,
                    commission_rate: affiliate.commission_rate,
                    type: affiliate.type,
                    link: `${this.config.frontend}?ref=${affiliate.code}`
                });

            } catch (error) {
                console.error('❌ Erro gerar código afiliado:', error);
                res.status(400).json({ error: error.message });
            }
        });

        // 💳 GERAR CRÉDITO ADMINISTRATIVO
        app.post('/api/admin/generate-credit', async (req, res) => {
            try {
                const { adminId, amount, currency = 'BRL' } = req.body;
                
                const credit = await this.gerarCreditoAdministrativo(adminId, amount, currency);
                
                res.json({
                    success: true,
                    code: credit.code,
                    amount: (credit.amount / 100).toFixed(2),
                    currency: credit.currency,
                    payment_url: credit.payment_url,
                    expires_at: credit.expires_at
                });

            } catch (error) {
                console.error('❌ Erro gerar crédito admin:', error);
                res.status(400).json({ error: error.message });
            }
        });

        // 📊 INFORMAÇÕES COMPLETAS DO SISTEMA
        app.get('/api/stripe/info', (req, res) => {
            res.json({
                success: true,
                system: 'CoinBitClub Stripe Real System',
                endpoints: {
                    subscription_brazil: 'POST /api/stripe/subscription/brazil',
                    subscription_foreign: 'POST /api/stripe/subscription/foreign',
                    recharge_brazil: 'POST /api/stripe/recharge/brazil',
                    recharge_foreign: 'POST /api/stripe/recharge/foreign',
                    generate_affiliate: 'POST /api/affiliate/generate-code',
                    generate_admin_credit: 'POST /api/admin/generate-credit'
                },
                plans: {
                    subscription_brazil: 'R$ 297,00/mês',
                    subscription_foreign: '$50.00/month',
                    recharge_minimum_brazil: 'R$ 100,00',
                    recharge_minimum_foreign: '$20.00',
                    admin_credit_minimum_brazil: 'R$ 200,00',
                    admin_credit_minimum_foreign: '$35.00'
                },
                affiliate_rates: {
                    normal: '1.5%',
                    vip: '5.0%'
                },
                commission_rates: {
                    with_subscription: '10%',
                    without_subscription: '20%'
                }
            });
        });

        console.log('✅ Links Stripe REAIS configurados');
    }

    async salvarLinkStripe(type, url, sessionId, userId, affiliateCode, amount, currency) {
        const client = await this.pool.connect();
        
        try {
            await client.query(`
                INSERT INTO stripe_links 
                (type, stripe_url, stripe_session_id, user_id, affiliate_code, amount, currency)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [type, url, sessionId, userId, affiliateCode, amount, currency]);
            
        } finally {
            client.release();
        }
    }

    // =======================================
    // 🚀 INICIALIZAÇÃO COMPLETA
    // =======================================
    
    async inicializar() {
        console.log('\n🚀 INICIALIZANDO SISTEMA STRIPE REAL COMPLETO');
        console.log('==============================================');
        
        try {
            // Criar estrutura do banco
            await this.criarTabelasCompletas();
            
            // Testar conexão Stripe
            const account = await this.stripe.accounts.retrieve();
            console.log(`✅ Stripe conectado: ${account.business_profile?.name || account.id}`);
            
            // Testar conexão PostgreSQL
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();
            console.log('✅ PostgreSQL conectado');
            
            console.log('\n✅ SISTEMA STRIPE REAL 100% OPERACIONAL!');
            console.log('=========================================');
            console.log('🔗 Links disponíveis:');
            console.log('  • Assinatura Brasil: /api/stripe/subscription/brazil');
            console.log('  • Assinatura Exterior: /api/stripe/subscription/foreign');
            console.log('  • Recarga Brasil: /api/stripe/recharge/brazil');
            console.log('  • Recarga Exterior: /api/stripe/recharge/foreign');
            console.log('  • Código Afiliado: /api/affiliate/generate-code');
            console.log('  • Crédito Admin: /api/admin/generate-credit');
            console.log('  • Info Sistema: /api/stripe/info');
            
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            throw error;
        }
    }
}

// =======================================
// 🌐 SERVIDOR EXPRESS COMPLETO
// =======================================

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
});

// Inicializar sistema
const sistema = new SistemaStripeRealCompleto();

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        system: 'CoinBitClub Stripe Real System'
    });
});

// Executar se chamado diretamente
if (require.main === module) {
    sistema.inicializar()
        .then(() => {
            sistema.setupRoutes(app);
            
            const port = process.env.PORT || 3001;
            app.listen(port, '0.0.0.0', () => {
                console.log(`\n🌐 Servidor rodando na porta ${port}`);
                console.log(`🔗 Acesse: http://localhost:${port}/api/stripe/info`);
            });
        })
        .catch(error => {
            console.error('💥 Erro crítico:', error);
            process.exit(1);
        });
}

module.exports = SistemaStripeRealCompleto;
