require('dotenv').config();
const { Pool } = require('pg');

/**
 * 🏗️ CRIADOR COMPLETO DE ESTRUTURA DE BANCO
 * Cria todas as tabelas necessárias para o sistema de trading
 */

class DatabaseStructureCreator {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
    }

    async createCompleteStructure() {
        console.log('🏗️ CRIANDO ESTRUTURA COMPLETA DO BANCO');
        console.log('='.repeat(60));
        
        try {
            // 1. Criar tabela de usuários
            await this.createUsersTable();
            
            // 2. Criar tabela de sinais
            await this.createSignalsTable();
            
            // 3. Criar tabela de ordens
            await this.createOrdersTable();
            
            // 4. Criar tabela de posições
            await this.createPositionsTable();
            
            // 5. Criar tabela de saldos
            await this.createBalancesTable();
            
            // 6. Criar tabelas de monitoramento
            await this.createMonitoringTables();
            
            // 7. Criar índices
            await this.createIndexes();
            
            // 8. Inserir dados de teste
            await this.insertTestData();
            
            // 9. Verificar estrutura criada
            await this.verifyStructure();
            
            console.log('\n✅ ESTRUTURA COMPLETA CRIADA COM SUCESSO!');
            
        } catch (error) {
            console.error('❌ Erro ao criar estrutura:', error);
        } finally {
            await this.pool.end();
        }
    }

    async createUsersTable() {
        console.log('\n👥 CRIANDO TABELA DE USUÁRIOS');
        console.log('-'.repeat(40));
        
        try {
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(100) UNIQUE NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    
                    -- Chaves API Binance
                    binance_api_key VARCHAR(255),
                    binance_secret_key VARCHAR(255),
                    binance_testnet BOOLEAN DEFAULT true,
                    
                    -- Chaves API Bybit
                    bybit_api_key VARCHAR(255),
                    bybit_secret_key VARCHAR(255),
                    bybit_testnet BOOLEAN DEFAULT true,
                    
                    -- Configurações
                    ativo BOOLEAN DEFAULT true,
                    trading_enabled BOOLEAN DEFAULT false,
                    risk_level VARCHAR(20) DEFAULT 'medium',
                    max_daily_trades INTEGER DEFAULT 10,
                    max_position_size DECIMAL(15,8) DEFAULT 1000.00,
                    
                    -- Timestamps
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    last_login TIMESTAMP
                )
            `);
            
            console.log('✅ Tabela users criada');
            
        } catch (error) {
            console.error('❌ Erro ao criar tabela users:', error.message);
        }
    }

    async createSignalsTable() {
        console.log('\n📡 CRIANDO TABELA DE SINAIS');
        console.log('-'.repeat(40));
        
        try {
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS signals (
                    id SERIAL PRIMARY KEY,
                    symbol VARCHAR(20) NOT NULL,
                    side VARCHAR(10) NOT NULL, -- 'buy' ou 'sell'
                    action VARCHAR(20) NOT NULL, -- 'open', 'close', 'update'
                    
                    -- Dados do sinal
                    price DECIMAL(15,8),
                    quantity DECIMAL(15,8),
                    stop_loss DECIMAL(15,8),
                    take_profit DECIMAL(15,8),
                    leverage INTEGER DEFAULT 1,
                    
                    -- Dados TradingView
                    tradingview_alert_name VARCHAR(255),
                    timeframe VARCHAR(10),
                    exchange VARCHAR(20) DEFAULT 'bybit',
                    
                    -- Análise IA
                    processed BOOLEAN DEFAULT false,
                    ai_analysis TEXT,
                    ai_confidence DECIMAL(5,2),
                    ai_risk_score DECIMAL(5,2),
                    
                    -- Origem e status
                    source VARCHAR(50) DEFAULT 'tradingview',
                    status VARCHAR(20) DEFAULT 'pending',
                    
                    -- Timestamps
                    created_at TIMESTAMP DEFAULT NOW(),
                    processed_at TIMESTAMP,
                    executed_at TIMESTAMP
                )
            `);
            
            console.log('✅ Tabela signals criada');
            
        } catch (error) {
            console.error('❌ Erro ao criar tabela signals:', error.message);
        }
    }

    async createOrdersTable() {
        console.log('\n📈 CRIANDO TABELA DE ORDENS');
        console.log('-'.repeat(40));
        
        try {
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS orders (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    signal_id INTEGER REFERENCES signals(id),
                    
                    -- Dados da ordem
                    exchange VARCHAR(20) NOT NULL,
                    symbol VARCHAR(20) NOT NULL,
                    side VARCHAR(10) NOT NULL, -- 'buy' ou 'sell'
                    type VARCHAR(20) NOT NULL, -- 'market', 'limit', 'stop'
                    
                    -- Quantidades e preços
                    quantity DECIMAL(15,8) NOT NULL,
                    price DECIMAL(15,8),
                    filled_quantity DECIMAL(15,8) DEFAULT 0,
                    avg_fill_price DECIMAL(15,8),
                    
                    -- Status e IDs
                    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'filled', 'cancelled', 'failed'
                    exchange_order_id VARCHAR(100),
                    client_order_id VARCHAR(100),
                    
                    -- Timestamps
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    filled_at TIMESTAMP
                )
            `);
            
            console.log('✅ Tabela orders criada');
            
        } catch (error) {
            console.error('❌ Erro ao criar tabela orders:', error.message);
        }
    }

    async createPositionsTable() {
        console.log('\n📊 CRIANDO TABELA DE POSIÇÕES');
        console.log('-'.repeat(40));
        
        try {
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS positions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    
                    -- Dados da posição
                    exchange VARCHAR(20) NOT NULL,
                    symbol VARCHAR(20) NOT NULL,
                    side VARCHAR(10) NOT NULL, -- 'long' ou 'short'
                    
                    -- Quantidades e preços
                    quantity DECIMAL(15,8) NOT NULL,
                    entry_price DECIMAL(15,8) NOT NULL,
                    current_price DECIMAL(15,8),
                    
                    -- P&L
                    unrealized_pnl DECIMAL(15,8) DEFAULT 0,
                    realized_pnl DECIMAL(15,8) DEFAULT 0,
                    
                    -- Stop Loss e Take Profit
                    stop_loss DECIMAL(15,8),
                    take_profit DECIMAL(15,8),
                    
                    -- Status
                    status VARCHAR(20) DEFAULT 'open', -- 'open', 'closed', 'liquidated'
                    
                    -- Timestamps
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    closed_at TIMESTAMP
                )
            `);
            
            console.log('✅ Tabela positions criada');
            
        } catch (error) {
            console.error('❌ Erro ao criar tabela positions:', error.message);
        }
    }

    async createBalancesTable() {
        console.log('\n💰 CRIANDO TABELA DE SALDOS');
        console.log('-'.repeat(40));
        
        try {
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS balances (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    
                    -- Dados do saldo
                    exchange VARCHAR(20) NOT NULL,
                    asset VARCHAR(10) NOT NULL,
                    account_type VARCHAR(20) DEFAULT 'unified', -- 'spot', 'futures', 'unified'
                    
                    -- Quantidades
                    free DECIMAL(20,8) DEFAULT 0,
                    used DECIMAL(20,8) DEFAULT 0,
                    total DECIMAL(20,8) DEFAULT 0,
                    
                    -- Valor em USD
                    usd_value DECIMAL(15,2) DEFAULT 0,
                    
                    -- Timestamps
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    
                    -- Constraint única
                    UNIQUE(user_id, exchange, asset, account_type)
                )
            `);
            
            console.log('✅ Tabela balances criada');
            
        } catch (error) {
            console.error('❌ Erro ao criar tabela balances:', error.message);
        }
    }

    async createMonitoringTables() {
        console.log('\n📊 CRIANDO TABELAS DE MONITORAMENTO');
        console.log('-'.repeat(40));
        
        try {
            // Tabela de logs de API
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS api_logs (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    exchange VARCHAR(20) NOT NULL,
                    endpoint VARCHAR(255) NOT NULL,
                    method VARCHAR(10) NOT NULL,
                    
                    -- Status da requisição
                    status_code INTEGER,
                    response_time INTEGER,
                    success BOOLEAN DEFAULT false,
                    
                    -- Dados da requisição
                    request_data TEXT,
                    response_data TEXT,
                    error_message TEXT,
                    
                    -- Timestamp
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);
            
            // Tabela de métricas de performance
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS performance_metrics (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    
                    -- Métricas de trading
                    total_trades INTEGER DEFAULT 0,
                    winning_trades INTEGER DEFAULT 0,
                    losing_trades INTEGER DEFAULT 0,
                    total_pnl DECIMAL(15,8) DEFAULT 0,
                    
                    -- Métricas de tempo
                    avg_trade_duration INTEGER DEFAULT 0, -- em minutos
                    max_drawdown DECIMAL(5,2) DEFAULT 0,
                    win_rate DECIMAL(5,2) DEFAULT 0,
                    
                    -- Período
                    period_start DATE,
                    period_end DATE,
                    
                    -- Timestamps
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);
            
            console.log('✅ Tabelas de monitoramento criadas');
            
        } catch (error) {
            console.error('❌ Erro ao criar tabelas de monitoramento:', error.message);
        }
    }

    async createIndexes() {
        console.log('\n🔍 CRIANDO ÍNDICES');
        console.log('-'.repeat(40));
        
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_signals_created_at ON signals(created_at DESC)',
            'CREATE INDEX IF NOT EXISTS idx_signals_processed ON signals(processed, created_at)',
            'CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status)',
            'CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC)',
            'CREATE INDEX IF NOT EXISTS idx_positions_user_status ON positions(user_id, status)',
            'CREATE INDEX IF NOT EXISTS idx_balances_user_exchange ON balances(user_id, exchange)',
            'CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at DESC)',
            'CREATE INDEX IF NOT EXISTS idx_users_active ON users(ativo, trading_enabled)'
        ];
        
        for (const indexSql of indexes) {
            try {
                await this.pool.query(indexSql);
                console.log(`✅ Índice criado: ${indexSql.split(' ')[5]}`);
            } catch (error) {
                console.log(`⚠️  Erro no índice: ${error.message.substring(0, 50)}...`);
            }
        }
    }

    async insertTestData() {
        console.log('\n🧪 INSERINDO DADOS DE TESTE');
        console.log('-'.repeat(40));
        
        try {
            // Verificar se já existem usuários
            const existingUsers = await this.pool.query('SELECT COUNT(*) FROM users');
            const userCount = parseInt(existingUsers.rows[0].count);
            
            if (userCount === 0) {
                // Inserir usuário administrador
                await this.pool.query(`
                    INSERT INTO users (
                        username, email, password_hash,
                        binance_api_key, binance_secret_key,
                        bybit_api_key, bybit_secret_key,
                        ativo, trading_enabled
                    ) VALUES (
                        'admin', 'admin@coinbitclub.com', 'hashed_password_123',
                        'BINANCE_API_KEY_PLACEHOLDER_64_CHARS_LONG_EXAMPLE_123456789',
                        'BINANCE_SECRET_KEY_PLACEHOLDER_64_CHARS_LONG_EXAMPLE_123456',
                        'BYBIT_API_KEY_PLACEHOLDER_32_CHARS',
                        'BYBIT_SECRET_KEY_PLACEHOLDER_32_CHARS',
                        true, true
                    )
                `);
                
                console.log('✅ Usuário administrador criado');
                
                // Inserir sinal de teste
                await this.pool.query(`
                    INSERT INTO signals (
                        symbol, side, action, price, quantity,
                        tradingview_alert_name, timeframe, exchange
                    ) VALUES (
                        'BTCUSDT', 'buy', 'open', 45000.00, 0.001,
                        'BTC Long Signal', '1h', 'bybit'
                    )
                `);
                
                console.log('✅ Sinal de teste criado');
                
            } else {
                console.log(`✅ ${userCount} usuários já existem no banco`);
            }
            
        } catch (error) {
            console.error('❌ Erro ao inserir dados de teste:', error.message);
        }
    }

    async verifyStructure() {
        console.log('\n✅ VERIFICANDO ESTRUTURA CRIADA');
        console.log('-'.repeat(40));
        
        try {
            const tables = await this.pool.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            `);
            
            console.log('📋 Tabelas criadas:');
            tables.rows.forEach(row => {
                console.log(`   ✅ ${row.table_name}`);
            });
            
            // Verificar dados
            const stats = await this.pool.query(`
                SELECT 
                    (SELECT COUNT(*) FROM users) as users_count,
                    (SELECT COUNT(*) FROM signals) as signals_count,
                    (SELECT COUNT(*) FROM orders) as orders_count,
                    (SELECT COUNT(*) FROM positions) as positions_count,
                    (SELECT COUNT(*) FROM balances) as balances_count
            `);
            
            const { users_count, signals_count, orders_count, positions_count, balances_count } = stats.rows[0];
            
            console.log('\n📊 Dados existentes:');
            console.log(`   👥 Usuários: ${users_count}`);
            console.log(`   📡 Sinais: ${signals_count}`);
            console.log(`   📈 Ordens: ${orders_count}`);
            console.log(`   📊 Posições: ${positions_count}`);
            console.log(`   💰 Saldos: ${balances_count}`);
            
        } catch (error) {
            console.error('❌ Erro na verificação:', error.message);
        }
    }
}

// Executar criação
if (require.main === module) {
    const creator = new DatabaseStructureCreator();
    creator.createCompleteStructure();
}

module.exports = DatabaseStructureCreator;
