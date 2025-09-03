#!/usr/bin/env node

/**
 * 🧪 TESTE FINAL DO SISTEMA
 * =========================
 * 
 * Testa o sistema completo após a migração
 */

const MultiUserSignalProcessor = require('./multi-user-signal-processor');

async function testCompleteSystem() {
    console.log('🧪 TESTANDO SISTEMA COMPLETO APÓS MIGRAÇÃO...\n');
    
    try {
        const processor = new MultiUserSignalProcessor();
        
        // Sinal de teste
        const testSignal = {
            action: 'BUY',
            symbol: 'BTCUSDT',
            price: 50000,
            amount: 0.001,
            timestamp: new Date(),
            source: 'TEST'
        };
        
        console.log('📡 Processando sinal de teste...');
        console.log('Signal data:', testSignal);
        
        const result = await processor.processSignal(testSignal);
        
        console.log('\n🎯 RESULTADO DO TESTE:');
        console.log('=======================');
        
        if (result && result.userExecutions) {
            console.log(`✅ Processados ${result.userExecutions.length} usuários:`);
            result.userExecutions.forEach(exec => {
                console.log(`   • ${exec.username} (ID: ${exec.userId}): ${exec.status || 'N/A'}`);
            });
        } else {
            console.log('⚠️  Resultado inesperado:', JSON.stringify(result, null, 2));
        }
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

testCompleteSystem();
