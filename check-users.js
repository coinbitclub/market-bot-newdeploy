require('dotenv').config();
const { Pool } = require('pg');

async function checkUsers() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('👥 Checking active users with balance...\n');

        const result = await pool.query(`
            SELECT
                id,
                username,
                plan_type,
                subscription_status,
                balance_real_brl,
                balance_real_usd,
                balance_admin_brl,
                balance_admin_usd,
                max_open_positions,
                risk_level
            FROM users
            WHERE subscription_status = 'active'
            AND (
                (balance_real_brl + balance_admin_brl) >= 100 OR
                (balance_real_usd + balance_admin_usd) >= 20
            )
            ORDER BY
                CASE
                    WHEN plan_type LIKE 'PRO%' THEN 1
                    WHEN plan_type LIKE 'FLEX%' THEN 2
                    WHEN plan_type = 'TRIAL' THEN 3
                    ELSE 4
                END,
                id
        `);

        if (result.rows.length === 0) {
            console.log('❌ No active users with sufficient balance found');
            await pool.end();
            return;
        }

        console.log(`✅ Found ${result.rows.length} active users with balance:\n`);

        // Group by plan type
        const byPlan = {};
        result.rows.forEach(user => {
            if (!byPlan[user.plan_type]) {
                byPlan[user.plan_type] = [];
            }
            byPlan[user.plan_type].push(user);
        });

        // Display by plan type
        Object.keys(byPlan).forEach(planType => {
            console.log(`📊 ${planType} Users (${byPlan[planType].length}):`);
            byPlan[planType].forEach(user => {
                const totalBRL = parseFloat(user.balance_real_brl || 0) + parseFloat(user.balance_admin_brl || 0);
                const totalUSD = parseFloat(user.balance_real_usd || 0) + parseFloat(user.balance_admin_usd || 0);
                console.log(`   - ${user.username} (ID: ${user.id})`);
                console.log(`     Balance: BRL ${totalBRL.toFixed(2)} | USD ${totalUSD.toFixed(2)}`);
                console.log(`     Max Positions: ${user.max_open_positions} | Risk: ${user.risk_level}%`);
            });
            console.log('');
        });

        // Summary
        console.log('📈 Summary by Plan:');
        Object.keys(byPlan).forEach(planType => {
            console.log(`   ${planType}: ${byPlan[planType].length} users`);
        });

    } catch (error) {
        console.error('❌ Error checking users:', error.message);
    } finally {
        await pool.end();
    }
}

checkUsers();
