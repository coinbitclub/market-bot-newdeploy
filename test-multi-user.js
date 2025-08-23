#!/usr/bin/env node

require('dotenv').config({ path: '.env.production' });
const MultiUserSignalProcessor = require('./multi-user-signal-processor');

async function testMultiUserSignal() {
    console.log('🧪 TESTE SISTEMA MULTI-USUÁRIO');
    
    const processor = new MultiUserSignalProcessor();
    
    const testSignal = {
        symbol: 'BTCUSDT',
        action: 'BUY',
        quantity: 0.003,
        price: 45000,
        leverage: 2,
        source: 'TradingView-MultiUser',
        timestamp: new Date().toISOString()
    };
    
    console.log('📡 Enviando sinal para TODOS os usuários:', testSignal);
    
    try {
        const result = await processor.processSignal(testSignal);
        
        console.log('\n✅ RESULTADO MULTI-USUÁRIO:');
        console.log(JSON.stringify(result, null, 2));
        
        console.log('\n📊 RESUMO POR USUÁRIO:');
        result.userExecutions.forEach(userExec => {
            console.log(`\n👤 ${userExec.username} (ID: ${userExec.userId})`);
            console.log(`   Status: ${userExec.status}`);
            if (userExec.executions) {
                userExec.executions.forEach(exec => {
                    console.log(`   📡 ${exec.exchange}: ${exec.status}`);
                    if (exec.orderId) console.log(`      Ordem: ${exec.orderId}`);
                    if (exec.error) console.log(`      Erro: ${exec.error}`);
                });
            }
        });
        
        // Estatísticas
        const stats = await processor.getProcessingStats();
        console.log('\n📈 ESTATÍSTICAS:');
        console.log(`   • Total sinais: ${stats.total_signals || 0}`);
        console.log(`   • Sinais multi-usuário: ${stats.multi_user_signals || 0}`);
        console.log(`   • Execuções 24h: ${stats.executions_24h || 0}`);
        console.log(`   • Usuários ativos 24h: ${stats.active_users_24h || 0}`);
        
        console.log('\n🎯 TESTE MULTI-USUÁRIO CONCLUÍDO!');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
    
    process.exit(0);
}

testMultiUserSignal();
