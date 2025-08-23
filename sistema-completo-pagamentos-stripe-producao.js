// SISTEMA COMPLETO DE PAGAMENTOS STRIPE PRODUÇÃO
// Implementação completa com todos os planos e descontos especificados

const stripe = require('stripe')('[STRIPE_SECRET_KEY_REMOVED]');

class SistemaCompletoPagamentosStripe {
    constructor() {
        this.config = {
            // Chaves Stripe PRODUÇÃO
            secretKey: '[STRIPE_SECRET_KEY_REMOVED]',
            publishableKey: 'pk_live_51QCOIiBbdaDz4TVOX8Vh9KlFguewjyA2B2FNSSx5i5bUtzcei1aD399iUTyIk6PGQ3N8EW2lCO2lNRd1dWPp2E2X00ydaBMVUI',
            webhookSecret: '[SENSITIVE_DATA_REMOVED]',
            
            // Planos configurados
            planos: {
                brasil: {
                    premium: {
                        nome: 'Premium Brasil',
                        preco: 29700, // R$ 297,00 em centavos
                        moeda: 'brl',
                        comissao: 10,
                        tipo: 'subscription'
                    },
                    flex: {
                        nome: 'Flex Brasil',
                        preco: 0,
                        moeda: 'brl',
                        comissao: 20,
                        tipo: 'commission_only'
                    }
                },
                global: {
                    premium: {
                        nome: 'Premium Global',
                        preco: 6000, // USD 60,00 em centavos
                        moeda: 'usd',
                        comissao: 10,
                        tipo: 'subscription'
                    },
                    flex: {
                        nome: 'Flex Global',
                        preco: 0,
                        moeda: 'usd',
                        comissao: 20,
                        tipo: 'commission_only'
                    }
                }
            },
            
            // Sistema de descontos STRIPE_BONUS
            descontos: {
                brl: {
                    minimo: 10000, // R$ 100 (sem desconto)
                    bronze: { min: 20000, max: 100000, desconto: 5 }, // R$ 200-1000, 5%
                    prata: { min: 100000, max: 500000, desconto: 10 }, // R$ 1000-5000, 10%
                    ouro: { min: 500000, max: 999999999, desconto: 15 } // R$ 5000+, 15%
                },
                usd: {
                    minimo: 2000, // USD 20 (sem desconto)
                    bronze: { min: 3000, max: 30000, desconto: 5 }, // USD 30-300, 5%
                    prata: { min: 30000, max: 100000, desconto: 10 }, // USD 300-1000, 10%
                    ouro: { min: 100000, max: 999999999, desconto: 15 } // USD 1000+, 15%
                }
            }
        };
        
        this.produtosCriados = new Map();
        this.precosCriados = new Map();
    }

    // Calcular desconto baseado no valor
    calcularDesconto(valor, moeda) {
        const regras = this.config.descontos[moeda];
        
        if (valor < regras.minimo) {
            return { nivel: 'INVALIDO', desconto: 0, valor_final: valor };
        }
        
        let nivel = 'SEM_DESCONTO';
        let percentual = 0;
        
        if (valor >= regras.bronze.min && valor <= regras.bronze.max) {
            nivel = 'BRONZE';
            percentual = regras.bronze.desconto;
        } else if (valor >= regras.prata.min && valor <= regras.prata.max) {
            nivel = 'PRATA';
            percentual = regras.prata.desconto;
        } else if (valor >= regras.ouro.min) {
            nivel = 'OURO';
            percentual = regras.ouro.desconto;
        }
        
        const desconto = Math.floor(valor * (percentual / 100));
        const valor_final = valor - desconto;
        
        return {
            nivel,
            percentual,
            desconto,
            valor_final,
            valor_original: valor
        };
    }

    // Criar produtos no Stripe
    async criarProdutos() {
        console.log('🎯 Criando produtos no Stripe...');
        
        try {
            // BRASIL - Premium
            const produtoBrasilPremium = await stripe.products.create({
                name: this.config.planos.brasil.premium.nome,
                description: 'Plano Premium Brasil - Trading automatizado com IA + Assinatura mensal R$ 297 + 10% comissão sobre resultados positivos',
                metadata: {
                    tipo: 'subscription',
                    regiao: 'brasil',
                    comissao: '10'
                }
            });
            
            const precoBrasilPremium = await stripe.prices.create({
                product: produtoBrasilPremium.id,
                unit_amount: this.config.planos.brasil.premium.preco,
                currency: this.config.planos.brasil.premium.moeda,
                recurring: {
                    interval: 'month'
                }
            });
            
            // BRASIL - Flex
            const produtoBrasilFlex = await stripe.products.create({
                name: this.config.planos.brasil.flex.nome,
                description: 'Plano Flex Brasil - Trading automatizado com IA + 20% comissão sobre resultados positivos (sem mensalidade)',
                metadata: {
                    tipo: 'commission_only',
                    regiao: 'brasil',
                    comissao: '20'
                }
            });
            
            // GLOBAL - Premium
            const produtoGlobalPremium = await stripe.products.create({
                name: this.config.planos.global.premium.nome,
                description: 'Premium Global Plan - AI-powered automated trading + Monthly subscription USD 60 + 10% commission on positive results',
                metadata: {
                    tipo: 'subscription',
                    regiao: 'global',
                    comissao: '10'
                }
            });
            
            const precoGlobalPremium = await stripe.prices.create({
                product: produtoGlobalPremium.id,
                unit_amount: this.config.planos.global.premium.preco,
                currency: this.config.planos.global.premium.moeda,
                recurring: {
                    interval: 'month'
                }
            });
            
            // GLOBAL - Flex
            const produtoGlobalFlex = await stripe.products.create({
                name: this.config.planos.global.flex.nome,
                description: 'Global Flex Plan - AI-powered automated trading + 20% commission on positive results (no monthly fee)',
                metadata: {
                    tipo: 'commission_only',
                    regiao: 'global',
                    comissao: '20'
                }
            });
            
            // Salvar referências
            this.produtosCriados.set('brasil_premium', {
                produto: produtoBrasilPremium,
                preco: precoBrasilPremium
            });
            
            this.produtosCriados.set('brasil_flex', {
                produto: produtoBrasilFlex
            });
            
            this.produtosCriados.set('global_premium', {
                produto: produtoGlobalPremium,
                preco: precoGlobalPremium
            });
            
            this.produtosCriados.set('global_flex', {
                produto: produtoGlobalFlex
            });
            
            console.log('✅ Produtos criados com sucesso!');
            return this.produtosCriados;
            
        } catch (error) {
            console.error('❌ Erro ao criar produtos:', error.message);
            throw error;
        }
    }

    // Gerar links de pagamento
    async gerarLinksPlanos() {
        console.log('🔗 Gerando links de pagamento...');
        
        try {
            const links = {};
            
            // Link Premium Brasil
            if (this.produtosCriados.has('brasil_premium')) {
                const { preco } = this.produtosCriados.get('brasil_premium');
                
                const linkBrasilPremium = await stripe.paymentLinks.create({
                    line_items: [
                        {
                            price: preco.id,
                            quantity: 1
                        }
                    ],
                    after_completion: {
                        type: 'redirect',
                        redirect: {
                            url: 'https://coinbitclub.com/success?plan=brasil_premium'
                        }
                    }
                });
                
                links.brasil_premium = linkBrasilPremium.url;
            }
            
            // Link Premium Global
            if (this.produtosCriados.has('global_premium')) {
                const { preco } = this.produtosCriados.get('global_premium');
                
                const linkGlobalPremium = await stripe.paymentLinks.create({
                    line_items: [
                        {
                            price: preco.id,
                            quantity: 1
                        }
                    ],
                    after_completion: {
                        type: 'redirect',
                        redirect: {
                            url: 'https://coinbitclub.com/success?plan=global_premium'
                        }
                    }
                });
                
                links.global_premium = linkGlobalPremium.url;
            }
            
            console.log('✅ Links de pagamento gerados!');
            console.log('📋 Links disponíveis:');
            Object.entries(links).forEach(([plano, url]) => {
                console.log(`   ${plano}: ${url}`);
            });
            
            return links;
            
        } catch (error) {
            console.error('❌ Erro ao gerar links:', error.message);
            throw error;
        }
    }

    // Criar PaymentIntent para recarga com desconto
    async criarPagamentoRecarga(valor, moeda, userId) {
        console.log(`💳 Criando pagamento de recarga: ${valor/100} ${moeda.toUpperCase()}`);
        
        try {
            // Calcular desconto
            const infoDesconto = this.calcularDesconto(valor, moeda);
            
            console.log(`   📊 Desconto aplicado: ${infoDesconto.nivel} (${infoDesconto.percentual}%)`);
            console.log(`   💰 Valor original: ${infoDesconto.valor_original/100} ${moeda.toUpperCase()}`);
            console.log(`   🎁 Desconto: ${infoDesconto.desconto/100} ${moeda.toUpperCase()}`);
            console.log(`   ✅ Valor final: ${infoDesconto.valor_final/100} ${moeda.toUpperCase()}`);
            
            // Criar PaymentIntent
            const paymentIntent = await stripe.paymentIntents.create({
                amount: infoDesconto.valor_final,
                currency: moeda,
                metadata: {
                    tipo: 'recarga',
                    user_id: userId,
                    valor_original: infoDesconto.valor_original.toString(),
                    desconto_nivel: infoDesconto.nivel,
                    desconto_percentual: infoDesconto.percentual.toString(),
                    desconto_valor: infoDesconto.desconto.toString(),
                    stripe_bonus: infoDesconto.desconto.toString()
                },
                description: `Recarga CoinBitClub - ${infoDesconto.nivel} (${infoDesconto.percentual}% desconto)`
            });
            
            return {
                paymentIntent,
                desconto: infoDesconto,
                clientSecret: paymentIntent.client_secret
            };
            
        } catch (error) {
            console.error('❌ Erro ao criar pagamento de recarga:', error.message);
            throw error;
        }
    }

    // Webhook para processar pagamentos
    async processarWebhook(rawBody, signature) {
        console.log('🎣 Processando webhook do Stripe...');
        
        try {
            const event = stripe.webhooks.constructEvent(
                rawBody,
                signature,
                this.config.webhookSecret
            );
            
            console.log(`📨 Evento recebido: ${event.type}`);
            
            switch (event.type) {
                case 'payment_intent.succeeded':
                    await this.processarPagamentoSucesso(event.data.object);
                    break;
                    
                case 'invoice.payment_succeeded':
                    await this.processarAssinaturaSucesso(event.data.object);
                    break;
                    
                case 'customer.subscription.created':
                    await this.processarNovaAssinatura(event.data.object);
                    break;
                    
                case 'customer.subscription.deleted':
                    await this.processarCancelamentoAssinatura(event.data.object);
                    break;
                    
                default:
                    console.log(`⚠️  Evento não tratado: ${event.type}`);
            }
            
            return { received: true };
            
        } catch (error) {
            console.error('❌ Erro no webhook:', error.message);
            throw error;
        }
    }

    // Processar pagamento bem-sucedido
    async processarPagamentoSucesso(paymentIntent) {
        console.log(`✅ Pagamento bem-sucedido: ${paymentIntent.id}`);
        
        const { metadata } = paymentIntent;
        
        if (metadata.tipo === 'recarga') {
            // Processar recarga com desconto
            const valorOriginal = parseInt(metadata.valor_original);
            const descontoValor = parseInt(metadata.stripe_bonus);
            const valorFinal = paymentIntent.amount;
            
            console.log(`   💰 Creditando valor: ${valorOriginal/100} ${paymentIntent.currency}`);
            console.log(`   🎁 Bônus Stripe: ${descontoValor/100} ${paymentIntent.currency}`);
            
            // Aqui você implementaria a lógica de creditar na conta do usuário
            // await this.creditarSaldo(metadata.user_id, valorOriginal, descontoValor);
        }
    }

    // Processar assinatura bem-sucedida
    async processarAssinaturaSucesso(invoice) {
        console.log(`✅ Assinatura paga: ${invoice.id}`);
        
        // Implementar lógica de ativar/renovar plano
        // await this.ativarPlano(invoice.customer, invoice.subscription);
    }

    // Processar nova assinatura
    async processarNovaAssinatura(subscription) {
        console.log(`🎉 Nova assinatura criada: ${subscription.id}`);
        
        // Implementar lógica de configurar novo usuário
        // await this.configurarNovoUsuario(subscription.customer, subscription);
    }

    // Processar cancelamento
    async processarCancelamentoAssinatura(subscription) {
        console.log(`❌ Assinatura cancelada: ${subscription.id}`);
        
        // Implementar lógica de downgrade para plano gratuito
        // await this.cancelarPlano(subscription.customer);
    }

    // Executar configuração completa
    async executarConfiguracaoCompleta() {
        console.log('🚀 INICIANDO CONFIGURAÇÃO COMPLETA DO STRIPE');
        console.log('=' .repeat(60));
        
        try {
            // Criar produtos
            await this.criarProdutos();
            
            // Gerar links
            const links = await this.gerarLinksPlanos();
            
            // Salvar configuração
            const configuracao = {
                timestamp: new Date().toISOString(),
                ambiente: 'PRODUÇÃO',
                produtos: Array.from(this.produtosCriados.entries()).map(([key, value]) => ({
                    tipo: key,
                    produto_id: value.produto.id,
                    preco_id: value.preco?.id
                })),
                links,
                descontos: this.config.descontos,
                webhookUrl: 'https://coinbitclub.com/api/payments/webhook'
            };
            
            require('fs').writeFileSync(
                'configuracao-stripe-produção.json',
                JSON.stringify(configuracao, null, 2)
            );
            
            console.log('\n✅ CONFIGURAÇÃO STRIPE COMPLETA!');
            console.log('💾 Arquivo salvo: configuracao-stripe-produção.json');
            
            return configuracao;
            
        } catch (error) {
            console.error('\n❌ ERRO NA CONFIGURAÇÃO:', error.message);
            throw error;
        }
    }

    // Gerar página HTML dos planos
    gerarPaginaPlanos(links) {
        const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Planos CoinBitClub - Trading com IA</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #0f0f23; color: white; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 50px; }
        .plans { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; }
        .plan { background: #1a1a2e; border-radius: 15px; padding: 30px; border: 2px solid #16213e; transition: transform 0.3s; }
        .plan:hover { transform: translateY(-5px); border-color: #00ff88; }
        .plan.premium { border-color: #ffd700; background: linear-gradient(135deg, #1a1a2e 0%, #2d1810 100%); }
        .plan-header { text-align: center; margin-bottom: 20px; }
        .plan-title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .plan-price { font-size: 36px; color: #00ff88; margin-bottom: 5px; }
        .plan-period { font-size: 14px; color: #888; }
        .plan-features { list-style: none; margin: 20px 0; }
        .plan-features li { padding: 8px 0; border-bottom: 1px solid #333; }
        .plan-features li:before { content: "✓"; color: #00ff88; margin-right: 10px; }
        .plan-button { display: block; width: 100%; padding: 15px; background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%); color: white; text-decoration: none; border-radius: 8px; text-align: center; font-weight: bold; margin-top: 20px; transition: all 0.3s; }
        .plan-button:hover { background: linear-gradient(135deg, #00cc6a 0%, #00aa55 100%); }
        .plan-button.premium { background: linear-gradient(135deg, #ffd700 0%, #ffb700 100%); color: #000; }
        .plan-button.premium:hover { background: linear-gradient(135deg, #ffb700 0%, #ff9500 100%); }
        .bonus-section { background: #16213e; border-radius: 15px; padding: 30px; margin-top: 50px; }
        .bonus-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-top: 20px; }
        .bonus-tier { background: #1a1a2e; padding: 20px; border-radius: 10px; border-left: 4px solid #00ff88; }
        .bonus-tier.bronze { border-left-color: #cd7f32; }
        .bonus-tier.silver { border-left-color: #c0c0c0; }
        .bonus-tier.gold { border-left-color: #ffd700; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 CoinBitClub Trading com IA</h1>
            <p>Escolha seu plano e comece a operar com nossa IA avançada</p>
        </div>

        <div class="plans">
            <!-- Brasil Premium -->
            <div class="plan premium">
                <div class="plan-header">
                    <div class="plan-title">🇧🇷 Premium Brasil</div>
                    <div class="plan-price">R$ 297</div>
                    <div class="plan-period">por mês + 10% comissão</div>
                </div>
                <ul class="plan-features">
                    <li>Trading automatizado com IA</li>
                    <li>Suporte prioritário 24/7</li>
                    <li>Análises avançadas de mercado</li>
                    <li>10% comissão sobre resultados positivos</li>
                    <li>Dashboard completo</li>
                    <li>Relatórios detalhados</li>
                </ul>
                <a href="${links.brasil_premium || '#'}" class="plan-button premium">Assinar Premium Brasil</a>
            </div>

            <!-- Brasil Flex -->
            <div class="plan">
                <div class="plan-header">
                    <div class="plan-title">🇧🇷 Flex Brasil</div>
                    <div class="plan-price">Gratuito</div>
                    <div class="plan-period">20% comissão apenas</div>
                </div>
                <ul class="plan-features">
                    <li>Trading automatizado com IA</li>
                    <li>Suporte padrão</li>
                    <li>Análises básicas de mercado</li>
                    <li>20% comissão sobre resultados positivos</li>
                    <li>Dashboard básico</li>
                    <li>Relatórios mensais</li>
                </ul>
                <a href="https://coinbitclub.com/register?plan=brasil_flex" class="plan-button">Começar Flex Brasil</a>
            </div>

            <!-- Global Premium -->
            <div class="plan premium">
                <div class="plan-header">
                    <div class="plan-title">🌍 Premium Global</div>
                    <div class="plan-price">$60</div>
                    <div class="plan-period">per month + 10% commission</div>
                </div>
                <ul class="plan-features">
                    <li>AI-powered automated trading</li>
                    <li>Priority 24/7 support</li>
                    <li>Advanced market analysis</li>
                    <li>10% commission on positive results</li>
                    <li>Complete dashboard</li>
                    <li>Detailed reports</li>
                </ul>
                <a href="${links.global_premium || '#'}" class="plan-button premium">Subscribe Premium Global</a>
            </div>

            <!-- Global Flex -->
            <div class="plan">
                <div class="plan-header">
                    <div class="plan-title">🌍 Flex Global</div>
                    <div class="plan-price">Free</div>
                    <div class="plan-period">20% commission only</div>
                </div>
                <ul class="plan-features">
                    <li>AI-powered automated trading</li>
                    <li>Standard support</li>
                    <li>Basic market analysis</li>
                    <li>20% commission on positive results</li>
                    <li>Basic dashboard</li>
                    <li>Monthly reports</li>
                </ul>
                <a href="https://coinbitclub.com/register?plan=global_flex" class="plan-button">Start Flex Global</a>
            </div>
        </div>

        <div class="bonus-section">
            <h2>🎁 Sistema de Bônus para Recargas</h2>
            <p>Ganhe desconto progressivo baseado no valor da sua recarga:</p>
            
            <div class="bonus-grid">
                <div class="bonus-tier bronze">
                    <h3>🥉 Bronze (5%)</h3>
                    <p><strong>Brasil:</strong> R$ 200 - R$ 1.000</p>
                    <p><strong>Global:</strong> $30 - $300</p>
                </div>
                
                <div class="bonus-tier silver">
                    <h3>🥈 Prata (10%)</h3>
                    <p><strong>Brasil:</strong> R$ 1.000 - R$ 5.000</p>
                    <p><strong>Global:</strong> $300 - $1.000</p>
                </div>
                
                <div class="bonus-tier gold">
                    <h3>🥇 Ouro (15%)</h3>
                    <p><strong>Brasil:</strong> Acima de R$ 5.000</p>
                    <p><strong>Global:</strong> Acima de $1.000</p>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
        
        require('fs').writeFileSync('pagina-planos-stripe-produção.html', html);
        console.log('📄 Página HTML dos planos salva: pagina-planos-stripe-produção.html');
        
        return html;
    }
}

// Executar configuração
async function main() {
    const sistema = new SistemaCompletoPagamentosStripe();
    
    try {
        const configuracao = await sistema.executarConfiguracaoCompleta();
        
        // Gerar página HTML
        sistema.gerarPaginaPlanos(configuracao.links);
        
        console.log('\n🎉 SISTEMA STRIPE TOTALMENTE CONFIGURADO!');
        console.log('✅ Produtos criados no Stripe');
        console.log('✅ Links de pagamento gerados');
        console.log('✅ Sistema de descontos configurado');
        console.log('✅ Página HTML dos planos criada');
        
    } catch (error) {
        console.error('💥 Erro fatal:', error.message);
    }
}

if (require.main === module) {
    main();
}

module.exports = SistemaCompletoPagamentosStripe;

