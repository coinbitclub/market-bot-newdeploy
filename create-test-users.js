/**
 * 🧪 CREATE TEST USERS
 * Script to create test users for authentication testing
 */

const bcrypt = require('bcrypt');

async function createTestUsers() {
    try {
        // Connect to database
        const { Client } = require('pg');
        const client = new Client({
            host: 'localhost',
            port: 5432,
            database: 'coinbitclub_enterprise',
            user: 'coinbitclub_user',
            password: 'postgres'
        });

        await client.connect();
        console.log('✅ Connected to database');

        // Hash passwords
        const adminPassword = await bcrypt.hash('admin123', 10);
        const userPassword = await bcrypt.hash('user123', 10);
        const affiliatePassword = await bcrypt.hash('affiliate123', 10);

        // Create test users
        const testUsers = [
            {
                email: 'admin@coinbitclub.com',
                username: 'admin',
                full_name: 'Administrator',
                user_type: 'ADMIN',
                affiliate_type: 'none',
                password_hash: adminPassword,
                is_admin: true,
                trading_enabled: true,
                two_factor_enabled: false,
                real_brl: 10000.00,
                real_usd: 2000.00,
                admin_brl: 50000.00,
                admin_usd: 10000.00,
                commission_brl: 0.00,
                commission_usd: 0.00,
                max_open_positions: 100,
                max_position_size: 10000.00,
                default_leverage: 10,
                default_stop_loss_multiplier: 2.0,
                default_take_profit_multiplier: 3.0,
                risk_level: 'high'
            },
            {
                email: 'user@coinbitclub.com',
                username: 'testuser',
                full_name: 'Test User',
                user_type: 'USER',
                affiliate_type: 'none',
                password_hash: userPassword,
                is_admin: false,
                trading_enabled: true,
                two_factor_enabled: false,
                real_brl: 1000.00,
                real_usd: 200.00,
                admin_brl: 0.00,
                admin_usd: 0.00,
                commission_brl: 0.00,
                commission_usd: 0.00,
                max_open_positions: 5,
                max_position_size: 1000.00,
                default_leverage: 5,
                default_stop_loss_multiplier: 2.0,
                default_take_profit_multiplier: 3.0,
                risk_level: 'medium'
            },
            {
                email: 'affiliate@coinbitclub.com',
                username: 'affiliate',
                full_name: 'Test Affiliate',
                user_type: 'AFFILIATE',
                affiliate_type: 'normal',
                affiliate_code: 'AFF001',
                password_hash: affiliatePassword,
                is_admin: false,
                trading_enabled: true,
                two_factor_enabled: false,
                real_brl: 2000.00,
                real_usd: 400.00,
                admin_brl: 0.00,
                admin_usd: 0.00,
                commission_brl: 500.00,
                commission_usd: 100.00,
                max_open_positions: 10,
                max_position_size: 2000.00,
                default_leverage: 7,
                default_stop_loss_multiplier: 2.0,
                default_take_profit_multiplier: 3.0,
                risk_level: 'medium'
            }
        ];

        console.log('🔧 Creating test users...');

        for (const user of testUsers) {
            try {
                // Check if user already exists
                const existingUser = await client.query(
                    'SELECT id FROM users WHERE email = $1',
                    [user.email]
                );

                if (existingUser.rows.length > 0) {
                    console.log(`⚠️  User ${user.email} already exists, skipping...`);
                    continue;
                }

                // Insert new user
                const result = await client.query(`
                    INSERT INTO users (
                        email, username, full_name, user_type, affiliate_type, affiliate_code,
                        password_hash, is_admin, trading_enabled, two_factor_enabled,
                        real_brl, real_usd, admin_brl, admin_usd, commission_brl, commission_usd,
                        max_open_positions, max_position_size, default_leverage,
                        default_stop_loss_multiplier, default_take_profit_multiplier, risk_level,
                        is_active, created_at, updated_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                        $21, $22, true, NOW(), NOW()
                    ) RETURNING id
                `, [
                    user.email, user.username, user.full_name, user.user_type, user.affiliate_type,
                    user.affiliate_code, user.password_hash, user.is_admin, user.trading_enabled,
                    user.two_factor_enabled, user.real_brl, user.real_usd, user.admin_brl,
                    user.admin_usd, user.commission_brl, user.commission_usd, user.max_open_positions,
                    user.max_position_size, user.default_leverage, user.default_stop_loss_multiplier,
                    user.default_take_profit_multiplier, user.risk_level
                ]);

                console.log(`✅ Created user: ${user.email} (ID: ${result.rows[0].id})`);
            } catch (error) {
                console.error(`❌ Error creating user ${user.email}:`, error.message);
            }
        }

        await client.end();
        console.log('🎉 Test users created successfully!');
        console.log('\n📋 Test Credentials:');
        console.log('Admin: admin@coinbitclub.com / admin123');
        console.log('User: user@coinbitclub.com / user123');
        console.log('Affiliate: affiliate@coinbitclub.com / affiliate123');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

createTestUsers();
