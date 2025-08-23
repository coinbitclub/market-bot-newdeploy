const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function checkFearGreed() {
    try {
        console.log('🔍 VERIFICANDO FEAR & GREED INDEX');
        console.log('==================================');
        
        // 1. Verificar logs de fear & greed
        const fearGreedLogs = await pool.query(`
            SELECT component, message, timestamp, data 
            FROM system_logs 
            WHERE component LIKE '%fear%' OR component LIKE '%greed%'
            ORDER BY timestamp DESC 
            LIMIT 10
        `);
        
        console.log(`📊 Logs Fear & Greed encontrados: ${fearGreedLogs.rows.length}`);
        
        if (fearGreedLogs.rows.length > 0) {
            console.log('\n📋 Últimos registros:');
            fearGreedLogs.rows.forEach((row, index) => {
                const data = row.data || {};
                console.log(`${index + 1}. [${row.component}] ${row.message}`);
                console.log(`   Timestamp: ${row.timestamp}`);
                if (data.value) console.log(`   Valor: ${data.value} (${data.classification})`);
            });
        } else {
            console.log('❌ Nenhum dado de Fear & Greed encontrado nos logs');
        }
        
        // 2. Verificar se há tabela específica
        const fearGreedTable = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'fear_greed_index'
            )
        `);
        
        console.log(`\n📊 Tabela fear_greed_index existe: ${fearGreedTable.rows[0].exists}`);
        
        // 3. Verificar últimas coletas de BTC dominance (que pode incluir Fear & Greed)
        const btcLogs = await pool.query(`
            SELECT component, message, timestamp, data 
            FROM system_logs 
            WHERE component LIKE '%btc%' OR component LIKE '%dominance%'
            ORDER BY timestamp DESC 
            LIMIT 5
        `);
        
        console.log(`\n📈 Logs BTC Dominance: ${btcLogs.rows.length}`);
        btcLogs.rows.forEach((row, index) => {
            console.log(`${index + 1}. [${row.component}] ${row.message} - ${row.timestamp}`);
        });
        
        // 4. Status atual do sistema
        console.log('\n🎯 STATUS ATUAL:');
        console.log(`   Fear & Greed: ${fearGreedLogs.rows.length > 0 ? '✅ ATIVO' : '❌ INATIVO'}`);
        console.log(`   BTC Dominance: ${btcLogs.rows.length > 0 ? '✅ ATIVO' : '❌ INATIVO'}`);
        console.log(`   Tabela dedicada: ${fearGreedTable.rows[0].exists ? '✅ SIM' : '❌ NÃO'}`);
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

checkFearGreed();
