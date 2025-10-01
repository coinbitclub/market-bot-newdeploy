/**
 * Check trade history database tables
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://coinbitclub_enterprise_user:lh25CKrwM9gkSQ921bpKPjPWpfKlq2AU@dpg-d3dte4umcj7s73cae2s0-a.oregon-postgres.render.com/coinbitclub_enterprise',
  ssl: { rejectUnauthorized: false }
});

async function checkTradeHistory() {
  try {
    console.log('📊 Checking trade history tables...\n');

    // 1. Check trade_executions table
    console.log('🔍 Checking trade_executions table...');
    const executions = await pool.query(`
      SELECT
        id, trade_id, user_id, username, plan_type, symbol, side,
        position_size, success, error_message, created_at
      FROM trade_executions
      ORDER BY created_at DESC
      LIMIT 20
    `);

    if (executions.rows.length > 0) {
      console.log(`✅ Found ${executions.rows.length} trade executions:\n`);
      console.table(executions.rows);
    } else {
      console.log('⚠️ No trade executions found in database\n');
    }

    // 2. Check trading_positions table
    console.log('\n🔍 Checking trading_positions table...');
    const positions = await pool.query(`
      SELECT
        id, trade_id, symbol, side, status, entry_price, quantity,
        total_investment, created_at
      FROM trading_positions
      ORDER BY created_at DESC
      LIMIT 20
    `);

    if (positions.rows.length > 0) {
      console.log(`✅ Found ${positions.rows.length} positions:\n`);
      console.table(positions.rows);
    } else {
      console.log('⚠️ No positions found in database\n');
    }

    // 3. Check trading_operations table for recent entries
    console.log('\n🔍 Checking trading_operations table...');
    const operations = await pool.query(`
      SELECT
        id, user_id, operation_type, symbol, amount, status,
        trade_id, created_at
      FROM trading_operations
      ORDER BY created_at DESC
      LIMIT 10
    `);

    if (operations.rows.length > 0) {
      console.log(`✅ Found ${operations.rows.length} operations:\n`);
      console.table(operations.rows);
    } else {
      console.log('⚠️ No operations found in database\n');
    }

    // 4. Summary
    console.log('\n📈 SUMMARY:');
    console.log(`   Trade Executions: ${executions.rows.length}`);
    console.log(`   Trading Positions: ${positions.rows.length}`);
    console.log(`   Trading Operations: ${operations.rows.length}`);

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

checkTradeHistory();
