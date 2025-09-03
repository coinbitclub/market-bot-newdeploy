const { Pool } = require('pg');
const crypto = require('crypto');

console.log('🔐 TESTE DE DESCRIPTOGRAFIA DE CHAVES API');
console.log('==========================================\n');

// Configuração da base de dados
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
    ssl: {
        rejectUnauthorized: false
    }
});

// Função de descriptografia (igual à do orchestrator)
function decryptUserKeys(encryptedKey, encryptedSecret) {
    const encryptionKey = process.env.ENCRYPTION_KEY || 'process.env.API_KEY_HERE';
    
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

        return { apiKey, apiSecret };

    } catch (error) {
        throw new Error('Erro ao descriptografar chaves: ' + error.message);
    }
}

async function testDecryption() {
    try {
        console.log('📊 Buscando usuários 14, 15, 16...\n');
        
        const result = await pool.query(`
            SELECT id, binance_api_key_encrypted, binance_api_secret_encrypted, bybit_api_key_encrypted, bybit_api_secret_encrypted 
            FROM users 
            WHERE id IN (14, 15, 16)
        `);
        
        if (result.rows.length === 0) {
            console.log('❌ Nenhum usuário encontrado');
            return;
        }
        
        for (const user of result.rows) {
            console.log(`\n👤 TESTANDO USUÁRIO ${user.id}`);
            console.log('='.repeat(40));
            
            // Verificar formato das chaves
            console.log('\n🔍 VERIFICAÇÃO DE FORMATO:');
            if (user.binance_api_key_encrypted) {
                console.log(`✅ Binance Key existe (${user.binance_api_key_encrypted.length} chars)`);
                console.log(`   Formato hex: ${/^[0-9a-f]+$/i.test(user.binance_api_key_encrypted)}`);
                console.log(`   Primeiros chars: ${user.binance_api_key_encrypted.substring(0, 20)}...`);
            } else {
                console.log('❌ Binance Key não existe');
            }
            
            if (user.binance_api_secret_encrypted) {
                console.log(`✅ Binance Secret existe (${user.binance_api_secret_encrypted.length} chars)`);
                console.log(`   Formato hex: ${/^[0-9a-f]+$/i.test(user.binance_api_secret_encrypted)}`);
                console.log(`   Primeiros chars: ${user.binance_api_secret_encrypted.substring(0, 20)}...`);
            } else {
                console.log('❌ Binance Secret não existe');
            }
            
            // Testar descriptografia Binance
            if (user.binance_api_key_encrypted && user.binance_api_secret_encrypted) {
                console.log('\n🔐 TESTE DESCRIPTOGRAFIA BINANCE:');
                try {
                    const binanceKeys = decryptUserKeys(user.binance_api_key_encrypted, user.binance_api_secret_encrypted);
                    console.log('✅ Descriptografia SUCESSO!');
                    console.log(`   API Key: ${binanceKeys.apiKey.substring(0, 8)}...${binanceKeys.apiKey.substring(-8)}`);
                    console.log(`   Secret: ${binanceKeys.apiSecret.substring(0, 8)}...${binanceKeys.apiSecret.substring(-8)}`);
                } catch (error) {
                    console.log('❌ Descriptografia FALHOU!');
                    console.log(`   Erro: ${error.message}`);
                    console.log(`   Stack: ${error.stack}`);
                }
            }
            
            // Testar descriptografia Bybit
            if (user.bybit_api_key_encrypted && user.bybit_api_secret_encrypted) {
                console.log('\n🔐 TESTE DESCRIPTOGRAFIA BYBIT:');
                try {
                    const bybitKeys = decryptUserKeys(user.bybit_api_key_encrypted, user.bybit_api_secret_encrypted);
                    console.log('✅ Descriptografia SUCESSO!');
                    console.log(`   API Key: ${bybitKeys.apiKey.substring(0, 8)}...${bybitKeys.apiKey.substring(-8)}`);
                    console.log(`   Secret: ${bybitKeys.apiSecret.substring(0, 8)}...${bybitKeys.apiSecret.substring(-8)}`);
                } catch (error) {
                    console.log('❌ Descriptografia FALHOU!');
                    console.log(`   Erro: ${error.message}`);
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Erro geral:', error.message);
    } finally {
        await pool.end();
    }
}

testDecryption();
