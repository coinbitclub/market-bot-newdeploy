const { Pool } = require('pg');

async function verificarFusoHorario() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🕐 Verificando fuso horário e dados...\n');

        // Verificar timezone atual do PostgreSQL
        const timezoneQuery = await pool.query('SELECT NOW(), NOW() AT TIME ZONE \'America/Sao_Paulo\' as brasilia_time');
        console.log('🌍 TIMEZONE INFO:');
        console.log(`Hora UTC: ${timezoneQuery.rows[0].now}`);
        console.log(`Hora Brasília: ${timezoneQuery.rows[0].brasilia_time}\n`);

        // Verificar dados usando fuso correto
        const signalsQuery = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo' >= 
                      CURRENT_DATE AT TIME ZONE 'America/Sao_Paulo' THEN 1 END) as hoje_brasilia,
                MAX(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') as ultimo_sinal_brasilia,
                MAX(created_at) as ultimo_sinal_utc
            FROM trading_signals
        `);
        
        console.log('📊 TRADING_SIGNALS (Horário Brasília):');
        console.log(`Total de sinais: ${signalsQuery.rows[0].total}`);
        console.log(`Sinais hoje (Brasília): ${signalsQuery.rows[0].hoje_brasilia}`);
        console.log(`Último sinal (UTC): ${signalsQuery.rows[0].ultimo_sinal_utc}`);
        console.log(`Último sinal (Brasília): ${signalsQuery.rows[0].ultimo_sinal_brasilia}\n`);

        // Verificar últimos sinais detalhadamente
        const recentSignals = await pool.query(`
            SELECT 
                id,
                symbol,
                ai_decision,
                confidence,
                created_at as utc_time,
                created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo' as brasilia_time
            FROM trading_signals 
            ORDER BY created_at DESC 
            LIMIT 5
        `);

        console.log('🔍 ÚLTIMOS 5 SINAIS:');
        recentSignals.rows.forEach((signal, index) => {
            console.log(`${index + 1}. ID: ${signal.id} | Symbol: ${signal.symbol} | AI: ${signal.ai_decision}`);
            console.log(`   UTC: ${signal.utc_time} | Brasília: ${signal.brasilia_time}`);
        });

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

require('dotenv').config();
verificarFusoHorario();
