// SECURITY_VALIDATED: 2025-08-08T23:29:34.793Z
// Este arquivo foi verificado e tem credenciais protegidas

const { Pool } = require('pg');

// Configuração da conexão
const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: false
});

async function diagnosticoCompleto() {
    console.log('🔍 DIAGNÓSTICO COMPLETO DO PROCESSAMENTO DE SINAIS');
    console.log('==================================================');
    
    try {
        // 1. Verificar estrutura das tabelas principais
        console.log('\n📊 1. ESTRUTURA DAS TABELAS:');
        console.log('-----------------------------');
        
        const tabelas = ['trading_signals', 'signal_metrics_log', 'trading_orders', 'users'];
        
        for (const tabela of tabelas) {
            try {
                const estrutura = await pool.query(`
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns 
                    WHERE table_name = $1 
                    ORDER BY ordinal_position
                `, [tabela]);
                
                console.log(`\n🔹 ${tabela.toUpperCase()}:`);
                if (estrutura.rows.length > 0) {
                    estrutura.rows.forEach(col => {
                        console.log(`   ${col.column_name} (${col.data_type}) - NULL: ${col.is_nullable}`);
                    });
                } else {
                    console.log(`   ❌ Tabela não encontrada`);
                }
            } catch (error) {
                console.log(`   ❌ Erro ao verificar ${tabela}:`, error.message);
            }
        }
        
        // 2. Verificar dados NULL na signal_metrics_log
        console.log('\n\n🔎 2. ANÁLISE DE DADOS NULL - SIGNAL_METRICS_LOG:');
        console.log('--------------------------------------------------');
        
        const nullAnalysis = await pool.query(`
            SELECT 
                COUNT(*) as total_registros,
                COUNT(symbol) as symbol_preenchido,
                COUNT(*) - COUNT(symbol) as symbol_null,
                COUNT(confidence) as confidence_preenchido,
                COUNT(*) - COUNT(confidence) as confidence_null,
                COUNT(top100_trend) as top100_trend_preenchido,
                COUNT(*) - COUNT(top100_trend) as top100_trend_null,
                COUNT(btc_dominance) as btc_dominance_preenchido,
                COUNT(*) - COUNT(btc_dominance) as btc_dominance_null,
                COUNT(execution_time_ms) as execution_time_preenchido,
                COUNT(*) - COUNT(execution_time_ms) as execution_time_null
            FROM signal_metrics_log
        `);
        
        if (nullAnalysis.rows.length > 0) {
            const stats = nullAnalysis.rows[0];
            console.log(`📈 Total de registros: ${stats.total_registros}`);
            console.log(`🔸 symbol: ${stats.symbol_preenchido} preenchidos, ${stats.symbol_null} NULL`);
            console.log(`🔸 confidence: ${stats.confidence_preenchido} preenchidos, ${stats.confidence_null} NULL`);
            console.log(`🔸 top100_trend: ${stats.top100_trend_preenchido} preenchidos, ${stats.top100_trend_null} NULL`);
            console.log(`🔸 btc_dominance: ${stats.btc_dominance_preenchido} preenchidos, ${stats.btc_dominance_null} NULL`);
            console.log(`🔸 execution_time_ms: ${stats.execution_time_preenchido} preenchidos, ${stats.execution_time_null} NULL`);
        }
        
        // 3. Verificar últimos registros detalhados
        console.log('\n\n📋 3. ÚLTIMOS REGISTROS DETALHADOS:');
        console.log('------------------------------------');
        
        const ultimosRegistros = await pool.query(`
            SELECT 
                id,
                symbol,
                ai_approved,
                ai_reason,
                confidence,
                market_direction,
                fear_greed_value,
                top100_trend,
                btc_dominance,
                status,
                execution_time_ms,
                users_affected,
                orders_created,
                created_at
            FROM signal_metrics_log 
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        
        ultimosRegistros.rows.forEach((reg, index) => {
            console.log(`\n🔹 Registro ${index + 1} (ID: ${reg.id}):`);
            console.log(`   Symbol: ${reg.symbol || 'NULL'}`);
            console.log(`   AI Approved: ${reg.ai_approved}`);
            console.log(`   AI Reason: ${reg.ai_reason || 'NULL'}`);
            console.log(`   Confidence: ${reg.confidence || 'NULL'}`);
            console.log(`   Market Direction: ${reg.market_direction || 'NULL'}`);
            console.log(`   Fear & Greed: ${reg.fear_greed_value || 'NULL'}`);
            console.log(`   Top100 Trend: ${reg.top100_trend || 'NULL'}`);
            console.log(`   BTC Dominance: ${reg.btc_dominance || 'NULL'}`);
            console.log(`   Status: ${reg.status || 'NULL'}`);
            console.log(`   Execution Time: ${reg.execution_time_ms || 'NULL'} ms`);
            console.log(`   Users Affected: ${reg.users_affected || 'NULL'}`);
            console.log(`   Orders Created: ${reg.orders_created || 'NULL'}`);
            console.log(`   Created At: ${reg.created_at}`);
        });
        
        // 4. Verificar se existem trading_signals
        console.log('\n\n🎯 4. VERIFICAÇÃO DE TRADING_SIGNALS:');
        console.log('--------------------------------------');
        
        try {
            const signalsCount = await pool.query('SELECT COUNT(*) as total FROM trading_signals');
            console.log(`📊 Total de trading_signals: ${signalsCount.rows[0].total}`);
            
            if (signalsCount.rows[0].total > 0) {
                const sampleSignals = await pool.query(`
                    SELECT * FROM trading_signals 
                    ORDER BY created_at DESC 
                    LIMIT 3
                `);
                
                console.log('\n🔹 Últimos sinais:');
                sampleSignals.rows.forEach((signal, index) => {
                    console.log(`   ${index + 1}. ID: ${signal.id}, Created: ${signal.created_at}`);
                    console.log(`      Columns:`, Object.keys(signal));
                });
            }
        } catch (error) {
            console.log(`❌ Erro ao verificar trading_signals: ${error.message}`);
        }
        
        // 5. Verificar se existem trading_orders
        console.log('\n\n💰 5. VERIFICAÇÃO DE TRADING_ORDERS:');
        console.log('-------------------------------------');
        
        try {
            const ordersCount = await pool.query('SELECT COUNT(*) as total FROM trading_orders');
            console.log(`📊 Total de trading_orders: ${ordersCount.rows[0].total}`);
            
            if (ordersCount.rows[0].total > 0) {
                const sampleOrders = await pool.query(`
                    SELECT * FROM trading_orders 
                    ORDER BY created_at DESC 
                    LIMIT 3
                `);
                
                console.log('\n🔹 Últimas ordens:');
                sampleOrders.rows.forEach((order, index) => {
                    console.log(`   ${index + 1}. ID: ${order.id}, Created: ${order.created_at}`);
                    console.log(`      Columns:`, Object.keys(order));
                });
            }
        } catch (error) {
            console.log(`❌ Erro ao verificar trading_orders: ${error.message}`);
        }
        
        // 6. Identificar problemas na cadeia de processamento
        console.log('\n\n⚠️  6. PROBLEMAS IDENTIFICADOS:');
        console.log('--------------------------------');
        
        const problemas = [];
        
        // Verificar campos NULL críticos
        if (nullAnalysis.rows[0]) {
            const stats = nullAnalysis.rows[0];
            if (stats.symbol_null > 0) {
                problemas.push(`❌ ${stats.symbol_null} registros sem SYMBOL - crítico para identificação`);
            }
            if (stats.confidence_null > 0) {
                problemas.push(`⚠️  ${stats.confidence_null} registros sem CONFIDENCE - reduz precisão`);
            }
            if (stats.top100_trend_null > 0) {
                problemas.push(`⚠️  ${stats.top100_trend_null} registros sem TOP100_TREND - dados de mercado incompletos`);
            }
            if (stats.btc_dominance_null > 0) {
                problemas.push(`⚠️  ${stats.btc_dominance_null} registros sem BTC_DOMINANCE - análise de mercado incompleta`);
            }
            if (stats.execution_time_null > 0) {
                problemas.push(`📊 ${stats.execution_time_null} registros sem EXECUTION_TIME - monitoramento de performance prejudicado`);
            }
        }
        
        if (problemas.length === 0) {
            console.log('✅ Nenhum problema crítico encontrado');
        } else {
            problemas.forEach(problema => console.log(problema));
        }
        
        console.log('\n\n🎯 7. RECOMENDAÇÕES:');
        console.log('--------------------');
        console.log('1. ✅ Implementar validação de campos obrigatórios antes de inserir');
        console.log('2. ✅ Adicionar valores padrão para campos opcionais');
        console.log('3. ✅ Implementar logs de debug no processamento de sinais');
        console.log('4. ✅ Criar função de preenchimento automático de dados de mercado');
        console.log('5. ✅ Implementar sistema de retry para falhas de coleta de dados');
        
    } catch (error) {
        console.error('❌ Erro no diagnóstico:', error);
    } finally {
        await pool.end();
        console.log('\n✅ Diagnóstico concluído');
    }
}

// Executar diagnóstico
diagnosticoCompleto().catch(console.error);
