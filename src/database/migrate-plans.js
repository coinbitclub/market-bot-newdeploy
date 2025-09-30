/**
 * 📋 PLANS MIGRATION SCRIPT
 * CoinBitClub Enterprise v6.0.0
 * Creates plans table and inserts initial data
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

class PlansMigration {
    constructor() {
        this.pool = new Pool({
            host: process.env.POSTGRES_HOST || 'localhost',
            port: process.env.POSTGRES_PORT || 5432,
            database: process.env.POSTGRES_DB || 'coinbitclub_enterprise',
            user: process.env.POSTGRES_USER || 'postgres',
            password: process.env.POSTGRES_PASSWORD || 'postgres',
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
    }

    async migrate() {
        console.log('🚀 Starting plans migration...');

        try {
            // Read the SQL migration file
            const sqlFile = path.join(__dirname, 'migrations', 'create-plans-table.sql');
            const sqlContent = fs.readFileSync(sqlFile, 'utf8');

            // Execute the migration
            console.log('📋 Creating plans table and inserting data...');
            const result = await this.pool.query(sqlContent);

            console.log('✅ Plans migration completed successfully!');
            console.log('📊 Migration results:');

            // Show the created plans
            const plansResult = await this.pool.query(`
                SELECT
                    code,
                    name,
                    type,
                    price,
                    currency,
                    region,
                    is_popular,
                    commission_rate
                FROM plans
                ORDER BY region, type, price
            `);

            console.log('\n📋 Created Plans:');
            console.table(plansResult.rows);

        } catch (error) {
            console.error('❌ Migration failed:', error);
            throw error;
        }
    }

    async checkPlans() {
        try {
            console.log('🔍 Checking existing plans...');

            const result = await this.pool.query(`
                SELECT
                    id,
                    code,
                    name,
                    type,
                    price,
                    currency,
                    region,
                    is_popular,
                    commission_rate,
                    created_at
                FROM plans
                ORDER BY region, type, price
            `);

            if (result.rows.length === 0) {
                console.log('📭 No plans found in database');
                return false;
            }

            console.log(`📊 Found ${result.rows.length} plans:`);
            console.table(result.rows);
            return true;

        } catch (error) {
            if (error.code === '42P01') { // Table doesn't exist
                console.log('📭 Plans table does not exist');
                return false;
            }
            console.error('❌ Error checking plans:', error);
            throw error;
        }
    }

    async close() {
        await this.pool.end();
    }
}

// Run migration if called directly
if (require.main === module) {
    (async () => {
        const migration = new PlansMigration();

        try {
            // Check if plans already exist
            const plansExist = await migration.checkPlans();

            if (plansExist) {
                console.log('⚠️  Plans already exist in database');
                console.log('💡 Use --force flag to recreate plans');

                if (!process.argv.includes('--force')) {
                    await migration.close();
                    process.exit(0);
                }

                console.log('🔄 Force flag detected, recreating plans...');
                await migration.pool.query('DROP TABLE IF EXISTS plans CASCADE');
            }

            await migration.migrate();
            console.log('🎉 Plans migration completed successfully!');

        } catch (error) {
            console.error('💥 Migration failed:', error);
            process.exit(1);
        } finally {
            await migration.close();
        }
    })();
}

module.exports = PlansMigration;