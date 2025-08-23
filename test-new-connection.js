const { Pool } = require('pg');
require('dotenv').config();

// Teste de conectividade com novo banco Railway
console.log('🔄 Testando conectividade com novo banco Railway...');
console.log(`📍 Conectando em: ${process.env.DATABASE_URL?.substring(0, 50)}...`);

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function testarNovaConexao() {
    try {
        // Teste básico de conexão
        const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
        console.log('✅ Conexão estabelecida com sucesso!');
        console.log(`📅 Hora do servidor: ${result.rows[0].current_time}`);
        console.log(`🗄️ Versão PostgreSQL: ${result.rows[0].pg_version.split(' ')[1]}`);
        
        // Verificar estrutura básica
        const tablesResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        console.log(`\n📊 Tabelas encontradas (${tablesResult.rows.length}):`);
        tablesResult.rows.forEach(table => {
            console.log(`   - ${table.table_name}`);
        });
        
        // Verificar dados essenciais
        const usersCount = await pool.query('SELECT COUNT(*) as count FROM users WHERE 1=1');
        const signalsCount = await pool.query('SELECT COUNT(*) as count FROM trading_signals WHERE 1=1');
        
        console.log(`\n📈 Status dos dados:`);
        console.log(`   👥 Usuários: ${usersCount.rows[0].count}`);
        console.log(`   📊 Sinais: ${signalsCount.rows[0].count}`);
        
        console.log('\n✅ Base de dados pronta para produção!');
        
    } catch (error) {
        console.error('❌ Erro na conexão:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

testarNovaConexao()
.then(() => {
    console.log('\n🚀 Sistema pronto para iniciar!');
    process.exit(0);
})
.catch(error => {
    console.error('\n💥 Falha na inicialização:', error.message);
    process.exit(1);
});
