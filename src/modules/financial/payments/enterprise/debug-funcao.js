/**
 * 🔧 DEBUG DA FUNÇÃO REGISTRAR SALDO DEVEDOR
 */

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function debugarFuncao() {
    try {
        console.log('🔍 Testando função registrar_saldo_devedor...');
        
        // Usar usuário existente
        const userId = '973c291c-3b69-41e4-9495-bfb9ecda998b';
        
        // Verificar saldo antes
        const antes = await pool.query('SELECT first_name, prepaid_credits, saldo_devedor_brl FROM users WHERE id = $1', [userId]);
        console.log('📊 Estado antes:', antes.rows[0]);
        
        // Executar função
        const resultado = await pool.query(`
            SELECT registrar_saldo_devedor($1, $2, $3, $4, $5) as result
        `, [userId, 9999, 50.00, 0.00, 'Teste debug']);
        
        console.log('🎯 Resultado da função:');
        console.log(JSON.stringify(resultado.rows[0].result, null, 2));
        
        // Verificar saldo depois
        const depois = await pool.query('SELECT first_name, prepaid_credits, saldo_devedor_brl FROM users WHERE id = $1', [userId]);
        console.log('📊 Estado depois:', depois.rows[0]);
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

debugarFuncao();
