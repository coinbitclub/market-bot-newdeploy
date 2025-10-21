#!/usr/bin/env node

/**
 * 🚀 SETUP PLANS TABLE - COINBITCLUB ENTERPRISE v6.0.0
 * 
 * This script creates the plans table and populates it with default data
 * Run this after updating your database structure
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class PlansTableSetup {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
    }

    async run() {
        try {
            console.log('🚀 Setting up Plans Table for CoinBitClub Enterprise...\n');

            // Read the migration SQL file
            const migrationPath = path.join(__dirname, '..', 'migrations', 'create-plans-table.sql');
            const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

            console.log('📄 Executing migration SQL...');
            
            // Execute the migration
            await this.pool.query(migrationSQL);
            
            console.log('✅ Migration executed successfully!');

            // Verify the table was created
            console.log('\n🔍 Verifying plans table...');
            const result = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_plans,
                    COUNT(CASE WHEN region = 'brazil' THEN 1 END) as brazil_plans,
                    COUNT(CASE WHEN region = 'international' THEN 1 END) as international_plans,
                    COUNT(CASE WHEN type = 'TRIAL' THEN 1 END) as trial_plans,
                    COUNT(CASE WHEN type = 'PREPAID' THEN 1 END) as prepaid_plans,
                    COUNT(CASE WHEN type = 'MONTHLY' THEN 1 END) as monthly_plans
                FROM plans
            `);

            const stats = result.rows[0];
            console.log('📊 Plans Table Statistics:');
            console.log(`   Total Plans: ${stats.total_plans}`);
            console.log(`   Brazil Plans: ${stats.brazil_plans}`);
            console.log(`   International Plans: ${stats.international_plans}`);
            console.log(`   Trial Plans: ${stats.trial_plans}`);
            console.log(`   Prepaid Plans: ${stats.prepaid_plans}`);
            console.log(`   Monthly Plans: ${stats.monthly_plans}`);

            // Show all plans
            console.log('\n📋 All Plans:');
            const plansResult = await this.pool.query(`
                SELECT code, name, type, price, currency, region, is_active
                FROM plans
                ORDER BY region, type, price
            `);

            plansResult.rows.forEach(plan => {
                const status = plan.is_active ? '✅' : '❌';
                console.log(`   ${status} ${plan.code}: ${plan.name} (${plan.type}) - ${plan.price} ${plan.currency} [${plan.region}]`);
            });

            console.log('\n🎉 Plans table setup completed successfully!');
            console.log('💡 You can now restart your backend server to use the new plans table.');

        } catch (error) {
            console.error('❌ Error setting up plans table:', error);
            console.error('Error details:', error.message);
            process.exit(1);
        } finally {
            await this.pool.end();
        }
    }
}

// Run the setup if this script is executed directly
if (require.main === module) {
    const setup = new PlansTableSetup();
    setup.run().catch(error => {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    });
}

module.exports = PlansTableSetup;

