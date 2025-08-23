const { BinanceTop100Collector } = require('./binance-top100-collector');

async function startContinuousCollection() {
    console.log('🔄 INICIANDO COLETA CONTÍNUA DAS TOP 100 CRIPTOMOEDAS');
    console.log('⏰ Intervalo: A cada 30 minutos');
    console.log('📊 Fonte: API Binance');
    console.log('🎯 Objetivo: Métricas para referência da IA');
    console.log('=' .repeat(60));

    const collector = new BinanceTop100Collector();
    
    try {
        // Iniciar coleta contínua
        await collector.start();
        
        console.log('✅ Collector iniciado com sucesso!');
        console.log('📈 Próxima coleta em 30 minutos');
        console.log('🔍 Use Ctrl+C para parar');
        
        // Manter processo ativo e mostrar status periodicamente
        setInterval(async () => {
            const status = await collector.getStatus();
            if (status) {
                const now = new Date().toLocaleTimeString();
                console.log(`[${now}] 📊 Status: ${status.total_records} cryptos | Última coleta: ${status.last_collection ? new Date(status.last_collection).toLocaleTimeString() : 'N/A'}`);
            }
        }, 10 * 60 * 1000); // Status a cada 10 minutos
        
        // Tratar interrupção
        process.on('SIGINT', async () => {
            console.log('\n🛑 Parando collector...');
            await collector.stop();
            process.exit(0);
        });
        
    } catch (error) {
        console.error('❌ Erro ao iniciar collector:', error.message);
        process.exit(1);
    }
}

// Executar
startContinuousCollection();
