const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function investigateUsersSimple() {
    try {
        console.log('🔍 INVESTIGANDO PORQUE NÃO ENCONTRA USUÁRIOS VÁLIDOS...\n');
        
        // 1. Verificar total de usuários
        console.log('1️⃣ TOTAL DE USUÁRIOS:');
        const usersCount = await pool.query('SELECT COUNT(*) as total FROM users');
        console.log(`Total: ${usersCount.rows[0].total}`);
        
        // 2. Verificar total de chaves API
        console.log('\n2️⃣ TOTAL DE CHAVES API:');
        const keysCount = await pool.query('SELECT COUNT(*) as total FROM user_api_keys');
        console.log(`Total: ${keysCount.rows[0].total}`);
        
        // 3. Verificar estrutura da tabela user_api_keys
        console.log('\n3️⃣ ESTRUTURA DA TABELA user_api_keys:');
        const structure = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'user_api_keys' 
            ORDER BY ordinal_position
        `);
        
        structure.rows.forEach(col => {
            console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
        });
        
        // 4. Verificar chaves não nulas
        console.log('\n4️⃣ VERIFICANDO CAMPOS COM DADOS:');
        const apiFields = structure.rows
            .filter(col => col.column_name.includes('api') || col.column_name.includes('key') || col.column_name.includes('secret'))
            .map(col => col.column_name);
        
        for (const field of apiFields) {
            try {
                const count = await pool.query(`SELECT COUNT(*) as total FROM user_api_keys WHERE ${field} IS NOT NULL AND ${field} != ''`);
                console.log(`  ${field}: ${count.rows[0].total} registros não vazios`);
            } catch (error) {
                console.log(`  ${field}: Erro - ${error.message}`);
            }
        }
        
        // 5. Verificar alguns registros
        console.log('\n5️⃣ AMOSTRA DE REGISTROS:');
        const sample = await pool.query('SELECT * FROM user_api_keys LIMIT 3');
        console.log('Encontrados:', sample.rows.length);
        
        if (sample.rows.length > 0) {
            console.log('Colunas:', Object.keys(sample.rows[0]));
            sample.rows.forEach((row, index) => {
                console.log(`\nRegistro ${index + 1}:`);
                Object.entries(row).forEach(([key, value]) => {
                    if (key.includes('api') || key.includes('key') || key.includes('secret')) {
                        console.log(`  ${key}: ${value ? (typeof value === 'string' && value.length > 10 ? 'PRESENTE' : value) : 'NULL'}`);
                    }
                });
            });
        }
        
        await pool.end();
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        await pool.end();
    }
}

investigateUsersSimple();
