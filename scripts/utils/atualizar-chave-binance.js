require('dotenv').config();
const { Pool } = require('pg');

async function atualizarChaveBinanceValida() {
    let dbConfig;
    if (process.env.DATABASE_URL) {
        dbConfig = {
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        };
    } else {
        dbConfig = {
            host: process.env.DB_HOST || 'trolley.proxy.rlwy.net',
            port: process.env.DB_PORT || 44790,
            database: process.env.DB_NAME || 'railway',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD,
            ssl: { rejectUnauthorized: false }
        };
    }

    const pool = new Pool(dbConfig);

    try {
        console.log('🔍 Verificando chaves Binance do usuário ID 16...');
        
        // Verificar chaves existentes
        const result = await pool.query(`
            SELECT id, user_id, exchange, api_key, validation_status, environment
            FROM user_api_keys 
            WHERE user_id = 16 AND exchange = 'binance'
            ORDER BY id
        `);

        console.log('📊 Chaves encontradas:');
        result.rows.forEach(row => {
            console.log(`   ID: ${row.id} | Key: ${row.api_key} | Status: ${row.validation_status} | Env: ${row.environment}`);
        });

        if (result.rows.length > 0) {
            const chaveId = result.rows[0].id;
            
            console.log('\n🔄 Atualizando chave como válida...');
            
            // Atualizar a chave como válida
            await pool.query(`
                UPDATE user_api_keys 
                SET validation_status = 'valid', 
                    last_validated = NOW(),
                    last_used = NOW(),
                    usage_count = COALESCE(usage_count, 0) + 1,
                    environment = 'mainnet',
                    is_testnet = false
                WHERE id = $1
            `, [chaveId]);

            console.log(`✅ Chave ID ${chaveId} atualizada como válida (mainnet)`);

            // Verificar a atualização
            const updated = await pool.query(`
                SELECT validation_status, environment, last_validated 
                FROM user_api_keys 
                WHERE id = $1
            `, [chaveId]);

            console.log('📋 Status atualizado:', updated.rows[0]);
        }

        await pool.end();
        console.log('\n✅ Processo concluído!');

    } catch (error) {
        console.error('❌ Erro:', error.message);
        process.exit(1);
    }
}

atualizarChaveBinanceValida();
