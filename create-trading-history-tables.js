/**
 * Create missing trading history tables
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://coinbitclub_enterprise_user:lh25CKrwM9gkSQ921bpKPjPWpfKlq2AU@dpg-d3dte4umcj7s73cae2s0-a.oregon-postgres.render.com/coinbitclub_enterprise',
  ssl: { rejectUnauthorized: false }
});

async function createTradingHistoryTables() {
  try {
    console.log('🔧 Creating trading history tables...\n');

    // 1. Create trading_positions table
    console.log('📊 Creating trading_positions table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trading_positions (
        id SERIAL PRIMARY KEY,
        trade_id VARCHAR(100) UNIQUE NOT NULL,
        symbol VARCHAR(20) NOT NULL,
        side VARCHAR(10) NOT NULL,
        exchange VARCHAR(50) NOT NULL,
        entry_price NUMERIC(15,8) NOT NULL,
        quantity NUMERIC(15,8) NOT NULL,
        total_investment NUMERIC(15,2) NOT NULL,
        participants JSONB NOT NULL,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        current_price NUMERIC(15,8),
        unrealized_pnl NUMERIC(15,2) DEFAULT 0,
        unrealized_pnl_percent NUMERIC(10,2) DEFAULT 0,
        stop_loss NUMERIC(15,8),
        take_profit NUMERIC(15,8),
        max_drawdown NUMERIC(15,2) DEFAULT 0,
        max_profit NUMERIC(15,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        closed_at TIMESTAMP
      )
    `);
    console.log('✅ trading_positions table created');

    // 2. Create indexes for trading_positions
    console.log('\n📊 Creating indexes for trading_positions...');
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_trading_positions_trade_id ON trading_positions(trade_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_trading_positions_status ON trading_positions(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_trading_positions_symbol ON trading_positions(symbol)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_trading_positions_created_at ON trading_positions(created_at DESC)`);
    console.log('✅ Indexes created');

    // 3. Verify trading_operations table and add missing columns if needed
    console.log('\n📊 Verifying trading_operations table...');
    const checkColumn = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'trading_operations' AND column_name = 'trade_id'
    `);

    if (checkColumn.rows.length === 0) {
      console.log('Adding trade_id column to trading_operations...');
      await pool.query(`ALTER TABLE trading_operations ADD COLUMN IF NOT EXISTS trade_id VARCHAR(100)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_trading_operations_trade_id ON trading_operations(trade_id)`);
      console.log('✅ trade_id column added');
    } else {
      console.log('✅ trade_id column already exists');
    }

    // 4. Create trade_executions table for individual user trades
    console.log('\n📊 Creating trade_executions table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trade_executions (
        id SERIAL PRIMARY KEY,
        trade_id VARCHAR(100) NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id),
        username VARCHAR(50),
        plan_type VARCHAR(20),
        symbol VARCHAR(20) NOT NULL,
        side VARCHAR(10) NOT NULL,
        exchange VARCHAR(50) NOT NULL,
        order_id VARCHAR(100),
        position_size NUMERIC(15,2) NOT NULL,
        executed_price NUMERIC(15,8),
        executed_qty NUMERIC(15,8),
        commission_percent NUMERIC(5,2),
        success BOOLEAN DEFAULT false,
        error_message TEXT,
        simulated BOOLEAN DEFAULT false,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ trade_executions table created');

    // 5. Create indexes for trade_executions
    console.log('\n📊 Creating indexes for trade_executions...');
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_trade_executions_trade_id ON trade_executions(trade_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_trade_executions_user_id ON trade_executions(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_trade_executions_symbol ON trade_executions(symbol)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_trade_executions_created_at ON trade_executions(created_at DESC)`);
    console.log('✅ Indexes created');

    // 6. Verify all tables
    console.log('\n📊 Verifying all trading tables...\n');
    const tables = await pool.query(`
      SELECT table_name,
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name IN ('trading_positions', 'trading_operations', 'trade_executions', 'transactions')
      ORDER BY table_name
    `);
    console.table(tables.rows);

    await pool.end();
    console.log('\n✅ All trading history tables created successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

createTradingHistoryTables();
