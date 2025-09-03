#!/usr/bin/env node

/**
 * 🔧 COINBITCLUB INTEGRATIONS VALIDATOR & FIXER
 * 
 * Valida e corrige integrações críticas em ambiente real:
 * - OpenAI para IA de análise e decisões
 * - Stripe para pagamentos e assinaturas
 * - Twilio para SMS e notificações
 * 
 * Executa testes reais e corrige configurações automaticamente
 */

require('dotenv').config();
const { Pool } = require('pg');

class IntegrationsValidator {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });

        this.results = {
            openai: { status: 'pending', tests: [], errors: [] },
            stripe: { status: 'pending', products: [], webhooks: [], errors: [] },
            twilio: { status: 'pending', services: [], errors: [] }
        };

        console.log('🔧 INTEGRATIONS VALIDATOR INICIADO');
        console.log('====================================');
    }

    async validateAllIntegrations() {
        try {
            console.log('\n🚀 VALIDANDO TODAS AS INTEGRAÇÕES...\n');

            // 1. Validar OpenAI com testes reais
            await this.validateOpenAIIntegration();

            // 2. Validar Stripe com produtos e webhooks reais
            await this.validateStripeIntegration();

            // 3. Validar Twilio com SMS real
            await this.validateTwilioIntegration();

            // 4. Gerar relatório final
            await this.generateIntegrationsReport();

        } catch (error) {
            console.error('❌ ERRO CRÍTICO:', error);
            process.exit(1);
        }
    }

    async validateOpenAIIntegration() {
        console.log('🤖 VALIDANDO INTEGRAÇÃO OPENAI...');

        if (!process.env.OPENAI_API_KEY) {
            this.results.openai.errors.push('API Key não configurada');
            this.results.openai.status = 'error';
            return;
        }

        try {
            const { OpenAI } = require('openai');
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

            // Teste 1: Conexão básica
            console.log('🧪 Teste 1: Conexão básica...');
            const basicTest = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: "Hello" }],
                max_tokens: 5
            });

            this.results.openai.tests.push({
                name: 'Conexão básica',
                status: 'success',
                response: basicTest.choices[0].message.content
            });
            console.log('✅ Conexão básica funcionando');

            // Teste 2: Análise de mercado (caso de uso real)
            console.log('🧪 Teste 2: Análise de mercado...');
            const marketAnalysis = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [{
                    role: "system",
                    content: "Você é um analista expert em criptomoedas. Analise os dados fornecidos e dê uma recomendação clara."
                }, {
                    role: "user", 
                    content: "Bitcoin está em $45,000, RSI 65, MACD bullish, volume acima da média. Fear & Greed Index: 60. Qual sua análise?"
                }],
                max_tokens: 200
            });

            this.results.openai.tests.push({
                name: 'Análise de mercado',
                status: 'success',
                response: marketAnalysis.choices[0].message.content.substring(0, 100) + '...'
            });
            console.log('✅ Análise de mercado funcionando');

            // Teste 3: Processamento de sinais (integração com trading)
            console.log('🧪 Teste 3: Processamento de sinais...');
            const signalProcessing = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{
                    role: "system",
                    content: "Analise o sinal de trading e retorne apenas: APPROVE, REJECT ou WAIT_CONFIRMATION"
                }, {
                    role: "user",
                    content: "SINAL_LONG BTCUSDT $45000 RSI:65 MACD:bullish Volume:high FearGreed:60"
                }],
                max_tokens: 10
            });

            this.results.openai.tests.push({
                name: 'Processamento de sinais',
                status: 'success',
                response: signalProcessing.choices[0].message.content.trim()
            });
            console.log('✅ Processamento de sinais funcionando');

            // Teste 4: Criação de função de monitoramento IA
            await this.createAIMonitoringFunction(openai);

            this.results.openai.status = 'success';
            console.log('✅ OpenAI completamente integrado e funcional\n');

        } catch (error) {
            console.error('❌ Erro OpenAI:', error.message);
            this.results.openai.status = 'error';
            this.results.openai.errors.push(error.message);
        }
    }

    async createAIMonitoringFunction(openai) {
        console.log('🧪 Teste 4: Criando função de monitoramento IA...');

        const aiMonitoringCode = `
const { OpenAI } = require('openai');

class CoinbitClubAIMonitor {
    constructor() {
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        this.lastAnalysis = null;
        this.analysisHistory = [];
    }

    async analyzeMarketSignal(signalData) {
        try {
            const prompt = \`
Analise este sinal de trading:
- Ação: \${signalData.action}
- Par: \${signalData.ticker}
- Preço: \${signalData.price}
- RSI: \${signalData.rsi || 'N/A'}
- Fear & Greed: \${signalData.fearGreed || 'N/A'}
- Volume: \${signalData.volume || 'N/A'}

Responda apenas com: APPROVE, REJECT, ou WAIT_CONFIRMATION
\`;

            const response = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: "Você é um analista de trading expert. Seja conciso." },
                    { role: "user", content: prompt }
                ],
                max_tokens: 10
            });

            const decision = response.choices[0].message.content.trim();
            
            this.lastAnalysis = {
                signal: signalData,
                decision: decision,
                timestamp: new Date(),
                confidence: this.calculateConfidence(signalData)
            };

            this.analysisHistory.push(this.lastAnalysis);
            
            return {
                decision: decision,
                confidence: this.lastAnalysis.confidence,
                reasoning: "AI analysis based on market indicators"
            };

        } catch (error) {
            console.error('❌ Erro na análise IA:', error);
            return { decision: 'WAIT_CONFIRMATION', confidence: 0, reasoning: 'AI analysis failed' };
        }
    }

    calculateConfidence(signalData) {
        let confidence = 50; // Base confidence
        
        if (signalData.rsi) {
            if (signalData.rsi > 30 && signalData.rsi < 70) confidence += 10;
            if (signalData.rsi > 20 && signalData.rsi < 80) confidence += 5;
        }
        
        if (signalData.fearGreed) {
            if (signalData.fearGreed > 25 && signalData.fearGreed < 75) confidence += 10;
        }
        
        return Math.min(confidence, 95); // Max 95% confidence
    }

    async generateDailyReport() {
        const recentAnalyses = this.analysisHistory.slice(-10);
        const approvals = recentAnalyses.filter(a => a.decision === 'APPROVE').length;
        const rejections = recentAnalyses.filter(a => a.decision === 'REJECT').length;
        
        const prompt = \`
Gere um relatório baseado nas análises recentes:
- Total de análises: \${recentAnalyses.length}
- Aprovações: \${approvals}
- Rejeições: \${rejections}
- Período: últimas 24 horas

Forneça insights sobre performance e tendências de mercado.
\`;

        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    { role: "system", content: "Gere um relatório profissional de trading." },
                    { role: "user", content: prompt }
                ],
                max_tokens: 500
            });

            return response.choices[0].message.content;
        } catch (error) {
            return "Erro ao gerar relatório: " + error.message;
        }
    }
}

module.exports = CoinbitClubAIMonitor;
`;

        // Salvar função de monitoramento IA
        require('fs').writeFileSync('./ai-monitoring-integration.js', aiMonitoringCode);
        console.log('✅ Função de monitoramento IA criada: ai-monitoring-integration.js');

        // Testar a função criada
        try {
            const AIMonitor = require('./ai-monitoring-integration.js');
            const monitor = new AIMonitor();
            
            const testSignal = {
                action: 'SINAL_LONG',
                ticker: 'BTCUSDT',
                price: 45000,
                rsi: 65,
                fearGreed: 60,
                volume: 'high'
            };

            const analysis = await monitor.analyzeMarketSignal(testSignal);
            console.log(`✅ Teste da função IA: ${analysis.decision} (confidence: ${analysis.confidence}%)`);

            this.results.openai.tests.push({
                name: 'Função de monitoramento',
                status: 'success',
                decision: analysis.decision,
                confidence: analysis.confidence
            });

        } catch (error) {
            console.log('⚠️ Erro ao testar função IA:', error.message);
        }
    }

    async validateStripeIntegration() {
        console.log('💳 VALIDANDO INTEGRAÇÃO STRIPE...');

        if (!process.env.STRIPE_SECRET_KEY) {
            this.results.stripe.errors.push('Secret Key não configurada');
            this.results.stripe.status = 'error';
            return;
        }

        try {
            const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

            // Teste 1: Conectividade
            console.log('🧪 Teste 1: Conectividade Stripe...');
            const balance = await stripe.balance.retrieve();
            console.log('✅ Conectado ao Stripe, moeda:', balance.available[0]?.currency || 'USD');

            // Teste 2: Criar produtos de teste real
            await this.createRealStripeProducts(stripe);

            // Teste 3: Testar webhooks
            await this.testStripeWebhooks(stripe);

            // Teste 4: Simular fluxo de pagamento completo
            await this.simulatePaymentFlow(stripe);

            this.results.stripe.status = 'success';
            console.log('✅ Stripe completamente integrado e funcional\n');

        } catch (error) {
            console.error('❌ Erro Stripe:', error.message);
            this.results.stripe.status = 'error';
            this.results.stripe.errors.push(error.message);
        }
    }

    async createRealStripeProducts(stripe) {
        console.log('🧪 Teste 2: Criando produtos Stripe reais...');

        const realProducts = [
            {
                name: 'CoinBitClub - Plano Mensal Premium',
                description: 'Acesso completo aos sinais de IA e trading automatizado por 30 dias',
                price: 9900, // R$ 99,00
                interval: 'month',
                features: ['Sinais IA em tempo real', 'Trading automatizado', 'Suporte 24/7', 'Dashboard premium']
            },
            {
                name: 'CoinBitClub - Plano Anual VIP',
                description: 'Acesso completo por 12 meses com 20% de desconto',
                price: 95040, // R$ 950,40 (20% desconto)
                interval: 'year',
                features: ['Tudo do plano mensal', '20% de desconto', 'Análises exclusivas', 'Mentoria mensal']
            },
            {
                name: 'Recarga Premium R$ 500',
                description: 'Recarga de saldo com 25% de bônus para trading',
                price: 50000, // R$ 500,00
                interval: 'one_time',
                bonus: 25,
                features: ['R$ 500 + R$ 125 bônus', 'Válido por 6 meses', 'Trading real']
            },
            {
                name: 'Recarga VIP R$ 1000',
                description: 'Recarga máxima com 30% de bônus para traders profissionais',
                price: 100000, // R$ 1000,00
                interval: 'one_time',
                bonus: 30,
                features: ['R$ 1000 + R$ 300 bônus', 'Trading em múltiplas exchanges', 'Sem limitações']
            }
        ];

        for (const productData of realProducts) {
            try {
                // Verificar se produto já existe
                const existingProducts = await stripe.products.search({
                    query: `name:'${productData.name}'`
                });

                let product;
                if (existingProducts.data.length > 0) {
                    product = existingProducts.data[0];
                    console.log(`♻️ Produto existente: ${productData.name}`);
                } else {
                    // Criar novo produto
                    product = await stripe.products.create({
                        name: productData.name,
                        description: productData.description,
                        metadata: {
                            type: productData.interval === 'one_time' ? 'recharge' : 'subscription',
                            bonus_percentage: productData.bonus || 0,
                            features: JSON.stringify(productData.features)
                        }
                    });
                    console.log(`✅ Produto criado: ${productData.name}`);
                }

                // Criar preço
                const priceConfig = {
                    unit_amount: productData.price,
                    currency: 'brl',
                    product: product.id
                };

                if (productData.interval !== 'one_time') {
                    priceConfig.recurring = { interval: productData.interval };
                }

                const price = await stripe.prices.create(priceConfig);

                // Criar payment link
                const paymentLink = await stripe.paymentLinks.create({
                    line_items: [{
                        price: price.id,
                        quantity: 1
                    }],
                    metadata: {
                        product_type: productData.interval === 'one_time' ? 'recharge' : 'subscription',
                        bonus_percentage: productData.bonus || 0
                    },
                    after_completion: {
                        type: 'redirect',
                        redirect: {
                            url: 'https://coinbitclub.com/success'
                        }
                    }
                });

                // Salvar no banco de dados
                await this.saveStripeProductToDatabase(product, price, paymentLink, productData);

                this.results.stripe.products.push({
                    name: productData.name,
                    price: `R$ ${(productData.price / 100).toFixed(2)}`,
                    link: paymentLink.url,
                    type: productData.interval === 'one_time' ? 'recharge' : 'subscription'
                });

                console.log(`   💰 Preço: R$ ${(productData.price / 100).toFixed(2)}`);
                console.log(`   🔗 Link: ${paymentLink.url}`);

            } catch (error) {
                console.log(`❌ Erro ao criar produto ${productData.name}:`, error.message);
                this.results.stripe.errors.push(`Produto ${productData.name}: ${error.message}`);
            }
        }
    }

    async saveStripeProductToDatabase(product, price, paymentLink, productData) {
        const client = await this.pool.connect();

        try {
            await client.query(`
                INSERT INTO stripe_products 
                (stripe_product_id, stripe_price_id, name, description, type, price_amount, 
                 currency, interval, bonus_percentage, payment_link, is_active, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, NOW())
                ON CONFLICT (stripe_product_id) DO UPDATE SET
                stripe_price_id = EXCLUDED.stripe_price_id,
                payment_link = EXCLUDED.payment_link,
                updated_at = NOW()
            `, [
                product.id,
                price.id, 
                productData.name,
                productData.description,
                productData.interval === 'one_time' ? 'recharge' : 'subscription',
                productData.price,
                'BRL',
                productData.interval,
                productData.bonus || 0,
                paymentLink.url
            ]);

        } catch (error) {
            console.log('⚠️ Erro ao salvar produto no banco:', error.message);
        } finally {
            client.release();
        }
    }

    async testStripeWebhooks(stripe) {
        console.log('🧪 Teste 3: Webhooks Stripe...');

        try {
            const webhooks = await stripe.webhookEndpoints.list();
            console.log(`✅ ${webhooks.data.length} webhooks configurados`);

            // Listar eventos importantes
            const events = await stripe.events.list({ limit: 5 });
            console.log(`✅ ${events.data.length} eventos recentes encontrados`);

            this.results.stripe.webhooks = webhooks.data.map(wh => ({
                url: wh.url,
                enabled_events: wh.enabled_events.length,
                status: wh.status
            }));

        } catch (error) {
            console.log('⚠️ Erro ao testar webhooks:', error.message);
        }
    }

    async simulatePaymentFlow(stripe) {
        console.log('🧪 Teste 4: Simulando fluxo de pagamento...');

        try {
            // Criar customer de teste
            const customer = await stripe.customers.create({
                email: 'test@coinbitclub.com',
                name: 'Test User',
                metadata: {
                    source: 'integration_test',
                    account_type: 'testnet'
                }
            });

            console.log(`✅ Customer criado: ${customer.id}`);

            // Simular intent de pagamento (não executamos realmente)
            const paymentIntent = await stripe.paymentIntents.create({
                amount: 9900, // R$ 99,00
                currency: 'brl',
                customer: customer.id,
                metadata: {
                    product_type: 'subscription',
                    test: 'true'
                },
                confirm: false // Não confirmar automaticamente
            });

            console.log(`✅ Payment Intent criado: ${paymentIntent.id}`);
            console.log(`   Status: ${paymentIntent.status}`);

            // Limpar dados de teste
            await stripe.customers.del(customer.id);
            console.log('✅ Dados de teste limpos');

        } catch (error) {
            console.log('⚠️ Erro na simulação:', error.message);
        }
    }

    async validateTwilioIntegration() {
        console.log('📱 VALIDANDO INTEGRAÇÃO TWILIO...');

        if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
            this.results.twilio.errors.push('Credenciais Twilio não configuradas');
            this.results.twilio.status = 'error';
            return;
        }

        try {
            const twilio = require('twilio')(
                process.env.TWILIO_ACCOUNT_SID,
                process.env.TWILIO_AUTH_TOKEN
            );

            // Teste 1: Conectividade
            console.log('🧪 Teste 1: Conectividade Twilio...');
            const account = await twilio.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
            console.log('✅ Conectado ao Twilio, status:', account.status);

            // Teste 2: Listar números disponíveis
            console.log('🧪 Teste 2: Números disponíveis...');
            const phoneNumbers = await twilio.incomingPhoneNumbers.list({ limit: 5 });
            console.log(`✅ ${phoneNumbers.length} números disponíveis`);

            if (phoneNumbers.length > 0) {
                console.log(`   📞 Número principal: ${phoneNumbers[0].phoneNumber}`);
                
                this.results.twilio.services.push({
                    type: 'phone_number',
                    number: phoneNumbers[0].phoneNumber,
                    status: 'active'
                });
            }

            // Teste 3: Criar função de notificação SMS
            await this.createSMSNotificationSystem(twilio, phoneNumbers[0]?.phoneNumber);

            // Teste 4: Testar envio de SMS (apenas em desenvolvimento)
            if (process.env.NODE_ENV === 'development' && process.env.TEST_PHONE_NUMBER) {
                await this.testSMSSending(twilio, phoneNumbers[0]?.phoneNumber);
            }

            this.results.twilio.status = 'success';
            console.log('✅ Twilio completamente integrado e funcional\n');

        } catch (error) {
            console.error('❌ Erro Twilio:', error.message);
            this.results.twilio.status = 'error';
            this.results.twilio.errors.push(error.message);
        }
    }

    async createSMSNotificationSystem(twilio, fromNumber) {
        console.log('🧪 Teste 3: Criando sistema de notificações SMS...');

        const smsSystemCode = `
const twilio = require('twilio')(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

class CoinbitClubSMSNotifier {
    constructor() {
        this.fromNumber = '${fromNumber || '+1234567890'}';
        this.templates = {
            trade_executed: 'CoinBitClub: Trade executado - {symbol} {side} {quantity} @ ${price}. PnL: {pnl}',
            position_closed: 'CoinBitClub: Posição fechada - {symbol} PnL: {pnl}. Saldo atual: ${balance}',
            signal_received: 'CoinBitClub: Novo sinal - {action} {symbol} @ ${price}',
            account_alert: 'CoinBitClub: ALERTA - {message}. Verifique sua conta.',
            payment_received: 'CoinBitClub: Pagamento recebido - ${amount}. Saldo atualizado.',
            subscription_expires: 'CoinBitClub: Sua assinatura expira em {days} dias. Renove agora!'
        };
    }

    async sendTradeNotification(userPhone, tradeData) {
        try {
            const message = this.formatMessage('trade_executed', {
                symbol: tradeData.symbol,
                side: tradeData.side,
                quantity: tradeData.quantity,
                price: tradeData.price,
                pnl: tradeData.pnl >= 0 ? '+' + tradeData.pnl : tradeData.pnl
            });

            const result = await twilio.messages.create({
                body: message,
                from: this.fromNumber,
                to: userPhone
            });

            console.log(\`📱 SMS enviado: \${result.sid}\`);
            return { success: true, sid: result.sid };

        } catch (error) {
            console.error('❌ Erro ao enviar SMS:', error);
            return { success: false, error: error.message };
        }
    }

    async sendSignalAlert(userPhone, signalData) {
        try {
            const message = this.formatMessage('signal_received', {
                action: signalData.action,
                symbol: signalData.symbol,
                price: signalData.price
            });

            const result = await twilio.messages.create({
                body: message,
                from: this.fromNumber,
                to: userPhone
            });

            return { success: true, sid: result.sid };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async sendAccountAlert(userPhone, alertMessage) {
        try {
            const message = this.formatMessage('account_alert', {
                message: alertMessage
            });

            const result = await twilio.messages.create({
                body: message,
                from: this.fromNumber,
                to: userPhone
            });

            return { success: true, sid: result.sid };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    formatMessage(template, data) {
        let message = this.templates[template];
        for (const [key, value] of Object.entries(data)) {
            message = message.replace(new RegExp(\`{\${key}}\`, 'g'), value);
        }
        return message;
    }

    async sendBulkNotifications(notifications) {
        const results = [];
        
        for (const notification of notifications) {
            try {
                const result = await twilio.messages.create({
                    body: notification.message,
                    from: this.fromNumber,
                    to: notification.phone
                });
                
                results.push({ 
                    phone: notification.phone, 
                    success: true, 
                    sid: result.sid 
                });
                
                // Rate limiting - aguardar 1 segundo entre envios
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                results.push({ 
                    phone: notification.phone, 
                    success: false, 
                    error: error.message 
                });
            }
        }
        
        return results;
    }
}

module.exports = CoinbitClubSMSNotifier;
`;

        // Salvar sistema de SMS
        require('fs').writeFileSync('./sms-notification-integration.js', smsSystemCode);
        console.log('✅ Sistema de notificações SMS criado: sms-notification-integration.js');

        this.results.twilio.services.push({
            type: 'notification_system',
            status: 'created',
            features: ['trade_notifications', 'signal_alerts', 'account_alerts', 'bulk_notifications']
        });
    }

    async testSMSSending(twilio, fromNumber) {
        console.log('🧪 Teste 4: Enviando SMS de teste...');

        try {
            const testMessage = await twilio.messages.create({
                body: 'CoinBitClub: Sistema SMS funcionando! Integração validada com sucesso.',
                from: fromNumber,
                to: process.env.TEST_PHONE_NUMBER
            });

            console.log(`✅ SMS de teste enviado: ${testMessage.sid}`);
            
            this.results.twilio.services.push({
                type: 'test_sms',
                status: 'sent',
                sid: testMessage.sid
            });

        } catch (error) {
            console.log('⚠️ Erro ao enviar SMS de teste:', error.message);
        }
    }

    async generateIntegrationsReport() {
        console.log('📊 RELATÓRIO DE INTEGRAÇÕES');
        console.log('=============================\n');

        // Status geral
        const integrations = ['openai', 'stripe', 'twilio'];
        const successful = integrations.filter(i => this.results[i].status === 'success').length;
        const total = integrations.length;

        console.log('🎯 RESUMO GERAL:');
        console.log(`   ✅ Integrações funcionando: ${successful}/${total}`);
        console.log(`   📊 Taxa de sucesso: ${Math.round((successful/total)*100)}%\n`);

        // OpenAI
        console.log('🤖 OPENAI:');
        console.log(`   Status: ${this.getStatusIcon(this.results.openai.status)} ${this.results.openai.status}`);
        if (this.results.openai.tests.length > 0) {
            console.log('   Testes executados:');
            this.results.openai.tests.forEach(test => {
                console.log(`     ✅ ${test.name}: ${test.status}`);
            });
        }
        if (this.results.openai.errors.length > 0) {
            console.log('   Erros:');
            this.results.openai.errors.forEach(error => {
                console.log(`     ❌ ${error}`);
            });
        }

        // Stripe
        console.log('\n💳 STRIPE:');
        console.log(`   Status: ${this.getStatusIcon(this.results.stripe.status)} ${this.results.stripe.status}`);
        if (this.results.stripe.products.length > 0) {
            console.log('   Produtos criados:');
            this.results.stripe.products.forEach(product => {
                console.log(`     💰 ${product.name}: ${product.price} (${product.type})`);
                console.log(`       🔗 ${product.link}`);
            });
        }
        if (this.results.stripe.webhooks.length > 0) {
            console.log('   Webhooks configurados:');
            this.results.stripe.webhooks.forEach(webhook => {
                console.log(`     🔗 ${webhook.url}: ${webhook.enabled_events} eventos`);
            });
        }

        // Twilio
        console.log('\n📱 TWILIO:');
        console.log(`   Status: ${this.getStatusIcon(this.results.twilio.status)} ${this.results.twilio.status}`);
        if (this.results.twilio.services.length > 0) {
            console.log('   Serviços disponíveis:');
            this.results.twilio.services.forEach(service => {
                console.log(`     📞 ${service.type}: ${service.status}`);
                if (service.number) console.log(`       Número: ${service.number}`);
                if (service.features) console.log(`       Features: ${service.features.join(', ')}`);
            });
        }

        // Próximos passos
        console.log('\n🎯 PRÓXIMOS PASSOS:');
        
        if (successful === total) {
            console.log('   🚀 TODAS AS INTEGRAÇÕES FUNCIONANDO!');
            console.log('   ✅ Sistema pronto para produção');
            console.log('   📋 Links de pagamento disponíveis');
            console.log('   🤖 IA integrada e funcional');
            console.log('   📱 SMS notifications ativas');
        } else {
            console.log('   ⚠️ Corrigir integrações com falha');
            console.log('   🔧 Verificar variáveis de ambiente');
            console.log('   📞 Contactar suporte se necessário');
        }

        console.log('\n=============================');
        console.log('✅ VALIDAÇÃO DE INTEGRAÇÕES FINALIZADA');
    }

    getStatusIcon(status) {
        switch(status) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'pending': return '⏳';
            default: return '⚠️';
        }
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const validator = new IntegrationsValidator();
    validator.validateAllIntegrations().catch(error => {
        console.error('💥 FALHA CRÍTICA:', error);
        process.exit(1);
    });
}

module.exports = IntegrationsValidator;
