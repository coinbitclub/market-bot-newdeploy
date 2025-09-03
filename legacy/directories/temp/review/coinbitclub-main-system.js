const { BinanceTop100Collector } = require('./binance-top100-collector');
const { DataCleanupService } = require('./data-cleanup-service');
const { FearGreedCollector } = require('./fear-greed-collector');

// Sistema principal de operação contínua
class CoinbitClubMainSystem {
    constructor() {
        this.binanceCollector = new BinanceTop100Collector();
        this.cleanupService = new DataCleanupService();
        this.fearGreedCollector = new FearGreedCollector();
        this.isRunning = false;
    }

    async startSystem() {
        if (this.isRunning) {
            console.log('⚠️ Sistema já está em execução');
            return;
        }

        console.log('🚀 INICIANDO SISTEMA COMPLETO COINBITCLUB');
        console.log('==========================================');
        
        try {
            this.isRunning = true;
            
            // 1. Iniciar collector Binance (a cada 30 min)
            console.log('📊 Iniciando Binance TOP 100 Collector...');
            await this.binanceCollector.start();
            
            // 2. Iniciar serviço de limpeza (a cada 24h)
            console.log('🧹 Iniciando serviço de limpeza automática...');
            this.cleanupService.startScheduledCleanup();
            
            // 3. Iniciar Fear & Greed collector (a cada 30 min)
            console.log('😨 Iniciando Fear & Greed Collector...');
            await this.fearGreedCollector.start();
            
            console.log('✅ Sistema totalmente operacional!');
            console.log('📍 Componentes ativos:');
            console.log('   - Binance Collector: 30 min');
            console.log('   - Fear & Greed: 30 min');
            console.log('   - Data Cleanup: 24h');
            console.log('   - BTC Dominance: integrado');
            console.log('   - Market Metrics: tempo real');
            
        } catch (error) {
            console.error('❌ Erro ao iniciar sistema:', error.message);
            this.isRunning = false;
        }
    }

    async stopSystem() {
        if (!this.isRunning) {
            console.log('⚠️ Sistema não está em execução');
            return;
        }

        console.log('🛑 Parando sistema...');
        
        try {
            await this.binanceCollector.stop();
            await this.fearGreedCollector.stop();
            this.cleanupService.stopScheduledCleanup();
            
            this.isRunning = false;
            console.log('✅ Sistema parado com sucesso');
            
        } catch (error) {
            console.error('❌ Erro ao parar sistema:', error.message);
        }
    }

    async getSystemStatus() {
        try {
            const binanceStatus = await this.binanceCollector.getStatus();
            const fearGreedStatus = await this.fearGreedCollector.getStatus();
            
            return {
                system_running: this.isRunning,
                binance_collector: binanceStatus,
                fear_greed_collector: fearGreedStatus,
                cleanup_service: {
                    running: this.cleanupService.intervalId !== null,
                    interval_hours: this.cleanupService.cleanupIntervalHours
                },
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Erro ao obter status:', error.message);
            return null;
        }
    }
}

// Função principal
async function main() {
    console.log('🎯 COINBITCLUB TRADING BOT - SISTEMA PRINCIPAL');
    console.log('===============================================');
    
    const mainSystem = new CoinbitClubMainSystem();
    
    try {
        // Iniciar sistema completo
        await mainSystem.startSystem();
        
        // Status a cada 2 horas
        setInterval(async () => {
            const status = await mainSystem.getSystemStatus();
            if (status) {
                console.log('\\n📊 STATUS DO SISTEMA:');
                console.log('   Sistema:', status.system_running ? '✅ ATIVO' : '❌ INATIVO');
                console.log('   Binance:', status.binance_collector ? '✅ OPERACIONAL' : '❌ PARADO');
                console.log('   Fear&Greed:', status.fear_greed_collector?.running ? '✅ OPERACIONAL' : '❌ PARADO');
                console.log('   Limpeza:', status.cleanup_service.running ? '✅ AGENDADA' : '❌ PARADA');
                if (status.fear_greed_collector?.current_value) {
                    console.log(`   F&G Atual: ${status.fear_greed_collector.current_value} (${status.fear_greed_collector.current_classification})`);
                }
                console.log('   Última verificação:', new Date().toLocaleString('pt-BR'));
            }
        }, 2 * 60 * 60 * 1000); // A cada 2 horas
        
        // Handlers para parada graceful
        process.on('SIGINT', async () => {
            console.log('\\n🛑 Recebido sinal de parada...');
            await mainSystem.stopSystem();
            process.exit(0);
        });
        
        process.on('SIGTERM', async () => {
            console.log('\\n🛑 Recebido sinal de término...');
            await mainSystem.stopSystem();
            process.exit(0);
        });
        
        // Manter processo ativo
        console.log('\\n📍 Sistema ativo. Pressione Ctrl+C para parar.');
        
    } catch (error) {
        console.error('❌ Erro fatal no sistema principal:', error.message);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    main();
}

module.exports = { CoinbitClubMainSystem };
