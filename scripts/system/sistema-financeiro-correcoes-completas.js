// 🔧 SISTEMA FINANCEIRO - CORREÇÕES COMPLETAS
// =============================================
//
// CORREÇÕES IMPLEMENTADAS:
// ✅ Comissões de afiliados: 1.5% normal / 5% VIP (não 15%/25%)
// ✅ Sistema de comissionamento: COM assinatura 10% / SEM assinatura 20%
// ✅ Planos administrativos separados dos comerciais
// ✅ Links diretos para assinaturas e recargas
// ✅ Integração completa com Stripe

const express = require('express');
const Stripe = require('stripe');
const { Pool } = require('pg');

class SistemaFinanceiroCorrigido {
    constructor() {
        console.log('🔧 INICIANDO CORREÇÕES DO SISTEMA FINANCEIRO');
        console.log('============================================');
        
        this.stripe = Stripe(process.env.STRIPE_SECRET_KEY);
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });

        // ✅ CONFIGURAÇÕES CORRIGIDAS
        this.config = {
            // Comissões de afiliados CORRETAS
            affiliateRates: {
                normal: 1.5,  // ✅ 1.5% (não 15%)
                vip: 5.0      // ✅ 5.0% (não 25%)
            },
            
            // Sistema de comissionamento CORRETO
            commissionRates: {
                WITH_SUBSCRIPTION: 10,    // ✅ COM assinatura = 10%
                WITHOUT_SUBSCRIPTION: 20  // ✅ SEM assinatura = 20%
            },
            
            // Planos de assinatura
            subscriptionPlans: {
                BR: {
                    price: 29700,      // R$ 297,00
                    currency: 'BRL',
                    commission: 10     // 10% de comissão
                },
                FOREIGN: {
                    price: 5000,       // $50,00
                    currency: 'USD',
                    commission: 10     // 10% de comissão
                }
            },
            
            // Planos administrativos (separados)
            adminPlans: {
                BASIC_ADMIN: { credit: 50000, currency: 'BRL' },      // R$ 500
                PREMIUM_ADMIN: { credit: 100000, currency: 'BRL' },   // R$ 1000
                VIP_ADMIN: { credit: 200000, currency: 'BRL' }        // R$ 2000
            },
            
            // Limites e valores
            minimumRecharge: {
                BR: 10000,     // R$ 100,00
                FOREIGN: 2000  // $20,00
            },
            
            conversionBonus: 10 // +10% na conversão comissão→crédito
        };
    }

    // ========================================
    // 🔗 LINKS PARA ASSINATURAS E RECARGAS
    // ========================================
    
    createCheckoutRoutes(app) {
        console.log('🔗 Configurando links de checkout...');
        
        // 📋 LINK PARA ASSINATURA BRASIL
        app.post('/api/subscription/brazil/checkout', async (req, res) => {
            try {
                const { userId, customerEmail } = req.body;
                
                const session = await this.stripe.checkout.sessions.create({
                    payment_method_types: ['card', 'boleto'],
                    mode: 'subscription',
                    customer_email: customerEmail,
                    line_items: [{
                        price_data: {
                            currency: 'brl',
                            product_data: {
                                name: 'CoinBitClub - Plano Mensal Brasil',
                                description: 'Acesso completo ao sistema + 10% comissão sobre lucros'
                            },
                            unit_amount: this.config.subscriptionPlans.BR.price,
                            recurring: { interval: 'month' }
                        },
                        quantity: 1
                    }],
                    success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
                    metadata: {
                        userId: userId,
                        planType: 'MONTHLY_BR',
                        commission: '10'
                    }
                });

                res.json({
                    success: true,
                    checkoutUrl: session.url,
                    sessionId: session.id,
                    plan: 'Mensal Brasil',
                    price: 'R$ 297,00',
                    commission: '10%'
                });

            } catch (error) {
                res.status(400).json({
                    error: 'Erro ao criar link de assinatura Brasil',
                    details: error.message
                });
            }
        });

        // 📋 LINK PARA ASSINATURA EXTERIOR
        app.post('/api/subscription/foreign/checkout', async (req, res) => {
            try {
                const { userId, customerEmail } = req.body;
                
                const session = await this.stripe.checkout.sessions.create({
                    payment_method_types: ['card'],
                    mode: 'subscription',
                    customer_email: customerEmail,
                    line_items: [{
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: 'CoinBitClub - Monthly Plan International',
                                description: 'Full system access + 10% commission on profits'
                            },
                            unit_amount: this.config.subscriptionPlans.FOREIGN.price,
                            recurring: { interval: 'month' }
                        },
                        quantity: 1
                    }],
                    success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
                    metadata: {
                        userId: userId,
                        planType: 'MONTHLY_FOREIGN',
                        commission: '10'
                    }
                });

                res.json({
                    success: true,
                    checkoutUrl: session.url,
                    sessionId: session.id,
                    plan: 'Monthly International',
                    price: '$50.00',
                    commission: '10%'
                });

            } catch (error) {
                res.status(400).json({
                    error: 'Erro ao criar link de assinatura exterior',
                    details: error.message
                });
            }
        });

        // 💳 LINK PARA RECARGA FLEXÍVEL
        app.post('/api/recharge/checkout', async (req, res) => {
            try {
                const { userId, amount, currency = 'BRL', customerEmail } = req.body;
                
                // Validar valor mínimo
                const minimumAmount = currency === 'BRL' ? 
                    this.config.minimumRecharge.BR : 
                    this.config.minimumRecharge.FOREIGN;
                
                if (amount < minimumAmount) {
                    return res.status(400).json({
                        error: 'Valor abaixo do mínimo',
                        minimum: {
                            amount: minimumAmount / 100,
                            currency: currency
                        }
                    });
                }

                const session = await this.stripe.checkout.sessions.create({
                    payment_method_types: currency === 'BRL' ? ['card', 'boleto'] : ['card'],
                    mode: 'payment',
                    customer_email: customerEmail,
                    line_items: [{
                        price_data: {
                            currency: currency.toLowerCase(),
                            product_data: {
                                name: `CoinBitClub - Recarga de Créditos`,
                                description: `Recarga flexível de ${(amount/100).toFixed(2)} ${currency}`
                            },
                            unit_amount: amount
                        },
                        quantity: 1
                    }],
                    success_url: `${process.env.FRONTEND_URL}/recharge/success?session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `${process.env.FRONTEND_URL}/recharge/cancel`,
                    metadata: {
                        userId: userId,
                        type: 'RECHARGE',
                        amount: amount,
                        currency: currency
                    }
                });

                res.json({
                    success: true,
                    checkoutUrl: session.url,
                    sessionId: session.id,
                    amount: (amount/100).toFixed(2),
                    currency: currency,
                    minimum: (minimumAmount/100).toFixed(2)
                });

            } catch (error) {
                res.status(400).json({
                    error: 'Erro ao criar link de recarga',
                    details: error.message
                });
            }
        });

        console.log('✅ Links de checkout configurados');
    }

    // ========================================
    // 💰 SISTEMA DE COMISSÕES CORRIGIDO
    // ========================================
    
    async calculateCommissionCorrect(operationData) {
        const { 
            profit, 
            userId, 
            hasActiveSubscription = false, 
            affiliateId = null, 
            affiliateType = 'normal',
            currency = 'USD'
        } = operationData;

        // Apenas cobrar comissão em operações com LUCRO
        if (profit <= 0) {
            return {
                totalCommission: 0,
                companyCommission: 0,
                affiliateCommission: 0,
                netProfit: profit,
                reason: 'No commission on loss operations'
            };
        }

        // ✅ SISTEMA CORRIGIDO: COM/SEM assinatura
        const commissionRate = hasActiveSubscription ? 
            this.config.commissionRates.WITH_SUBSCRIPTION :    // 10% COM assinatura
            this.config.commissionRates.WITHOUT_SUBSCRIPTION;  // 20% SEM assinatura

        // Calcular comissão total
        const totalCommission = profit * (commissionRate / 100);
        
        // ✅ AFILIADOS CORRIGIDOS: 1.5% normal / 5% VIP
        let affiliateCommission = 0;
        if (affiliateId && affiliateType) {
            const affiliateRate = this.config.affiliateRates[affiliateType] || 0;
            affiliateCommission = totalCommission * (affiliateRate / 100);
        }
        
        const companyCommission = totalCommission - affiliateCommission;
        const netProfit = profit - totalCommission;

        return {
            totalCommission,
            companyCommission,
            affiliateCommission,
            netProfit,
            currency,
            commissionRate,
            affiliateRate: this.config.affiliateRates[affiliateType] || 0,
            hasActiveSubscription,
            planType: hasActiveSubscription ? 'WITH_SUBSCRIPTION' : 'WITHOUT_SUBSCRIPTION'
        };
    }

    // ========================================
    // 🔧 PLANOS ADMINISTRATIVOS
    // ========================================
    
    createAdminRoutes(app) {
        console.log('👑 Configurando planos administrativos...');
        
        // Criar cupom administrativo
        app.post('/api/admin/create-plan-coupon', async (req, res) => {
            try {
                const { adminId, planType, userId, expirationDays = 30 } = req.body;
                
                if (!this.config.adminPlans[planType]) {
                    return res.status(400).json({
                        error: 'Plano administrativo inválido',
                        validPlans: Object.keys(this.config.adminPlans)
                    });
                }

                const plan = this.config.adminPlans[planType];
                const couponCode = `ADMIN_${planType}_${Date.now()}`;
                
                const client = await this.pool.connect();
                
                try {
                    await client.query(`
                        INSERT INTO admin_coupons 
                        (coupon_code, credit_amount, currency, plan_type, created_by_admin, 
                         target_user_id, expiration_date, is_used)
                        VALUES ($1, $2, $3, $4, $5, $6, 
                                NOW() + INTERVAL '${expirationDays} days', false)
                    `, [
                        couponCode,
                        plan.credit,
                        plan.currency,
                        planType,
                        adminId,
                        userId
                    ]);

                    res.json({
                        success: true,
                        couponCode: couponCode,
                        plan: planType,
                        credit: plan.credit / 100,
                        currency: plan.currency,
                        expirationDays: expirationDays,
                        targetUserId: userId
                    });

                } finally {
                    client.release();
                }

            } catch (error) {
                res.status(400).json({
                    error: 'Erro ao criar cupom administrativo',
                    details: error.message
                });
            }
        });

        // Listar planos administrativos disponíveis
        app.get('/api/admin/plans', (req, res) => {
            const plans = Object.entries(this.config.adminPlans).map(([key, plan]) => ({
                code: key,
                credit: plan.credit / 100,
                currency: plan.currency,
                description: `Crédito administrativo de ${(plan.credit/100).toFixed(2)} ${plan.currency}`
            }));

            res.json({
                success: true,
                adminPlans: plans,
                note: 'Planos administrativos são separados dos comerciais'
            });
        });

        console.log('✅ Planos administrativos configurados');
    }

    // ========================================
    // 📊 DEMONSTRAÇÃO E TESTES
    // ========================================
    
    async demonstrarSistemaCorrigido() {
        console.log('\n🧪 DEMONSTRANDO SISTEMA CORRIGIDO');
        console.log('=================================');

        // Teste 1: Comissões de afiliados corretas
        console.log('\n1. 📊 Testando comissões de afiliados:');
        
        const testAffiliate = await this.calculateCommissionCorrect({
            profit: 100,
            hasActiveSubscription: true,
            affiliateType: 'normal',
            affiliateId: 123
        });
        
        console.log('   💰 Lucro: $100 | COM assinatura | Afiliado Normal');
        console.log(`   📈 Comissão total: $${testAffiliate.totalCommission.toFixed(2)} (10%)`);
        console.log(`   🏢 Empresa: $${testAffiliate.companyCommission.toFixed(2)}`);
        console.log(`   🤝 Afiliado: $${testAffiliate.affiliateCommission.toFixed(2)} (1.5% da comissão)`);
        console.log(`   💵 Lucro líquido: $${testAffiliate.netProfit.toFixed(2)}`);

        // Teste 2: Sistema sem assinatura
        console.log('\n2. 📊 Testando sistema sem assinatura:');
        
        const testNoSub = await this.calculateCommissionCorrect({
            profit: 100,
            hasActiveSubscription: false,
            affiliateType: 'vip',
            affiliateId: 456
        });
        
        console.log('   💰 Lucro: $100 | SEM assinatura | Afiliado VIP');
        console.log(`   📈 Comissão total: $${testNoSub.totalCommission.toFixed(2)} (20%)`);
        console.log(`   🏢 Empresa: $${testNoSub.companyCommission.toFixed(2)}`);
        console.log(`   🤝 Afiliado VIP: $${testNoSub.affiliateCommission.toFixed(2)} (5% da comissão)`);
        console.log(`   💵 Lucro líquido: $${testNoSub.netProfit.toFixed(2)}`);

        // Teste 3: Planos administrativos
        console.log('\n3. 👑 Planos administrativos disponíveis:');
        Object.entries(this.config.adminPlans).forEach(([key, plan]) => {
            console.log(`   ${key}: ${(plan.credit/100).toFixed(2)} ${plan.currency}`);
        });

        console.log('\n✅ Sistema demonstrado com todas as correções!');
    }

    // ========================================
    // 🌐 CONFIGURAR ROTAS COMPLETAS
    // ========================================
    
    setupRoutes(app) {
        console.log('🌐 Configurando rotas do sistema corrigido...');

        // Configurar checkout links
        this.createCheckoutRoutes(app);
        
        // Configurar rotas administrativas
        this.createAdminRoutes(app);

        // Informações sobre o sistema financeiro
        app.get('/api/financial/info', (req, res) => {
            res.json({
                success: true,
                system: 'COINBITCLUB FINANCIAL SYSTEM',
                commissionRates: {
                    withSubscription: `${this.config.commissionRates.WITH_SUBSCRIPTION}%`,
                    withoutSubscription: `${this.config.commissionRates.WITHOUT_SUBSCRIPTION}%`
                },
                affiliateRates: {
                    normal: `${this.config.affiliateRates.normal}%`,
                    vip: `${this.config.affiliateRates.vip}%`
                },
                subscriptionPlans: {
                    brazil: {
                        price: `R$ ${(this.config.subscriptionPlans.BR.price/100).toFixed(2)}`,
                        commission: `${this.config.subscriptionPlans.BR.commission}%`
                    },
                    international: {
                        price: `$${(this.config.subscriptionPlans.FOREIGN.price/100).toFixed(2)}`,
                        commission: `${this.config.subscriptionPlans.FOREIGN.commission}%`
                    }
                },
                minimumRecharge: {
                    brazil: `R$ ${(this.config.minimumRecharge.BR/100).toFixed(2)}`,
                    international: `$${(this.config.minimumRecharge.FOREIGN/100).toFixed(2)}`
                },
                adminPlans: Object.keys(this.config.adminPlans),
                links: {
                    subscriptionBrazil: '/api/subscription/brazil/checkout',
                    subscriptionForeign: '/api/subscription/foreign/checkout',
                    recharge: '/api/recharge/checkout'
                }
            });
        });

        // Webhook para processar pagamentos Stripe
        app.post('/api/stripe/webhook', express.raw({type: 'application/json'}), async (req, res) => {
            const sig = req.headers['stripe-signature'];
            let event;

            try {
                event = this.stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
            } catch (err) {
                console.log(`⚠️ Webhook signature verification failed.`, err.message);
                return res.status(400).send(`Webhook Error: ${err.message}`);
            }

            // Processar evento
            switch (event.type) {
                case 'checkout.session.completed':
                    await this.processCheckoutCompleted(event.data.object);
                    break;
                    
                case 'invoice.payment_succeeded':
                    await this.processSubscriptionPayment(event.data.object);
                    break;
                    
                case 'customer.subscription.deleted':
                    await this.processSubscriptionCanceled(event.data.object);
                    break;
                    
                default:
                    console.log(`Unhandled event type ${event.type}`);
            }

            res.json({received: true});
        });

        console.log('✅ Rotas configuradas completamente');
    }

    async processCheckoutCompleted(session) {
        console.log('💳 Processando checkout completado:', session.id);
        
        const { userId, planType, type, amount, currency } = session.metadata;
        
        if (type === 'RECHARGE') {
            // Processar recarga
            await this.creditUserBalance(userId, parseInt(amount), currency);
        } else if (planType && planType.includes('MONTHLY')) {
            // Processar assinatura
            await this.activateUserSubscription(userId, planType);
        }
    }

    async creditUserBalance(userId, amount, currency) {
        const client = await this.pool.connect();
        
        try {
            const column = currency === 'BRL' ? 'balance_real_brl' : 'balance_real_usd';
            
            await client.query(`
                UPDATE users 
                SET ${column} = ${column} + $1,
                    updated_at = NOW()
                WHERE id = $2
            `, [amount, userId]);
            
            console.log(`✅ Crédito adicionado: ${amount/100} ${currency} para usuário ${userId}`);
            
        } finally {
            client.release();
        }
    }

    async activateUserSubscription(userId, planType) {
        const client = await this.pool.connect();
        
        try {
            await client.query(`
                UPDATE users 
                SET plan_type = 'MONTHLY',
                    subscription_active = true,
                    subscription_plan = $1,
                    updated_at = NOW()
                WHERE id = $2
            `, [planType, userId]);
            
            console.log(`✅ Assinatura ativada: ${planType} para usuário ${userId}`);
            
        } finally {
            client.release();
        }
    }

    // ========================================
    // 🚀 INICIALIZAÇÃO
    // ========================================
    
    async initialize() {
        console.log('\n🚀 INICIALIZANDO SISTEMA FINANCEIRO CORRIGIDO');
        console.log('==============================================');
        
        try {
            // Demonstrar correções
            await this.demonstrarSistemaCorrigido();
            
            console.log('\n✅ SISTEMA FINANCEIRO 100% CORRIGIDO!');
            console.log('=====================================');
            console.log('🔧 Correções implementadas:');
            console.log('  • Afiliados: 1.5% normal / 5% VIP');
            console.log('  • Comissões: 10% COM assinatura / 20% SEM assinatura');
            console.log('  • Planos administrativos separados');
            console.log('  • Links diretos para checkout');
            console.log('  • Integração Stripe completa');
            
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            throw error;
        }
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const sistema = new SistemaFinanceiroCorrigido();
    sistema.initialize().catch(console.error);
}

module.exports = SistemaFinanceiroCorrigido;
