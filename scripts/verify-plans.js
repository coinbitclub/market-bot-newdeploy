#!/usr/bin/env node

/**
 * 🔍 VERIFY PLANS SCRIPT
 * CoinBitClub Enterprise v6.0.0
 * Verifies that plans are correctly seeded in database
 */

require('dotenv').config();
const { Pool } = require('pg');

async function verifyPlans() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://coinbitclub_user:secure_password_2024@localhost:5432/coinbitclub_enterprise',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        console.log('🔍 Verifying plans in database...');

        // Get all plans
        const result = await pool.query(`
            SELECT
                id, code, name, description, type, price, currency,
                billing_period, commission_rate, minimum_balance,
                features, is_popular, is_recommended, is_active,
                region, stripe_product_id, created_at
            FROM plans
            ORDER BY id
        `);

        console.log(`\n📋 Found ${result.rows.length} plans in database:`);
        console.log('=====================================');

        result.rows.forEach((plan, index) => {
            console.log(`\n${index + 1}. ${plan.name} (${plan.code})`);
            console.log(`   Description: ${plan.description}`);
            console.log(`   Type: ${plan.type}`);
            console.log(`   Price: $${plan.price} ${plan.currency}`);
            console.log(`   Billing: ${plan.billing_period}`);
            console.log(`   Commission: ${plan.commission_rate}%`);
            console.log(`   Min Balance: $${plan.minimum_balance}`);
            console.log(`   Popular: ${plan.is_popular ? '🔥 Yes' : 'No'}`);
            console.log(`   Recommended: ${plan.is_recommended ? '⭐ Yes' : 'No'}`);
            console.log(`   Active: ${plan.is_active ? '✅ Yes' : '❌ No'}`);
            console.log(`   Region: ${plan.region}`);
            console.log(`   Stripe ID: ${plan.stripe_product_id || 'None'}`);
            console.log(`   Features: ${plan.features.length} features`);
            plan.features.forEach((feature, i) => {
                console.log(`     ${i + 1}. ${feature}`);
            });
        });

        // Summary statistics
        const statsResult = await pool.query(`
            SELECT
                COUNT(*) as total_plans,
                COUNT(CASE WHEN is_active = true THEN 1 END) as active_plans,
                COUNT(CASE WHEN is_popular = true THEN 1 END) as popular_plans,
                COUNT(CASE WHEN is_recommended = true THEN 1 END) as recommended_plans,
                COUNT(CASE WHEN type = 'TRIAL' THEN 1 END) as trial_plans,
                COUNT(CASE WHEN type = 'PREPAID' THEN 1 END) as prepaid_plans,
                COUNT(CASE WHEN type = 'MONTHLY' THEN 1 END) as monthly_plans
            FROM plans
        `);

        const stats = statsResult.rows[0];
        console.log('\n📊 Statistics:');
        console.log('=====================================');
        console.log(`Total Plans: ${stats.total_plans}`);
        console.log(`Active Plans: ${stats.active_plans}`);
        console.log(`Popular Plans: ${stats.popular_plans}`);
        console.log(`Recommended Plans: ${stats.recommended_plans}`);
        console.log(`Trial Plans: ${stats.trial_plans}`);
        console.log(`Prepaid Plans: ${stats.prepaid_plans}`);
        console.log(`Monthly Plans: ${stats.monthly_plans}`);

        // Check if we have exactly 3 plans as expected
        if (stats.total_plans === 3) {
            console.log('\n✅ Perfect! Database has exactly 3 plans as expected.');
        } else {
            console.log(`\n⚠️  Warning: Expected 3 plans, but found ${stats.total_plans}.`);
        }

        console.log('\n🎉 Verification completed successfully!');

    } catch (error) {
        console.error('❌ Error during verification:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run the verification
if (require.main === module) {
    verifyPlans()
        .then(() => {
            console.log('✅ Verification process completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Verification process failed:', error);
            process.exit(1);
        });
}

module.exports = verifyPlans;