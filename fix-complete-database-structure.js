/**
 * ✅ CORREÇÃO COMPLETA DA ESTRUTURA DO BANCO
 * Criar todas as tabelas e colunas em falta identificadas nos logs
 */

const { createRobustPool, testConnection, safeQuery } = require('./fixed-database-config');

async function corrigirEstruturaBanco() {
    console.log('🔧 CORRIGINDO ESTRUTURA COMPLETA DO BANCO...');
    
    const pool = createRobustPool();
    await testConnection(pool);
    
    try {
        // 1. Criar tabela ai_analysis se não existir
        console.log('1️⃣ Criando tabela ai_analysis...');
        await safeQuery(pool, `
            CREATE TABLE IF NOT EXISTS ai_analysis (
                id SERIAL PRIMARY KEY,
                cycle_id UUID NOT NULL,
                market_data JSONB NOT NULL,
                fear_greed_value INTEGER NOT NULL,
                btc_price NUMERIC NOT NULL,
                recommendation TEXT NOT NULL,
                confidence_level NUMERIC NOT NULL,
                reasoning TEXT NOT NULL,
                market_direction TEXT NOT NULL,
                analysis_timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
                openai_response JSONB,
                system_prompt TEXT,
                user_prompt TEXT,
                processing_time INTEGER,
                status TEXT DEFAULT 'ATIVO',
                metadata JSONB
            );
        `);

        // 2. Adicionar coluna created_at em tabelas que não têm
        console.log('2️⃣ Adicionando coluna created_at onde necessário...');
        
        // Verificar e adicionar created_at em fear_greed_index se não existir
        const checkCreatedAt = await safeQuery(pool, `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'fear_greed_index' 
            AND column_name = 'created_at'
        `);
        
        if (checkCreatedAt.rows.length === 0) {
            await safeQuery(pool, `
                ALTER TABLE fear_greed_index 
                ADD COLUMN created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
            `);
            console.log('   ✅ created_at adicionada em fear_greed_index');
        }

        // 3. Criar tabela user_keys se não existir
        console.log('3️⃣ Criando tabela user_keys...');
        await safeQuery(pool, `
            CREATE TABLE IF NOT EXISTS user_keys (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                username VARCHAR(255) NOT NULL,
                exchange VARCHAR(50) NOT NULL,
                api_key TEXT NOT NULL,
                secret_key TEXT NOT NULL,
                passphrase TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
                last_used TIMESTAMP WITHOUT TIME ZONE,
                permissions JSONB,
                status TEXT DEFAULT 'ATIVO'
            );
        `);

        // 4. Criar tabela users se não existir
        console.log('4️⃣ Criando tabela users...');
        await safeQuery(pool, `
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
                last_login TIMESTAMP WITHOUT TIME ZONE,
                role VARCHAR(50) DEFAULT 'user',
                settings JSONB,
                status TEXT DEFAULT 'ATIVO'
            );
        `);

        // 5. Verificar e corrigir outras estruturas necessárias
        console.log('5️⃣ Verificando outras estruturas...');
        
        // Verificar se sistema_leitura_mercado tem created_at
        const checkSistemaCreatedAt = await safeQuery(pool, `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'sistema_leitura_mercado' 
            AND column_name = 'created_at'
        `);
        
        if (checkSistemaCreatedAt.rows.length === 0) {
            await safeQuery(pool, `
                ALTER TABLE sistema_leitura_mercado 
                ADD COLUMN created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
            `);
            console.log('   ✅ created_at adicionada em sistema_leitura_mercado');
        }

        // 6. Criar índices importantes
        console.log('6️⃣ Criando índices...');
        await safeQuery(pool, `
            CREATE INDEX IF NOT EXISTS idx_ai_analysis_created_at ON ai_analysis(created_at);
            CREATE INDEX IF NOT EXISTS idx_ai_analysis_cycle_id ON ai_analysis(cycle_id);
            CREATE INDEX IF NOT EXISTS idx_sistema_leitura_created_at ON sistema_leitura_mercado(created_at);
            CREATE INDEX IF NOT EXISTS idx_fear_greed_created_at ON fear_greed_index(created_at);
            CREATE INDEX IF NOT EXISTS idx_user_keys_user_id ON user_keys(user_id);
            CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        `);

        await pool.end();
        console.log('\n✅ ESTRUTURA DO BANCO CORRIGIDA COM SUCESSO!');
        console.log('📋 Tabelas criadas/verificadas:');
        console.log('   ✅ ai_analysis');
        console.log('   ✅ user_keys');
        console.log('   ✅ users');
        console.log('   ✅ fear_greed_index (created_at)');
        console.log('   ✅ sistema_leitura_mercado (created_at)');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        await pool.end();
    }
}

corrigirEstruturaBanco();
