#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function setupFinancialSystem() {
    try {
        console.log('💰 CONFIGURANDO SISTEMA FINANCEIRO...');
        console.log('=====================================');
        
        const client = await pool.connect();
        const schema = fs.readFileSync('financial-system-schema.sql', 'utf8');
        
        console.log('📊 Aplicando schema do sistema financeiro...');
        await client.query(schema);
        
        console.log('✅ Schema financeiro aplicado com sucesso!');
        
        // Verificar estrutura criada
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('transactions', 'commission_records', 'coupons', 'coupon_usage', 'withdrawal_requests')
            ORDER BY table_name
        `);
        
        console.log('');
        console.log('📋 TABELAS FINANCEIRAS CRIADAS:');
        tablesResult.rows.forEach(row => {
            console.log(`   ✅ ${row.table_name}`);
        });
        
        // Verificar colunas de saldo adicionadas
        const userColumns = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'users'
            AND column_name LIKE 'balance_%'
            ORDER BY column_name
        `);
        
        console.log('');
        console.log('💰 COLUNAS DE SALDO ADICIONADAS:');
        userColumns.rows.forEach(row => {
            console.log(`   ✅ ${row.column_name}`);
        });
        
        // Testar criação de um cupom de exemplo
        console.log('');
        console.log('🎫 Testando sistema de cupons...');
        
        // Buscar um usuário admin ou criar
        let adminResult = await client.query("SELECT id FROM users WHERE is_admin = true LIMIT 1");
        let adminId;
        
        if (adminResult.rows.length === 0) {
            console.log('   📝 Criando usuário admin...');
            const newAdmin = await client.query(`
                INSERT INTO users (username, email, is_admin, plan_type) 
                VALUES ('admin', 'admin@coinbitclub.com', true, 'PREPAID')
                ON CONFLICT (email) DO UPDATE SET is_admin = true
                RETURNING id
            `);
            adminId = newAdmin.rows[0].id;
        } else {
            adminId = adminResult.rows[0].id;
        }
        
        // Criar cupom de teste
        await client.query(`
            INSERT INTO coupons (code, credit_amount, currency, created_by_admin_id, expires_at)
            VALUES ('WELCOME100', 100.00, 'BRL', $1, NOW() + INTERVAL '30 days')
            ON CONFLICT (code) DO NOTHING
        `, [adminId]);
        
        console.log('   ✅ Cupom WELCOME100 criado (R$ 100)');
        
        client.release();
        
        console.log('');
        console.log('🎉 SISTEMA FINANCEIRO CONFIGURADO COM SUCESSO!');
        console.log('===============================================');
        console.log('');
        console.log('📊 Recursos disponíveis:');
        console.log('   • Saldos separados (Real/Admin/Comissão)');
        console.log('   • Sistema de cupons administrativos');
        console.log('   • Comissão descontada nas recargas');
        console.log('   • Controle de saques por tipo de saldo');
        console.log('   • Comissionamento de afiliados');
        console.log('');
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Erro na configuração:', error.message);
        process.exit(1);
    }
}

setupFinancialSystem();
