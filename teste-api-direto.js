#!/usr/bin/env node
const crypto = require('crypto');
const fetch = require('node-fetch');

// Chaves que já identificamos do banco
const ACCOUNTS = {
    luiza_maria: {
        bybit: {
            api_key: YOUR_API_KEY_HERE,
            api_secret: 'VVm5gLaQQ59pDDHZQu13X1uBMN3Xc5fLf7Ey'
        }
    },
    paloma_amaral: {
        bybit: {
            api_key: YOUR_API_KEY_HERE,
            api_secret: 'HDfn0hGwJwBZRQKY0vhYPnAu1i3zObQz8xxh'
        }
    },
    erica_santos: {
        bybit: {
            api_key: YOUR_API_KEY_HERE,
            api_secret: 'YNjWRdGOUDO5N1s9rF0AW9tObgqK6UuB1Xan'
        }
    }
};

class APITester {
    constructor() {
        this.results = {
            successful: [],
            failed: []
        };
    }

    generateSignature(params, secret) {
        const sortedParams = Object.keys(params)
            .sort()
            .map(key => `${key}=${params[key]}`)
            .join('&');
        
        return crypto.createHmac('sha256', secret).update(sortedParams).digest('hex');
    }

    async testBybitConnection(accountName, apiKey, apiSecret) {
        const timestamp = Date.now().toString();
        const recvWindow = '5000';
        
        const params = {
            api_key: apiKey,
            timestamp: timestamp,
            recv_window: recvWindow
        };

        const signature = this.generateSignature(params, apiSecret);
        params.sign = signature;

        const queryString = Object.keys(params)
            .map(key => `${key}=${params[key]}`)
            .join('&');

        try {
            console.log(`🧪 Testando conexão Bybit para ${accountName}...`);
            console.log(`   API Key: ${apiKey}`);
            
            const response = await fetch(`https://api.bybit.com/v5/user/query-api?${queryString}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            
            if (data.retCode === 0) {
                console.log(`✅ ${accountName} - Conexão bem-sucedida!`);
                console.log(`   Dados da conta:`, JSON.stringify(data.result, null, 2));
                this.results.successful.push({
                    account: accountName,
                    exchange: 'bybit',
                    response: data
                });
                return true;
            } else {
                console.log(`❌ ${accountName} - Falha na conexão:`, data);
                this.results.failed.push({
                    account: accountName,
                    exchange: 'bybit',
                    error: data
                });
                return false;
            }
        } catch (error) {
            console.log(`❌ ${accountName} - Erro de rede:`, error.message);
            this.results.failed.push({
                account: accountName,
                exchange: 'bybit',
                error: error.message
            });
            return false;
        }
    }

    async testAllAccounts() {
        console.log('🚀 Iniciando teste direto das APIs com chaves do banco...\n');
        
        for (const [accountName, exchanges] of Object.entries(ACCOUNTS)) {
            if (exchanges.bybit) {
                await this.testBybitConnection(
                    accountName,
                    exchanges.bybit.api_key,
                    exchanges.bybit.api_secret
                );
                console.log(''); // Linha em branco
            }
        }

        console.log('📊 RESUMO DOS TESTES:');
        console.log(`✅ Sucessos: ${this.results.successful.length}`);
        console.log(`❌ Falhas: ${this.results.failed.length}`);

        if (this.results.successful.length > 0) {
            console.log('\n🎯 Contas funcionais:');
            this.results.successful.forEach(result => {
                console.log(`   - ${result.account} (${result.exchange})`);
            });
        }
    }
}

// Executar teste
const tester = new APITester();
tester.testAllAccounts();
