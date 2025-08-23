const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function verificarPosicoes() {
    console.log('🔍 VERIFICANDO POSIÇÕES ATIVAS');
    try {
        const estrutura = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'active_positions'`);
        console.log('Colunas:', estrutura.rows.map(r => r.column_name));
        
        const dados = await pool.query('SELECT * FROM active_positions LIMIT 3');
        console.log('Registros:', dados.rows.length);
        if(dados.rows.length > 0) console.log('Amostra:', dados.rows[0]);
        
        // Verificar user_positions também
        console.log('\n🔍 VERIFICANDO USER_POSITIONS');
        const userPos = await pool.query('SELECT COUNT(*) as total FROM user_positions');
        console.log('Total user_positions:', userPos.rows[0].total);
        
        if(parseInt(userPos.rows[0].total) > 0) {
            const sample = await pool.query('SELECT * FROM user_positions LIMIT 2');
            console.log('Amostra user_positions:', sample.rows[0]);
        }
        
    } catch (error) {
        console.error('Erro:', error.message);
    }
    await pool.end();
}
verificarPosicoes();
