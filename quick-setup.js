#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function setupQuick() {
    const client = await pool.connect();
    
    try {
        console.log('💰 Configuração rápida do sistema financeiro...');
        
        // Adicionar colunas de saldo se não existirem
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS balance_real_brl DECIMAL(15,2) DEFAULT 100.00,
            ADD COLUMN IF NOT EXISTS balance_real_usd DECIMAL(15,2) DEFAULT 20.00,
            ADD COLUMN IF NOT EXISTS balance_admin_brl DECIMAL(15,2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS balance_admin_usd DECIMAL(15,2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS balance_commission_brl DECIMAL(15,2) DEFAULT 50.00,
            ADD COLUMN IF NOT EXISTS balance_commission_usd DECIMAL(15,2) DEFAULT 10.00,
            ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) DEFAULT 'MONTHLY',
            ADD COLUMN IF NOT EXISTS affiliate_type VARCHAR(20) DEFAULT 'normal'
        `);
        
        console.log('✅ Colunas de saldo adicionadas à tabela users');
        
        // Criar tabela de transações simples
        await client.query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                type VARCHAR(50),
                amount DECIMAL(15,2),
                currency VARCHAR(3) DEFAULT 'BRL',
                status VARCHAR(20) DEFAULT 'COMPLETED',
                description TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        
        console.log('✅ Tabela transactions criada');
        
        // Criar tabela de cupons simples
        await client.query(`
            CREATE TABLE IF NOT EXISTS coupons (
                id SERIAL PRIMARY KEY,
                code VARCHAR(50) UNIQUE,
                credit_amount DECIMAL(15,2),
                currency VARCHAR(3) DEFAULT 'BRL',
                created_by_admin_id INTEGER DEFAULT 1,
                expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days'),
                is_active BOOLEAN DEFAULT true,
                current_uses INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        
        console.log('✅ Tabela coupons criada');
        
        // Criar tabela de uso de cupons simples
        await client.query(`
            CREATE TABLE IF NOT EXISTS coupon_usage (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                coupon_id INTEGER,
                credit_amount DECIMAL(15,2),
                currency VARCHAR(3),
                used_at TIMESTAMP DEFAULT NOW()
            )
        `);
        
        console.log('✅ Tabela coupon_usage criada');
        
        // Criar tabela de saques simples
        await client.query(`
            CREATE TABLE IF NOT EXISTS withdrawal_requests (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                amount DECIMAL(15,2),
                currency VARCHAR(3) DEFAULT 'BRL',
                status VARCHAR(20) DEFAULT 'PENDING',
                requested_at TIMESTAMP DEFAULT NOW()
            )
        `);
        
        console.log('✅ Tabela withdrawal_requests criada');
        
        // Verificar se temos usuários
        const users = await client.query('SELECT COUNT(*) as total FROM users');
        console.log(`📊 Total de usuários: ${users.rows[0].total}`);
        
        if (users.rows[0].total === 0) {
            // Criar usuário de teste
            await client.query(`
                INSERT INTO users (username, email, is_admin, plan_type, affiliate_type)
                VALUES ('testuser', 'test@coinbitclub.com', false, 'MONTHLY', 'normal')
            `);
            console.log('✅ Usuário de teste criado');
        }
        
        console.log('');
        console.log('🎉 Sistema financeiro configurado com sucesso!');
        console.log('📊 Pronto para testes!');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
    
    client.release();
    process.exit(0);
}

setupQuick();
