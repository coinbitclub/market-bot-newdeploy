#!/usr/bin/env node
const crypto = require('crypto');
const fetch = require('node-fetch');

// ===== CÓDIGO BASEADO NO SEU EXEMPLO DE SUCESSO =====
// Usando a estrutura que funcionou anteriormente

const ACCOUNTS = {
    // Exemplo de contas reais (substituir por chaves válidas para teste)
    test_account: {
        bybit: {
            api_key: YOUR_API_KEY_HERE,
            api_secret: 'INSIRA_SECRET_REAL_AQUI'
        },
        binance: {
            api_key: "YOUR_BINANCE_API_KEY"YOUR_BINANCE_API_KEY"INSIRA_SECRET_BINANCE_AQUI'
        }
    }
};

class ComprehensiveAPITester {
    constructor() {
        this.results = {
            successful: [],
            failed: [],
            summary: {}
        };
        this.retryCount = 3;
        this.timeout = 10000;
    }

    // ===== BYBIT API METHODS =====
    async testBybitEndpoint(account, endpoint, method = 'GET', params = {}) {
        const { api_key, api_secret } = account.bybit;
        const timestamp = Date.now().toString();
        const recv_window = '5000';
        
        let queryString = '';
        let body = '';
        
        if (method === 'GET') {
            const allParams = { ...params, timestamp, recv_window };
            queryString = Object.keys(allParams)
                .sort()
                .map(key => `${key}=${allParams[key]}`)
                .join('&');
        } else {
            body = JSON.stringify(params);
            queryString = `timestamp=${timestamp}&recv_window=${recv_window}`;
        }
        
        const sign = crypto.createHmac('sha256', api_secret)
            .update(timestamp + api_key + recv_window + (method === 'POST' ? body : ''))
            .digest('hex');
        
        const headers = {
            'X-BAPI-API-KEY': api_key,
            'X-BAPI-SIGN': sign,
            'X-BAPI-SIGN-TYPE': '2',
            'X-BAPI-TIMESTAMP': timestamp,
            'X-BAPI-RECV-WINDOW': recv_window,
            'Content-Type': 'application/json'
        };
        
        const url = `https://api.bybit.com${endpoint}${queryString ? '?' + queryString : ''}`;
        
        try {
            const response = await fetch(url, {
                method,
                headers,
                body: method === 'POST' ? body : undefined
            });
            
            const data = await response.json();
            return { success: data.retCode === 0, data, status: response.status };
        } catch (error) {
            return { success: false, error: error.message, status: 0 };
        }
    }
    
    // ===== BINANCE API METHODS =====
    async testBinanceEndpoint(account, endpoint, method = 'GET', params = {}) {
        const { api_key, api_secret } = account.binance;
        const timestamp = Date.now();
        
        const allParams = { ...params, timestamp };
        const queryString = Object.keys(allParams)
            .map(key => `${key}=${allParams[key]}`)
            .join('&');
        
        const signature = crypto.createHmac('sha256', api_secret)
            .update(queryString)
            .digest('hex');
        
        const url = `https://api.binance.com${endpoint}?${queryString}&signature=${signature}`;
        
        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'X-MBX-APIKEY': api_key,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            return { success: !data.code, data, status: response.status };
        } catch (error) {
            return { success: false, error: error.message, status: 0 };
        }
    }
    
    // ===== COMPREHENSIVE TESTING =====
    async runComprehensiveTest() {
        console.log('🚀 Iniciando teste abrangente das APIs...\n');
        
        // Lista dos endpoints mais importantes para testar
        const bybitEndpoints = [
            { path: '/v5/user/query-api', name: 'API Info' },
            { path: '/v5/account/wallet-balance', name: 'Wallet Balance', params: { accountType: 'UNIFIED' } },
            { path: '/v5/position/list', name: 'Position List', params: { category: 'linear' } },
            { path: '/v5/order/realtime', name: 'Active Orders', params: { category: 'linear' } },
            { path: '/v5/market/tickers', name: 'Market Tickers', params: { category: 'linear' } }
        ];
        
        const binanceEndpoints = [
            { path: '/api/v3/account', name: 'Account Info' },
            { path: '/api/v3/openOrders', name: 'Open Orders' },
            { path: '/api/v3/ticker/24hr', name: '24hr Ticker' }
        ];
        
        for (const [accountName, account] of Object.entries(ACCOUNTS)) {
            console.log(`\n=== TESTANDO CONTA: ${accountName.toUpperCase()} ===`);
            
            // Teste Bybit
            if (account.bybit) {
                console.log('\n📊 BYBIT ENDPOINTS:');
                for (const endpoint of bybitEndpoints) {
                    console.log(`\n🔸 ${endpoint.name}:`);
                    const result = await this.testBybitEndpoint(account, endpoint.path, 'GET', endpoint.params || {});
                    
                    if (result.success) {
                        console.log(`   ✅ Sucesso`);
                        console.log(`   📋 Dados:`, JSON.stringify(result.data.result, null, 2));
                        this.results.successful.push({ account: accountName, exchange: 'bybit', endpoint: endpoint.name });
                    } else {
                        console.log(`   ❌ Falha: ${result.error || result.data?.retMsg || 'Erro desconhecido'}`);
                        this.results.failed.push({ account: accountName, exchange: 'bybit', endpoint: endpoint.name, error: result.error || result.data });
                    }
                    
                    // Delay entre requests
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
            
            // Teste Binance
            if (account.binance) {
                console.log('\n📊 BINANCE ENDPOINTS:');
                for (const endpoint of binanceEndpoints) {
                    console.log(`\n🔸 ${endpoint.name}:`);
                    const result = await this.testBinanceEndpoint(account, endpoint.path, 'GET', endpoint.params || {});
                    
                    if (result.success) {
                        console.log(`   ✅ Sucesso`);
                        console.log(`   📋 Dados:`, JSON.stringify(result.data, null, 2));
                        this.results.successful.push({ account: accountName, exchange: 'binance', endpoint: endpoint.name });
                    } else {
                        console.log(`   ❌ Falha: ${result.error || result.data?.msg || 'Erro desconhecido'}`);
                        this.results.failed.push({ account: accountName, exchange: 'binance', endpoint: endpoint.name, error: result.error || result.data });
                    }
                    
                    // Delay entre requests
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
        }
        
        this.printFinalSummary();
    }
    
    printFinalSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMO FINAL DOS TESTES');
        console.log('='.repeat(60));
        console.log(`✅ Sucessos: ${this.results.successful.length}`);
        console.log(`❌ Falhas: ${this.results.failed.length}`);
        
        if (this.results.successful.length > 0) {
            console.log('\n🎯 ENDPOINTS FUNCIONAIS:');
            this.results.successful.forEach(result => {
                console.log(`   - ${result.account} → ${result.exchange} → ${result.endpoint}`);
            });
        }
        
        if (this.results.failed.length > 0) {
            console.log('\n❌ ENDPOINTS COM PROBLEMAS:');
            this.results.failed.forEach(result => {
                console.log(`   - ${result.account} → ${result.exchange} → ${result.endpoint}`);
            });
        }
        
        console.log('\n💡 DIAGNÓSTICO:');
        if (this.results.failed.length === 0) {
            console.log('   🎉 Todas as chaves estão funcionando perfeitamente!');
        } else if (this.results.successful.length === 0) {
            console.log('   ⚠️  Nenhuma chave está funcionando - verificar credenciais');
        } else {
            console.log('   ⚡ Algumas chaves funcionam - verificar configurações específicas');
        }
    }
}

// ===== EXECUÇÃO =====
console.log('🔧 TESTE ABRANGENTE DE APIs - BASEADO NO CÓDIGO DE SUCESSO');
console.log('📝 Para usar este teste:');
console.log('   1. Substitua as chaves em ACCOUNTS por chaves reais válidas');
console.log('   2. Execute novamente o teste');
console.log('   3. Compare os resultados com o Order Execution Engine\n');

console.log('⚠️  ATENÇÃO: As chaves atuais no banco estão marcadas como "invalid"');
console.log('   Isso explica porque o Order Execution Engine falha na validação');
console.log('   É necessário inserir chaves válidas no banco ou configurar novas\n');

const tester = new ComprehensiveAPITester();

// Comentado para não fazer requests com chaves inválidas
// tester.runComprehensiveTest();

console.log('✅ Estrutura de teste preparada!');
console.log('💡 Este código está baseado no seu exemplo que funcionou anteriormente');
console.log('📋 Para prosseguir: insira chaves válidas em ACCOUNTS e descomente a linha final');
