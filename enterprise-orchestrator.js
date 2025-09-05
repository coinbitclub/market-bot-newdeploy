/**
 * 🎯 ENTERPRISE ORCHESTRATOR - ENTRY POINT PRINCIPAL
 * ================================================================
 * 
 * Arquivo de entrada oficial que carrega o sistema unificado
 * Conforme especificação técnica CoinBitClub Enterprise v6.0.0
 * 
 * @author CoinBitClub Enterprise Team
 * @version 6.0.0
 * @date 04/09/2025
 */

console.log('🚀 ENTERPRISE ORCHESTRATOR - INICIANDO...');
console.log('==========================================');

const EnterpriseSystem = require('./src/enterprise-unified-system');

class EnterpriseOrchestrator {
    constructor() {
        this.system = new EnterpriseSystem();
        this.isRunning = false;
        
        console.log('✅ Enterprise Orchestrator inicializado');
        console.log('📋 Sistema: CoinBitClub Enterprise v6.0.0');
        console.log('🎯 Modo: Orquestração Completa');
    }

    async start() {
        try {
            console.log('\n🔄 Iniciando sistema enterprise...');
            
            this.isRunning = true;
            await this.system.start();
            
            console.log('\n🎉 SISTEMA ENTERPRISE TOTALMENTE OPERACIONAL!');
            console.log('===============================================');
            console.log('🌐 Sistema Principal: ATIVO');
            console.log('📊 APIs Enterprise: FUNCIONAIS');
            console.log('🔄 Trading Real: HABILITADO');
            console.log('📈 Análise IA: OPERACIONAL');
            console.log('💰 Sistema Financeiro: ATIVO');
            console.log('🤝 Sistema Afiliados: FUNCIONANDO');
            console.log('===============================================');
            console.log('📍 Webhook TradingView: /api/enterprise/trading/webhooks/signal');
            console.log('🛑 Para parar: Ctrl+C\n');
            
        } catch (error) {
            console.error('❌ Erro na inicialização do orchestrator:', error.message);
            process.exit(1);
        }
    }

    async stop() {
        console.log('\n🛑 Parando Enterprise Orchestrator...');
        this.isRunning = false;
        
        if (this.system) {
            await this.system.stop();
        }
        
        console.log('✅ Enterprise Orchestrator parado com sucesso');
    }
}

// 🚀 INICIALIZAÇÃO AUTOMÁTICA
if (require.main === module) {
    const orchestrator = new EnterpriseOrchestrator();
    
    // Tratamento de sinais para parada limpa
    process.on('SIGINT', async () => {
        await orchestrator.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        await orchestrator.stop();
        process.exit(0);
    });
    
    // Iniciar sistema
    orchestrator.start().catch((error) => {
        console.error('❌ Falha crítica no Enterprise Orchestrator:', error);
        process.exit(1);
    });
}

module.exports = EnterpriseOrchestrator;
