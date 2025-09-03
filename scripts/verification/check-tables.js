const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function checkAndCreateTables() {
    try {
        console.log('🔍 Verificando estrutura das tabelas...');
        
        // Verificar tabelas existentes
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('users', 'user_api_keys')
        `);
        
        console.log('📊 Tabelas encontradas:', tables.rows.map(r => r.table_name));
        
        // Verificar se user_api_keys existe
        const hasUserApiKeys = tables.rows.some(r => r.table_name === 'user_api_keys');
        
        if (!hasUserApiKeys) {
            console.log('🔧 Criando tabela user_api_keys...');
            
            await pool.query(`
                CREATE TABLE IF NOT EXISTS user_api_keys (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    exchange VARCHAR(50) NOT NULL DEFAULT 'binance',
                    api_key TEXT NOT NULL,
                    secret_key TEXT NOT NULL,
                    is_valid BOOLEAN DEFAULT NULL,
                    last_checked TIMESTAMP,
                    error_message TEXT,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(user_id, exchange)
                )
            `);
            
            console.log('✅ Tabela user_api_keys criada');
            
            // Migrar dados da tabela users se existirem
            const usersWithKeys = await pool.query(`
                SELECT id, api_key, secret_key 
                FROM users 
                WHERE api_key IS NOT NULL AND secret_key IS NOT NULL
            `);
            
            if (usersWithKeys.rows.length > 0) {
                console.log(`🔄 Migrando ${usersWithKeys.rows.length} chaves da tabela users...`);
                
                for (const user of usersWithKeys.rows) {
                    await pool.query(`
                        INSERT INTO user_api_keys (user_id, exchange, api_key, secret_key)
                        VALUES ($1, 'binance', $2, $3)
                        ON CONFLICT (user_id, exchange) DO NOTHING
                    `, [user.id, user.api_key, user.secret_key]);
                }
                
                console.log('✅ Migração concluída');
            }
        } else {
            console.log('✅ Tabela user_api_keys já existe');
            
            // Verificar estrutura
            const columns = await pool.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'user_api_keys'
                ORDER BY ordinal_position
            `);
            
            console.log('📋 Estrutura da tabela user_api_keys:');
            columns.rows.forEach(col => {
                console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
            });
        }
        
        // Verificar quantidade de chaves
        const keyCount = await pool.query('SELECT COUNT(*) FROM user_api_keys');
        console.log(`🔑 Total de chaves cadastradas: ${keyCount.rows[0].count}`);
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

checkAndCreateTables();
