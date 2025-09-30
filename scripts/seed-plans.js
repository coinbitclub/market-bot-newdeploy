#!/usr/bin/env node

/**
 * 📋 PLANS SEEDING SCRIPT
 * CoinBitClub Enterprise v6.0.0
 * Seeds the database with 3 universal plans
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function seedPlans() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://coinbitclub_user:secure_password_2024@localhost:5432/coinbitclub_enterprise',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        console.log('🌱 Starting plans seeding process...');

        // Test database connection
        console.log('🔗 Testing database connection...');
        const testResult = await pool.query('SELECT NOW() as current_time');
        console.log('✅ Database connected successfully at:', testResult.rows[0].current_time);

        // Check if plans table exists
        console.log('📋 Checking if plans table exists...');
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'plans'
            );
        `);

        if (!tableCheck.rows[0].exists) {
            console.log('❌ Plans table does not exist. Running migration first...');

            // Read and execute the table creation script
            const migrationPath = path.join(__dirname, '../src/database/migrations/create-plans-table.sql');
            if (fs.existsSync(migrationPath)) {
                const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
                await pool.query(migrationSQL);
                console.log('✅ Plans table created successfully');
            } else {
                throw new Error('Migration file not found: ' + migrationPath);
            }
        } else {
            console.log('✅ Plans table exists');
        }

        // Read and execute the seeding script
        console.log('🌱 Seeding 3 universal plans...');
        const seedPath = path.join(__dirname, '../src/database/migrations/seed-3-universal-plans.sql');

        if (!fs.existsSync(seedPath)) {
            throw new Error('Seed file not found: ' + seedPath);
        }

        const seedSQL = fs.readFileSync(seedPath, 'utf8');

        // Execute the seeding script
        await pool.query(seedSQL);

        console.log('✅ Plans seeded successfully!');

        // Verify the seeded data
        console.log('🔍 Verifying seeded plans...');
        const verifyResult = await pool.query(`
            SELECT
                id, code, name, type, price, currency,
                commission_rate, is_popular, is_active, region
            FROM plans
            ORDER BY id
        `);

        console.log('\n📋 Seeded Plans:');
        console.log('==========================================');
        verifyResult.rows.forEach((plan, index) => {
            console.log(`${index + 1}. ${plan.name} (${plan.code})`);
            console.log(`   Type: ${plan.type}`);
            console.log(`   Price: ${plan.price} ${plan.currency}`);
            console.log(`   Commission: ${plan.commission_rate}%`);
            console.log(`   Popular: ${plan.is_popular ? 'Yes' : 'No'}`);
            console.log(`   Active: ${plan.is_active ? 'Yes' : 'No'}`);
            console.log(`   Region: ${plan.region}`);
            console.log('------------------------------------------');
        });

        // Show summary
        const summaryResult = await pool.query(`
            SELECT
                COUNT(*) as total_plans,
                COUNT(CASE WHEN is_active = true THEN 1 END) as active_plans,
                COUNT(CASE WHEN is_popular = true THEN 1 END) as popular_plans
            FROM plans
        `);

        const summary = summaryResult.rows[0];
        console.log('\n📊 Summary:');
        console.log(`Total Plans: ${summary.total_plans}`);
        console.log(`Active Plans: ${summary.active_plans}`);
        console.log(`Popular Plans: ${summary.popular_plans}`);

        console.log('\n🎉 Plans seeding completed successfully!');
        console.log('🚀 Your application now has 3 universal plans ready to use.');

    } catch (error) {
        console.error('❌ Error during plans seeding:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run the seeding
if (require.main === module) {
    seedPlans()
        .then(() => {
            console.log('✅ Seeding process completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Seeding process failed:', error);
            process.exit(1);
        });
}

module.exports = seedPlans;