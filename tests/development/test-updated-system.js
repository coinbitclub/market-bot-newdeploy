#!/usr/bin/env node

/**
 * 🧪 TESTE DO SISTEMA ATUALIZADO
 * ==============================
 * 
 * Testa se o sistema está identificando todas as chaves
 */

const MultiUserSignalProcessor = require('./multi-user-signal-processor');

async function testUpdatedSystem() {
    console.log('🧪 TESTANDO SISTEMA ATUALIZADO...\n');
    
    try {
        const processor = new MultiUserSignalProcessor();
        
        // Teste com um sinal fictício
        const testSignal = {
            action: 'BUY',
            symbol: 'BTCUSDT',
            price: 50000,
            amount: 0.001,
            timestamp: new Date()
        };
        
        console.log('📡 Processando sinal de teste...');
        const result = await processor.processSignal(testSignal);
        
        console.log('\n✅ Resultado do teste:');
        console.log(JSON.stringify(result, null, 2));
        
    } catch (error) {
        console.error('❌ Erro no teste:', error);
    }
}

testUpdatedSystem();
