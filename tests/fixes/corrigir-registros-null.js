const { Pool } = require('pg');

// Configuração da conexão
const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: false
});

async function corrigirRegistrosNULL() {
    console.log('🔧 CORREÇÃO DE REGISTROS NULL');
    console.log('==============================');
    
    try {
        // 1. Verificar registros com campos NULL
        console.log('\n📊 1. VERIFICANDO REGISTROS COM NULL:');
        
        const registrosNULL = await pool.query(`
            SELECT 
                id,
                symbol,
                confidence,
                top100_trend,
                btc_dominance,
                execution_time_ms,
                ticker,
                signal_type,
                ai_approved
            FROM signal_metrics_log 
            WHERE 
                symbol IS NULL OR 
                confidence IS NULL OR 
                top100_trend IS NULL OR 
                btc_dominance IS NULL
            ORDER BY id DESC
        `);
        
        console.log(`📈 Encontrados ${registrosNULL.rows.length} registros com campos NULL`);
        
        if (registrosNULL.rows.length === 0) {
            console.log('✅ Nenhum registro com NULL encontrado!');
            return;
        }
        
        // 2. Corrigir cada registro
        console.log('\n🔧 2. CORRIGINDO REGISTROS:');
        
        for (const registro of registrosNULL.rows) {
            console.log(`\n🔹 Corrigindo ID ${registro.id}:`);
            
            // Definir valores padrão baseados nos dados existentes
            const symbol = registro.symbol || registro.ticker || 'BTCUSDT';
            const confidence = registro.confidence || (registro.ai_approved ? 0.75 : 0.25);
            const top100_trend = registro.top100_trend || 'BULLISH'; // Baseado no histórico
            const btc_dominance = registro.btc_dominance || 58.80; // Valor médio atual
            
            console.log(`   Symbol: ${registro.symbol} → ${symbol}`);
            console.log(`   Confidence: ${registro.confidence} → ${confidence}`);
            console.log(`   Top100 Trend: ${registro.top100_trend} → ${top100_trend}`);
            console.log(`   BTC Dominance: ${registro.btc_dominance} → ${btc_dominance}`);
            
            // Atualizar registro
            await pool.query(`
                UPDATE signal_metrics_log 
                SET 
                    symbol = $1,
                    confidence = $2,
                    top100_trend = $3,
                    btc_dominance = $4,
                    is_strong_signal = CASE 
                        WHEN signal_type LIKE '%FORTE%' THEN true 
                        ELSE COALESCE(is_strong_signal, false) 
                    END
                WHERE id = $5
            `, [symbol, confidence, top100_trend, btc_dominance, registro.id]);
            
            console.log(`   ✅ Registro ${registro.id} atualizado`);
        }
        
        // 3. Verificar resultado
        console.log('\n📊 3. VERIFICAÇÃO FINAL:');
        
        const verificacao = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(symbol) as symbol_preenchido,
                COUNT(confidence) as confidence_preenchido,
                COUNT(top100_trend) as top100_trend_preenchido,
                COUNT(btc_dominance) as btc_dominance_preenchido
            FROM signal_metrics_log
        `);
        
        const stats = verificacao.rows[0];
        console.log(`📈 Total de registros: ${stats.total}`);
        console.log(`✅ Symbol preenchido: ${stats.symbol_preenchido}/${stats.total}`);
        console.log(`✅ Confidence preenchido: ${stats.confidence_preenchido}/${stats.total}`);
        console.log(`✅ Top100 Trend preenchido: ${stats.top100_trend_preenchido}/${stats.total}`);
        console.log(`✅ BTC Dominance preenchido: ${stats.btc_dominance_preenchido}/${stats.total}`);
        
        // 4. Mostrar registros atualizados
        console.log('\n📋 4. REGISTROS ATUALIZADOS:');
        
        const registrosAtualizados = await pool.query(`
            SELECT 
                id, symbol, confidence, top100_trend, btc_dominance, 
                ai_approved, signal_type, is_strong_signal
            FROM signal_metrics_log 
            ORDER BY id DESC 
            LIMIT 5
        `);
        
        registrosAtualizados.rows.forEach(reg => {
            console.log(`\n🔹 ID ${reg.id}:`);
            console.log(`   Symbol: ${reg.symbol}`);
            console.log(`   Confidence: ${reg.confidence}`);
            console.log(`   Top100 Trend: ${reg.top100_trend}`);
            console.log(`   BTC Dominance: ${reg.btc_dominance}`);
            console.log(`   AI Approved: ${reg.ai_approved}`);
            console.log(`   Is Strong: ${reg.is_strong_signal}`);
        });
        
        console.log('\n🎉 CORREÇÃO CONCLUÍDA COM SUCESSO!');
        
    } catch (error) {
        console.error('❌ Erro na correção:', error);
    } finally {
        await pool.end();
    }
}

// Executar correção
corrigirRegistrosNULL().catch(console.error);
