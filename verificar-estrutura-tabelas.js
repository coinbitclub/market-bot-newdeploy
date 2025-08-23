const { Client } = require('pg');

async function verificarEstruturaTabelas() {
    const connectionString = 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway';
    
    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Conectado ao banco');
        
        // Verificar estrutura da tabela active_positions
        console.log('\n📋 Estrutura da tabela active_positions:');
        const activePositionsStructure = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'active_positions' 
            ORDER BY ordinal_position
        `);
        
        if (activePositionsStructure.rows.length > 0) {
            activePositionsStructure.rows.forEach(col => {
                console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
            });
        } else {
            console.log('  ⚠️ Tabela active_positions não existe ou está vazia');
        }
        
        // Verificar estrutura da tabela users
        console.log('\n📋 Estrutura da tabela users (colunas de API):');
        const usersStructure = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name LIKE '%api%'
            ORDER BY ordinal_position
        `);
        
        if (usersStructure.rows.length > 0) {
            usersStructure.rows.forEach(col => {
                console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
            });
        } else {
            console.log('  ⚠️ Nenhuma coluna de API encontrada na tabela users');
        }
        
        // Verificar quais colunas existem realmente na tabela users
        console.log('\n📋 Todas as colunas da tabela users:');
        const allUsersColumns = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        `);
        
        allUsersColumns.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type}`);
        });
        
        // Verificar se a tabela active_positions existe, se não, criar
        const tableExists = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'active_positions'
            );
        `);
        
        if (!tableExists.rows[0].exists) {
            console.log('\n🔧 Criando tabela active_positions...');
            await client.query(`
                CREATE TABLE active_positions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    exchange VARCHAR(20) NOT NULL,
                    symbol VARCHAR(50) NOT NULL,
                    side VARCHAR(10) NOT NULL,
                    position_size DECIMAL(20,8) DEFAULT 0,
                    entry_price DECIMAL(20,8) DEFAULT 0,
                    mark_price DECIMAL(20,8) DEFAULT 0,
                    unrealised_pnl DECIMAL(20,8) DEFAULT 0,
                    position_value DECIMAL(20,8) DEFAULT 0,
                    leverage DECIMAL(10,2) DEFAULT 1,
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(user_id, exchange, symbol)
                );
            `);
            console.log('✅ Tabela active_positions criada');
        } else {
            console.log('\n✅ Tabela active_positions já existe');
        }
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await client.end();
    }
}

verificarEstruturaTabelas();
