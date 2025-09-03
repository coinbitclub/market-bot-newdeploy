require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function analiseCompleta() {
    try {
        console.log('🔍 ANÁLISE COMPLETA DO SISTEMA...\n');

        // 1. Últimos sinais
        const sinais = await pool.query(`
            SELECT * FROM signal_metrics_log 
            ORDER BY received_at DESC 
            LIMIT 3
        `);

        console.log('📊 ÚLTIMOS SINAIS:');
        sinais.rows.forEach((sinal, i) => {
            console.log(`${i+1}. ${sinal.signal_type} ${sinal.ticker} - IA Aprovado: ${sinal.ai_approved} - Motivo: ${sinal.ai_reason || 'N/A'}`);
        });

        // 2. Usuários ativos
        const usuarios = await pool.query(`
            SELECT username, real_balance, admin_balance, trading_enabled, api_key_valid
            FROM users 
            WHERE is_active = true
        `);

        console.log('\n👥 USUÁRIOS ATIVOS:');
        usuarios.rows.forEach((user, i) => {
            console.log(`${i+1}. ${user.username}: Real: $${user.real_balance} | Trading: ${user.trading_enabled} | API: ${user.api_key_valid}`);
        });

        // 3. Posições
        const posicoes = await pool.query(`
            SELECT COUNT(*) as total_abertas FROM positions WHERE status = 'OPEN'
        `);

        console.log(`\n📈 POSIÇÕES ABERTAS: ${posicoes.rows[0].total_abertas}`);

        // 4. Estatísticas
        const stats = await pool.query(`
            SELECT 
                COUNT(*) as total_sinais,
                COUNT(CASE WHEN ai_approved = true THEN 1 END) as aprovados_ia,
                COUNT(CASE WHEN processed_at IS NOT NULL THEN 1 END) as processados
            FROM signal_metrics_log
        `);

        console.log('\n📊 ESTATÍSTICAS:');
        console.log(`Total de sinais: ${stats.rows[0].total_sinais}`);
        console.log(`Aprovados pela IA: ${stats.rows[0].aprovados_ia}`);
        console.log(`Processados: ${stats.rows[0].processados}`);

        // 5. Diagnóstico
        console.log('\n🔍 DIAGNÓSTICO:');
        if (usuarios.rows.length === 0) {
            console.log('❌ PROBLEMA: Nenhum usuário ativo encontrado');
        } else if (usuarios.rows.every(u => !u.trading_enabled)) {
            console.log('❌ PROBLEMA: Nenhum usuário com trading habilitado');
        } else if (usuarios.rows.every(u => !u.api_key_valid)) {
            console.log('❌ PROBLEMA: Nenhum usuário com API key válida');
        } else if (usuarios.rows.every(u => u.real_balance < 10)) {
            console.log('❌ PROBLEMA: Usuários sem saldo suficiente');
        } else {
            console.log('✅ USUÁRIOS: Configuração OK');
            
            if (sinais.rows.length > 0 && sinais.rows.every(s => !s.ai_approved)) {
                console.log('❌ PROBLEMA: IA rejeitando todos os sinais');
            } else {
                console.log('✅ SINAIS: Sendo processados');
            }
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

analiseCompleta();
