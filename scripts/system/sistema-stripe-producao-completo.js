// 💳 SISTEMA COMPLETO STRIPE PRODUÇÃO - PLANOS E DESCONTOS
// Brasil: R$297 + 10% ou 20% | Internacional: USD60 + 10% ou 20%
// Descontos Bronze/Prata/Ouro implementados

const Stripe = require('stripe');

class SistemaStripeProducaoCompleto {
    constructor() {
        // Chaves REAIS de produção
        this.stripe = Stripe(process.env.STRIPE_SECRET_KEY || '[STRIPE_SECRET_KEY_REMOVED]');
        this.publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || '[SENSITIVE_DATA_REMOVED]';
        
        // Configuração dos planos
        this.planos = {
            brasil: {
                premium: {
                    nome: 'Premium Brasil',
                    preco: 29700, // R$ 297.00 em centavos
                    moeda: 'brl',
                    comissao: 10, // 10%
                    descricao: 'Assinatura mensal R$ 297 + 10% comissão sobre resultados positivos'
                },
                flex: {
                    nome: 'Flex Brasil',
                    preco: 0, // Sem mensalidade
                    moeda: 'brl',
                    comissao: 20, // 20%
                    descricao: '20% comissão sobre resultados positivos (sem mensalidade)'
                }
            },
            internacional: {
                premium: {
                    nome: 'Premium Global',
                    preco: 6000, // USD 60.00 em centavos
                    moeda: 'usd',
                    comissao: 10, // 10%
                    descricao: 'Monthly subscription USD 60 + 10% commission on positive results'
                },
                flex: {
                    nome: 'Flex Global',
                    preco: 0, // Sem mensalidade
                    moeda: 'usd',
                    comissao: 20, // 20%
                    descricao: '20% commission on positive results (no monthly fee)'
                }
            }
        };

        // Configuração dos descontos STRIPE_BONUS
        this.descontos = {
            brl: {
                minimo_sem_bonus: 10000, // R$ 100.00
                bronze: {
                    minimo: 20000, // R$ 200.00
                    maximo: 100000, // R$ 1.000.00
                    desconto: 5 // 5%
                },
                prata: {
                    minimo: 100001, // R$ 1.000.01
                    maximo: 500000, // R$ 5.000.00
                    desconto: 10 // 10%
                },
                ouro: {
                    minimo: 500001, // R$ 5.000.01
                    maximo: null, // Sem limite máximo
                    desconto: 15 // 15%
                }
            },
            usd: {
                minimo_sem_bonus: 2000, // USD 20.00
                bronze: {
                    minimo: 3000, // USD 30.00
                    maximo: 30000, // USD 300.00
                    desconto: 5 // 5%
                },
                prata: {
                    minimo: 30001, // USD 300.01
                    maximo: 100000, // USD 1.000.00
                    desconto: 10 // 10%
                },
                ouro: {
                    minimo: 100001, // USD 1.000.01
                    maximo: null, // Sem limite máximo
                    desconto: 15 // 15%
                }
            }
        };

        this.produtos = {};
        this.precos = {};
    }

    async configurarSistemaCompleto() {
        console.log('💳 CONFIGURANDO SISTEMA STRIPE PRODUÇÃO COMPLETO');
        console.log('=' .repeat(80));

        try {
            // 1. Verificar conta Stripe
            await this.verificarConta();
            
            // 2. Criar produtos
            await this.criarProdutos();
            
            // 3. Criar preços
            await this.criarPrecos();
            
            // 4. Configurar webhooks
            await this.configurarWebhooks();
            
            // 5. Gerar links de pagamento
            await this.gerarLinksPageamento();
            
            // 6. Criar página de planos
            await this.criarPaginaPlanos();
            
            console.log('\n🎉 SISTEMA STRIPE PRODUÇÃO CONFIGURADO COM SUCESSO!');
            
        } catch (error) {
            console.error('❌ Erro na configuração:', error);
            throw error;
        }
    }

    async verificarConta() {
        console.log('\n🔍 Verificando conta Stripe...');
        
        try {
            const account = await this.stripe.accounts.retrieve();
            console.log(`✅ Conta Stripe: ${account.display_name || account.id}`);
            console.log(`   País: ${account.country}`);
            console.log(`   Moedas suportadas: ${account.capabilities?.transfers || 'N/A'}`);
            
        } catch (error) {
            throw new Error(`Erro na conta Stripe: ${error.message}`);
        }
    }

    async criarProdutos() {
        console.log('\n📦 Criando produtos no Stripe...');
        
        // Produto Premium Brasil
        this.produtos.premium_brasil = await this.stripe.products.create({
            name: 'CoinBitClub Premium Brasil',
            description: 'Assinatura premium mensal R$ 297 + 10% comissão sobre resultados positivos',
            type: 'service',
            metadata: {
                tipo: 'premium',
                pais: 'brasil',
                comissao: '10'
            }
        });
        console.log(`✅ Produto criado: ${this.produtos.premium_brasil.name}`);

        // Produto Flex Brasil
        this.produtos.flex_brasil = await this.stripe.products.create({
            name: 'CoinBitClub Flex Brasil',
            description: '20% comissão sobre resultados positivos (sem mensalidade)',
            type: 'service',
            metadata: {
                tipo: 'flex',
                pais: 'brasil',
                comissao: '20'
            }
        });
        console.log(`✅ Produto criado: ${this.produtos.flex_brasil.name}`);

        // Produto Premium Internacional
        this.produtos.premium_global = await this.stripe.products.create({
            name: 'CoinBitClub Premium Global',
            description: 'Monthly premium subscription USD 60 + 10% commission on positive results',
            type: 'service',
            metadata: {
                tipo: 'premium',
                pais: 'global',
                comissao: '10'
            }
        });
        console.log(`✅ Produto criado: ${this.produtos.premium_global.name}`);

        // Produto Flex Internacional
        this.produtos.flex_global = await this.stripe.products.create({
            name: 'CoinBitClub Flex Global',
            description: '20% commission on positive results (no monthly fee)',
            type: 'service',
            metadata: {
                tipo: 'flex',
                pais: 'global',
                comissao: '20'
            }
        });
        console.log(`✅ Produto criado: ${this.produtos.flex_global.name}`);

        // Produto Recarga BRL
        this.produtos.recarga_brl = await this.stripe.products.create({
            name: 'Recarga de Saldo BRL',
            description: 'Recarga de saldo em reais (R$) com descontos Bronze/Prata/Ouro',
            type: 'service',
            metadata: {
                tipo: 'recarga',
                moeda: 'brl'
            }
        });
        console.log(`✅ Produto criado: ${this.produtos.recarga_brl.name}`);

        // Produto Recarga USD
        this.produtos.recarga_usd = await this.stripe.products.create({
            name: 'Recarga de Saldo USD',
            description: 'Balance recharge in USD with Bronze/Silver/Gold discounts',
            type: 'service',
            metadata: {
                tipo: 'recarga',
                moeda: 'usd'
            }
        });
        console.log(`✅ Produto criado: ${this.produtos.recarga_usd.name}`);
    }

    async criarPrecos() {
        console.log('\n💰 Criando preços no Stripe...');

        // Preço Premium Brasil
        this.precos.premium_brasil = await this.stripe.prices.create({
            product: this.produtos.premium_brasil.id,
            unit_amount: 29700, // R$ 297.00
            currency: 'brl',
            recurring: {
                interval: 'month'
            },
            nickname: 'Premium Brasil Mensal'
        });
        console.log(`✅ Preço criado: Premium Brasil R$ 297/mês`);

        // Preço Premium Global
        this.precos.premium_global = await this.stripe.prices.create({
            product: this.produtos.premium_global.id,
            unit_amount: 6000, // USD 60.00
            currency: 'usd',
            recurring: {
                interval: 'month'
            },
            nickname: 'Premium Global Monthly'
        });
        console.log(`✅ Preço criado: Premium Global USD 60/month`);

        // Não criamos preços para Flex pois são gratuitos (apenas comissão)
        console.log('✅ Planos Flex configurados como gratuitos (apenas comissão)');
    }

    async configurarWebhooks() {
        console.log('\n🔗 Configurando webhooks...');

        try {
            const webhook = await this.stripe.webhookEndpoints.create({
                url: 'https://coinbitclub.com/api/webhooks/stripe',
                enabled_events: [
                    'payment_intent.succeeded',
                    'payment_intent.payment_failed',
                    'invoice.payment_succeeded',
                    'invoice.payment_failed',
                    'customer.subscription.created',
                    'customer.subscription.updated',
                    'customer.subscription.deleted',
                    'checkout.session.completed'
                ],
                description: 'CoinBitClub Payment Events'
            });

            console.log(`✅ Webhook configurado: ${webhook.url}`);
            console.log(`   Secret: ${webhook.secret}`);

        } catch (error) {
            console.log(`⚠️ Webhook: ${error.message} (pode já existir)`);
        }
    }

    async gerarLinksPageamento() {
        console.log('\n🔗 Gerando links de pagamento...');

        // Link Premium Brasil
        const linkPremiumBrasil = await this.stripe.paymentLinks.create({
            line_items: [{
                price: this.precos.premium_brasil.id,
                quantity: 1
            }],
            metadata: {
                plano: 'premium_brasil',
                comissao: '10'
            }
        });
        console.log(`✅ Link Premium Brasil: ${linkPremiumBrasil.url}`);

        // Link Premium Global
        const linkPremiumGlobal = await this.stripe.paymentLinks.create({
            line_items: [{
                price: this.precos.premium_global.id,
                quantity: 1
            }],
            metadata: {
                plano: 'premium_global',
                comissao: '10'
            }
        });
        console.log(`✅ Link Premium Global: ${linkPremiumGlobal.url}`);

        // Salvar links
        this.links = {
            premium_brasil: linkPremiumBrasil.url,
            premium_global: linkPremiumGlobal.url
        };
    }

    calcularDesconto(valor, moeda) {
        const config = this.descontos[moeda];
        
        if (valor < config.minimo_sem_bonus) {
            return { tier: 'NONE', desconto: 0, valor_final: valor };
        }

        let tier = 'NONE';
        let percentualDesconto = 0;

        // Verificar tier do desconto
        if (valor >= config.bronze.minimo && valor <= config.bronze.maximo) {
            tier = 'BRONZE';
            percentualDesconto = config.bronze.desconto;
        } else if (valor >= config.prata.minimo && valor <= config.prata.maximo) {
            tier = 'PRATA';
            percentualDesconto = config.prata.desconto;
        } else if (valor >= config.ouro.minimo) {
            tier = 'OURO';
            percentualDesconto = config.ouro.desconto;
        }

        const valorDesconto = Math.floor(valor * (percentualDesconto / 100));
        const valorFinal = valor - valorDesconto;

        return {
            tier,
            desconto: percentualDesconto,
            valor_original: valor,
            valor_desconto: valorDesconto,
            valor_final: valorFinal
        };
    }

    async criarCheckoutRecarga(valorCentavos, moeda, userId) {
        const desconto = this.calcularDesconto(valorCentavos, moeda);
        
        // Produto de recarga
        const produto = moeda === 'brl' ? this.produtos.recarga_brl : this.produtos.recarga_usd;
        
        // Criar sessão de checkout
        const session = await this.stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: moeda,
                    product: produto.id,
                    unit_amount: desconto.valor_final,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: 'https://coinbitclub.com/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: 'https://coinbitclub.com/cancel',
            metadata: {
                tipo: 'recarga',
                user_id: userId,
                valor_original: desconto.valor_original.toString(),
                desconto_tier: desconto.tier,
                desconto_percentual: desconto.desconto.toString(),
                valor_desconto: desconto.valor_desconto.toString(),
                moeda: moeda
            }
        });

        return {
            checkout_url: session.url,
            session_id: session.id,
            desconto_info: desconto
        };
    }

    async criarPaginaPlanos() {
        console.log('\n📄 Criando página de planos...');

        const htmlPlanos = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Planos CoinBitClub - Trading Bot de Criptomoedas</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .plan-card { 
            transition: transform 0.3s; 
            border: 2px solid #dee2e6;
        }
        .plan-card:hover { 
            transform: translateY(-5px); 
            border-color: #007bff;
        }
        .plan-premium { 
            border-color: #ffc107 !important;
            background: linear-gradient(135deg, #fff9e6 0%, #ffffff 100%);
        }
        .plan-flex { 
            border-color: #28a745 !important;
            background: linear-gradient(135deg, #f0f9f0 0%, #ffffff 100%);
        }
        .discount-badge {
            position: absolute;
            top: -10px;
            right: 10px;
            background: #dc3545;
            color: white;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 0.8em;
            font-weight: bold;
        }
        .recharge-section {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 10px;
            padding: 2rem;
            margin: 2rem 0;
        }
    </style>
</head>
<body>
    <div class="container my-5">
        <div class="text-center mb-5">
            <h1 class="display-4 text-primary">CoinBitClub</h1>
            <p class="lead">Trading Bot Automático de Criptomoedas</p>
            <p class="text-muted">Sistemas multiusuário enterprise com faturamento pré-pago</p>
        </div>

        <!-- Planos Brasil -->
        <div class="row mb-5">
            <div class="col-12">
                <h2 class="text-center mb-4">🇧🇷 Planos Brasil</h2>
            </div>
            
            <!-- Premium Brasil -->
            <div class="col-md-6 mb-4">
                <div class="card plan-card plan-premium h-100 position-relative">
                    <div class="discount-badge">PREMIUM</div>
                    <div class="card-header text-center bg-warning">
                        <h3 class="text-dark">Premium Brasil</h3>
                        <h2 class="text-dark">R$ 297<small>/mês</small></h2>
                    </div>
                    <div class="card-body">
                        <ul class="list-unstyled">
                            <li class="mb-2">✅ Assinatura mensal R$ 297</li>
                            <li class="mb-2">✅ 10% comissão sobre lucros</li>
                            <li class="mb-2">✅ Trading automático 24/7</li>
                            <li class="mb-2">✅ Suporte prioritário</li>
                            <li class="mb-2">✅ Dashboard avançado</li>
                            <li class="mb-2">✅ Análises de IA</li>
                        </ul>
                    </div>
                    <div class="card-footer">
                        <a href="${this.links?.premium_brasil || '#'}" class="btn btn-warning btn-lg w-100">
                            Assinar Premium Brasil
                        </a>
                        <small class="text-muted d-block mt-2 text-center">
                            Recomendado para investimentos R$ 5.000+
                        </small>
                    </div>
                </div>
            </div>

            <!-- Flex Brasil -->
            <div class="col-md-6 mb-4">
                <div class="card plan-card plan-flex h-100">
                    <div class="card-header text-center bg-success">
                        <h3 class="text-white">Flex Brasil</h3>
                        <h2 class="text-white">Gratuito</h2>
                    </div>
                    <div class="card-body">
                        <ul class="list-unstyled">
                            <li class="mb-2">✅ Sem mensalidade</li>
                            <li class="mb-2">✅ 20% comissão sobre lucros</li>
                            <li class="mb-2">✅ Trading automático 24/7</li>
                            <li class="mb-2">✅ Suporte padrão</li>
                            <li class="mb-2">✅ Dashboard básico</li>
                            <li class="mb-2">⏳ Fila de prioridade</li>
                        </ul>
                    </div>
                    <div class="card-footer">
                        <a href="/registro?plano=flex_brasil" class="btn btn-success btn-lg w-100">
                            Começar Flex Brasil
                        </a>
                        <small class="text-muted d-block mt-2 text-center">
                            Ideal para testes e iniciantes
                        </small>
                    </div>
                </div>
            </div>
        </div>

        <!-- Planos Internacional -->
        <div class="row mb-5">
            <div class="col-12">
                <h2 class="text-center mb-4">🌍 Planos Internacional</h2>
            </div>
            
            <!-- Premium Global -->
            <div class="col-md-6 mb-4">
                <div class="card plan-card plan-premium h-100 position-relative">
                    <div class="discount-badge">PREMIUM</div>
                    <div class="card-header text-center bg-warning">
                        <h3 class="text-dark">Premium Global</h3>
                        <h2 class="text-dark">USD 60<small>/month</small></h2>
                    </div>
                    <div class="card-body">
                        <ul class="list-unstyled">
                            <li class="mb-2">✅ Monthly subscription USD 60</li>
                            <li class="mb-2">✅ 10% commission on profits</li>
                            <li class="mb-2">✅ 24/7 automatic trading</li>
                            <li class="mb-2">✅ Priority support</li>
                            <li class="mb-2">✅ Advanced dashboard</li>
                            <li class="mb-2">✅ AI analysis</li>
                        </ul>
                    </div>
                    <div class="card-footer">
                        <a href="${this.links?.premium_global || '#'}" class="btn btn-warning btn-lg w-100">
                            Subscribe Premium Global
                        </a>
                        <small class="text-muted d-block mt-2 text-center">
                            Recommended for investments USD 5,000+
                        </small>
                    </div>
                </div>
            </div>

            <!-- Flex Global -->
            <div class="col-md-6 mb-4">
                <div class="card plan-card plan-flex h-100">
                    <div class="card-header text-center bg-success">
                        <h3 class="text-white">Flex Global</h3>
                        <h2 class="text-white">Free</h2>
                    </div>
                    <div class="card-body">
                        <ul class="list-unstyled">
                            <li class="mb-2">✅ No monthly fee</li>
                            <li class="mb-2">✅ 20% commission on profits</li>
                            <li class="mb-2">✅ 24/7 automatic trading</li>
                            <li class="mb-2">✅ Standard support</li>
                            <li class="mb-2">✅ Basic dashboard</li>
                            <li class="mb-2">⏳ Priority queue</li>
                        </ul>
                    </div>
                    <div class="card-footer">
                        <a href="/registro?plano=flex_global" class="btn btn-success btn-lg w-100">
                            Start Flex Global
                        </a>
                        <small class="text-muted d-block mt-2 text-center">
                            Perfect for testing and beginners
                        </small>
                    </div>
                </div>
            </div>
        </div>

        <!-- Sistema de Recarga com Descontos -->
        <div class="recharge-section">
            <h2 class="text-center mb-4">💰 Sistema de Recarga com Descontos</h2>
            
            <div class="row">
                <div class="col-md-6">
                    <h4>🇧🇷 Recargas Brasil (BRL)</h4>
                    <ul class="list-group">
                        <li class="list-group-item">
                            <strong>Valor Mínimo:</strong> R$ 100 (sem bônus)
                        </li>
                        <li class="list-group-item list-group-item-warning">
                            <strong>Bronze:</strong> R$ 200 - R$ 1.000<br>
                            <span class="badge bg-warning">5% desconto</span>
                        </li>
                        <li class="list-group-item list-group-item-info">
                            <strong>Prata:</strong> R$ 1.000 - R$ 5.000<br>
                            <span class="badge bg-info">10% desconto</span>
                        </li>
                        <li class="list-group-item list-group-item-success">
                            <strong>Ouro:</strong> R$ 5.000+<br>
                            <span class="badge bg-success">15% desconto</span>
                        </li>
                    </ul>
                </div>
                
                <div class="col-md-6">
                    <h4>🌍 Recargas Internacional (USD)</h4>
                    <ul class="list-group">
                        <li class="list-group-item">
                            <strong>Minimum:</strong> USD 20 (no bonus)
                        </li>
                        <li class="list-group-item list-group-item-warning">
                            <strong>Bronze:</strong> USD 30 - USD 300<br>
                            <span class="badge bg-warning">5% discount</span>
                        </li>
                        <li class="list-group-item list-group-item-info">
                            <strong>Silver:</strong> USD 300 - USD 1,000<br>
                            <span class="badge bg-info">10% discount</span>
                        </li>
                        <li class="list-group-item list-group-item-success">
                            <strong>Gold:</strong> USD 1,000+<br>
                            <span class="badge bg-success">15% discount</span>
                        </li>
                    </ul>
                </div>
            </div>
            
            <div class="text-center mt-4">
                <p class="text-muted">
                    * Descontos aplicados automaticamente no checkout<br>
                    * Valores pré-pagos via Stripe para trading automático
                </p>
            </div>
        </div>

        <!-- Informações Importantes -->
        <div class="row mt-5">
            <div class="col-12">
                <div class="alert alert-info">
                    <h5>ℹ️ Informações Importantes</h5>
                    <ul class="mb-0">
                        <li><strong>Testnet:</strong> Sistema opera em testnet das exchanges para segurança</li>
                        <li><strong>Multiusuário:</strong> Arquitetura enterprise para múltiplos usuários simultâneos</li>
                        <li><strong>Saldo Mínimo:</strong> Mantém monitoramento mas não inicia novas operações</li>
                        <li><strong>Comissões:</strong> Aplicadas apenas sobre resultados positivos</li>
                        <li><strong>Suporte:</strong> Disponível 24/7 para usuários Premium</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`;

        // Salvar página
        require('fs').writeFileSync('./pagina-planos-stripe-producao.html', htmlPlanos);
        console.log('✅ Página de planos criada: pagina-planos-stripe-producao.html');
    }

    async gerarRelatorioCompleto() {
        console.log('\n📊 RELATÓRIO COMPLETO DO SISTEMA STRIPE');
        console.log('='.repeat(80));

        console.log('\n🏢 INFORMAÇÕES DA CONTA:');
        const account = await this.stripe.accounts.retrieve();
        console.log(`   Nome: ${account.display_name || 'CoinBitClub'}`);
        console.log(`   País: ${account.country}`);
        console.log(`   ID: ${account.id}`);

        console.log('\n📦 PRODUTOS CRIADOS:');
        Object.keys(this.produtos).forEach(key => {
            const produto = this.produtos[key];
            console.log(`   ${produto.name} (${produto.id})`);
        });

        console.log('\n💰 PREÇOS CRIADOS:');
        Object.keys(this.precos).forEach(key => {
            const preco = this.precos[key];
            console.log(`   ${preco.nickname}: ${preco.unit_amount/100} ${preco.currency.toUpperCase()}`);
        });

        console.log('\n🔗 LINKS DE PAGAMENTO:');
        if (this.links) {
            Object.keys(this.links).forEach(key => {
                console.log(`   ${key}: ${this.links[key]}`);
            });
        }

        console.log('\n🎯 CONFIGURAÇÃO DE DESCONTOS:');
        console.log('   Brasil (BRL):');
        console.log(`     Mínimo sem bônus: R$ ${this.descontos.brl.minimo_sem_bonus/100}`);
        console.log(`     Bronze (5%): R$ ${this.descontos.brl.bronze.minimo/100} - R$ ${this.descontos.brl.bronze.maximo/100}`);
        console.log(`     Prata (10%): R$ ${this.descontos.brl.prata.minimo/100} - R$ ${this.descontos.brl.prata.maximo/100}`);
        console.log(`     Ouro (15%): R$ ${this.descontos.brl.ouro.minimo/100}+`);
        
        console.log('   Internacional (USD):');
        console.log(`     Minimum no bonus: USD ${this.descontos.usd.minimo_sem_bonus/100}`);
        console.log(`     Bronze (5%): USD ${this.descontos.usd.bronze.minimo/100} - USD ${this.descontos.usd.bronze.maximo/100}`);
        console.log(`     Silver (10%): USD ${this.descontos.usd.prata.minimo/100} - USD ${this.descontos.usd.prata.maximo/100}`);
        console.log(`     Gold (15%): USD ${this.descontos.usd.ouro.minimo/100}+`);

        console.log('\n🚀 PRÓXIMOS PASSOS:');
        console.log('1. ✅ Produtos criados no Stripe Dashboard');
        console.log('2. ✅ Preços configurados para assinaturas');
        console.log('3. ✅ Links de pagamento gerados');
        console.log('4. ✅ Sistema de desconto automático');
        console.log('5. ✅ Página de planos HTML criada');
        console.log('6. 🔄 Configurar webhooks no domínio real');
        console.log('7. 🔄 Testar fluxo completo de pagamento');
        console.log('8. 🔄 Integrar com sistema de usuários');

        console.log('\n🎉 SISTEMA STRIPE PRODUÇÃO 100% CONFIGURADO!');
    }
}

// Executar configuração se chamado diretamente
if (require.main === module) {
    const sistema = new SistemaStripeProducaoCompleto();
    
    sistema.configurarSistemaCompleto()
        .then(() => sistema.gerarRelatorioCompleto())
        .catch(error => {
            console.error('❌ Erro:', error);
            process.exit(1);
        });
}

module.exports = SistemaStripeProducaoCompleto;

