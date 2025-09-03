// VERIFICADOR COMPLETO DE INTEGRAÇÕES EXTERNAS
// Este script testa TODAS as integrações externas com as chaves reais do Railway

const axios = require('axios');
const crypto = require('crypto');

class VerificadorIntegracoes {
    constructor() {
        this.configuracoes = {
            // BYBIT - Chaves do Railway
            bybit: {
                apiKey: 'process.env.API_KEY_HERE',
                apiSecret: 'process.env.API_KEY_HERE',
                baseUrl: 'https://api-testnet.bybit.com',
                testnet: true
            },
            
            // STRIPE - Chaves de Produção
            stripe: {
                secret: '[SENSITIVE_DATA_REMOVED]',
                publishable: 'process.env.STRIPE_PUBLISHABLE_KEY1aD399iUTyIk6PGQ3N8EW2lCO2lNRd1dWPp2E2X00ydaBMVUI',
                webhook: '[SENSITIVE_DATA_REMOVED]'
            },
            
            // OPENAI
            openai: {
                apiKey: '[SENSITIVE_DATA_REMOVED]',
                baseUrl: 'https://api.openai.com/v1'
            },
            
            // COINSTATS
            coinstats: {
                apiKey: 'ZFIxigBcVaCyXDL1Qp/Ork7TOL3+h07NM2f3YoSrMkI=',
                markets: 'https://openapiv1.coinstats.app/markets',
                fearGreed: 'https://openapiv1.coinstats.app/insights/fear-and-greed'
            },
            
            // TWILIO
            twilio: {
                accountSid: '[SENSITIVE_DATA_REMOVED]',
                authToken: '[SENSITIVE_DATA_REMOVED]',
                sid: '[SENSITIVE_DATA_REMOVED]',
                phone: '+14782765936'
            }
        };
        
        this.resultados = {
            bybit: { status: 'PENDENTE', detalhes: {} },
            stripe: { status: 'PENDENTE', detalhes: {} },
            openai: { status: 'PENDENTE', detalhes: {} },
            coinstats: { status: 'PENDENTE', detalhes: {} },
            twilio: { status: 'PENDENTE', detalhes: {} }
        };
    }

    // Gerar assinatura para Bybit
    gerarAssinaturaBybit(params, timestamp) {
        const queryString = Object.keys(params)
            .sort()
            .map(key => `${key}=${params[key]}`)
            .join('&');
        
        const signaturePayload = timestamp + this.configuracoes.bybit.apiKey + '5000' + queryString;
        return crypto.createHmac('sha256', this.configuracoes.bybit.apiSecret)
                    .update(signaturePayload)
                    .digest('hex');
    }

    // Testar Bybit
    async testarBybit() {
        console.log('\n🔄 Testando conexão com Bybit...');
        
        try {
            const timestamp = Date.now().toString();
            const params = {
                category: 'spot'
            };
            
            const signature = this.gerarAssinaturaBybit(params, timestamp);
            
            const headers = {
                'X-BAPI-API-KEY': this.configuracoes.bybit.apiKey,
                'X-BAPI-SIGN': signature,
                'X-BAPI-SIGN-TYPE': '2',
                'X-BAPI-TIMESTAMP': timestamp,
                'X-BAPI-RECV-WINDOW': '5000',
                'Content-Type': 'application/json'
            };

            // Teste 1: Verificar informações da conta
            const responseAccount = await axios.get(
                `${this.configuracoes.bybit.baseUrl}/v5/account/wallet-balance`,
                { 
                    headers,
                    params: { accountType: 'UNIFIED' }
                }
            );

            // Teste 2: Verificar saldo
            const responseSaldo = await axios.get(
                `${this.configuracoes.bybit.baseUrl}/v5/account/wallet-balance`,
                { 
                    headers,
                    params: { accountType: 'SPOT' }
                }
            );

            // Teste 3: Verificar posições
            const responsePosicoes = await axios.get(
                `${this.configuracoes.bybit.baseUrl}/v5/position/list`,
                { 
                    headers,
                    params: { category: 'spot' }
                }
            );

            this.resultados.bybit = {
                status: 'SUCESSO',
                detalhes: {
                    account: responseAccount.data?.retCode === 0,
                    saldo: responseSaldo.data?.retCode === 0,
                    posicoes: responsePosicoes.data?.retCode === 0,
                    testnet: true,
                    timestamp: new Date().toISOString(),
                    apiKey: this.configuracoes.bybit.apiKey.substring(0, 10) + '...'
                }
            };

            console.log('✅ Bybit: Conexão bem-sucedida!');
            console.log(`   - Account Info: ${responseAccount.data?.retCode === 0 ? 'OK' : 'ERRO'}`);
            console.log(`   - Saldo: ${responseSaldo.data?.retCode === 0 ? 'OK' : 'ERRO'}`);
            console.log(`   - Posições: ${responsePosicoes.data?.retCode === 0 ? 'OK' : 'ERRO'}`);

        } catch (error) {
            this.resultados.bybit = {
                status: 'ERRO',
                detalhes: {
                    erro: error.message,
                    codigo: error.response?.status,
                    resposta: error.response?.data
                }
            };
            console.log('❌ Bybit: Erro na conexão');
            console.log('   Erro:', error.message);
        }
    }

    // Testar Stripe
    async testarStripe() {
        console.log('\n🔄 Testando conexão com Stripe...');
        
        try {
            const stripe = require('stripe')(this.configuracoes.stripe.secret);

            // Teste 1: Verificar conta
            const account = await stripe.accounts.retrieve();

            // Teste 2: Listar produtos
            const products = await stripe.products.list({ limit: 5 });

            // Teste 3: Listar preços
            const prices = await stripe.prices.list({ limit: 5 });

            this.resultados.stripe = {
                status: 'SUCESSO',
                detalhes: {
                    accountId: account.id,
                    businessProfile: account.business_profile?.name || 'N/A',
                    country: account.country,
                    defaultCurrency: account.default_currency,
                    productsCount: products.data.length,
                    pricesCount: prices.data.length,
                    chargesEnabled: account.charges_enabled,
                    payoutsEnabled: account.payouts_enabled
                }
            };

            console.log('✅ Stripe: Conexão bem-sucedida!');
            console.log(`   - Account ID: ${account.id}`);
            console.log(`   - País: ${account.country}`);
            console.log(`   - Cobranças: ${account.charges_enabled ? 'HABILITADAS' : 'DESABILITADAS'}`);
            console.log(`   - Produtos: ${products.data.length}`);

        } catch (error) {
            this.resultados.stripe = {
                status: 'ERRO',
                detalhes: {
                    erro: error.message,
                    tipo: error.type,
                    codigo: error.code
                }
            };
            console.log('❌ Stripe: Erro na conexão');
            console.log('   Erro:', error.message);
        }
    }

    // Testar OpenAI
    async testarOpenAI() {
        console.log('\n🔄 Testando conexão com OpenAI...');
        
        try {
            const response = await axios.post(
                `${this.configuracoes.openai.baseUrl}/chat/completions`,
                {
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'user',
                            content: 'Teste de conexão - responda apenas "OK"'
                        }
                    ],
                    max_tokens: 5
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.configuracoes.openai.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            this.resultados.openai = {
                status: 'SUCESSO',
                detalhes: {
                    model: response.data.model,
                    usage: response.data.usage,
                    resposta: response.data.choices[0]?.message?.content
                }
            };

            console.log('✅ OpenAI: Conexão bem-sucedida!');
            console.log(`   - Modelo: ${response.data.model}`);
            console.log(`   - Tokens usados: ${response.data.usage?.total_tokens}`);

        } catch (error) {
            this.resultados.openai = {
                status: 'ERRO',
                detalhes: {
                    erro: error.message,
                    codigo: error.response?.status,
                    resposta: error.response?.data
                }
            };
            console.log('❌ OpenAI: Erro na conexão');
            console.log('   Erro:', error.message);
        }
    }

    // Testar CoinStats
    async testarCoinStats() {
        console.log('\n🔄 Testando conexão com CoinStats...');
        
        try {
            // Teste 1: Markets
            const responseMarkets = await axios.get(this.configuracoes.coinstats.markets, {
                headers: {
                    'X-API-KEY"YOUR_COINSTATS_API_KEYYOUR_API_KEY_HEREYOUR_COINSTATS_API_KEYYOUR_API_KEY_HERE,
                detalhes: {
                    markets: responseMarkets.data?.length || 0,
                    fearGreedValue: responseFearGreed.data?.value || 'N/A',
                    fearGreedClassification: responseFearGreed.data?.value_classification || 'N/A'
                }
            };

            console.log('✅ CoinStats: Conexão bem-sucedida!');
            console.log(`   - Markets: ${responseMarkets.data?.length || 0} disponíveis`);
            console.log(`   - Fear & Greed: ${responseFearGreed.data?.value || 'N/A'}`);

        } catch (error) {
            this.resultados.coinstats = {
                status: 'ERRO',
                detalhes: {
                    erro: error.message,
                    codigo: error.response?.status
                }
            };
            console.log('❌ CoinStats: Erro na conexão');
            console.log('   Erro:', error.message);
        }
    }

    // Testar Twilio
    async testarTwilio() {
        console.log('\n🔄 Testando conexão com Twilio...');
        
        try {
            const accountSid = this.configuracoes.twilio.accountSid;
            const authToken = this.configuracoes.twilio.authToken;
            const client = require('twilio')(accountSid, authToken);

            // Teste 1: Verificar account
            const account = await client.accounts(accountSid).fetch();

            // Teste 2: Listar números
            const phoneNumbers = await client.incomingPhoneNumbers.list({ limit: 5 });

            this.resultados.twilio = {
                status: 'SUCESSO',
                detalhes: {
                    accountSid: account.sid,
                    accountStatus: account.status,
                    phoneNumbers: phoneNumbers.length,
                    type: account.type
                }
            };

            console.log('✅ Twilio: Conexão bem-sucedida!');
            console.log(`   - Account: ${account.sid}`);
            console.log(`   - Status: ${account.status}`);
            console.log(`   - Números: ${phoneNumbers.length}`);

        } catch (error) {
            this.resultados.twilio = {
                status: 'ERRO',
                detalhes: {
                    erro: error.message,
                    codigo: error.code
                }
            };
            console.log('❌ Twilio: Erro na conexão');
            console.log('   Erro:', error.message);
        }
    }

    // Executar todos os testes
    async executarTodosTestes() {
        console.log('🚀 INICIANDO VERIFICAÇÃO COMPLETA DE INTEGRAÇÕES EXTERNAS');
        console.log('=' .repeat(60));
        
        const inicio = Date.now();

        await this.testarBybit();
        await this.testarStripe();
        await this.testarOpenAI();
        await this.testarCoinStats();
        await this.testarTwilio();

        const fim = Date.now();
        const tempo = (fim - inicio) / 1000;

        this.gerarRelatorioFinal(tempo);
    }

    // Gerar relatório final
    gerarRelatorioFinal(tempo) {
        console.log('\n' + '=' .repeat(60));
        console.log('📊 RELATÓRIO FINAL DE INTEGRAÇÕES');
        console.log('=' .repeat(60));

        const sucessos = Object.values(this.resultados).filter(r => r.status === 'SUCESSO').length;
        const total = Object.keys(this.resultados).length;

        console.log(`\n🎯 RESUMO GERAL:`);
        console.log(`   - Sucessos: ${sucessos}/${total}`);
        console.log(`   - Taxa de sucesso: ${((sucessos/total) * 100).toFixed(1)}%`);
        console.log(`   - Tempo total: ${tempo.toFixed(2)}s`);

        console.log(`\n📋 DETALHES POR SERVIÇO:`);
        
        Object.entries(this.resultados).forEach(([servico, resultado]) => {
            const emoji = resultado.status === 'SUCESSO' ? '✅' : '❌';
            console.log(`   ${emoji} ${servico.toUpperCase()}: ${resultado.status}`);
        });

        // Salvar relatório em arquivo
        const relatorio = {
            timestamp: new Date().toISOString(),
            tempo_execucao: tempo,
            resumo: {
                sucessos,
                total,
                taxa_sucesso: ((sucessos/total) * 100).toFixed(1) + '%'
            },
            resultados: this.resultados
        };

        require('fs').writeFileSync(
            'relatorio-integracoes-externas.json',
            JSON.stringify(relatorio, null, 2)
        );

        console.log(`\n💾 Relatório salvo em: relatorio-integracoes-externas.json`);
        
        if (sucessos === total) {
            console.log(`\n🎉 TODAS AS INTEGRAÇÕES ESTÃO FUNCIONANDO PERFEITAMENTE!`);
        } else {
            console.log(`\n⚠️  ALGUMAS INTEGRAÇÕES PRECISAM DE ATENÇÃO!`);
        }
    }
}

// Executar verificação
async function main() {
    const verificador = new VerificadorIntegracoes();
    await verificador.executarTodosTestes();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = VerificadorIntegracoes;
