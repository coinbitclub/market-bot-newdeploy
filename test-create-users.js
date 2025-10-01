/**
 * Create test users for trading bot testing
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://coinbitclub_enterprise_user:lh25CKrwM9gkSQ921bpKPjPWpfKlq2AU@dpg-d3dte4umcj7s73cae2s0-a.oregon-postgres.render.com/coinbitclub_enterprise',
  ssl: { rejectUnauthorized: false }
});

const testUsers = [
  { username: 'test_pro_br_1', email: 'test.pro.br.1@test.com', plan: 'PRO_BR', balance_real_brl: 500, balance_real_usd: 0, balance_admin_brl: 0, balance_admin_usd: 0 },
  { username: 'test_pro_br_2', email: 'test.pro.br.2@test.com', plan: 'PRO_BR', balance_real_brl: 1000, balance_real_usd: 0, balance_admin_brl: 0, balance_admin_usd: 0 },
  { username: 'test_pro_us_1', email: 'test.pro.us.1@test.com', plan: 'PRO_US', balance_real_brl: 0, balance_real_usd: 100, balance_admin_brl: 0, balance_admin_usd: 0 },
  { username: 'test_pro_us_2', email: 'test.pro.us.2@test.com', plan: 'PRO_US', balance_real_brl: 0, balance_real_usd: 200, balance_admin_brl: 0, balance_admin_usd: 0 },
  { username: 'test_flex_br_1', email: 'test.flex.br.1@test.com', plan: 'FLEX_BR', balance_real_brl: 200, balance_real_usd: 0, balance_admin_brl: 300, balance_admin_usd: 0 },
  { username: 'test_flex_br_2', email: 'test.flex.br.2@test.com', plan: 'FLEX_BR', balance_real_brl: 400, balance_real_usd: 0, balance_admin_brl: 600, balance_admin_usd: 0 },
  { username: 'test_flex_us_1', email: 'test.flex.us.1@test.com', plan: 'FLEX_US', balance_real_brl: 0, balance_real_usd: 50, balance_admin_brl: 0, balance_admin_usd: 50 },
  { username: 'test_flex_us_2', email: 'test.flex.us.2@test.com', plan: 'FLEX_US', balance_real_brl: 0, balance_real_usd: 100, balance_admin_brl: 0, balance_admin_usd: 100 },
  { username: 'test_trial_1', email: 'test.trial.1@test.com', plan: 'TRIAL', balance_real_brl: 0, balance_real_usd: 0, balance_admin_brl: 150, balance_admin_usd: 30 },
  { username: 'test_trial_2', email: 'test.trial.2@test.com', plan: 'TRIAL', balance_real_brl: 0, balance_real_usd: 0, balance_admin_brl: 200, balance_admin_usd: 40 }
];

async function createTestUsers() {
  try {
    console.log('🔧 Creating 10 test users with different plans...\n');

    const password = await bcrypt.hash('Test123!', 10);

    for (const user of testUsers) {
      try {
        const result = await pool.query(`
          INSERT INTO users (
            username, email, password_hash, user_type, plan_type, subscription_status,
            balance_real_brl, balance_real_usd, balance_admin_brl, balance_admin_usd,
            max_open_positions, default_leverage, risk_level, is_active, trading_enabled
          ) VALUES ($1, $2, $3, 'USER', $4, 'active', $5, $6, $7, $8, 2, 5, '2', true, true)
          ON CONFLICT (email) DO UPDATE SET
            plan_type = $4,
            balance_real_brl = $5,
            balance_real_usd = $6,
            balance_admin_brl = $7,
            balance_admin_usd = $8,
            subscription_status = 'active',
            is_active = true,
            trading_enabled = true
          RETURNING id, username, plan_type
        `, [
          user.username,
          user.email,
          password,
          user.plan,
          user.balance_real_brl,
          user.balance_real_usd,
          user.balance_admin_brl,
          user.balance_admin_usd
        ]);

        console.log(`✅ Created: ${result.rows[0].username} (ID: ${result.rows[0].id}) - Plan: ${result.rows[0].plan_type}`);
      } catch (err) {
        console.error(`❌ Failed to create ${user.username}:`, err.message);
      }
    }

    console.log('\n📊 Fetching all test users...\n');
    const allUsers = await pool.query(`
      SELECT id, username, plan_type, subscription_status,
             balance_real_brl, balance_real_usd, balance_admin_brl, balance_admin_usd,
             (balance_real_brl + balance_admin_brl) as total_brl,
             (balance_real_usd + balance_admin_usd) as total_usd
      FROM users
      WHERE email LIKE 'test.%@test.com'
      ORDER BY
        CASE plan_type
          WHEN 'PRO_BR' THEN 1
          WHEN 'PRO_US' THEN 2
          WHEN 'FLEX_BR' THEN 3
          WHEN 'FLEX_US' THEN 4
          WHEN 'TRIAL' THEN 5
          ELSE 6
        END,
        username
    `);

    console.log('Total test users:', allUsers.rows.length);
    console.table(allUsers.rows);

    await pool.end();
    console.log('\n✅ Test users created successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

createTestUsers();
