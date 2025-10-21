#!/usr/bin/env node
/**
 * Run database migration script
 * Usage: node run-migration.js migrations/fix-trading-operations-schema.sql
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const migrationFile = process.argv[2] || 'migrations/fix-trading-operations-schema.sql';
    const migrationPath = path.resolve(__dirname, migrationFile);

    console.log('🔧 Database Migration Runner');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📁 Migration file: ${migrationPath}`);

    // Check if file exists
    if (!fs.existsSync(migrationPath)) {
        console.error(`❌ Migration file not found: ${migrationPath}`);
        process.exit(1);
    }

    // Read migration SQL
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log(`📄 Migration SQL loaded (${migrationSQL.length} characters)`);

    // Get database URL
    const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!databaseUrl) {
        console.error('❌ DATABASE_URL not set in environment variables');
        console.error('   Please set DATABASE_URL in .env file');
        process.exit(1);
    }

    console.log('🔌 Connecting to database...');
    console.log(`   Host: ${databaseUrl.split('@')[1]?.split('/')[0] || 'unknown'}`);

    // Create database connection
    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes('render.com') || databaseUrl.includes('railway.app')
            ? { rejectUnauthorized: false }
            : false
    });

    try {
        // Test connection
        const client = await pool.connect();
        console.log('✅ Database connected successfully');

        console.log('');
        console.log('🚀 Running migration...');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Execute migration
        const result = await client.query(migrationSQL);

        console.log('✅ Migration completed successfully!');
        console.log('');

        // Get table info
        console.log('📊 Checking trading_operations table schema...');
        const schemaResult = await client.query(`
            SELECT
                column_name,
                data_type,
                character_maximum_length,
                is_nullable
            FROM information_schema.columns
            WHERE table_name = 'trading_operations'
            ORDER BY ordinal_position;
        `);

        console.log('');
        console.log('📋 Table columns:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        schemaResult.rows.forEach(row => {
            const length = row.character_maximum_length ? `(${row.character_maximum_length})` : '';
            const nullable = row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
            console.log(`  ${row.column_name.padEnd(25)} ${row.data_type}${length.padEnd(8)} ${nullable}`);
        });

        console.log('');
        console.log('✅ Migration verified - trading_operations table is ready');

        client.release();

    } catch (error) {
        console.error('');
        console.error('❌ Migration failed:');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error(error.message);
        if (error.position) {
            console.error(`   Position: ${error.position}`);
        }
        console.error('');
        process.exit(1);
    } finally {
        await pool.end();
    }

    console.log('');
    console.log('🎉 All done!');
}

runMigration().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
