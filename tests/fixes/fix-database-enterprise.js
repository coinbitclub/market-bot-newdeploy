/**
 * ✅ DIAGNÓSTICO COMPLETO DO BANCO - CoinBitClub Enterprise v6.0.0
 * Verificar todas as tabelas necessárias e criar as que faltam
 */

const { createRobustPool, testConnection, safeQuery } = require('./fixed-database-config');

async function diagnosticoCompleto() {
    console.log('🔍 DIAGNÓSTICO COMPLETO DO BANCO - CoinBitClub Enterprise v6.0.0');
    
    const pool = createRobustPool();
    await testConnection(pool);
    
    try {
        // 1. Verificar tabelas essenciais
        const tabelasEssenciais = [
            'sistema_leitura_mercado',
            'ai_analysis', 
            'fear_greed_index',
            'user_keys',
            'users'
        ];
        
        console.log('\n📊 VERIFICANDO TABELAS ESSENCIAIS:');
        
        for (const tabela of tabelasEssenciais) {
            const queryExists = `
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = '${tabela}'
                );
            `;
            
            const result = await safeQuery(pool, queryExists);
            const existe = result.rows[0].exists;
            console.log(`   ${existe ? '✅' : '❌'} ${tabela}: ${existe ? 'EXISTE' : 'NÃO EXISTE'}`);
            
            if (!existe) {
                console.log(`   🔧 Criando tabela ${tabela}...`);
                await criarTabela(pool, tabela);
            }
        }
        
        // 2. Verificar colunas essenciais em tabelas existentes
        await verificarColunas(pool);
        
        // 3. Inserir dados iniciais se necessário
        await inserirDadosIniciais(pool);
        
        await pool.end();
        console.log('\n✅ DIAGNÓSTICO COMPLETO - BANCO PRONTO PARA CoinBitClub Enterprise v6.0.0');
        
    } catch (error) {
        console.error('❌ Erro no diagnóstico:', error.message);
        await pool.end();
    }
}

async function criarTabela(pool, nomeTabela) {
    let createQuery = '';
    
    switch (nomeTabela) {
        case 'ai_analysis':
            createQuery = `
                CREATE TABLE ai_analysis (
                    id SERIAL PRIMARY KEY,
                    cycle_id UUID,
                    analysis_timestamp TIMESTAMP DEFAULT NOW(),
                    market_data JSONB,
                    fear_greed_data JSONB,
                    ai_recommendation TEXT,
                    confidence_score NUMERIC(5,2),
                    reasoning TEXT,
                    market_direction TEXT CHECK (market_direction IN ('LONG', 'SHORT', 'NEUTRO')),
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
            `;
            break;
            
        case 'users':
            createQuery = `
                CREATE TABLE users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(100) UNIQUE NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    status VARCHAR(50) DEFAULT 'ATIVO'
                );
            `;
            break;
            
        case 'user_keys':
            createQuery = `
                CREATE TABLE user_keys (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    exchange VARCHAR(50) NOT NULL,
                    api_key VARCHAR(500) NOT NULL,
                    api_secret VARCHAR(500) NOT NULL,
                    testnet BOOLEAN DEFAULT true,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    status VARCHAR(50) DEFAULT 'ATIVO'
                );
            `;
            break;
    }
    
    if (createQuery) {
        await safeQuery(pool, createQuery);
        console.log(`   ✅ Tabela ${nomeTabela} criada com sucesso`);
    }
}

async function verificarColunas(pool) {
    console.log('\n🔍 VERIFICANDO COLUNAS ESSENCIAIS:');
    
    // Verificar coluna created_at em fear_greed_index
    const queryFearGreed = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'fear_greed_index' 
        AND column_name = 'created_at';
    `;
    
    const resultFG = await safeQuery(pool, queryFearGreed);
    if (resultFG.rows.length === 0) {
        console.log('   🔧 Adicionando coluna created_at em fear_greed_index...');
        await safeQuery(pool, `
            ALTER TABLE fear_greed_index 
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
        `);
        console.log('   ✅ Coluna created_at adicionada');
    } else {
        console.log('   ✅ fear_greed_index.created_at: EXISTE');
    }
}

async function inserirDadosIniciais(pool) {
    console.log('\n📊 INSERINDO DADOS INICIAIS SE NECESSÁRIO:');
    
    // Verificar se há dados na tabela users
    const queryUsers = `SELECT COUNT(*) as total FROM users`;
    const resultUsers = await safeQuery(pool, queryUsers);
    
    if (parseInt(resultUsers.rows[0].total) === 0) {
        console.log('   🔧 Inserindo usuário admin padrão...');
        await safeQuery(pool, `
            INSERT INTO users (username, email, password_hash, status)
            VALUES ('admin', 'admin@coinbitclub.com', '$2b$10$defaulthash', 'ATIVO');
        `);
        console.log('   ✅ Usuário admin criado');
    } else {
        console.log('   ✅ Usuários existem no sistema');
    }
}

diagnosticoCompleto();
