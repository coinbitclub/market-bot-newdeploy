console.log('🔥 TESTE DIRETO - INICIO');
console.log('========================');
console.log('Node.js versão:', process.version);
console.log('Plataforma:', process.platform);
console.log('Timestamp:', new Date().toISOString());

// Teste básico de conexão com banco
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function testeRapido() {
    try {
        console.log('\n🔗 Testando conexão com banco...');
        const result = await pool.query('SELECT NOW() as timestamp, COUNT(*) as users FROM users');
        console.log('✅ Conectado!');
        console.log('🕒 Server time:', result.rows[0].timestamp);
        console.log('👥 Users count:', result.rows[0].users);
        
        // Buscar chaves API
        console.log('\n🔑 Buscando chaves API...');
        const keys = await pool.query(`
            SELECT u.username, uak.exchange, uak.environment,
                   LENGTH(uak.api_key) as key_len,
                   LENGTH(uak.secret_key) as secret_len
            FROM users u 
            JOIN user_api_keys uak ON u.id = uak.user_id 
            WHERE u.is_active = true AND uak.is_active = true
        `);
        
        console.log(`📊 Encontradas ${keys.rows.length} chaves:`);
        keys.rows.forEach((key, i) => {
            console.log(`   ${i+1}. ${key.username} - ${key.exchange} (${key.environment})`);
            console.log(`      Key: ${key.key_len} chars | Secret: ${key.secret_len} chars`);
        });
        
        await pool.end();
        console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO!');
        return true;
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        await pool.end();
        return false;
    }
}

testeRapido().then(success => {
    console.log('\n🏁 FIM DO TESTE');
    console.log(`Resultado: ${success ? 'SUCESSO' : 'FALHOU'}`);
}).catch(err => {
    console.error('💥 Erro fatal:', err.message);
});
