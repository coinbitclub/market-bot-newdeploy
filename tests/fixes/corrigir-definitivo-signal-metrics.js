require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function corrigirDefinitivoTabelaSignalMetrics() {
    try {
        console.log('🔧 CORREÇÃO DEFINITIVA - signal_metrics_log...\n');

        // 1. Verificar se a tabela existe
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'signal_metrics_log'
            )
        `);

        if (!tableExists.rows[0].exists) {
            console.log('❌ Tabela signal_metrics_log não existe, criando...');
        } else {
            console.log('✅ Tabela signal_metrics_log existe');
        }

        // 2. Recriar a tabela com TODAS as colunas necessárias
        await pool.query(`DROP TABLE IF EXISTS signal_metrics_log CASCADE`);
        console.log('🗑️ Tabela antiga removida');

        await pool.query(`
            CREATE TABLE signal_metrics_log (
                id SERIAL PRIMARY KEY,
                signal_data JSONB,
                market_direction JSONB,
                ai_decision JSONB,
                execution_result JSONB,
                should_execute BOOLEAN DEFAULT false,
                reason TEXT,
                confidence DECIMAL(5,4),
                fear_greed_value INTEGER,
                top100_trend VARCHAR(20),
                btc_dominance DECIMAL(5,2),
                market_rsi DECIMAL(5,2),
                is_strong_signal BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW(),
                signal_type VARCHAR(50),
                ticker VARCHAR(50),
                price DECIMAL(20,8),
                symbol VARCHAR(50),
                action VARCHAR(20),
                side VARCHAR(10),
                source VARCHAR(100),
                user_executions JSONB,
                received_at TIMESTAMP DEFAULT NOW(),
                processed_at TIMESTAMP,
                status VARCHAR(50) DEFAULT 'PENDING',
                error_message TEXT,
                execution_time_ms INTEGER,
                users_affected INTEGER DEFAULT 0,
                orders_created INTEGER DEFAULT 0,
                top100_percentage_up DECIMAL(5,2),
                ai_approved BOOLEAN DEFAULT false,
                ai_reason TEXT,
                timestamp_signal TIMESTAMP
            )
        `);
        console.log('✅ Nova tabela signal_metrics_log criada com TODAS as colunas');

        // 3. Testar inserção exatamente como o código faz
        console.log('\n🧪 Testando inserção como signal-metrics-monitor.js...');
        
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

        // 4. Limpar teste
        await pool.query('DELETE FROM signal_metrics_log WHERE id = $1', [result.rows[0].id]);
        console.log('✅ Registro de teste removido');

        // 5. Criar índices para performance
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_signal_metrics_log_ticker ON signal_metrics_log(ticker);
            CREATE INDEX IF NOT EXISTS idx_signal_metrics_log_received_at ON signal_metrics_log(received_at);
            CREATE INDEX IF NOT EXISTS idx_signal_metrics_log_ai_approved ON signal_metrics_log(ai_approved);
            CREATE INDEX IF NOT EXISTS idx_signal_metrics_log_signal_type ON signal_metrics_log(signal_type);
        `);
        console.log('✅ Índices criados para performance');

        // 6. Verificar estrutura final
        const columns = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'signal_metrics_log'
            ORDER BY ordinal_position
        `);

        console.log('\n📊 ESTRUTURA FINAL signal_metrics_log:');
        columns.rows.forEach(col => {
            console.log(`   • ${col.column_name} (${col.data_type}) - ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });

        console.log('\n🎯 TABELA signal_metrics_log TOTALMENTE CORRIGIDA!');
        console.log('✅ Sistema pronto para processar sinais sem erros');

    } catch (error) {
        console.error('❌ Erro na correção:', error.message);
    } finally {
        await pool.end();
    }
}

corrigirDefinitivoTabelaSignalMetrics();
