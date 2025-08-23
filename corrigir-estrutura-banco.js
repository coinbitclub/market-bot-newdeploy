// 🔧 CORREÇÃO ESTRUTURA BANCO - STRIPE REAL
// =========================================

const { Pool } = require('pg');

async function corrigirEstruturaBanco() {
    console.log('🔧 CORRIGINDO ESTRUTURA DO BANCO...');
    
    const pool = new Pool({
        connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
        ssl: { rejectUnauthorized: false }
    });
    
    const client = await pool.connect();
    
    try {
        // Verificar se a tabela affiliate_codes existe
        const checkTable = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'affiliate_codes'
        `);
        
        console.log('📋 Colunas existentes na tabela affiliate_codes:');
        checkTable.rows.forEach(row => {
            console.log(`   - ${row.column_name}: ${row.data_type}`);
        });
        
        // Se a tabela existe mas está incompleta, vamos recriar
        if (checkTable.rows.length > 0) {
            console.log('🗑️ Removendo tabela existente...');
            await client.query('DROP TABLE IF EXISTS affiliate_codes CASCADE');
        }
        
        // Criar tabela affiliate_codes correta
        console.log('📋 Criando tabela affiliate_codes...');
        await client.query(`
            CREATE TABLE affiliate_codes (
                id SERIAL PRIMARY KEY,
                code VARCHAR(20) UNIQUE NOT NULL,
                user_id INTEGER,
                type VARCHAR(10) DEFAULT 'normal',
                commission_rate DECIMAL(5,2) DEFAULT 1.5,
                clicks INTEGER DEFAULT 0,
                conversions INTEGER DEFAULT 0,
                total_earned DECIMAL(15,2) DEFAULT 0,
                currency VARCHAR(3) DEFAULT 'USD',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        
        // Criar outras tabelas necessárias
        console.log('📋 Criando tabela admin_credit_codes...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS admin_credit_codes (
                id SERIAL PRIMARY KEY,
                code VARCHAR(30) UNIQUE NOT NULL,
                amount DECIMAL(15,2) NOT NULL,
                currency VARCHAR(3) NOT NULL,
                created_by_admin INTEGER,
                used_by_user INTEGER,
                stripe_payment_link VARCHAR(500),
                stripe_session_id VARCHAR(200),
                is_used BOOLEAN DEFAULT false,
                used_at TIMESTAMP,
                expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        
        console.log('📋 Criando tabela affiliate_tracking...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS affiliate_tracking (
                id SERIAL PRIMARY KEY,
                affiliate_code VARCHAR(20),
                visitor_ip VARCHAR(45),
                user_agent TEXT,
                referrer_url TEXT,
                conversion_user_id INTEGER,
                conversion_amount DECIMAL(15,2),
                commission_earned DECIMAL(15,2),
                clicked_at TIMESTAMP DEFAULT NOW(),
                converted_at TIMESTAMP
            )
        `);
        
        console.log('📋 Criando tabela stripe_links...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS stripe_links (
                id SERIAL PRIMARY KEY,
                type VARCHAR(20) NOT NULL,
                stripe_url TEXT NOT NULL,
                stripe_session_id VARCHAR(200),
                user_id INTEGER,
                affiliate_code VARCHAR(20),
                amount DECIMAL(15,2),
                currency VARCHAR(3),
                metadata JSONB,
                is_completed BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW(),
                completed_at TIMESTAMP
            )
        `);
        
        // Inserir alguns códigos de teste
        console.log('🧪 Inserindo dados de teste...');
        
        await client.query(`
            INSERT INTO affiliate_codes (code, user_id, type, commission_rate) VALUES
            ('CBCTEST01', 1, 'normal', 1.5),
            ('CBCVIP01', 2, 'vip', 5.0)
            ON CONFLICT (code) DO NOTHING
        `);
        
        console.log('✅ Estrutura do banco corrigida com sucesso!');
        
        // Listar tabelas criadas
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('affiliate_codes', 'admin_credit_codes', 'affiliate_tracking', 'stripe_links')
        `);
        
        console.log('\n📊 Tabelas criadas:');
        tables.rows.forEach(row => {
            console.log(`   ✅ ${row.table_name}`);
        });
        
    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

// Executar correção
corrigirEstruturaBanco();
