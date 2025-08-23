require('dotenv').config();
const axios = require('axios');
const { exec } = require('child_process');
const { promisify } = require('util');

/**
 * 🌐 CORREÇÃO AVANÇADA DE CONECTIVIDADE
 * Resolve problemas de erro 403 e região do Ngrok
 */

class ConnectivityFixer {
    constructor() {
        this.execAsync = promisify(exec);
        this.currentIP = null;
        this.ngrokRegion = 'eu'; // Forçar região EU
        this.railwayUrl = process.env.RAILWAY_STATIC_URL || 'https://coinbitclub-market-bot-backend-production.up.railway.app';
    }

    async fixAllConnectivity() {
        console.log('🌐 CORREÇÃO COMPLETA DE CONECTIVIDADE');
        console.log('='.repeat(60));
        
        try {
            // 1. Verificar IP atual
            await this.getCurrentIP();
            
            // 2. Reiniciar Ngrok com região EU
            await this.restartNgrokEU();
            
            // 3. Verificar novo IP
            await this.verifyNewIP();
            
            // 4. Testar conectividade com exchanges
            await this.testExchangeConnectivity();
            
            // 5. Verificar Railway deployment
            await this.checkRailwayDeployment();
            
            // 6. Gerar relatório de conectividade
            await this.generateConnectivityReport();
            
        } catch (error) {
            console.error('❌ Erro na correção de conectividade:', error);
        }
    }

    async getCurrentIP() {
        console.log('\n🔍 VERIFICANDO IP ATUAL');
        console.log('-'.repeat(40));
        
        try {
            // Verificar IP público
            const ipResponse = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
            this.currentIP = ipResponse.data.ip;
            console.log(`🌐 IP público atual: ${this.currentIP}`);
            
            // Verificar geolocalização
            const geoResponse = await axios.get(`http://ip-api.com/json/${this.currentIP}`, { timeout: 5000 });
            const { country, regionName, city, org } = geoResponse.data;
            
            console.log(`📍 Localização: ${city}, ${regionName}, ${country}`);
            console.log(`🏢 Provedor: ${org}`);
            
            // Verificar se é IP europeu
            const europeanCountries = ['DE', 'NL', 'GB', 'FR', 'IE', 'IT', 'ES', 'PT', 'BE', 'LU', 'AT', 'CH'];
            const isEuropean = europeanCountries.includes(geoResponse.data.countryCode);
            
            if (!isEuropean) {
                console.log('❌ IP não está na região europeia - necessário reiniciar Ngrok');
                return false;
            } else {
                console.log('✅ IP está na região europeia');
                return true;
            }
            
        } catch (error) {
            console.error('❌ Erro ao verificar IP:', error.message);
            return false;
        }
    }

    async restartNgrokEU() {
        console.log('\n🔄 REINICIANDO NGROK REGIÃO EU');
        console.log('-'.repeat(40));
        
        try {
            // Parar processos ngrok existentes
            console.log('🛑 Parando processos ngrok existentes...');
            try {
                await this.execAsync('taskkill /f /im ngrok.exe');
                console.log('✅ Processos ngrok finalizados');
            } catch (error) {
                console.log('⚠️  Nenhum processo ngrok ativo');
            }
            
            // Aguardar um pouco
            await this.sleep(2000);
            
            // Iniciar ngrok na região EU
            console.log('🚀 Iniciando ngrok na região EU...');
            
            const ngrokCommand = `ngrok http 3000 --region=eu --log=stdout`;
            console.log(`📝 Comando: ${ngrokCommand}`);
            
            // Executar ngrok em background
            const ngrokProcess = exec(ngrokCommand);
            
            ngrokProcess.stdout.on('data', (data) => {
                const output = data.toString();
                if (output.includes('started tunnel')) {
                    console.log('✅ Tunnel ngrok iniciado com sucesso');
                }
                if (output.includes('url=')) {
                    const match = output.match(/url=([^\s]+)/);
                    if (match) {
                        console.log(`🔗 URL do tunnel: ${match[1]}`);
                    }
                }
            });
            
            ngrokProcess.stderr.on('data', (data) => {
                console.log(`⚠️  Ngrok stderr: ${data}`);
            });
            
            // Aguardar inicialização
            console.log('⏳ Aguardando inicialização do tunnel...');
            await this.sleep(10000);
            
            // Verificar se o tunnel está ativo
            try {
                const tunnelResponse = await axios.get('http://localhost:4040/api/tunnels');
                const tunnels = tunnelResponse.data.tunnels;
                
                if (tunnels && tunnels.length > 0) {
                    const publicUrl = tunnels[0].public_url;
                    console.log(`✅ Tunnel ativo: ${publicUrl}`);
                    return publicUrl;
                } else {
                    console.log('❌ Nenhum tunnel ativo encontrado');
                    return null;
                }
            } catch (error) {
                console.log('❌ Erro ao verificar tunnels ngrok');
                return null;
            }
            
        } catch (error) {
            console.error('❌ Erro ao reiniciar ngrok:', error.message);
            return null;
        }
    }

    async verifyNewIP() {
        console.log('\n🔍 VERIFICANDO NOVO IP APÓS NGROK');
        console.log('-'.repeat(40));
        
        // Aguardar um pouco para o IP se propagar
        await this.sleep(5000);
        
        return await this.getCurrentIP();
    }

    async testExchangeConnectivity() {
        console.log('\n🔗 TESTANDO CONECTIVIDADE COM EXCHANGES');
        console.log('-'.repeat(40));
        
        const exchanges = [
            {
                name: 'Bybit Mainnet',
                url: 'https://api.bybit.com/v5/market/time',
                timeout: 10000
            },
            {
                name: 'Bybit Testnet',
                url: 'https://api-testnet.bybit.com/v5/market/time',
                timeout: 10000
            },
            {
                name: 'Binance Mainnet',
                url: 'https://api.binance.com/api/v3/time',
                timeout: 10000
            },
            {
                name: 'Binance Testnet',
                url: 'https://testnet.binance.vision/api/v3/time',
                timeout: 10000
            }
        ];
        
        const results = [];
        
        for (const exchange of exchanges) {
            try {
                console.log(`🔄 Testando ${exchange.name}...`);
                
                const startTime = Date.now();
                const response = await axios.get(exchange.url, {
                    timeout: exchange.timeout,
                    headers: {
                        'User-Agent': 'CoinBitClub-Bot/1.0',
                        'Accept': 'application/json'
                    }
                });
                const responseTime = Date.now() - startTime;
                
                console.log(`✅ ${exchange.name}: Sucesso (${responseTime}ms)`);
                results.push({
                    name: exchange.name,
                    status: 'success',
                    responseTime,
                    data: response.data
                });
                
            } catch (error) {
                const status = error.response?.status || 'timeout';
                const message = error.response?.statusText || error.message;
                
                console.log(`❌ ${exchange.name}: ${status} - ${message}`);
                results.push({
                    name: exchange.name,
                    status: 'error',
                    error: status,
                    message
                });
            }
        }
        
        return results;
    }

    async checkRailwayDeployment() {
        console.log('\n🚄 VERIFICANDO DEPLOYMENT RAILWAY');
        console.log('-'.repeat(40));
        
        const endpoints = [
            { path: '/', description: 'Health check' },
            { path: '/api/status', description: 'API status' },
            { path: '/api/health', description: 'System health' },
            { path: '/webhook/test', description: 'Webhook test' }
        ];
        
        for (const endpoint of endpoints) {
            try {
                console.log(`🔄 Testando ${this.railwayUrl}${endpoint.path}...`);
                
                const response = await axios.get(`${this.railwayUrl}${endpoint.path}`, {
                    timeout: 15000,
                    headers: {
                        'User-Agent': 'CoinBitClub-Health-Check/1.0'
                    }
                });
                
                console.log(`✅ ${endpoint.description}: ${response.status} ${response.statusText}`);
                
            } catch (error) {
                const status = error.response?.status || 'timeout';
                const message = error.response?.statusText || error.message;
                
                if (status === 404) {
                    console.log(`⚠️  ${endpoint.description}: ${status} - Endpoint não encontrado (normal para alguns)`);
                } else {
                    console.log(`❌ ${endpoint.description}: ${status} - ${message}`);
                }
            }
        }
    }

    async generateConnectivityReport() {
        console.log('\n📊 RELATÓRIO DE CONECTIVIDADE');
        console.log('='.repeat(60));
        
        console.log(`🌐 IP atual: ${this.currentIP || 'Não determinado'}`);
        console.log(`🌍 Região Ngrok: ${this.ngrokRegion.toUpperCase()}`);
        console.log(`🚄 Railway URL: ${this.railwayUrl}`);
        
        console.log('\n🔧 AÇÕES RECOMENDADAS:');
        console.log('   1. ✅ Ngrok configurado para região EU');
        console.log('   2. 🔄 Reiniciar aplicação Railway se necessário');
        console.log('   3. 🔑 Verificar whitelisting de IP nas exchanges');
        console.log('   4. 📡 Testar webhooks TradingView');
        console.log('   5. 🚀 Ativar monitoramento automático');
        
        console.log('\n💡 PRÓXIMOS PASSOS:');
        console.log('   • Execute: node complete-trading-diagnostic.js');
        console.log('   • Execute: node auto-error-fixer.js');
        console.log('   • Monitore logs em tempo real');
        console.log('   • Verifique recepção de sinais');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Executar correção
if (require.main === module) {
    const fixer = new ConnectivityFixer();
    fixer.fixAllConnectivity();
}

module.exports = ConnectivityFixer;
