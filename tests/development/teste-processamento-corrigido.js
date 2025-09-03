const MultiUserSignalProcessor = require('./multi-user-signal-processor');

async function testarProcessamentoCorrigido() {
    console.log('🧪 TESTE DO PROCESSAMENTO CORRIGIDO DE SINAIS');
    console.log('=============================================');
    
    try {
        const processor = new MultiUserSignalProcessor();
        
        // Simular um sinal de teste
        const signalTest = {
            signal: 'COMPRA LONGA BTCUSDT FORTE',
            ticker: 'BTCUSDT',
            symbol: 'BTCUSDT',
            source: 'TESTE_CORRECAO',
            timestamp: new Date().toISOString(),
            action: 'BUY',
            side: 'LONG'
        };
        
        console.log('📡 Processando sinal de teste...');
        console.log('Sinal:', signalTest);
        
        const resultado = await processor.processSignal(signalTest);
        
        console.log('\n✅ RESULTADO DO PROCESSAMENTO:');
        console.log('================================');
        console.log('Success:', resultado.success);
        if (resultado.success) {
            console.log('✅ Processamento realizado com sucesso!');
            console.log('🤖 Decisão IA:', resultado.aiDecision);
            console.log('📊 Direção mercado:', resultado.marketDirection);
            console.log('📈 Métricas sinal:', resultado.signalMetrics);
        } else {
            console.log('❌ Processamento falhou:', resultado.reason);
        }
        
        // Verificar se os dados foram salvos corretamente
        console.log('\n🔍 VERIFICANDO DADOS SALVOS:');
        console.log('=============================');
        
        const { Pool } = require('pg');
        const pool = new Pool({
            connectionString: 'process.env.DATABASE_URL',
            ssl: false
        });
        
        const ultimoRegistro = await pool.query(`
            SELECT 
                id, symbol, ticker, confidence, top100_trend, btc_dominance,
                execution_time_ms, users_affected, orders_created, ai_approved, ai_reason
            FROM signal_metrics_log 
            ORDER BY created_at DESC 
            LIMIT 1
        `);
        
        if (ultimoRegistro.rows.length > 0) {
            const registro = ultimoRegistro.rows[0];
            console.log('📊 Último registro salvo:');
            console.log(`   ID: ${registro.id}`);
            console.log(`   Symbol: ${registro.symbol || 'NULL'} ${registro.symbol ? '✅' : '❌'}`);
            console.log(`   Ticker: ${registro.ticker || 'NULL'} ${registro.ticker ? '✅' : '❌'}`);
            console.log(`   Confidence: ${registro.confidence || 'NULL'} ${registro.confidence ? '✅' : '❌'}`);
            console.log(`   Top100 Trend: ${registro.top100_trend || 'NULL'} ${registro.top100_trend ? '✅' : '❌'}`);
            console.log(`   BTC Dominance: ${registro.btc_dominance || 'NULL'} ${registro.btc_dominance ? '✅' : '❌'}`);
            console.log(`   Execution Time: ${registro.execution_time_ms || 'NULL'} ${registro.execution_time_ms ? '✅' : '❌'}`);
            console.log(`   Users Affected: ${registro.users_affected || 'NULL'} ${registro.users_affected !== null ? '✅' : '❌'}`);
            console.log(`   Orders Created: ${registro.orders_created || 'NULL'} ${registro.orders_created !== null ? '✅' : '❌'}`);
            console.log(`   AI Approved: ${registro.ai_approved} ✅`);
            console.log(`   AI Reason: ${registro.ai_reason || 'NULL'} ${registro.ai_reason ? '✅' : '❌'}`);
            
            // Contar NULLs
            const nullCount = [
                registro.symbol,
                registro.confidence,
                registro.top100_trend,
                registro.btc_dominance,
                registro.execution_time_ms
            ].filter(field => field === null || field === undefined).length;
            
            console.log(`\n📈 RESULTADO DA CORREÇÃO:`);
            console.log(`   NULLs encontrados: ${nullCount}/5 campos`);
            if (nullCount === 0) {
                console.log('   🎉 PERFEITO! Nenhum campo NULL crítico');
            } else if (nullCount <= 2) {
                console.log('   ⚠️  Alguns campos ainda NULL - necessário ajuste');
            } else {
                console.log('   ❌ Muitos campos NULL - correção não funcionou');
            }
        }
        
        await pool.end();
        
    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
        console.error('Stack:', error.stack);
    }
    
    console.log('\n✅ Teste concluído');
}

// Executar teste
testarProcessamentoCorrigido().catch(console.error);
