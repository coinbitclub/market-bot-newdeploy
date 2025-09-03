
/**
 * 🎭 ENTERPRISE ORCHESTRATION SCRIPT
 * Inicia todos os sistemas em ordem correta
 */

const CoinBitClubEnterpriseSystem = require('./src/enterprise-unified-system');

class EnterpriseOrchestrator {
    constructor() {
        this.services = [];
        this.isRunning = false;
    }

    async start() {
        try {
            console.log('🎭 INICIANDO ORQUESTRAÇÃO ENTERPRISE...');
            console.log('=======================================');
            
            // 1. Iniciar sistema principal
            console.log('🚀 Iniciando sistema principal...');
            const enterpriseSystem = new CoinBitClubEnterpriseSystem();
            await enterpriseSystem.start();
            this.services.push(enterpriseSystem);
            
            // 2. Aguardar estabilização
            console.log('⏳ Aguardando estabilização (5s)...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // 3. Verificar saúde do sistema
            console.log('🔍 Verificando saúde do sistema...');
            await this.checkSystemHealth();
            
            this.isRunning = true;
            console.log('\n🎉 ORQUESTRAÇÃO ENTERPRISE CONCLUÍDA!');
            console.log('📊 Sistema disponível em: http://localhost:3333');
            console.log('📈 Dashboard: http://localhost:3333/dashboard');
            console.log('⚡ API: http://localhost:3333/api/enterprise');
            
            // 4. Setup de graceful shutdown
            this.setupGracefulShutdown();
            
        } catch (error) {
            console.error('❌ Erro na orquestração:', error.message);
            await this.stop();
            process.exit(1);
        }
    }

    async checkSystemHealth() {
        try {
            const http = require('http');
            const options = {
                hostname: 'localhost',
                port: 3333,
                path: '/health',
                method: 'GET'
            };

            return new Promise((resolve, reject) => {
                const req = http.request(options, (res) => {
                    if (res.statusCode === 200) {
                        console.log('✅ Sistema saudável');
                        resolve(true);
                    } else {
                        reject(new Error(`Sistema com problemas: ${res.statusCode}`));
                    }
                });

                req.on('error', reject);
                req.setTimeout(5000, () => reject(new Error('Timeout na verificação')));
                req.end();
            });
        } catch (error) {
            console.warn('⚠️ Não foi possível verificar saúde:', error.message);
        }
    }

    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            console.log(`\n📴 Recebido sinal ${signal}, parando serviços...`);
            await this.stop();
            process.exit(0);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }

    async stop() {
        console.log('🛑 Parando serviços enterprise...');
        
        for (const service of this.services) {
            try {
                await service.stop();
            } catch (error) {
                console.error('Erro ao parar serviço:', error.message);
            }
        }
        
        this.isRunning = false;
        console.log('✅ Todos os serviços parados');
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const orchestrator = new EnterpriseOrchestrator();
    orchestrator.start().catch(console.error);
}

module.exports = EnterpriseOrchestrator;
