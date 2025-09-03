
// WRAPPER DE EXECUÇÃO FORÇADA - BYPASS DE TODAS AS VERIFICAÇÕES
const originalProcess = require('./enhanced-signal-processor-with-execution.js');

class ForcedExecutionWrapper {
    constructor() {
        // FORÇAR ENABLE_REAL_TRADING = true
        process.env.ENABLE_REAL_TRADING = 'true';
        
        console.log('🚨 EXECUÇÃO FORÇADA ATIVADA - BYPASS DE VERIFICAÇÕES');
        console.log('⚠️ TODAS AS ORDENS SERÃO EXECUTADAS NAS EXCHANGES');
        
        this.processor = new originalProcess.EnhancedSignalProcessorWithExecution();
    }
    
    async forceProcessAllPendingSignals() {
        // Buscar todos os sinais não processados
        const signals = await this.processor.pool.query(`
            SELECT * FROM trading_signals 
            WHERE processed = false 
            OR created_at > NOW() - INTERVAL '2 hours'
            ORDER BY created_at DESC
        `);
        
        console.log(`🔄 Processando ${signals.rows.length} sinais em modo FORÇADO`);
        
        for (const signal of signals.rows) {
            console.log(`🚀 FORÇANDO execução: ${signal.symbol} ${signal.action}`);
            
            // BYPASS: Definir trading como ativo forçadamente
            const originalValue = process.env.ENABLE_REAL_TRADING;
            process.env.ENABLE_REAL_TRADING = 'true';
            
            try {
                await this.processor.processSignal(signal);
                console.log(`   ✅ Sinal ${signal.id} processado com EXECUÇÃO REAL`);
            } catch (error) {
                console.error(`   ❌ Erro no sinal ${signal.id}: ${error.message}`);
            }
            
            // Restaurar valor original (mas manter como true)
            process.env.ENABLE_REAL_TRADING = 'true';
        }
    }
}

if (require.main === module) {
    const wrapper = new ForcedExecutionWrapper();
    wrapper.forceProcessAllPendingSignals().catch(console.error);
}

module.exports = { ForcedExecutionWrapper };
