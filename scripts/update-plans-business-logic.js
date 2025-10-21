#!/usr/bin/env node

/**
 * 🔄 UPDATE PLANS BUSINESS LOGIC - COINBITCLUB ENTERPRISE v6.0.0
 * 
 * This script updates the plans table to match the exact business requirements:
 * 1. TRIAL - Testnet only trading
 * 2. PRO - $100/month flat fee, unlimited trading  
 * 3. FLEX - Percentage fee per transaction, requires user assets
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class PlansBusinessLogicUpdate {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
    }

    async run() {
        try {
            console.log('🔄 Updating Plans Business Logic for CoinBitClub Enterprise...\n');

            // Read the migration SQL file
            const migrationPath = path.join(__dirname, '..', 'migrations', 'update-plans-business-logic.sql');
            const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

            console.log('📄 Executing business logic update...');
            
            // Execute the migration
            await this.pool.query(migrationSQL);
            
            console.log('✅ Business logic update executed successfully!');

            // Verify the updated plans
            console.log('\n🔍 Verifying updated plans...');
            const result = await this.pool.query(`
                SELECT 
                    code,
                    name,
                    type,
                    monthly_fee,
                    commission_rate,
                    allows_realtime_trading,
                    requires_user_assets,
                    transaction_fee_type,
                    minimum_balance
                FROM plans
                ORDER BY 
                    CASE code 
                        WHEN 'TRIAL' THEN 1
                        WHEN 'FLEX' THEN 2
                        WHEN 'PRO' THEN 3
                        ELSE 4
                    END
            `);

            console.log('📊 Updated Plans Business Logic:');
            console.log('=' .repeat(80));
            
            result.rows.forEach(plan => {
                console.log(`\n🎯 ${plan.code} Plan:`);
                console.log(`   Name: ${plan.name}`);
                console.log(`   Type: ${plan.type}`);
                console.log(`   Monthly Fee: $${plan.monthly_fee}`);
                console.log(`   Commission Rate: ${plan.commission_rate}%`);
                console.log(`   Real-time Trading: ${plan.allows_realtime_trading ? '✅ Yes' : '❌ No (Testnet Only)'}`);
                console.log(`   Requires User Assets: ${plan.requires_user_assets ? '✅ Yes' : '❌ No'}`);
                console.log(`   Transaction Fee Type: ${plan.transaction_fee_type}`);
                console.log(`   Minimum Balance: $${plan.minimum_balance}`);
                
                // Business logic summary
                if (plan.code === 'TRIAL') {
                    console.log(`   📋 Business Logic: TESTNET ONLY - Free trial for learning`);
                } else if (plan.code === 'PRO') {
                    console.log(`   📋 Business Logic: UNLIMITED TRADING - $100/month flat fee`);
                } else if (plan.code === 'FLEX') {
                    console.log(`   📋 Business Logic: ASSET REQUIRED - 20% fee per transaction`);
                }
            });

            // Show plan validation rules
            console.log('\n🔍 Plan Validation Rules:');
            console.log('=' .repeat(80));
            const validationResult = await this.pool.query(`
                SELECT * FROM plan_validation_rules
                ORDER BY 
                    CASE code 
                        WHEN 'TRIAL' THEN 1
                        WHEN 'FLEX' THEN 2
                        WHEN 'PRO' THEN 3
                        ELSE 4
                    END
            `);

            validationResult.rows.forEach(rule => {
                console.log(`\n📋 ${rule.code}: ${rule.trading_mode}`);
                console.log(`   Real-time Trading: ${rule.allows_realtime_trading ? '✅' : '❌'}`);
                console.log(`   Requires Assets: ${rule.requires_user_assets ? '✅' : '❌'}`);
                console.log(`   Fee Type: ${rule.transaction_fee_type}`);
                console.log(`   Monthly Fee: $${rule.monthly_fee}`);
            });

            console.log('\n🎉 Plans business logic updated successfully!');
            console.log('💡 The plans now match your exact business requirements:');
            console.log('   • TRIAL: Testnet only trading');
            console.log('   • PRO: $100/month flat fee, unlimited trading');
            console.log('   • FLEX: Percentage fee per transaction, requires user assets');

        } catch (error) {
            console.error('❌ Error updating plans business logic:', error);
            console.error('Error details:', error.message);
            process.exit(1);
        } finally {
            await this.pool.end();
        }
    }
}

// Run the update if this script is executed directly
if (require.main === module) {
    const update = new PlansBusinessLogicUpdate();
    update.run().catch(error => {
        console.error('❌ Update failed:', error);
        process.exit(1);
    });
}

module.exports = PlansBusinessLogicUpdate;

