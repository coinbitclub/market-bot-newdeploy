require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function corrigirDefinitivoFinal() {
    try {
        console.log('🔧 CORREÇÃO DEFINITIVA FINAL...\n');

        // Alterar colunas JSON para TEXT
        await pool.query(`
            ALTER TABLE signal_metrics_log 
            ALTER COLUMN market_direction TYPE TEXT,
            ALTER COLUMN signal_data TYPE TEXT,
            ALTER COLUMN ai_decision TYPE TEXT,
            ALTER COLUMN execution_result TYPE TEXT,
            ALTER COLUMN user_executions TYPE TEXT
        `);
        console.log('✅ Colunas JSON alteradas para TEXT');

        // Testar inserção
        const testData = {
            signal: 'BUY',
            ticker: 'BTCUSDT',
            source: 'test',
            timestamp: new Date(),
            market_direction: 'BULLISH',
            fear_greed: 50,
            top100_percentage: 60.5,
            ai_approved: true,
            ai_reason: 'Teste'
        };

        const result = await pool.query(`
            INSERT INTO signal_metrics_log (
                signal_type, ticker, source, received_at,
                market_direction, fear_greed_value, top100_percentage_up,
                ai_approved, ai_reason, processed_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            RETURNING id
        `, [
            testData.signal,
            testData.ticker,
            testData.source,
            testData.timestamp,
            testData.market_direction,
            testData.fear_greed,
            testData.top100_percentage,
            testData.ai_approved,
            testData.ai_reason
        ]);

        console.log(`✅ Teste de inserção bem-sucedido - ID: ${result.rows[0].id}`);

        // Limpar teste
        await pool.query('DELETE FROM signal_metrics_log WHERE id = $1', [result.rows[0].id]);
        console.log('✅ Registro de teste removido');

        console.log('\n🎯 CORREÇÃO DEFINITIVA CONCLUÍDA!');

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

corrigirDefinitivoFinal();
