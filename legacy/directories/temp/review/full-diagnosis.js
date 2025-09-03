const { Pool } = require('pg');
const crypto = require('crypto');

console.log('🔍 DIAGNÓSTICO COMPLETO DE CHAVES API');
console.log('=====================================\n');

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

// Função para tentar diferentes chaves de encriptação
function testDecryption(encryptedKey, encryptedSecret, encryptionKey) {
    try {
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(encryptionKey, 'salt', 32);

        // Descriptografar API Key
        const keyBuffer = Buffer.from(encryptedKey, 'hex');
        const keyIv = keyBuffer.slice(0, 16);
        const keyEncrypted = keyBuffer.slice(16);
        const keyDecipher = crypto.createDecipheriv(algorithm, key, keyIv);
        const apiKey = keyDecipher.update(keyEncrypted, null, 'utf8') + keyDecipher.final('utf8');

        // Descriptografar API Secret
        const secretBuffer = Buffer.from(encryptedSecret, 'hex');
        const secretIv = secretBuffer.slice(0, 16);
        const secretEncrypted = secretBuffer.slice(16);
        const secretDecipher = crypto.createDecipheriv(algorithm, key, secretIv);
        const apiSecret = secretDecipher.update(secretEncrypted, null, 'utf8') + secretDecipher.final('utf8');

        return { success: true, apiKey, apiSecret };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function fullDiagnosis() {
    try {
        console.log('📊 1. VERIFICANDO ESTRUTURA DA TABELA...');
        const columns = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name LIKE '%api%'
            ORDER BY column_name
        `);
        
        console.log('   Colunas de API encontradas:');
        columns.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });

        console.log('\n📊 2. VERIFICANDO USUÁRIOS ATIVOS...');
        const users = await pool.query(`
            SELECT id, username, is_active,
                   binance_api_key_encrypted, binance_api_secret_encrypted,
                   bybit_api_key_encrypted, bybit_api_secret_encrypted
            FROM users 
            WHERE is_active = true
            ORDER BY id
        `);

        console.log(`   Total de usuários ativos: ${users.rows.length}`);

        for (const user of users.rows) {
            console.log(`\n👤 USUÁRIO ID ${user.id} (${user.username || 'Sem nome'})`);
            console.log('=' .repeat(50));

            // Verificar Binance
            if (user.binance_api_key_encrypted && user.binance_api_secret_encrypted) {
                console.log('\n🟡 BINANCE:');
                console.log(`   Key length: ${user.binance_api_key_encrypted.length}`);
                console.log(`   Secret length: ${user.binance_api_secret_encrypted.length}`);
                console.log(`   Key format hex: ${/^[0-9a-f]+$/i.test(user.binance_api_key_encrypted)}`);
                console.log(`   Secret format hex: ${/^[0-9a-f]+$/i.test(user.binance_api_secret_encrypted)}`);
                
                // Testar diferentes chaves de encriptação
                const encryptionKeys = [
                    process.env.ENCRYPTION_KEY || 'process.env.API_KEY_HERE',
                    'process.env.API_KEY_HERE',
                    'coinbitclub2024',
                    'your-secret-key-here'
                ];

                console.log('\n   🔐 TESTANDO DESCRIPTOGRAFIA:');
                for (const testKey of encryptionKeys) {
                    const result = testDecryption(
                        user.binance_api_key_encrypted, 
                        user.binance_api_secret_encrypted, 
                        testKey
                    );
                    
                    if (result.success) {
                        console.log(`   ✅ SUCESSO com chave: ${testKey.substring(0, 10)}...`);
                        console.log(`      API Key decrypted: ${result.apiKey.substring(0, 8)}...${result.apiKey.substring(-4)}`);
                        console.log(`      Secret decrypted: ${result.apiSecret.substring(0, 8)}...${result.apiSecret.substring(-4)}`);
                        break;
                    } else {
                        console.log(`   ❌ FALHOU com chave: ${testKey.substring(0, 10)}... (${result.error})`);
                    }
                }
            } else {
                console.log('\n🟡 BINANCE: Chaves não configuradas');
            }

            // Verificar Bybit
            if (user.bybit_api_key_encrypted && user.bybit_api_secret_encrypted) {
                console.log('\n🟡 BYBIT:');
                console.log(`   Key length: ${user.bybit_api_key_encrypted.length}`);
                console.log(`   Secret length: ${user.bybit_api_secret_encrypted.length}`);
                console.log(`   Key format hex: ${/^[0-9a-f]+$/i.test(user.bybit_api_key_encrypted)}`);
                console.log(`   Secret format hex: ${/^[0-9a-f]+$/i.test(user.bybit_api_secret_encrypted)}`);
            } else {
                console.log('\n🟡 BYBIT: Chaves não configuradas');
            }
        }

        console.log('\n📊 3. VERIFICANDO VARIÁVEIS DE AMBIENTE...');
        console.log(`   ENCRYPTION_KEY definida: ${!!process.env.ENCRYPTION_KEY}`);
        console.log(`   ENCRYPTION_KEY value: ${process.env.ENCRYPTION_KEY || 'process.env.API_KEY_HERE'}`);

        await pool.end();

    } catch (error) {
        console.error('❌ Erro:', error.message);
        console.error('Stack:', error.stack);
        await pool.end();
    }
}

fullDiagnosis();
