#!/usr/bin/env node

require('dotenv').config({ path: '.env.production' });
const Processor = require('./enhanced-signal-processor-with-execution.js');

async function testRealTrading() {
    console.log('🧪 TESTE TRADING REAL COM CHAVES TESTNET');
    
    const processor = new Processor();
    
    const signal = {
        symbol: 'BTCUSDT',
        action: 'BUY',
        quantity: 0.003,
        price: 45000,
        leverage: 2,
        stopLoss: 44000,
        takeProfit: 46000
    };
    
    console.log('📡 Processando sinal:', signal);
    
    try {
        const result = await processor.processSignal(signal);
        console.log('✅ RESULTADO:', JSON.stringify(result, null, 2));
        
        if (result.executionResult) {
            console.log('\n🚀 TENTATIVAS DE EXECUÇÃO:');
            result.executionResult.forEach(exec => {
                console.log(`  ${exec.exchange}: ${exec.status}`);
                if (exec.orderId) console.log(`    Ordem: ${exec.orderId}`);
                if (exec.error) console.log(`    Erro: ${exec.error}`);
            });
        }
        
        console.log('\n🎯 TESTE CONCLUÍDO COM SUCESSO!');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
    
    process.exit(0);
}

testRealTrading();
