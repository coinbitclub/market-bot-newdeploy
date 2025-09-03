// 🛠️ CORRIGIR TABELA DE CUPONS ADMINISTRATIVOS
// =============================================
//
// Problema: Conflito com tabela existente
// Solução: Remover tabela antiga e criar nova estrutura correta

const { Pool } = require('pg');

async function corrigirTabelaCupons() {
    console.log('🛠️ CORRIGINDO TABELA DE CUPONS ADMINISTRATIVOS');
    console.log('==============================================');
    
    const pool = new Pool({
        connectionString: 'process.env.DATABASE_URL',
        ssl: { rejectUnauthorized: false }
    });
    
    const client = await pool.connect();
    
    try {
        console.log('🗄️ Removendo tabelas antigas...');
        
        // Remover tabelas existentes
        await client.query('DROP TABLE IF EXISTS coupon_usage_logs CASCADE');
        await client.query('DROP TABLE IF EXISTS admin_coupons CASCADE');
        
        console.log('✅ Tabelas antigas removidas');
        console.log('🔧 Criando estrutura correta...');
        
        // Criar tabela de cupons administrativos
        await client.query(`
            CREATE TABLE admin_coupons (
                id SERIAL PRIMARY KEY,
                coupon_code VARCHAR(30) UNIQUE NOT NULL,
                credit_type VARCHAR(20) NOT NULL,
                amount DECIMAL(15,2) NOT NULL,
                currency VARCHAR(3) NOT NULL,
                created_by_admin INTEGER NOT NULL,
                used_by_user INTEGER,
                is_used BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW(),
                used_at TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                description TEXT,
                metadata JSONB DEFAULT '{}'::jsonb
            )
        `);
        
        // Criar tabela de logs
        await client.query(`
            CREATE TABLE coupon_usage_logs (
                id SERIAL PRIMARY KEY,
                coupon_code VARCHAR(30) NOT NULL,
                user_id INTEGER NOT NULL,
                action VARCHAR(20) NOT NULL,
                amount DECIMAL(15,2),
                currency VARCHAR(3),
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        
        // Criar índices para performance
        await client.query('CREATE INDEX idx_admin_coupons_code ON admin_coupons(coupon_code)');
        await client.query('CREATE INDEX idx_admin_coupons_status ON admin_coupons(is_used, expires_at)');
        await client.query('CREATE INDEX idx_coupon_logs_code ON coupon_usage_logs(coupon_code)');
        
        // Verificar se tabela users tem colunas de balance admin
        console.log('🔍 Verificando estrutura da tabela users...');
        
        const userColumns = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name IN ('balance_admin_brl', 'balance_admin_usd')
        `);
        
        if (userColumns.rows.length === 0) {
            console.log('➕ Adicionando colunas de balance admin na tabela users...');
            
            await client.query(`
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS balance_admin_brl DECIMAL(15,2) DEFAULT 0,
                ADD COLUMN IF NOT EXISTS balance_admin_usd DECIMAL(15,2) DEFAULT 0
            `);
        }
        
        console.log('✅ Estrutura de cupons criada com sucesso!');
        console.log('📊 Resumo das tabelas:');
        console.log('  • admin_coupons: Cupons administrativos');
        console.log('  • coupon_usage_logs: Logs de uso');
        console.log('  • users: Atualizada com balances admin');
        
    } finally {
        client.release();
        await pool.end();
    }
}

// Executar correção
if (require.main === module) {
    corrigirTabelaCupons().catch(console.error);
}

module.exports = { corrigirTabelaCupons };
