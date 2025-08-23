/**
 * 🔧 BUSCAR CHAVES REAIS NO BANCO
 */

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function buscarChaves() {
    try {
        console.log('🔍 Buscando chaves no banco...');
        
        // 1. Contar total
        const total = await pool.query('SELECT COUNT(*) FROM user_api_keys');
        console.log(`🔑 Total de chaves: ${total.rows[0].count}`);
        
        // 2. Listar todas
        const todas = await pool.query(`
            SELECT uak.id, uak.user_id, uak.exchange, uak.environment, 
                   uak.is_active, uak.api_key IS NOT NULL as has_api,
                   u.username, u.is_active as user_active
            FROM user_api_keys uak
            LEFT JOIN users u ON uak.user_id = u.id
        `);
        
        console.log(`📋 Detalhes das ${todas.rows.length} chaves:`);
        todas.rows.forEach(k => {
            const status = k.is_active && k.user_active && k.has_api ? '✅' : '❌';
            console.log(`   ${status} ID ${k.id}: ${k.username || 'SEM_USER'} - ${k.exchange} ${k.environment}`);
            console.log(`      User ativo: ${k.user_active} | Chave ativa: ${k.is_active} | Tem API: ${k.has_api}`);
        });
        
        // 3. Query do sistema
        const validas = await pool.query(`
            SELECT u.username, uak.exchange, uak.environment
            FROM users u
            JOIN user_api_keys uak ON u.id = uak.user_id
            WHERE u.is_active = true 
            AND uak.is_active = true
            AND uak.api_key IS NOT NULL
            AND uak.secret_key IS NOT NULL
        `);
        
        console.log(`\n🎯 Chaves válidas para o sistema: ${validas.rows.length}`);
        validas.rows.forEach(v => {
            console.log(`   ✅ ${v.username} - ${v.exchange} ${v.environment}`);
        });
        
        if (validas.rows.length === 0) {
            console.log('\n🔧 Aplicando correções...');
            
            // Ativar usuários
            const usersFixed = await pool.query('UPDATE users SET is_active = true WHERE is_active = false RETURNING username');
            console.log(`   👥 ${usersFixed.rows.length} usuários ativados`);
            
            // Ativar chaves
            const keysFixed = await pool.query('UPDATE user_api_keys SET is_active = true WHERE is_active = false RETURNING id');
            console.log(`   🔑 ${keysFixed.rows.length} chaves ativadas`);
            
            // Testar novamente
            const validasPos = await pool.query(`
                SELECT u.username, uak.exchange, uak.environment
                FROM users u
                JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE u.is_active = true 
                AND uak.is_active = true
                AND uak.api_key IS NOT NULL
                AND uak.secret_key IS NOT NULL
            `);
            
            console.log(`\n🎯 Após correções: ${validasPos.rows.length} chaves válidas`);
            validasPos.rows.forEach(v => {
                console.log(`   ✅ ${v.username} - ${v.exchange} ${v.environment}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

buscarChaves();
