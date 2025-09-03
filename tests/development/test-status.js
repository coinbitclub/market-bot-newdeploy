const { createRobustPool, testConnection, safeQuery } = require('./fixed-database-config');
require('dotenv').config();

async function testStatusConstraint() {
    const pool = createRobustPool();
    await testConnection(pool);
    
    console.log('🔍 TESTANDO VALORES DE STATUS ACEITOS...\n');
    
    const statusValues = ['completed', 'COMPLETED', 'active', 'ACTIVE', 'success', 'SUCCESS'];
    
    for (const status of statusValues) {
        try {
            console.log(`⚡ Testando status: "${status}"`);
            
            const result = await safeQuery(pool, `
                INSERT INTO sistema_leitura_mercado (
                    cycle_id, btc_price, fear_greed_value, fear_greed_classification, fear_greed_direction,
                    status, market_direction, confidence_level, reasoning
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id
            `, [
                'test-' + Date.now(),
                60000,
                50,
                'Neutral',
                'NEUTRAL',
                status,
                'LONG',
                75,
                'Test constraint'
            ]);
            
            if (result.rows.length > 0) {
                console.log(`   ✅ "${status}" ACEITO (ID: ${result.rows[0].id})`);
                
                // Limpar o teste
                await safeQuery(pool, 'DELETE FROM sistema_leitura_mercado WHERE id = $1', [result.rows[0].id]);
            }
        } catch (error) {
            console.log(`   ❌ "${status}" REJEITADO: ${error.message.split('violates')[0]}...`);
        }
    }
    
    await pool.end();
}

testStatusConstraint().catch(console.error);
