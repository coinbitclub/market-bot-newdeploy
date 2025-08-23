#!/usr/bin/env node

console.log('🔍 VERIFICAÇÃO COMPLETA DO BANCO DE DADOS');
console.log('========================================');

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function verificarBanco() {
    try {
        // 1. Verificar usuários
        console.log('\n👥 1. USUÁRIOS NO BANCO:');
        console.log('========================');
        const usuarios = await pool.query('SELECT id, name, email FROM users ORDER BY id LIMIT 10');
        
        if (usuarios.rows.length === 0) {
            console.log('❌ Nenhum usuário encontrado!');
        } else {
            usuarios.rows.forEach(user => {
                console.log(`   ID: ${user.id} | Nome: ${user.name || 'SEM NOME'} | Email: ${user.email || 'SEM EMAIL'}`);
            });
        }

        // 2. Verificar estrutura da tabela order_executions
        console.log('\n📋 2. ESTRUTURA DA TABELA ORDER_EXECUTIONS:');
        console.log('==========================================');
        
        try {
            const estrutura = await pool.query(`
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'order_executions' 
                ORDER BY ordinal_position
            `);
            
            if (estrutura.rows.length === 0) {
                console.log('❌ Tabela order_executions não existe!');
                
                // Criar tabela se não existir
                console.log('\n🔧 Criando tabela order_executions...');
                await pool.query(`
                    CREATE TABLE IF NOT EXISTS order_executions (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER REFERENCES users(id),
                        exchange VARCHAR(20) NOT NULL,
                        symbol VARCHAR(20) NOT NULL,
                        order_type VARCHAR(20) NOT NULL,
                        quantity DECIMAL(20,8) NOT NULL,
                        executed_quantity DECIMAL(20,8),
                        price DECIMAL(20,8),
                        executed_price DECIMAL(20,8),
                        status VARCHAR(20) DEFAULT 'pending',
                        signal_id VARCHAR(100),
                        executed_at TIMESTAMP,
                        created_at TIMESTAMP DEFAULT NOW()
                    )
                `);
                console.log('✅ Tabela order_executions criada!');
            } else {
                console.log('✅ Tabela order_executions existe:');
                estrutura.rows.forEach(col => {
                    console.log(`   ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
                });
            }
        } catch (error) {
            console.log(`❌ Erro ao verificar order_executions: ${error.message}`);
        }

        // 3. Verificar chaves API dos usuários
        console.log('\n🔑 3. CHAVES API DOS USUÁRIOS:');
        console.log('=============================');
        
        try {
            const chaves = await pool.query(`
                SELECT 
                    u.id, u.name, u.email,
                    uak.exchange, uak.environment, uak.is_active
                FROM users u
                LEFT JOIN user_api_keys uak ON u.id = uak.user_id
                ORDER BY u.id, uak.exchange
            `);
            
            if (chaves.rows.length === 0) {
                console.log('❌ Nenhuma chave API encontrada!');
            } else {
                let usuarioAtual = null;
                chaves.rows.forEach(row => {
                    if (row.id !== usuarioAtual) {
                        console.log(`\n👤 ${row.name || 'SEM NOME'} (ID: ${row.id})`);
                        usuarioAtual = row.id;
                    }
                    if (row.exchange) {
                        console.log(`   📊 ${row.exchange} (${row.environment}) - ${row.is_active ? 'ATIVO' : 'INATIVO'}`);
                    } else {
                        console.log('   ⚠️ Sem chaves API configuradas');
                    }
                });
            }
        } catch (error) {
            console.log(`❌ Erro ao verificar chaves: ${error.message}`);
        }

        // 4. Verificar outras tabelas importantes
        console.log('\n📊 4. OUTRAS TABELAS IMPORTANTES:');
        console.log('=================================');
        
        const tabelas = [
            'signal_metrics_log',
            'api_validation_log', 
            'fear_greed_index',
            'btc_dominance',
            'positions',
            'trades'
        ];
        
        for (const tabela of tabelas) {
            try {
                const count = await pool.query(`SELECT COUNT(*) as total FROM ${tabela}`);
                console.log(`   ${tabela}: ${count.rows[0].total} registros`);
            } catch (error) {
                console.log(`   ${tabela}: ❌ Não existe ou erro (${error.message})`);
            }
        }

        // 5. Criar usuários de exemplo se necessário
        if (usuarios.rows.length === 0) {
            console.log('\n🔧 5. CRIANDO USUÁRIOS DE EXEMPLO:');
            console.log('==================================');
            
            const usuariosExemplo = [
                { name: 'Érica dos Santos', email: 'erica.andrade.santos@hotmail.com' },
                { name: 'Luiza Maria', email: 'lmariadapinto@gmail.com' },
                { name: 'Mauro Alves', email: 'mauroalves150391@gmail.com' },
                { name: 'Admin Sistema', email: 'admin@coinbitclub.vip' }
            ];
            
            for (const usuario of usuariosExemplo) {
                try {
                    const resultado = await pool.query(`
                        INSERT INTO users (name, email, is_active, created_at, plan_type)
                        VALUES ($1, $2, true, NOW(), 'MONTHLY')
                        RETURNING id
                    `, [usuario.name, usuario.email]);
                    
                    console.log(`   ✅ Criado: ${usuario.name} (ID: ${resultado.rows[0].id})`);
                } catch (error) {
                    console.log(`   ⚠️ ${usuario.name}: ${error.message}`);
                }
            }
        }

        // 6. Verificar dashboard queries
        console.log('\n📈 6. TESTANDO QUERIES DO DASHBOARD:');
        console.log('===================================');
        
        const queries = [
            {
                nome: 'Usuários ativos',
                sql: 'SELECT COUNT(*) as total FROM users WHERE is_active = true'
            },
            {
                nome: 'Fear & Greed Index',
                sql: 'SELECT value, category FROM fear_greed_index ORDER BY created_at DESC LIMIT 1'
            },
            {
                nome: 'BTC Dominance',
                sql: 'SELECT dominance_percentage FROM btc_dominance ORDER BY collected_at DESC LIMIT 1'
            },
            {
                nome: 'Últimas métricas IA',
                sql: 'SELECT ai_decision, confidence, timestamp FROM signal_metrics_log ORDER BY timestamp DESC LIMIT 1'
            }
        ];
        
        for (const query of queries) {
            try {
                const resultado = await pool.query(query.sql);
                console.log(`   ✅ ${query.nome}: ${resultado.rows.length} registros`);
                if (resultado.rows.length > 0) {
                    console.log(`      Dados: ${JSON.stringify(resultado.rows[0])}`);
                }
            } catch (error) {
                console.log(`   ❌ ${query.nome}: ${error.message}`);
            }
        }

    } catch (error) {
        console.error('❌ Erro geral:', error.message);
    } finally {
        await pool.end();
    }
}

verificarBanco().catch(console.error);
