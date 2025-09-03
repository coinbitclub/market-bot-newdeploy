const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function fixDuplicateConstraint() {
    try {
        console.log('🔧 CORRIGINDO CONSTRAINT DE DUPLICAÇÃO...\n');
        
        // 1. Verificar constraints atuais
        console.log('1️⃣ Verificando constraints atuais:');
        const constraints = await pool.query(`
            SELECT conname, contype 
            FROM pg_constraint 
            WHERE conrelid = 'balances'::regclass
        `);
        
        constraints.rows.forEach(constraint => {
            console.log(`  - ${constraint.conname}: ${constraint.contype}`);
        });
        
        // 2. Limpar registros antigos
        console.log('\n2️⃣ Limpando registros antigos:');
        const deleteResult = await pool.query('DELETE FROM balances WHERE created_at < NOW() - INTERVAL \'1 hour\'');
        console.log(`  ✅ Removidos ${deleteResult.rowCount} registros antigos`);
        
        // 3. Verificar registros atuais
        console.log('\n3️⃣ Registros atuais:');
        const currentRecords = await pool.query(`
            SELECT b.user_id, b.exchange, b.asset, b.wallet_balance, u.username
            FROM balances b
            JOIN users u ON b.user_id = u.id
            ORDER BY b.created_at DESC
        `);
        
        console.log(`Registros encontrados: ${currentRecords.rows.length}`);
        currentRecords.rows.forEach(record => {
            console.log(`  ${record.username} (${record.exchange}): $${record.wallet_balance} ${record.asset}`);
        });
        
        // 4. Criar nova estratégia de insert
        console.log('\n4️⃣ Testando insert com UPSERT:');
        
        // Dados de teste
        const testData = [
            { user_id: 15, exchange: 'bybit', balance: 236.70 },
            { user_id: 16, exchange: 'bybit', balance: 146.98 }
        ];
        
        for (const data of testData) {
            try {
                // Delete e Insert em vez de UPSERT
                await pool.query(`
                    DELETE FROM balances 
                    WHERE user_id = $1 AND exchange = $2 AND asset = 'USDT'
                `, [data.user_id, data.exchange]);
                
                await pool.query(`
                    INSERT INTO balances (user_id, exchange, wallet_balance, asset, created_at, last_updated)
                    VALUES ($1, $2, $3, 'USDT', NOW(), NOW())
                `, [data.user_id, data.exchange, data.balance]);
                
                console.log(`  ✅ User ${data.user_id} (${data.exchange}): $${data.balance}`);
                
            } catch (error) {
                console.log(`  ❌ Erro User ${data.user_id}: ${error.message}`);
            }
        }
        
        // 5. Verificar resultado final
        console.log('\n5️⃣ Verificando resultado final:');
        const finalRecords = await pool.query(`
            SELECT b.user_id, b.exchange, b.asset, b.wallet_balance, u.username, b.created_at
            FROM balances b
            JOIN users u ON b.user_id = u.id
            ORDER BY b.created_at DESC
        `);
        
        console.log(`Total de registros: ${finalRecords.rows.length}`);
        finalRecords.rows.forEach(record => {
            console.log(`  ${record.username} (${record.exchange}): $${record.wallet_balance} ${record.asset} - ${record.created_at}`);
        });
        
        await pool.end();
        console.log('\n✅ Correção de constraints concluída!');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        await pool.end();
    }
}

fixDuplicateConstraint();
