const dns = require('dns');
const https = require('https');
const http = require('http');
const { promisify } = require('util');

const lookup = promisify(dns.lookup);

class DiagnosticoConectividade {
    async testarDNS(hostname) {
        try {
            const result = await lookup(hostname);
            console.log(`✅ DNS OK para ${hostname}: ${result.address}`);
            return true;
        } catch (error) {
            console.log(`❌ DNS FALHOU para ${hostname}: ${error.message}`);
            return false;
        }
    }

    async testarHTTPS(url) {
        return new Promise((resolve) => {
            const req = https.get(url, { timeout: 10000 }, (res) => {
                console.log(`✅ HTTPS OK para ${url}: Status ${res.statusCode}`);
                resolve(true);
            });

            req.on('error', (error) => {
                console.log(`❌ HTTPS FALHOU para ${url}: ${error.message}`);
                resolve(false);
            });

            req.on('timeout', () => {
                console.log(`❌ TIMEOUT para ${url}`);
                req.destroy();
                resolve(false);
            });

            req.setTimeout(10000);
        });
    }

    async testarConexaoBanco() {
        console.log('\n🔍 TESTANDO CONECTIVIDADE DO BANCO DE DADOS...');
        
        const hostnames = [
            'trolley.proxy.rlwy.net',
            'railway.app'
        ];

        for (const hostname of hostnames) {
            await this.testarDNS(hostname);
        }
    }

    async testarAPIs() {
        console.log('\n🔍 TESTANDO CONECTIVIDADE DAS APIS...');
        
        const endpoints = [
            'api.binance.com',
            'api.coingecko.com',
            'api.coinstats.app'
        ];

        for (const endpoint of endpoints) {
            await this.testarDNS(endpoint);
        }

        // Testar HTTPS
        const urls = [
            'https://api.binance.com/api/v3/ping',
            'https://api.coingecko.com/api/v3/ping',
            'https://openapi.coinstats.app/coins'
        ];

        for (const url of urls) {
            await this.testarHTTPS(url);
        }
    }

    async verificarProxyFirewall() {
        console.log('\n🔍 VERIFICANDO CONFIGURAÇÕES DE PROXY/FIREWALL...');
        
        // Verificar variáveis de ambiente de proxy
        const proxyVars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy'];
        let hasProxy = false;
        
        for (const proxyVar of proxyVars) {
            if (process.env[proxyVar]) {
                console.log(`🔧 Proxy detectado: ${proxyVar} = ${process.env[proxyVar]}`);
                hasProxy = true;
            }
        }
        
        if (!hasProxy) {
            console.log('ℹ️  Nenhum proxy configurado nas variáveis de ambiente');
        }
    }

    async executarDiagnosticoCompleto() {
        console.log('🚀 INICIANDO DIAGNÓSTICO COMPLETO DE CONECTIVIDADE...\n');
        
        await this.verificarProxyFirewall();
        await this.testarConexaoBanco();
        await this.testarAPIs();
        
        console.log('\n📋 DIAGNÓSTICO CONCLUÍDO!');
        console.log('\n💡 SOLUÇÕES POSSÍVEIS:');
        console.log('1. Verificar conexão com internet');
        console.log('2. Verificar configurações de firewall/antivírus');
        console.log('3. Verificar configurações de proxy corporativo');
        console.log('4. Tentar usar DNS público (8.8.8.8 ou 1.1.1.1)');
        console.log('5. Verificar se há bloqueio de domínios específicos');
        console.log('6. Reiniciar roteador/modem se necessário');
    }
}

// Executar diagnóstico
const diagnostico = new DiagnosticoConectividade();
diagnostico.executarDiagnosticoCompleto().catch(console.error);
