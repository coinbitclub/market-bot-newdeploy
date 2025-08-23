const { Client } = require('pg');

async function criarTabelaActivePositions() {
    const connectionString = 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway';
    
    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Conectado ao banco');
        
        // Verificar se a tabela existe
        const tableExists = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'active_positions'
            );
        `);
        
        if (tableExists.rows[0].exists) {
            console.log('📋 Tabela active_positions já existe');
            
            // Verificar se tem as colunas corretas
            const columns = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'active_positions'
            `);
            
            const columnNames = columns.rows.map(row => row.column_name);
            console.log('📋 Colunas existentes:', columnNames.join(', '));
            
            // Adicionar colunas que faltam
            if (!columnNames.includes('position_size')) {
                console.log('🔧 Adicionando coluna position_size...');
                await client.query(`ALTER TABLE active_positions ADD COLUMN position_size DECIMAL(20,8) DEFAULT 0`);
            }
            
            if (!columnNames.includes('is_active')) {
                console.log('🔧 Adicionando coluna is_active...');
                await client.query(`ALTER TABLE active_positions ADD COLUMN is_active BOOLEAN DEFAULT true`);
            }
            
        } else {
            console.log('🔧 Criando tabela active_positions...');
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
        }
        
        console.log('✅ Estrutura da tabela active_positions corrigida!');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await client.end();
    }
}

criarTabelaActivePositions();
