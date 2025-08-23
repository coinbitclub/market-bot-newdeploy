console.log('🔍 VERIFICAÇÃO RÁPIDA DO SISTEMA DUAL');

const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

pool.connect()
.then(client => {
    return client.query("SELECT config_key, config_value FROM system_config WHERE config_key LIKE '%DUAL%' OR config_key LIKE '%TRADING%'")
    .then(result => {
        console.log('\n⚙️ CONFIGURAÇÕES:');
        result.rows.forEach(row => console.log(`${row.config_key}: ${row.config_value}`));
        
        return client.query("SELECT account_type, COUNT(*) as count FROM users WHERE account_type IS NOT NULL GROUP BY account_type");
    })
    .then(result => {
        console.log('\n👥 USUÁRIOS:');
        result.rows.forEach(row => console.log(`${row.account_type}: ${row.count}`));
        
        client.release();
        console.log('\n✅ VERIFICAÇÃO CONCLUÍDA');
    });
})
.catch(err => {
    console.error('❌ ERRO:', err.message);
});
