const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function investigateKeys() {
    const client = await pool.connect();
    
    try {
        console.log('🔑 INVESTIGAÇÃO DAS CHAVES NO BANCO');
        console.log('===================================');

        // 1. Verificar todas as chaves
        const allKeys = await client.query(`
            SELECT 
                id, 
                username,
                account_type,
                testnet_mode,
                exchange_testnet_mode,
                bybit_api_key IS NOT NULL as has_bybit_key,
                binance_api_key IS NOT NULL as has_binance_key,
                bybit_api_key_encrypted IS NOT NULL as has_bybit_encrypted,
                binance_api_key_encrypted IS NOT NULL as has_binance_encrypted,
                LENGTH(bybit_api_key) as bybit_key_length,
                LENGTH(binance_api_key) as binance_key_length,
                LEFT(COALESCE(bybit_api_key, ''), 10) as bybit_preview,
                LEFT(COALESCE(binance_api_key, ''), 10) as binance_preview
            FROM users 
            WHERE (bybit_api_key IS NOT NULL OR binance_api_key IS NOT NULL OR 
                   bybit_api_key_encrypted IS NOT NULL OR binance_api_key_encrypted IS NOT NULL)
            AND (is_active = true OR ativo = true)
            ORDER BY id
        `);

        console.log(`\n📊 TOTAL DE USUÁRIOS COM CHAVES: ${allKeys.rows.length}`);
        console.log('');

        allKeys.rows.forEach(user => {
            console.log(`ID ${user.id} (${user.username}):`);
            console.log(`  Account Type: ${user.account_type || 'não definido'}`);
            console.log(`  Testnet Mode: ${user.testnet_mode}`);
            console.log(`  Exchange Testnet: ${user.exchange_testnet_mode}`);
            console.log(`  Bybit: ${user.has_bybit_key ? `✅ (${user.bybit_key_length} chars)` : '❌'} | Encrypted: ${user.has_bybit_encrypted ? '✅' : '❌'}`);
            console.log(`  Binance: ${user.has_binance_key ? `✅ (${user.binance_key_length} chars)` : '❌'} | Encrypted: ${user.has_binance_encrypted ? '✅' : '❌'}`);
            
            if (user.bybit_preview && user.bybit_preview !== '') {
                console.log(`  Bybit Preview: ${user.bybit_preview}...`);
            }
            if (user.binance_preview && user.binance_preview !== '') {
                console.log(`  Binance Preview: ${user.binance_preview}...`);
            }
            console.log('');
        });

        // 2. Verificar tipos de chave por exchange
        const keyTypes = await client.query(`
            SELECT 
                'Bybit' as exchange,
                COUNT(CASE WHEN account_type = 'testnet' THEN 1 END) as testnet_keys,
                COUNT(CASE WHEN account_type = 'management' THEN 1 END) as management_keys,
                COUNT(*) as total_keys
            FROM users 
            WHERE bybit_api_key IS NOT NULL 
            AND (is_active = true OR ativo = true)
            
            UNION ALL
            
            SELECT 
                'Binance' as exchange,
                COUNT(CASE WHEN account_type = 'testnet' THEN 1 END) as testnet_keys,
                COUNT(CASE WHEN account_type = 'management' THEN 1 END) as management_keys,
                COUNT(*) as total_keys
            FROM users 
            WHERE binance_api_key IS NOT NULL 
            AND (is_active = true OR ativo = true)
        `);

        console.log('📈 DISTRIBUIÇÃO DAS CHAVES:');
        console.log('===========================');
        keyTypes.rows.forEach(row => {
            console.log(`${row.exchange}:`);
            console.log(`  Testnet: ${row.testnet_keys} chaves`);
            console.log(`  Management: ${row.management_keys} chaves`);
            console.log(`  Total: ${row.total_keys} chaves`);
            console.log('');
        });

        // 3. Verificar se as chaves estão sendo lidas corretamente no código
        console.log('🔍 TESTE DE LEITURA DAS CHAVES:');
        console.log('===============================');

        for (const user of allKeys.rows) {
            if (user.has_bybit_key) {
                const keyData = await client.query(`
                    SELECT 
                        bybit_api_key,
                        bybit_api_secret IS NOT NULL as has_secret,
                        account_type,
                        testnet_mode
                    FROM users 
                    WHERE id = $1
                `, [user.id]);

                const key = keyData.rows[0];
                console.log(`ID ${user.id} Bybit:`);
                console.log(`  Key exists: ${key.bybit_api_key ? '✅' : '❌'}`);
                console.log(`  Secret exists: ${key.has_secret ? '✅' : '❌'}`);
                console.log(`  Account type: ${key.account_type}`);
                console.log(`  Should use testnet: ${key.testnet_mode}`);
                
                // Determinar URL correta
                const isTestnet = key.account_type === 'testnet' || key.testnet_mode === true;
                const baseUrl = isTestnet ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com';
                console.log(`  Expected URL: ${baseUrl}`);
                console.log('');
            }
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        client.release();
        process.exit(0);
    }
}

investigateKeys();
