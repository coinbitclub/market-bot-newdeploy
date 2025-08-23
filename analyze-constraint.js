const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function analyzeConstraint() {
    try {
        console.log('🔍 ANALISANDO CONSTRAINT DE DUPLICAÇÃO...\n');
        
        // 1. Verificar detalhes da constraint
        const constraintDetails = await pool.query(`
            SELECT 
                tc.constraint_name, 
                tc.table_name, 
                kcu.column_name,
                tc.constraint_type
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            WHERE tc.constraint_name = 'balances_user_id_asset_account_type_key'
            ORDER BY kcu.ordinal_position;
        `);
        
        console.log('Constraint details:');
        constraintDetails.rows.forEach(row => {
            console.log(`  Constraint: ${row.constraint_name}`);
            console.log(`  Table: ${row.table_name}`);
            console.log(`  Column: ${row.column_name}`);
            console.log(`  Type: ${row.constraint_type}`);
            console.log('');
        });
        
        // 2. Verificar valores de account_type
        const accountTypes = await pool.query(`
            SELECT DISTINCT account_type 
            FROM balances 
            WHERE account_type IS NOT NULL
        `);
        
        console.log('Account types encontrados:');
        accountTypes.rows.forEach(row => {
            console.log(`  - ${row.account_type}`);
        });
        
        // 3. Tentar insert com account_type
        console.log('\n🔧 Testando insert com account_type:');
        
        try {
            await pool.query(`
                DELETE FROM balances 
                WHERE user_id = 16 AND exchange = 'bybit'
            `);
            
            await pool.query(`
                INSERT INTO balances (user_id, exchange, wallet_balance, asset, account_type, created_at, last_updated)
                VALUES (16, 'bybit', 146.98, 'USDT', 'UNIFIED', NOW(), NOW())
            `);
            
            console.log('  ✅ Insert com account_type funcionou!');
            
        } catch (error) {
            console.log(`  ❌ Erro: ${error.message}`);
        }
        
        // 4. Verificar registros finais
        const finalRecords = await pool.query(`
            SELECT user_id, exchange, wallet_balance, asset, account_type
            FROM balances
            ORDER BY created_at DESC
        `);
        
        console.log('\n📊 Registros finais:');
        finalRecords.rows.forEach(record => {
            console.log(`  User ${record.user_id} (${record.exchange}): $${record.wallet_balance} ${record.asset} [${record.account_type || 'NULL'}]`);
        });
        
        await pool.end();
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        await pool.end();
    }
}

analyzeConstraint();
