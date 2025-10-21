/**
 * 🗄️ CREATE STRIPE TRANSACTIONS TABLE
 * Migration script to create the stripe_transactions table
 */

const fs = require('fs');
const path = require('path');
const ConnectionPoolManager = require('../src/database/connection-pool-manager');

async function createStripeTransactionsTable() {
    console.log('🚀 Starting Stripe Transactions Table Creation...');
    
    const dbPoolManager = new ConnectionPoolManager();
    
    try {
        // Read the SQL migration file
        const migrationPath = path.join(__dirname, '../migrations/create-stripe-transactions-table.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📄 Migration SQL loaded from:', migrationPath);
        
        // Execute the migration
        console.log('🔄 Executing migration...');
        await dbPoolManager.executeWrite(migrationSQL);
        
        console.log('✅ Stripe transactions table created successfully!');
        
        // Verify table creation
        console.log('🔍 Verifying table structure...');
        const tableInfo = await dbPoolManager.executeRead(`
            SELECT 
                column_name, 
                data_type, 
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_name = 'stripe_transactions' 
            ORDER BY ordinal_position
        `);
        
        console.log('📊 Table structure:');
        tableInfo.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });
        
        // Check indexes
        const indexes = await dbPoolManager.executeRead(`
            SELECT indexname, indexdef 
            FROM pg_indexes 
            WHERE tablename = 'stripe_transactions'
        `);
        
        console.log('🔗 Indexes created:');
        indexes.rows.forEach(row => {
            console.log(`  - ${row.indexname}`);
        });
        
        console.log('🎉 Migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await dbPoolManager.close();
    }
}

// Run migration if called directly
if (require.main === module) {
    createStripeTransactionsTable()
        .then(() => {
            console.log('✅ Script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Script failed:', error);
            process.exit(1);
        });
}

module.exports = { createStripeTransactionsTable };
