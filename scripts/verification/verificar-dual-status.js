const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkDualStatus() {
    const client = await pool.connect();
    
    try {
        console.log('📊 STATUS DO SISTEMA DUAL');
        console.log('=========================');
        
        // Verificar configurações
        const configs = await client.query(`
            SELECT config_key, config_value 
            FROM system_config 
            WHERE config_key LIKE '%DUAL%' OR config_key LIKE '%TRADING%' OR config_key LIKE '%BALANCE%'
            ORDER BY config_key
        `);
        
        console.log('\n⚙️ CONFIGURAÇÕES:');
        if (configs.rows.length > 0) {
            configs.rows.forEach(row => {
                console.log(`   ${row.config_key}: ${row.config_value}`);
            });
        } else {
            console.log('   Nenhuma configuração encontrada');
        }
        
        // Verificar usuários por tipo
        const userStats = await client.query(`
            SELECT 
                COALESCE(account_type, 'sem_tipo') as account_type,
                COUNT(*) as count,
                COUNT(CASE WHEN testnet_mode = true THEN 1 END) as testnet_count,
                COUNT(CASE WHEN testnet_mode = false THEN 1 END) as management_count
            FROM users 
            WHERE is_active = true OR ativo = true
            GROUP BY account_type
            ORDER BY account_type
        `);
        
        console.log('\n👥 USUÁRIOS POR TIPO:');
        userStats.rows.forEach(row => {
            console.log(`   ${row.account_type}: ${row.count} total`);
            if (row.testnet_count > 0) console.log(`     • Testnet: ${row.testnet_count}`);
            if (row.management_count > 0) console.log(`     • Management: ${row.management_count}`);
        });
        
        // Verificar se há colunas necessárias
        const columnCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name IN ('account_type', 'testnet_mode')
        `);
        
        console.log('\n🔧 COLUNAS NECESSÁRIAS:');
        const hasAccountType = columnCheck.rows.some(row => row.column_name === 'account_type');
        const hasTestnetMode = columnCheck.rows.some(row => row.column_name === 'testnet_mode');
        
        console.log(`   account_type: ${hasAccountType ? '✅' : '❌'}`);
        console.log(`   testnet_mode: ${hasTestnetMode ? '✅' : '❌'}`);
        
        // Status geral
        const isDualActive = configs.rows.some(row => 
            row.config_key === 'DUAL_MODE_ACTIVE' && row.config_value === 'true'
        );
        
        const isTradingEnabled = configs.rows.some(row => 
            row.config_key === 'ENABLE_REAL_TRADING' && row.config_value === 'true'
        );
        
        console.log('\n🎯 STATUS GERAL:');
        console.log(`   Modo Dual: ${isDualActive ? '✅ ATIVO' : '❌ INATIVO'}`);
        console.log(`   Trading Real: ${isTradingEnabled ? '✅ ATIVO' : '❌ INATIVO'}`);
        console.log(`   Colunas DB: ${hasAccountType && hasTestnetMode ? '✅ OK' : '❌ INCOMPLETO'}`);
        
        if (isDualActive && isTradingEnabled && hasAccountType && hasTestnetMode) {
            console.log('\n🚀 SISTEMA DUAL TOTALMENTE OPERACIONAL!');
        } else {
            console.log('\n⚠️ Sistema dual parcialmente configurado');
        }
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        client.release();
        process.exit(0);
    }
}

checkDualStatus();
