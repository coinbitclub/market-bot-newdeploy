// 🔗 LINKS E ROTAS PARA ASSINATURAS E RECARGAS
// ============================================
//
// Sistema completo de checkout links para:
// ✅ Assinaturas Brasil (R$ 297,00)
// ✅ Assinaturas Exterior ($50,00)
// ✅ Recargas Flexíveis (min R$ 100 / $20)
// ✅ Planos Administrativos

const express = require('express');
const Stripe = require('stripe');

class CheckoutLinksManager {
    constructor() {
        this.stripe = Stripe(process.env.STRIPE_SECRET_KEY);
        
        this.plans = {
            // Assinaturas comerciais
            subscription: {
                brazil: {
                    price: 29700,     // R$ 297,00
                    currency: 'BRL',
                    name: 'CoinBitClub - Plano Mensal Brasil',
                    description: 'Acesso completo + 10% comissão sobre lucros',
                    commission: 10
                },
                foreign: {
                    price: 5000,      // $50,00
                    currency: 'USD',
                    name: 'CoinBitClub - Monthly Plan International',
                    description: 'Full access + 10% commission on profits',
                    commission: 10
                }
            },
            
            // Valores mínimos para recargas
            recharge: {
                minimumBR: 10000,    // R$ 100,00
                minimumForeign: 2000  // $20,00
            }
        };
    }

    setupRoutes(app) {
        console.log('🔗 Configurando links de checkout...');

        // ========================================
        // 📋 ASSINATURA BRASIL - R$ 297,00
        // ========================================
        app.post('/api/subscription/brazil/create-link', async (req, res) => {
            try {
                const { userId, customerEmail, customerName } = req.body;

                const session = await this.stripe.checkout.sessions.create({
                    payment_method_types: ['card', 'boleto'],
                    mode: 'subscription',
                    customer_email: customerEmail,
                    line_items: [{
                        price_data: {
                            currency: 'brl',
                            product_data: {
                                name: this.plans.subscription.brazil.name,
                                description: this.plans.subscription.brazil.description,
                                images: [`${process.env.FRONTEND_URL}/assets/logo-coinbitclub.png`]
                            },
                            unit_amount: this.plans.subscription.brazil.price,
                            recurring: { interval: 'month' }
                        },
                        quantity: 1
                    }],
                    success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
                    metadata: {
                        userId: userId,
                        planType: 'MONTHLY_BRAZIL',
                        commission: '10',
                        customerName: customerName || ''
                    },
                    billing_address_collection: 'required',
                    locale: 'pt-BR'
                });

                res.json({
                    success: true,
                    checkoutUrl: session.url,
                    sessionId: session.id,
                    plan: {
                        name: 'Plano Mensal Brasil',
                        price: 'R$ 297,00',
                        commission: '10%',
                        currency: 'BRL'
                    }
                });

            } catch (error) {
                console.error('❌ Erro ao criar link assinatura Brasil:', error);
                res.status(400).json({
                    error: 'Erro ao criar link de assinatura',
                    details: error.message
                });
            }
        });

        // ========================================
        // 📋 ASSINATURA EXTERIOR - $50,00
        // ========================================
        app.post('/api/subscription/foreign/create-link', async (req, res) => {
            try {
                const { userId, customerEmail, customerName } = req.body;

                const session = await this.stripe.checkout.sessions.create({
                    payment_method_types: ['card'],
                    mode: 'subscription',
                    customer_email: customerEmail,
                    line_items: [{
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: this.plans.subscription.foreign.name,
                                description: this.plans.subscription.foreign.description,
                                images: [`${process.env.FRONTEND_URL}/assets/logo-coinbitclub.png`]
                            },
                            unit_amount: this.plans.subscription.foreign.price,
                            recurring: { interval: 'month' }
                        },
                        quantity: 1
                    }],
                    success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
                    metadata: {
                        userId: userId,
                        planType: 'MONTHLY_FOREIGN',
                        commission: '10',
                        customerName: customerName || ''
                    },
                    billing_address_collection: 'required',
                    locale: 'en'
                });

                res.json({
                    success: true,
                    checkoutUrl: session.url,
                    sessionId: session.id,
                    plan: {
                        name: 'Monthly International Plan',
                        price: '$50.00',
                        commission: '10%',
                        currency: 'USD'
                    }
                });

            } catch (error) {
                console.error('❌ Erro ao criar link assinatura exterior:', error);
                res.status(400).json({
                    error: 'Erro ao criar link de assinatura internacional',
                    details: error.message
                });
            }
        });

        // ========================================
        // 💳 RECARGAS FLEXÍVEIS
        // ========================================
        app.post('/api/recharge/create-link', async (req, res) => {
            try {
                const { userId, amount, currency = 'BRL', customerEmail, customerName } = req.body;

                // Validar valor mínimo
                const minimumAmount = currency === 'BRL' ? 
                    this.plans.recharge.minimumBR : 
                    this.plans.recharge.minimumForeign;

                if (amount < minimumAmount) {
                    return res.status(400).json({
                        error: 'Valor abaixo do mínimo permitido',
                        minimum: {
                            amount: minimumAmount / 100,
                            currency: currency,
                            formatted: currency === 'BRL' ? 
                                `R$ ${(minimumAmount/100).toFixed(2)}` : 
                                `$${(minimumAmount/100).toFixed(2)}`
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
                                description: `Recarga flexível de ${(amount/100).toFixed(2)} ${currency}`,
                                images: [`${process.env.FRONTEND_URL}/assets/logo-coinbitclub.png`]
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
                        amount: amount.toString(),
                        currency: currency,
                        customerName: customerName || ''
                    },
                    billing_address_collection: 'required',
                    locale: currency === 'BRL' ? 'pt-BR' : 'en'
                });

                res.json({
                    success: true,
                    checkoutUrl: session.url,
                    sessionId: session.id,
                    recharge: {
                        amount: (amount/100).toFixed(2),
                        currency: currency,
                        formatted: currency === 'BRL' ? 
                            `R$ ${(amount/100).toFixed(2)}` : 
                            `$${(amount/100).toFixed(2)}`,
                        minimum: currency === 'BRL' ? 
                            `R$ ${(minimumAmount/100).toFixed(2)}` : 
                            `$${(minimumAmount/100).toFixed(2)}`
                    }
                });

            } catch (error) {
                console.error('❌ Erro ao criar link de recarga:', error);
                res.status(400).json({
                    error: 'Erro ao criar link de recarga',
                    details: error.message
                });
            }
        });

        // ========================================
        // 📊 INFORMAÇÕES DOS PLANOS
        // ========================================
        app.get('/api/plans/info', (req, res) => {
            res.json({
                success: true,
                system: 'CoinBitClub Financial System',
                subscriptions: {
                    brazil: {
                        name: 'Plano Mensal Brasil',
                        price: 'R$ 297,00',
                        commission: '10%',
                        currency: 'BRL',
                        endpoint: '/api/subscription/brazil/create-link'
                    },
                    international: {
                        name: 'Monthly International Plan',
                        price: '$50.00',
                        commission: '10%',
                        currency: 'USD',
                        endpoint: '/api/subscription/foreign/create-link'
                    }
                },
                recharges: {
                    minimums: {
                        brazil: 'R$ 100,00',
                        international: '$20.00'
                    },
                    endpoint: '/api/recharge/create-link',
                    flexible: true,
                    description: 'Valores customizáveis acima do mínimo'
                },
                commissions: {
                    withSubscription: '10%',
                    withoutSubscription: '20%',
                    affiliates: {
                        normal: '1.5%',
                        vip: '5.0%'
                    }
                },
                adminPlans: {
                    description: 'Planos administrativos disponíveis separadamente',
                    endpoint: '/api/admin/plans'
                }
            });
        });

        // ========================================
        // 📱 LINKS DIRETOS RÁPIDOS
        // ========================================
        app.get('/quick-links', (req, res) => {
            const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
            
            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>CoinBitClub - Links Rápidos</title>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: Arial, sans-serif; margin: 40px; background: #1a1a1a; color: #fff; }
                        .container { max-width: 800px; margin: 0 auto; }
                        .header { text-align: center; margin-bottom: 40px; }
                        .card { background: #2d2d2d; padding: 20px; margin: 20px 0; border-radius: 10px; }
                        .button { background: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; text-decoration: none; display: inline-block; margin: 5px; }
                        .button:hover { background: #45a049; }
                        .price { font-size: 24px; font-weight: bold; color: #4CAF50; }
                        .commission { color: #FF9800; font-weight: bold; }
                        .minimum { color: #2196F3; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🚀 CoinBitClub - Links de Checkout</h1>
                            <p>Sistema financeiro completo com Stripe</p>
                        </div>

                        <div class="card">
                            <h2>📋 Assinaturas Mensais</h2>
                            <h3>🇧🇷 Brasil</h3>
                            <p><span class="price">R$ 297,00</span>/mês</p>
                            <p><span class="commission">Comissão: 10%</span> sobre lucros</p>
                            <p><strong>Endpoint:</strong> POST ${baseUrl}/api/subscription/brazil/create-link</p>
                            <p><strong>Parâmetros:</strong> userId, customerEmail, customerName</p>
                            
                            <h3>🌍 Internacional</h3>
                            <p><span class="price">$50.00</span>/mês</p>
                            <p><span class="commission">Comissão: 10%</span> sobre lucros</p>
                            <p><strong>Endpoint:</strong> POST ${baseUrl}/api/subscription/foreign/create-link</p>
                            <p><strong>Parâmetros:</strong> userId, customerEmail, customerName</p>
                        </div>

                        <div class="card">
                            <h2>💳 Recargas Flexíveis</h2>
                            <p><span class="minimum">Mínimo Brasil:</span> R$ 100,00</p>
                            <p><span class="minimum">Mínimo Internacional:</span> $20.00</p>
                            <p><strong>Endpoint:</strong> POST ${baseUrl}/api/recharge/create-link</p>
                            <p><strong>Parâmetros:</strong> userId, amount, currency, customerEmail, customerName</p>
                        </div>

                        <div class="card">
                            <h2>🔧 Sistema de Comissões</h2>
                            <p><strong>COM assinatura:</strong> <span class="commission">10%</span></p>
                            <p><strong>SEM assinatura:</strong> <span class="commission">20%</span></p>
                            <p><strong>Afiliado Normal:</strong> 1.5% da comissão</p>
                            <p><strong>Afiliado VIP:</strong> 5.0% da comissão</p>
                        </div>

                        <div class="card">
                            <h2>📊 APIs Disponíveis</h2>
                            <p><a href="${baseUrl}/api/plans/info" class="button">Informações dos Planos</a></p>
                            <p><a href="${baseUrl}/api/admin/plans" class="button">Planos Administrativos</a></p>
                            <p><a href="${baseUrl}/status" class="button">Status do Sistema</a></p>
                        </div>

                        <div class="card">
                            <h2>💡 Exemplo de Uso</h2>
                            <pre style="background: #333; padding: 15px; border-radius: 5px; overflow-x: auto;">
// Criar link de assinatura Brasil
POST ${baseUrl}/api/subscription/brazil/create-link
{
  "userId": "123",
  "customerEmail": "usuario@email.com",
  "customerName": "Nome do Usuario"
}

// Criar link de recarga
POST ${baseUrl}/api/recharge/create-link
{
  "userId": "123",
  "amount": 15000,  // R$ 150,00 em centavos
  "currency": "BRL",
  "customerEmail": "usuario@email.com",
  "customerName": "Nome do Usuario"
}
                            </pre>
                        </div>
                    </div>
                </body>
                </html>
            `);
        });

        console.log('✅ Links de checkout configurados:');
        console.log('   📋 /api/subscription/brazil/create-link');
        console.log('   📋 /api/subscription/foreign/create-link');
        console.log('   💳 /api/recharge/create-link');
        console.log('   📊 /api/plans/info');
        console.log('   📱 /quick-links');
    }
}

module.exports = CheckoutLinksManager;
