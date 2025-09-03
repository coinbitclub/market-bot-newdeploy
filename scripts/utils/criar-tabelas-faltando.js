const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function criarTabelasFaltando() {
    try {
        console.log('🔧 Criando tabelas que estão faltando...\n');

        // 1. Criar tabela signal_metrics_log
        await pool.query(`
            CREATE TABLE IF NOT EXISTS signal_metrics_log (
                id SERIAL PRIMARY KEY,
                signal_data JSONB NOT NULL,
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
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Tabela signal_metrics_log criada');

        // 2. Criar tabela active_positions se não existir
        await pool.query(`
            CREATE TABLE IF NOT EXISTS active_positions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                symbol VARCHAR(50) NOT NULL,
                side VARCHAR(10) NOT NULL,
                size DECIMAL(20,8) NOT NULL,
                entry_price DECIMAL(20,8) NOT NULL,
                stop_loss DECIMAL(20,8),
                take_profit DECIMAL(20,8),
                leverage INTEGER DEFAULT 1,
                status VARCHAR(20) DEFAULT 'ACTIVE',
                exchange VARCHAR(20),
                order_id VARCHAR(100),
                unrealized_pnl DECIMAL(20,8) DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Tabela active_positions verificada');

        // 3. Criar tabela key_validation_log
        await pool.query(`
            CREATE TABLE IF NOT EXISTS key_validation_log (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                exchange VARCHAR(20) NOT NULL,
                status VARCHAR(20) NOT NULL,
                error_message TEXT,
                response_time_ms INTEGER,
                validated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Tabela key_validation_log criada');

        // 4. Criar tabela balance_history
        await pool.query(`
            CREATE TABLE IF NOT EXISTS balance_history (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                balance_type VARCHAR(50) NOT NULL,
                amount DECIMAL(15,2) NOT NULL,
                currency VARCHAR(3) NOT NULL DEFAULT 'USD',
                operation_type VARCHAR(50) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Tabela balance_history criada');

        // 5. Criar tabela user_trading_configs
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_trading_configs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL UNIQUE,
                plan_type VARCHAR(20) DEFAULT 'FREE',
                max_leverage INTEGER DEFAULT 1,
                max_positions INTEGER DEFAULT 1,
                max_daily_loss DECIMAL(10,2) DEFAULT 0,
                min_balance_required DECIMAL(10,2) DEFAULT 0,
                stop_loss_percentage DECIMAL(5,2) DEFAULT 2.0,
                take_profit_percentage DECIMAL(5,2) DEFAULT 3.0,
                cooldown_minutes INTEGER DEFAULT 5,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Tabela user_trading_configs criada');

        // 6. Criar tabela btc_dominance_analysis
        await pool.query(`
            CREATE TABLE IF NOT EXISTS btc_dominance_analysis (
                id SERIAL PRIMARY KEY,
                btc_dominance DECIMAL(5,2) NOT NULL,
                classification VARCHAR(50),
                market_correlation VARCHAR(50),
                altseason_probability DECIMAL(5,2),
                analysis_data JSONB,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Tabela btc_dominance_analysis criada');

        // 7. Criar tabela rsi_overheated_log
        await pool.query(`
            CREATE TABLE IF NOT EXISTS rsi_overheated_log (
                id SERIAL PRIMARY KEY,
                market_rsi DECIMAL(5,2) NOT NULL,
                condition_type VARCHAR(20) NOT NULL,
                severity VARCHAR(20),
                symbols_affected JSONB,
                recommendations JSONB,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Tabela rsi_overheated_log criada');

        // 8. Criar tabela ticker_blocks
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ticker_blocks (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                ticker VARCHAR(50) NOT NULL,
                blocked_until TIMESTAMP NOT NULL,
                reason VARCHAR(255),
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(user_id, ticker)
            )
        `);
        console.log('✅ Tabela ticker_blocks criada');

        // 9. Atualizar tabela users para campos financeiros se não existirem
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS balance_real_brl DECIMAL(15,2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS balance_real_usd DECIMAL(15,2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS balance_admin_brl DECIMAL(15,2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS balance_admin_usd DECIMAL(15,2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS balance_commission_brl DECIMAL(15,2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS balance_commission_usd DECIMAL(15,2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) DEFAULT 'FREE',
            ADD COLUMN IF NOT EXISTS affiliate_type VARCHAR(20) DEFAULT 'none',
            ADD COLUMN IF NOT EXISTS affiliate_id INTEGER
        `);
        console.log('✅ Campos financeiros adicionados à tabela users');

        // 10. Criar índices para performance
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_signals_processed ON signals(processed);
            CREATE INDEX IF NOT EXISTS idx_signals_created_at ON signals(created_at);
            CREATE INDEX IF NOT EXISTS idx_real_orders_user_id ON real_orders(user_id);
            CREATE INDEX IF NOT EXISTS idx_real_orders_created_at ON real_orders(created_at);
            CREATE INDEX IF NOT EXISTS idx_active_positions_user_id ON active_positions(user_id);
            CREATE INDEX IF NOT EXISTS idx_active_positions_status ON active_positions(status);
            CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
            CREATE INDEX IF NOT EXISTS idx_user_api_keys_active ON user_api_keys(is_active);
        `);
        console.log('✅ Índices de performance criados');

        console.log('\n🎯 TODAS AS TABELAS CRIADAS COM SUCESSO!');

        // Verificar estrutura final
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);

        console.log('\n📊 TABELAS NO BANCO:');
        tables.rows.forEach(table => {
            console.log(`   ✅ ${table.table_name}`);
        });

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

criarTabelasFaltando();
