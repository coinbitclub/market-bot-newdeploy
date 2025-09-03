const { createRobustPool, testConnection, safeQuery } = require('./fixed-database-config');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

async function testStatusValues() {
    const pool = createRobustPool();
    await testConnection(pool);
    
    console.log('🔍 TESTANDO VALORES DE STATUS PERMITIDOS...\n');
    
    // Teste direto com valores mais prováveis
    const statusList = [
        'ACTIVE',
        'COMPLETED', 
        'SUCCESS',
        'FINISHED',
        'DONE',
        'completed',
        'active',
        'success',
        'finished',
        'done'
    ];
    
    for (const status of statusList) {
        try {
            const testId = uuidv4();
            
            const result = await safeQuery(pool, `
                INSERT INTO sistema_leitura_mercado (
                    cycle_id, cycle_number, btc_price, fear_greed_value, 
                    fear_greed_classification, fear_greed_direction, 
                    market_direction, confidence_level, reasoning, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id
            `, [
                testId,     // cycle_id
                1,          // cycle_number  
                60000,      // btc_price
                50,         // fear_greed_value
                'Neutral',  // fear_greed_classification
                'NEUTRAL',  // fear_greed_direction
                'LONG',     // market_direction
                75,         // confidence_level
                'Test',     // reasoning
                status      // status
            ]);
            
            if (result.rows.length > 0) {
                console.log(`✅ "${status}" ACEITO (ID: ${result.rows[0].id})`);
                
                // Limpar teste
                await safeQuery(pool, 'DELETE FROM sistema_leitura_mercado WHERE id = $1', [result.rows[0].id]);
                
                // Parar no primeiro que der certo
                console.log(`\n🎯 VALOR CORRETO ENCONTRADO: "${status}"`);
                break;
            }
        } catch (error) {
            console.log(`❌ "${status}" REJEITADO: ${error.message.substring(0, 80)}...`);
        }
    }
    
    await pool.end();
}

testStatusValues().catch(console.error);
