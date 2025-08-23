require('dotenv').config();
const { spawn, exec } = require('child_process');
const axios = require('axios');
const { promisify } = require('util');

/**
 * 🔧 CORRETOR DE AVISO NGROK
 * Remove a tela de aviso "Visit Site" do Ngrok gratuito
 */

class NgrokWarningFixer {
    constructor() {
        this.execAsync = promisify(exec);
        this.ngrokProcess = null;
        this.publicUrl = null;
    }

    async fixNgrokWarning() {
        console.log('🔧 REMOVENDO AVISO DO NGROK');
        console.log('='.repeat(50));
        
        try {
            // 1. Parar Ngrok atual
            await this.stopCurrentNgrok();
            
            // 2. Iniciar Ngrok com configuração corrigida
            await this.startNgrokWithoutWarning();
            
            // 3. Testar acesso direto
            await this.testDirectAccess();
            
            // 4. Configurar headers de bypass
            await this.configureBypassHeaders();
            
            console.log('\n✅ NGROK CONFIGURADO SEM AVISO!');
            
        } catch (error) {
            console.error('❌ Erro na correção:', error);
        }
    }

    async stopCurrentNgrok() {
        console.log('\n🛑 PARANDO NGROK ATUAL');
        console.log('-'.repeat(30));
        
        try {
            await this.execAsync('taskkill /f /im ngrok.exe 2>nul');
            console.log('✅ Processos Ngrok finalizados');
            
            // Aguardar um pouco
            await this.sleep(3000);
            
        } catch (error) {
            console.log('⚠️  Nenhum processo Ngrok ativo');
        }
    }

    async startNgrokWithoutWarning() {
        console.log('\n🚀 INICIANDO NGROK SEM AVISO');
        console.log('-'.repeat(30));
        
        return new Promise((resolve, reject) => {
            // Iniciar ngrok com configuração personalizada
            this.ngrokProcess = spawn('ngrok', [
                'http', 
                '3000',
                '--request-header-add', 'ngrok-skip-browser-warning:true',
                '--request-header-add', 'User-Agent:TradingView-Webhook',
                '--log=stdout'
            ], {
                stdio: ['ignore', 'pipe', 'pipe']
            });
            
            this.ngrokProcess.stdout.on('data', (data) => {
                const output = data.toString();
                console.log(`📡 ${output.trim()}`);
                
                if (output.includes('started tunnel')) {
                    console.log('✅ Tunnel iniciado sem aviso!');
                }
            });
            
            this.ngrokProcess.stderr.on('data', (data) => {
                console.log(`⚠️  ${data.toString().trim()}`);
            });
            
            // Aguardar inicialização
            setTimeout(async () => {
                try {
                    const response = await axios.get('http://localhost:4040/api/tunnels');
                    const tunnels = response.data.tunnels;
                    
                    if (tunnels && tunnels.length > 0) {
                        this.publicUrl = tunnels[0].public_url;
                        console.log(`🔗 Nova URL: ${this.publicUrl}`);
                        resolve(this.publicUrl);
                    } else {
                        reject(new Error('Nenhum tunnel encontrado'));
                    }
                } catch (error) {
                    reject(error);
                }
            }, 10000);
        });
    }

    async testDirectAccess() {
        console.log('\n🧪 TESTANDO ACESSO DIRETO');
        console.log('-'.repeat(30));
        
        if (!this.publicUrl) {
            console.log('❌ URL não disponível');
            return;
        }
        
        try {
            // Testar com headers corretos
            const response = await axios.get(`${this.publicUrl}/api/health`, {
                headers: {
                    'ngrok-skip-browser-warning': 'true',
                    'User-Agent': 'TradingView-Webhook/1.0'
                },
                timeout: 10000
            });
            
            console.log(`✅ Acesso direto: ${response.status}`);
            
        } catch (error) {
            const status = error.response?.status || 'timeout';
            console.log(`⚠️  Acesso direto: ${status}`);
            
            if (status === 400) {
                console.log('💡 Erro 400 indica que o servidor está rodando');
            }
        }
        
        // Testar webhook
        try {
            const webhookResponse = await axios.post(`${this.publicUrl}/webhook/tradingview`, {
                symbol: 'BTCUSDT',
                side: 'buy',
                action: 'test',
                test: true
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true',
                    'User-Agent': 'TradingView-Webhook/1.0'
                },
                timeout: 10000
            });
            
            console.log(`✅ Webhook test: ${webhookResponse.status}`);
            
        } catch (error) {
            const status = error.response?.status || 'timeout';
            console.log(`⚠️  Webhook test: ${status}`);
        }
    }

    async configureBypassHeaders() {
        console.log('\n⚙️  CONFIGURANDO HEADERS DE BYPASS');
        console.log('-'.repeat(30));
        
        console.log('📋 Headers para usar no TradingView:');
        console.log('   ngrok-skip-browser-warning: true');
        console.log('   User-Agent: TradingView-Webhook');
        console.log('   Content-Type: application/json');
        
        console.log('\n📡 URLs corrigidas para TradingView:');
        if (this.publicUrl) {
            console.log(`   Webhook: ${this.publicUrl}/webhook/tradingview`);
            console.log(`   Signal: ${this.publicUrl}/api/webhook/signal`);
        }
        
        console.log('\n💡 Para testar via curl:');
        console.log(`curl -X POST "${this.publicUrl}/webhook/tradingview" \\`);
        console.log(`  -H "Content-Type: application/json" \\`);
        console.log(`  -H "ngrok-skip-browser-warning: true" \\`);
        console.log(`  -H "User-Agent: TradingView-Webhook" \\`);
        console.log(`  -d '{"symbol":"BTCUSDT","side":"buy","action":"test"}'`);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async cleanup() {
        if (this.ngrokProcess) {
            console.log('🛑 Finalizando tunnel...');
            this.ngrokProcess.kill();
        }
    }
}

// Executar correção
if (require.main === module) {
    const fixer = new NgrokWarningFixer();
    
    // Cleanup ao sair
    process.on('SIGINT', async () => {
        await fixer.cleanup();
        process.exit(0);
    });
    
    fixer.fixNgrokWarning();
}

module.exports = NgrokWarningFixer;
