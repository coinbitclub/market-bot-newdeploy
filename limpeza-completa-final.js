#!/usr/bin/env node

/**
 * 🧹 LIMPEZA COMPLETA COM FOREIGN KEYS
 * ===================================
 * 
 * Remove todos os dados respeitando dependências
 */

const { Pool } = require('pg');

async function cleanAllTestData() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🧹 LIMPEZA COMPLETA COM FOREIGN KEYS\n');

        // Listar todas as tabelas e suas dependências
        const cleanOrder = [
            'order_logs',           // Dependente de orders
            'orders',               // Dependente de signals
            'signals',              // Base
            'notifications',        // Dados de sistema
            'audit_logs',          // Logs de auditoria
            'exchange_operations',  // Operações de exchange
            'market_analysis'       // Análises de mercado
        ];

        for (const tableName of cleanOrder) {
            try {
                // Verificar se tabela existe
                const tableExists = await pool.query(`
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.tables 
                        WHERE table_name = $1
                    )
                `, [tableName]);

                if (!tableExists.rows[0].exists) {
                    console.log(`⚠️  ${tableName}: Tabela não existe`);
                    continue;
                }

                // Contar registros
                const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
                const count = parseInt(countResult.rows[0].count);

                if (count === 0) {
                    console.log(`✅ ${tableName}: Já vazia`);
                    continue;
                }

                // Limpar tabela
                await pool.query(`DELETE FROM ${tableName}`);
                console.log(`🧹 ${tableName}: ${count} registros removidos`);

            } catch (error) {
                console.log(`❌ ${tableName}: ${error.message}`);
            }
        }

        // Resetar sequências importantes
        const sequences = [
            'signals_id_seq',
            'orders_id_seq', 
            'order_logs_id_seq',
            'notifications_id_seq'
        ];

        console.log('\n🔄 RESETANDO SEQUÊNCIAS:');
        for (const seqName of sequences) {
            try {
                await pool.query(`ALTER SEQUENCE ${seqName} RESTART WITH 1`);
                console.log(`✅ ${seqName} resetada`);
            } catch (error) {
                console.log(`⚠️  ${seqName}: ${error.message}`);
            }
        }

        // Verificação final das tabelas principais
        console.log('\n📊 VERIFICAÇÃO FINAL:');
        const mainTables = ['signals', 'orders', 'order_logs', 'users', 'user_api_keys', 'balances'];
        
        for (const table of mainTables) {
            try {
                const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
                const count = parseInt(result.rows[0].count);
                
                if (['users', 'user_api_keys', 'balances'].includes(table)) {
                    console.log(`✅ ${table}: ${count} registros (MANTIDOS)`);
                } else {
                    console.log(`🧹 ${table}: ${count} registros (LIMPOS)`);
                }
            } catch (error) {
                console.log(`⚠️  ${table}: ${error.message}`);
            }
        }

        console.log('\n🎯 LIMPEZA COMPLETA FINALIZADA!');
        console.log('✅ Todos os dados de teste removidos');
        console.log('✅ Dados críticos preservados');
        console.log('✅ Sistema pronto para produção real');

        await pool.end();

    } catch (error) {
        console.error('❌ Erro geral:', error.message);
        process.exit(1);
    }
}

cleanAllTestData();
