const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkConfig() {
    const client = await pool.connect();
    
    try {
        // Verificar se system_config existe
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'system_config'
        `);
        
        console.log('system_config exists:', tables.rows.length > 0);
        
        if (tables.rows.length > 0) {
            const columns = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'system_config'
            `);
            console.log('Columns:', columns.rows);
        } else {
            console.log('Creating system_config table...');
            await client.query(`
                CREATE TABLE system_config (
                    id SERIAL PRIMARY KEY,
                    config_key VARCHAR(100) UNIQUE NOT NULL,
                    config_value TEXT NOT NULL,
                    description TEXT,
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);
            console.log('system_config table created');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        client.release();
        process.exit(0);
    }
}

checkConfig();
