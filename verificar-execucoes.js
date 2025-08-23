require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function verificarExecucoes() {
    try {
        console.log('🔍 VERIFICANDO EXECUÇÕES RECENTES...\n');

        // Verificar últimos sinais
        const sinais = await pool.query(`
            SELECT * FROM signal_metrics_log 
            ORDER BY received_at DESC 
            LIMIT 5
        `);

        console.log('📊 ÚLTIMOS SINAIS RECEBIDOS:');
        sinais.rows.forEach((sinal, i) => {
            console.log(`${i+1}. ${sinal.signal_type} ${sinal.ticker} - ${sinal.received_at} - IA: ${sinal.ai_approved}`);
        });

        // Verificar posições abertas
        const posicoes = await pool.query(`
            SELECT users.name, positions.* 
            FROM positions 
            JOIN users ON positions.user_id = users.id 
            WHERE positions.status = 'OPEN'
            ORDER BY positions.created_at DESC
        `);

        console.log('\n📈 POSIÇÕES ABERTAS:');
        if (posicoes.rows.length === 0) {
            console.log('❌ NENHUMA POSIÇÃO ABERTA ENCONTRADA');
        } else {
            posicoes.rows.forEach((pos, i) => {
                console.log(`${i+1}. ${pos.name}: ${pos.side} ${pos.symbol} - Valor: $${pos.value} - Status: ${pos.status}`);
            });
        }

        // Verificar balances dos usuários
        const usuarios = await pool.query(`
            SELECT name, real_balance, admin_balance, commission_balance 
            FROM users 
            WHERE is_active = true
        `);

        console.log('\n💰 BALANCES DOS USUÁRIOS:');
        usuarios.rows.forEach((user, i) => {
            console.log(`${i+1}. ${user.name}: Real: $${user.real_balance} | Admin: $${user.admin_balance} | Comissão: $${user.commission_balance}`);
        });

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

verificarExecucoes();
