require('dotenv').config();
const { spawn, exec } = require('child_process');
const axios = require('axios');
const { promisify } = require('util');

/**
 * 🔥 ATIVADOR COMPLETO DO SISTEMA
 * Configura Ngrok, corrige conectividade e ativa trading real
 */

class SystemActivator {
    constructor() {
        this.execAsync = promisify(exec);
        this.ngrokProcess = null;
        this.publicUrl = null;
    }

    async activateCompleteSystem() {
        console.log('🔥 ATIVAÇÃO COMPLETA DO SISTEMA DE TRADING');
        console.log('='.repeat(60));
        
        try {
            // 1. Configurar Ngrok
            await this.setupNgrok();
            
            // 2. Iniciar tunnel EU
            await this.startEUTunnel();
            
            // 3. Verificar conectividade
            await this.verifyConnectivity();
            
            // 4. Executar correções de banco
            await this.fixDatabaseErrors();
            
            // 5. Ativar monitoramento
            await this.activateMonitoring();
            
            // 6. Relatório final
            await this.generateActivationReport();
            
        } catch (error) {
            console.error('❌ Erro na ativação:', error);
        }
    }

    async setupNgrok() {
        console.log('\n🔧 CONFIGURANDO NGROK');
        console.log('-'.repeat(40));
        
        try {
            // Configurar authtoken se necessário
            console.log('🔑 Configurando autenticação...');
            
            // Para teste, vamos pular o authtoken por enquanto
            console.log('⚠️  Usando Ngrok sem authtoken (limitado)');
            
        } catch (error) {
            console.log('⚠️  Erro na configuração:', error.message);
        }
    }

    async startEUTunnel() {
        console.log('\n🌍 INICIANDO TUNNEL REGIÃO EU');
        console.log('-'.repeat(40));
        
        try {
            // Parar processos existentes
            console.log('🛑 Parando tunnels existentes...');
            try {
                await this.execAsync('taskkill /f /im ngrok.exe 2>nul');
            } catch (error) {
                // Processo pode não existir
            }
            
            // Aguardar um pouco
            await this.sleep(2000);
            
            // Iniciar tunnel para região EU
            console.log('🚀 Iniciando tunnel EU...');
            
            return new Promise((resolve, reject) => {
                // Usar spawn para manter processo ativo
                this.ngrokProcess = spawn('ngrok', ['http', '3000', '--region=eu'], {
                    stdio: ['ignore', 'pipe', 'pipe']
                });
                
                let outputBuffer = '';
                
                this.ngrokProcess.stdout.on('data', (data) => {
                    const output = data.toString();
                    outputBuffer += output;
                    
                    // Log importante
                    if (output.includes('started tunnel') || output.includes('url=')) {
                        console.log('✅ Tunnel iniciado com sucesso');
                    }
                });
                
                this.ngrokProcess.stderr.on('data', (data) => {
                    console.log(`⚠️  Ngrok: ${data.toString().trim()}`);
                });
                
                // Aguardar inicialização
                setTimeout(async () => {
                    try {
                        // Verificar tunnels ativos
                        const response = await axios.get('http://localhost:4040/api/tunnels');
                        const tunnels = response.data.tunnels;
                        
                        if (tunnels && tunnels.length > 0) {
                            this.publicUrl = tunnels[0].public_url;
                            console.log(`🔗 URL pública: ${this.publicUrl}`);
                            
                            // Verificar região
                            if (this.publicUrl.includes('.eu.')) {
                                console.log('✅ Tunnel na região EU confirmado');
                                resolve(this.publicUrl);
                            } else {
                                console.log('⚠️  Tunnel não está na região EU');
                                resolve(this.publicUrl);
                            }
                        } else {
                            console.log('❌ Nenhum tunnel ativo');
                            reject(new Error('Nenhum tunnel ativo'));
                        }
                    } catch (error) {
                        console.log('❌ Erro ao verificar tunnels:', error.message);
                        reject(error);
                    }
                }, 10000);
            });
            
        } catch (error) {
            console.error('❌ Erro ao iniciar tunnel:', error.message);
            throw error;
        }
    }

    async verifyConnectivity() {
        console.log('\n🔍 VERIFICANDO CONECTIVIDADE');
        console.log('-'.repeat(40));
        
        try {
            // Verificar IP atual
            const ipResponse = await axios.get('https://api.ipify.org?format=json');
            const currentIP = ipResponse.data.ip;
            console.log(`🌐 IP atual: ${currentIP}`);
            
            // Verificar geolocalização
            const geoResponse = await axios.get(`http://ip-api.com/json/${currentIP}`);
            const { country, regionName, city } = geoResponse.data;
            console.log(`📍 Localização: ${city}, ${regionName}, ${country}`);
            
            // Testar exchanges
            const exchanges = [
                { name: 'Bybit', url: 'https://api.bybit.com/v5/market/time' },
                { name: 'Binance', url: 'https://api.binance.com/api/v3/time' }
            ];
            
            console.log('\n🔗 Testando exchanges:');
            for (const exchange of exchanges) {
                try {
                    const startTime = Date.now();
                    await axios.get(exchange.url, { timeout: 5000 });
                    const responseTime = Date.now() - startTime;
                    console.log(`   ✅ ${exchange.name}: ${responseTime}ms`);
                } catch (error) {
                    const status = error.response?.status || 'timeout';
                    console.log(`   ❌ ${exchange.name}: ${status}`);
                    
                    if (status === 403) {
                        console.log(`      🔑 IP ${currentIP} pode estar bloqueado`);
                    }
                }
            }
            
        } catch (error) {
            console.error('❌ Erro na verificação:', error.message);
        }
    }

    async fixDatabaseErrors() {
        console.log('\n🔧 EXECUTANDO CORREÇÕES DE BANCO');
        console.log('-'.repeat(40));
        
        try {
            console.log('🔄 Executando auto-error-fixer...');
            
            // Executar o corretor de erros
            const { stdout, stderr } = await this.execAsync('node auto-error-fixer.js', {
                cwd: process.cwd()
            });
            
            if (stdout) {
                console.log('✅ Correções aplicadas:');
                console.log(stdout.substring(0, 500) + '...');
            }
            
            if (stderr) {
                console.log('⚠️  Avisos:', stderr.substring(0, 200));
            }
            
        } catch (error) {
            console.log('⚠️  Erro nas correções:', error.message.substring(0, 100));
        }
    }

    async activateMonitoring() {
        console.log('\n📊 ATIVANDO MONITORAMENTO');
        console.log('-'.repeat(40));
        
        try {
            // Verificar se o servidor está rodando
            console.log('🔄 Verificando servidor local...');
            
            try {
                await axios.get('http://localhost:3000/api/health', { timeout: 5000 });
                console.log('✅ Servidor local está rodando');
            } catch (error) {
                console.log('⚠️  Servidor local não está rodando');
                console.log('💡 Para iniciar: npm start ou node app.js');
            }
            
            // Verificar Railway
            console.log('🔄 Verificando Railway...');
            
            try {
                const railwayUrl = 'https://coinbitclub-market-bot-backend-production.up.railway.app';
                await axios.get(`${railwayUrl}/api/health`, { timeout: 10000 });
                console.log('✅ Railway está respondendo');
            } catch (error) {
                const status = error.response?.status || 'timeout';
                if (status === 404) {
                    console.log('⚠️  Railway: endpoint /api/health não encontrado');
                } else {
                    console.log(`⚠️  Railway: ${status}`);
                }
            }
            
        } catch (error) {
            console.error('❌ Erro no monitoramento:', error.message);
        }
    }

    async generateActivationReport() {
        console.log('\n📊 RELATÓRIO DE ATIVAÇÃO');
        console.log('='.repeat(60));
        
        console.log('🔥 STATUS DO SISTEMA:');
        console.log(`   🌍 Ngrok URL: ${this.publicUrl || 'Não disponível'}`);
        console.log(`   ⚡ Tunnel ativo: ${this.ngrokProcess ? 'Sim' : 'Não'}`);
        console.log(`   📡 Região: EU (configurada)`);
        
        console.log('\n🚀 PRÓXIMAS AÇÕES:');
        console.log('   1. ✅ Verificar se app.js está rodando localmente');
        console.log('   2. 📡 Configurar webhooks TradingView para usar Ngrok URL');
        console.log('   3. 🔑 Adicionar IPs nas whitelists das exchanges');
        console.log('   4. 📊 Monitorar logs em tempo real');
        console.log('   5. 🎯 Testar recepção de sinais');
        
        console.log('\n💡 COMANDOS ÚTEIS:');
        console.log('   • Iniciar servidor: node app.js');
        console.log('   • Verificar tunnels: curl http://localhost:4040/api/tunnels');
        console.log('   • Testar webhook: curl [NGROK_URL]/webhook/test');
        console.log('   • Ver logs: tail -f logs/app.log');
        
        if (this.publicUrl) {
            console.log(`\n🔗 URL PARA WEBHOOKS TRADINGVIEW:`);
            console.log(`   ${this.publicUrl}/webhook/tradingview`);
            console.log(`   ${this.publicUrl}/api/webhook/signal`);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Cleanup ao sair
    async cleanup() {
        if (this.ngrokProcess) {
            console.log('🛑 Finalizando tunnel Ngrok...');
            this.ngrokProcess.kill();
        }
    }
}

// Executar ativação
if (require.main === module) {
    const activator = new SystemActivator();
    
    // Cleanup ao sair
    process.on('SIGINT', async () => {
        await activator.cleanup();
        process.exit(0);
    });
    
    activator.activateCompleteSystem();
}

module.exports = SystemActivator;
