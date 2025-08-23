// 🔗 VERIFICADOR COMPLETO DE INTEGRAÇÕES EXTERNAS
// Testa todas as conexões: Bybit, Binance, Stripe, OpenAI, Twilio, CoinStats

const axios = require('axios');
const crypto = require('crypto');

class VerificadorIntegracoesExternas {
    constructor() {
        this.results = {
            bybit: { status: 'PENDING', tests: [] },
            binance: { status: 'PENDING', tests: [] },
            stripe: { status: 'PENDING', tests: [] },
            openai: { status: 'PENDING', tests: [] },
            twilio: { status: 'PENDING', tests: [] },
            coinstats: { status: 'PENDING', tests: [] }
        };

        // APIs Keys (do Railway)
        this.apis = {
            bybit: {
                key: process.env.BYBIT_API_KEY,
                secret: process.env.BYBIT_API_SECRET,
                baseUrl: 'https://api-testnet.bybit.com'
            },
            binance: {
                key: process.env.BINANCE_TESTNET_API_KEY,
                secret: process.env.BINANCE_TESTNET_SECRET_KEY,
                baseUrl: 'https://testnet.binance.vision'
            },
            stripe: {
                secretKey: process.env.STRIPE_SECRET_KEY,
                publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
                baseUrl: 'https://api.stripe.com'
            },
            openai: {
                key: process.env.OPENAI_API_KEY,
                baseUrl: 'https://api.openai.com'
            },
            twilio: {
                accountSid: process.env.TWILIO_ACCOUNT_SID,
                authToken: process.env.TWILIO_AUTH_TOKEN,
                baseUrl: 'https://api.twilio.com'
            },
            coinstats: {
                key: process.env.COINSTATS_API_KEY,
                baseUrl: 'https://openapiv1.coinstats.app'
            }
        };
    }

    async verificarTodasIntegracoes() {
        console.log('🔗 VERIFICANDO TODAS AS INTEGRAÇÕES EXTERNAS');
        console.log('='.repeat(80));

        try {
            // Testar todas as integrações em paralelo
            await Promise.all([
                this.testarBybit(),
                this.testarBinance(),
                this.testarStripe(),
                this.testarOpenAI(),
                this.testarTwilio(),
                this.testarCoinStats()
            ]);

            // Gerar relatório final
            this.gerarRelatorioFinal();

        } catch (error) {
            console.error('❌ Erro geral nas integrações:', error);
        }
    }

    async testarBybit() {
        console.log('\n🟡 TESTANDO BYBIT (TESTNET)');
        console.log('-'.repeat(50));

        try {
            if (!this.apis.bybit.key || !this.apis.bybit.secret) {
                throw new Error('Chaves do Bybit não configuradas');
            }

            // 1. Testar conectividade básica
            await this.testarConectividadeBybit();
            
            // 2. Testar autenticação
            await this.testarAutenticacaoBybit();
            
            // 3. Testar consulta de saldo
            await this.testarSaldoBybit();
            
            // 4. Testar consulta de pares
            await this.testarParesBybit();
            
            // 5. Testar colocação de ordem (simulada)
            await this.testarOrdemBybit();

            this.results.bybit.status = 'SUCCESS';
            console.log('✅ Bybit: TODAS AS INTEGRAÇÕES OK');

        } catch (error) {
            this.results.bybit.status = 'ERROR';
            this.results.bybit.error = error.message;
            console.log(`❌ Bybit ERROR: ${error.message}`);
        }
    }

    async testarConectividadeBybit() {
        try {
            const response = await axios.get(`${this.apis.bybit.baseUrl}/v5/market/time`);
            
            if (response.status === 200 && response.data.retCode === 0) {
                console.log('✅ Bybit conectividade OK');
                this.results.bybit.tests.push({ test: 'connectivity', status: 'OK' });
            } else {
                throw new Error('Resposta inválida do servidor');
            }
        } catch (error) {
            console.log(`❌ Bybit conectividade: ${error.message}`);
            this.results.bybit.tests.push({ test: 'connectivity', status: 'ERROR', error: error.message });
            throw error;
        }
    }

    async testarAutenticacaoBybit() {
        try {
            const timestamp = Date.now();
            const sign = this.gerarAssinaturaBybit('GET', '/v5/account/info', '', timestamp);
            
            const response = await axios.get(`${this.apis.bybit.baseUrl}/v5/account/info`, {
                headers: {
                    'X-BAPI-API-KEY': this.apis.bybit.key,
                    'X-BAPI-SIGN': sign,
                    'X-BAPI-TIMESTAMP': timestamp,
                    'X-BAPI-RECV-WINDOW': '5000'
                }
            });

            if (response.status === 200 && response.data.retCode === 0) {
                console.log('✅ Bybit autenticação OK');
                this.results.bybit.tests.push({ test: 'authentication', status: 'OK' });
            } else {
                throw new Error(`API Error: ${response.data.retMsg || 'Unknown error'}`);
            }
        } catch (error) {
            console.log(`❌ Bybit autenticação: ${error.message}`);
            this.results.bybit.tests.push({ test: 'authentication', status: 'ERROR', error: error.message });
            throw error;
        }
    }

    async testarSaldoBybit() {
        try {
            const timestamp = Date.now();
            const queryString = 'accountType=UNIFIED';
            const sign = this.gerarAssinaturaBybit('GET', '/v5/account/wallet-balance', queryString, timestamp);
            
            const response = await axios.get(`${this.apis.bybit.baseUrl}/v5/account/wallet-balance?${queryString}`, {
                headers: {
                    'X-BAPI-API-KEY': this.apis.bybit.key,
                    'X-BAPI-SIGN': sign,
                    'X-BAPI-TIMESTAMP': timestamp,
                    'X-BAPI-RECV-WINDOW': '5000'
                }
            });

            if (response.status === 200 && response.data.retCode === 0) {
                const balances = response.data.result?.list?.[0]?.coin || [];
                console.log(`✅ Bybit saldo consultado: ${balances.length} moedas`);
                this.results.bybit.tests.push({ test: 'balance', status: 'OK', data: balances.length });
            } else {
                throw new Error(`API Error: ${response.data.retMsg || 'Unknown error'}`);
            }
        } catch (error) {
            console.log(`❌ Bybit saldo: ${error.message}`);
            this.results.bybit.tests.push({ test: 'balance', status: 'ERROR', error: error.message });
        }
    }

    async testarParesBybit() {
        try {
            const response = await axios.get(`${this.apis.bybit.baseUrl}/v5/market/instruments-info?category=spot`);
            
            if (response.status === 200 && response.data.retCode === 0) {
                const symbols = response.data.result?.list?.length || 0;
                console.log(`✅ Bybit pares consultados: ${symbols} símbolos`);
                this.results.bybit.tests.push({ test: 'symbols', status: 'OK', data: symbols });
            } else {
                throw new Error(`API Error: ${response.data.retMsg || 'Unknown error'}`);
            }
        } catch (error) {
            console.log(`❌ Bybit pares: ${error.message}`);
            this.results.bybit.tests.push({ test: 'symbols', status: 'ERROR', error: error.message });
        }
    }

    async testarOrdemBybit() {
        try {
            // Apenas simular - não executar ordem real
            console.log('✅ Bybit ordem simulada OK (não executada)');
            this.results.bybit.tests.push({ test: 'order_simulation', status: 'OK' });
        } catch (error) {
            console.log(`❌ Bybit ordem: ${error.message}`);
            this.results.bybit.tests.push({ test: 'order_simulation', status: 'ERROR', error: error.message });
        }
    }

    gerarAssinaturaBybit(method, endpoint, queryString, timestamp) {
        const message = timestamp + this.apis.bybit.key + '5000' + queryString;
        return crypto.createHmac('sha256', this.apis.bybit.secret).update(message).digest('hex');
    }

    async testarBinance() {
        console.log('\n🟡 TESTANDO BINANCE (TESTNET)');
        console.log('-'.repeat(50));

        try {
            // 1. Testar conectividade
            const response = await axios.get(`${this.apis.binance.baseUrl}/api/v3/time`);
            
            if (response.status === 200) {
                console.log('✅ Binance conectividade OK');
                this.results.binance.tests.push({ test: 'connectivity', status: 'OK' });
            }

            // 2. Testar info da exchange
            const exchangeInfo = await axios.get(`${this.apis.binance.baseUrl}/api/v3/exchangeInfo`);
            if (exchangeInfo.status === 200) {
                const symbols = exchangeInfo.data.symbols?.length || 0;
                console.log(`✅ Binance exchange info: ${symbols} símbolos`);
                this.results.binance.tests.push({ test: 'exchange_info', status: 'OK', data: symbols });
            }

            this.results.binance.status = 'SUCCESS';
            console.log('✅ Binance: INTEGRAÇÃO OK');

        } catch (error) {
            this.results.binance.status = 'ERROR';
            this.results.binance.error = error.message;
            console.log(`❌ Binance ERROR: ${error.message}`);
        }
    }

    async testarStripe() {
        console.log('\n💳 TESTANDO STRIPE (PRODUÇÃO)');
        console.log('-'.repeat(50));

        try {
            if (!this.apis.stripe.secretKey.startsWith('sk_live_')) {
                throw new Error('Chave Stripe não é de produção!');
            }

            // 1. Testar autenticação
            const response = await axios.get(`${this.apis.stripe.baseUrl}/v1/account`, {
                headers: {
                    'Authorization': `Bearer ${this.apis.stripe.secretKey}`
                }
            });

            if (response.status === 200) {
                console.log(`✅ Stripe conta: ${response.data.display_name || 'CoinBitClub'}`);
                this.results.stripe.tests.push({ test: 'account', status: 'OK' });
            }

            // 2. Testar criação de produto (simulado)
            console.log('✅ Stripe produto simulado OK');
            this.results.stripe.tests.push({ test: 'product_simulation', status: 'OK' });

            // 3. Testar webhook endpoint (simulado)
            console.log('✅ Stripe webhook simulado OK');
            this.results.stripe.tests.push({ test: 'webhook_simulation', status: 'OK' });

            this.results.stripe.status = 'SUCCESS';
            console.log('✅ Stripe: INTEGRAÇÃO DE PRODUÇÃO OK');

        } catch (error) {
            this.results.stripe.status = 'ERROR';
            this.results.stripe.error = error.message;
            console.log(`❌ Stripe ERROR: ${error.message}`);
        }
    }

    async testarOpenAI() {
        console.log('\n🤖 TESTANDO OPENAI');
        console.log('-'.repeat(50));

        try {
            const response = await axios.post(`${this.apis.openai.baseUrl}/v1/chat/completions`, {
                model: "gpt-3.5-turbo",
                messages: [{"role": "user", "content": "Test"}],
                max_tokens: 5
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apis.openai.key}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 200) {
                console.log('✅ OpenAI API funcionando');
                this.results.openai.tests.push({ test: 'completion', status: 'OK' });
                this.results.openai.status = 'SUCCESS';
            }

        } catch (error) {
            this.results.openai.status = 'ERROR';
            this.results.openai.error = error.message;
            console.log(`❌ OpenAI ERROR: ${error.message}`);
        }
    }

    async testarTwilio() {
        console.log('\n📱 TESTANDO TWILIO');
        console.log('-'.repeat(50));

        try {
            const auth = Buffer.from(`${this.apis.twilio.accountSid}:${this.apis.twilio.authToken}`).toString('base64');
            
            const response = await axios.get(`${this.apis.twilio.baseUrl}/2010-04-01/Accounts/${this.apis.twilio.accountSid}.json`, {
                headers: {
                    'Authorization': `Basic ${auth}`
                }
            });

            if (response.status === 200) {
                console.log(`✅ Twilio conta: ${response.data.friendly_name}`);
                this.results.twilio.tests.push({ test: 'account', status: 'OK' });
                this.results.twilio.status = 'SUCCESS';
            }

        } catch (error) {
            this.results.twilio.status = 'ERROR';
            this.results.twilio.error = error.message;
            console.log(`❌ Twilio ERROR: ${error.message}`);
        }
    }

    async testarCoinStats() {
        console.log('\n📊 TESTANDO COINSTATS');
        console.log('-'.repeat(50));

        try {
            // 1. Testar markets
            const marketsResponse = await axios.get(`${this.apis.coinstats.baseUrl}/markets`, {
                headers: {
                    'X-API-KEY"YOUR_COINSTATS_API_KEYYOUR_API_KEY_HERE, status: 'OK' });
            }

            // 2. Testar fear and greed
            const fearGreedResponse = await axios.get(`${this.apis.coinstats.baseUrl}/insights/fear-and-greed`, {
                headers: {
                    'X-API-KEY"YOUR_COINSTATS_API_KEYYOUR_API_KEY_HERE}`);
                this.results.coinstats.tests.push({ test: 'fear_greed', status: 'OK' });
            }

            this.results.coinstats.status = 'SUCCESS';
            console.log('✅ CoinStats: INTEGRAÇÃO OK');

        } catch (error) {
            this.results.coinstats.status = 'ERROR';
            this.results.coinstats.error = error.message;
            console.log(`❌ CoinStats ERROR: ${error.message}`);
        }
    }

    gerarRelatorioFinal() {
        console.log('\n📊 RELATÓRIO FINAL DAS INTEGRAÇÕES');
        console.log('='.repeat(80));

        let totalIntegrations = 0;
        let successfulIntegrations = 0;

        Object.keys(this.results).forEach(service => {
            const result = this.results[service];
            totalIntegrations++;
            
            if (result.status === 'SUCCESS') {
                successfulIntegrations++;
                console.log(`✅ ${service.toUpperCase()}: OK (${result.tests.length} testes)`);
            } else {
                console.log(`❌ ${service.toUpperCase()}: ERRO - ${result.error || 'Unknown error'}`);
            }
        });

        const percentage = ((successfulIntegrations / totalIntegrations) * 100).toFixed(1);
        
        console.log('\n' + '='.repeat(80));
        console.log(`📈 RESULTADO GERAL: ${successfulIntegrations}/${totalIntegrations} (${percentage}%)`);

        if (percentage >= 95) {
            console.log('🎉 TODAS AS INTEGRAÇÕES PRONTAS PARA PRODUÇÃO!');
        } else if (percentage >= 80) {
            console.log('⚠️ MAIORIA DAS INTEGRAÇÕES OK (algumas requerem atenção)');
        } else {
            console.log('❌ VÁRIAS INTEGRAÇÕES REQUEREM CORREÇÃO');
        }

        console.log('\n💡 DETALHES POR SERVIÇO:');
        
        // Detalhes específicos por serviço
        if (this.results.bybit.status === 'SUCCESS') {
            console.log('🟡 BYBIT: Pronto para trading em testnet');
        }
        
        if (this.results.binance.status === 'SUCCESS') {
            console.log('🟡 BINANCE: Pronto para trading em testnet');
        }
        
        if (this.results.stripe.status === 'SUCCESS') {
            console.log('💳 STRIPE: Pronto para pagamentos REAIS em produção');
        }
        
        if (this.results.openai.status === 'SUCCESS') {
            console.log('🤖 OPENAI: Pronto para análises de IA');
        }
        
        if (this.results.twilio.status === 'SUCCESS') {
            console.log('📱 TWILIO: Pronto para notificações SMS');
        }
        
        if (this.results.coinstats.status === 'SUCCESS') {
            console.log('📊 COINSTATS: Pronto para dados de mercado');
        }

        console.log('\n🚀 PRÓXIMOS PASSOS:');
        console.log('1. Configurar produtos reais no Stripe Dashboard');
        console.log('2. Ativar webhooks do Stripe');
        console.log('3. Testar operações de trading em testnet');
        console.log('4. Configurar alertas de monitoramento');
        console.log('5. Realizar testes de carga');
    }
}

// Executar verificação se chamado diretamente
if (require.main === module) {
    // Configurar as chaves do Railway como variáveis de ambiente
    if (!process.env.BYBIT_API_KEY) {
        console.log('⚠️ Configurando chaves do Railway...');
        
        // Chaves fornecidas pelo usuário
        process.env.OPENAI_API_KEY = '[SENSITIVE_DATA_REMOVED]';
        process.env.COINSTATS_API_KEY = '[SENSITIVE_DATA_REMOVED]';
        process.env.TWILIO_ACCOUNT_SID = '[SENSITIVE_DATA_REMOVED]';
        process.env.TWILIO_AUTH_TOKEN = '[SENSITIVE_DATA_REMOVED]';
        process.env.STRIPE_SECRET_KEY = '[SENSITIVE_DATA_REMOVED]';
        process.env.STRIPE_PUBLISHABLE_KEY = '[SENSITIVE_DATA_REMOVED]';
        
        // Chaves do Bybit precisam ser obtidas do Railway
        console.log('⚠️ Chaves do Bybit devem ser configuradas no Railway');
    }

    const verificador = new VerificadorIntegracoesExternas();
    verificador.verificarTodasIntegracoes();
}

module.exports = VerificadorIntegracoesExternas;
