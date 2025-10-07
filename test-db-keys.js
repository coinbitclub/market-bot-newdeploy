/**
 * Test to check the format of encrypted API keys in the database
 */

require('dotenv').config();
const { Pool } = require('pg');

async function checkDatabaseKeys() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('🔍 Checking encrypted API key formats in database...\n');

        const result = await pool.query(`
            SELECT
                user_id,
                exchange,
                api_secret,
                LENGTH(api_secret) as secret_length,
                created_at,
                updated_at
            FROM user_api_keys
            WHERE api_secret IS NOT NULL
            ORDER BY updated_at DESC
            LIMIT 5
        `);

        if (result.rows.length === 0) {
            console.log('❌ No API keys found in database');
            return;
        }

        console.log(`Found ${result.rows.length} API keys:\n`);

        for (const row of result.rows) {
            const parts = row.api_secret.split(':');
            console.log(`User ${row.user_id} - ${row.exchange}:`);
            console.log(`  Length: ${row.secret_length}`);
            console.log(`  Parts: ${parts.length} (${parts.length === 2 ? 'LEGACY' : parts.length === 3 ? 'NEW' : 'UNKNOWN'})`);
            console.log(`  Sample: ${row.api_secret.substring(0, 50)}...`);
            console.log(`  Created: ${row.created_at}`);
            console.log(`  Updated: ${row.updated_at}`);
            console.log('');
        }

        // Check encryption key
        console.log('🔑 Environment Variables:');
        console.log(`  ENCRYPTION_KEY: ${process.env.ENCRYPTION_KEY ? process.env.ENCRYPTION_KEY.substring(0, 20) + '...' : 'NOT SET'}`);
        console.log(`  API_KEY_ENCRYPTION_SECRET: ${process.env.API_KEY_ENCRYPTION_SECRET ? 'SET' : 'NOT SET'}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkDatabaseKeys();
