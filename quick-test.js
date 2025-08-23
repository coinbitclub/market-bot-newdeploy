const { Pool } = require('pg');

console.log('🔐 TESTE SIMPLES DE CHAVES');
console.log('=========================\n');

const pool = new Pool({
    connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function quickTest() {
    try {
        console.log('📊 Testando conexão...');
        const result = await pool.query('SELECT id, binance_api_key_encrypted FROM users WHERE id = 14 LIMIT 1');
        
        if (result.rows.length > 0) {
            const user = result.rows[0];
            console.log('✅ Usuário 14 encontrado');
            console.log('🔍 Binance Key existe:', !!user.binance_api_key_encrypted);
            
            if (user.binance_api_key_encrypted) {
                console.log('📏 Tamanho da chave:', user.binance_api_key_encrypted.length);
                console.log('🔢 Formato hex:', /^[0-9a-f]+$/i.test(user.binance_api_key_encrypted));
                console.log('👀 Primeiros 30 chars:', user.binance_api_key_encrypted.substring(0, 30));
            }
        } else {
            console.log('❌ Usuário 14 não encontrado');
        }
        
        await pool.end();
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        await pool.end();
    }
}

quickTest();
