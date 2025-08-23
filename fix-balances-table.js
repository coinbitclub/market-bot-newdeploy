const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function fixBalancesTable() {
    try {
        console.log('🔧 CORRIGINDO ESTRUTURA DA TABELA BALANCES...\n');
        
        // 1. Verificar estrutura atual
        console.log('1️⃣ Verificando estrutura atual:');
        const currentStructure = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'balances' 
            ORDER BY ordinal_position
        `);
        
        console.log('Colunas atuais:');
        currentStructure.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
        });
        
        // 2. Adicionar coluna exchange se não existir
        const hasExchange = currentStructure.rows.some(col => col.column_name === 'exchange');
        
        if (!hasExchange) {
            console.log('\n2️⃣ Adicionando coluna exchange...');
            await pool.query('ALTER TABLE balances ADD COLUMN exchange VARCHAR(50)');
            console.log('✅ Coluna exchange adicionada');
        } else {
            console.log('\n2️⃣ Coluna exchange já existe');
        }
        
        // 3. Verificar outras colunas necessárias
        const requiredColumns = [
            { name: 'environment', type: 'VARCHAR(50)', description: 'mainnet/testnet' },
            { name: 'api_status', type: 'VARCHAR(50)', description: 'status da API' },
            { name: 'error_message', type: 'TEXT', description: 'mensagem de erro' }
        ];
        
        console.log('\n3️⃣ Verificando colunas adicionais:');
        for (const col of requiredColumns) {
            const exists = currentStructure.rows.some(existing => existing.column_name === col.name);
            
            if (!exists) {
                console.log(`   Adicionando ${col.name}...`);
                await pool.query(`ALTER TABLE balances ADD COLUMN ${col.name} ${col.type}`);
                console.log(`   ✅ ${col.name} adicionada - ${col.description}`);
            } else {
                console.log(`   ✅ ${col.name} já existe`);
            }
        }
        
        // 4. Verificar estrutura final
        console.log('\n4️⃣ Estrutura final:');
        const finalStructure = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'balances' 
            ORDER BY ordinal_position
        `);
        
        finalStructure.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
        });
        
        console.log('\n✅ Tabela balances corrigida com sucesso!');
        
        await pool.end();
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        await pool.end();
    }
}

fixBalancesTable();
