require('dotenv').config();
const { Pool } = require('pg');

    const pool = new Pool({
        connectionString: 'process.env.DATABASE_URL'
    });async function verificarEstrutura() {
    try {
        // Verificar estrutura da tabela users
        const colunasUsers = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        `);

        console.log('📋 ESTRUTURA TABELA USERS:');
        colunasUsers.rows.forEach(col => {
            console.log(`- ${col.column_name}: ${col.data_type}`);
        });

        // Verificar usuários
        const usuarios = await pool.query('SELECT * FROM users LIMIT 2');
        console.log('\n👥 USUÁRIOS:');
        usuarios.rows.forEach((user, i) => {
            console.log(`${i+1}. ID: ${user.id} | Username: ${user.username} | Ativo: ${user.is_active}`);
            console.log(`   Balance: $${user.balance} | Trading: ${user.trading_enabled} | API: ${user.api_key_valid}`);
        });

        // Verificar último sinal processado
        const ultimoSinal = await pool.query(`
            SELECT * FROM signal_metrics_log 
            ORDER BY received_at DESC 
            LIMIT 1
        `);

        console.log('\n📊 ÚLTIMO SINAL:');
        const sinal = ultimoSinal.rows[0];
        console.log(`Tipo: ${sinal.signal_type} ${sinal.ticker}`);
        console.log(`IA Aprovado: ${sinal.ai_approved}`);
        console.log(`Motivo IA: ${sinal.ai_reason}`);
        console.log(`Processado: ${sinal.processed_at ? 'SIM' : 'NÃO'}`);

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

verificarEstrutura();
