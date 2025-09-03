const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function verificarEstrutura() {
    try {
        console.log('📊 Verificando estrutura da tabela users...');
        
        const colunas = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        `);

        console.log('\n🔍 Colunas encontradas:');
        colunas.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
        });

        console.log('\n📋 Testando inserção simples...');
        
        // Tentar inserir usando as colunas que sabemos que existem
        const testUser = await pool.query(`
            INSERT INTO users (name, email, balance_brl, balance_usd) 
            VALUES ('Test User', 'test@example.com', 100.00, 20.00) 
            RETURNING id, name, email
        `);

        console.log('✅ Usuário de teste criado:', testUser.rows[0]);

        // Remover usuário de teste
        await pool.query('DELETE FROM users WHERE id = $1', [testUser.rows[0].id]);
        console.log('🗑️ Usuário de teste removido');

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

verificarEstrutura();
