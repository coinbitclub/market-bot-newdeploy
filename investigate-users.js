#!/usr/bin/env node

/**
 * 🔍 INVESTIGAÇÃO DE USUÁRIOS ESPECÍFICOS
 * =======================================
 * 
 * Script para investigar por que usuários 15, 16, 17 não estão sendo considerados
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

class UserInvestigator {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
            ssl: { rejectUnauthorized: false }
        });
    }

    async investigate() {
        console.log('🔍 INVESTIGANDO USUÁRIOS 15, 16 e 17...\n');
        
        const client = await this.pool.connect();
        
        try {
            // 1. Buscar dados específicos dos usuários
            console.log('📊 DADOS DETALHADOS DOS USUÁRIOS:');
            console.log('=================================');
            
            const result = await client.query(`
                SELECT 
                    id,
                    username,
                    email,
                    exchange_auto_trading,
                    exchange_testnet_mode,
                    binance_api_key_encrypted,
                    binance_api_secret_encrypted,
                    bybit_api_key_encrypted,
                    bybit_api_secret_encrypted,
                    api_validation_status,
                    last_api_validation,
                    created_at
                FROM users 
                WHERE id IN (15, 16, 17)
                ORDER BY id
            `);
            
            if (result.rows.length === 0) {
                console.log('❌ NENHUM USUÁRIO ENCONTRADO COM IDs 15, 16, 17');
                return;
            }
            
            result.rows.forEach(user => {
                console.log(`\n🔹 USUÁRIO ID: ${user.id}`);
                console.log(`   Username: ${user.username || 'N/A'}`);
                console.log(`   Email: ${user.email || 'N/A'}`);
                console.log(`   Auto Trading: ${user.exchange_auto_trading}`);
                console.log(`   Testnet Mode: ${user.exchange_testnet_mode}`);
                console.log(`   Binance API Key: ${user.binance_api_key_encrypted ? '✅ DEFINIDA' : '❌ NÃO DEFINIDA'}`);
                console.log(`   Binance Secret: ${user.binance_api_secret_encrypted ? '✅ DEFINIDA' : '❌ NÃO DEFINIDA'}`);
                console.log(`   Bybit API Key: ${user.bybit_api_key_encrypted ? '✅ DEFINIDA' : '❌ NÃO DEFINIDA'}`);
                console.log(`   Bybit Secret: ${user.bybit_api_secret_encrypted ? '✅ DEFINIDA' : '❌ NÃO DEFINIDA'}`);
                console.log(`   API Status: ${user.api_validation_status || 'N/A'}`);
                console.log(`   Última Validação: ${user.last_api_validation || 'N/A'}`);
            });
            
            // 2. Analisar elegibilidade específica
            console.log('\n\n🔍 ANÁLISE DE ELEGIBILIDADE:');
            console.log('============================');
            
            const eligibilityQuery = await client.query(`
                SELECT 
                    id,
                    username,
                    exchange_auto_trading,
                    CASE 
                        WHEN binance_api_key_encrypted IS NOT NULL AND binance_api_secret_encrypted IS NOT NULL THEN true
                        ELSE false
                    END as has_binance_keys,
                    CASE 
                        WHEN bybit_api_key_encrypted IS NOT NULL AND bybit_api_secret_encrypted IS NOT NULL THEN true
                        ELSE false
                    END as has_bybit_keys,
                    CASE 
                        WHEN exchange_auto_trading = true AND (
                            (binance_api_key_encrypted IS NOT NULL AND binance_api_secret_encrypted IS NOT NULL) OR
                            (bybit_api_key_encrypted IS NOT NULL AND bybit_api_secret_encrypted IS NOT NULL)
                        ) THEN true
                        ELSE false
                    END as is_eligible,
                    -- Diagnóstico detalhado
                    CASE 
                        WHEN exchange_auto_trading IS NULL THEN 'AUTO_TRADING_NULL'
                        WHEN exchange_auto_trading = false THEN 'AUTO_TRADING_DISABLED'
                        WHEN binance_api_key_encrypted IS NULL AND bybit_api_key_encrypted IS NULL THEN 'NO_API_KEYS'
                        WHEN binance_api_secret_encrypted IS NULL AND bybit_api_secret_encrypted IS NULL THEN 'NO_API_SECRETS'
                        WHEN exchange_auto_trading = true AND (
                            (binance_api_key_encrypted IS NOT NULL AND binance_api_secret_encrypted IS NOT NULL) OR
                            (bybit_api_key_encrypted IS NOT NULL AND bybit_api_secret_encrypted IS NOT NULL)
                        ) THEN 'ELIGIBLE'
                        ELSE 'OTHER_ISSUE'
                    END as diagnostic
                FROM users 
                WHERE id IN (15, 16, 17)
                ORDER BY id
            `);
            
            eligibilityQuery.rows.forEach(user => {
                console.log(`\n🔹 USUÁRIO ${user.id} (${user.username || 'N/A'}):`);
                console.log(`   Auto Trading: ${user.exchange_auto_trading}`);
                console.log(`   Tem chaves Binance: ${user.has_binance_keys ? '✅ SIM' : '❌ NÃO'}`);
                console.log(`   Tem chaves Bybit: ${user.has_bybit_keys ? '✅ SIM' : '❌ NÃO'}`);
                console.log(`   É elegível: ${user.is_eligible ? '✅ SIM' : '❌ NÃO'}`);
                console.log(`   Diagnóstico: ${user.diagnostic}`);
            });
            
            // 3. Comparar com consulta exata do sistema
            console.log('\n\n🔎 CONSULTA EXATA DO SISTEMA:');
            console.log('=============================');
            
            const systemQuery = await client.query(`
                SELECT 
                    id,
                    username
                FROM users 
                WHERE exchange_auto_trading = true 
                  AND (
                      (binance_api_key_encrypted IS NOT NULL AND binance_api_secret_encrypted IS NOT NULL) OR
                      (bybit_api_key_encrypted IS NOT NULL AND bybit_api_secret_encrypted IS NOT NULL)
                  )
                ORDER BY id
            `);
            
            console.log(`Total de usuários retornados pela consulta do sistema: ${systemQuery.rows.length}`);
            
            if (systemQuery.rows.length > 0) {
                console.log('\nUsuários encontrados:');
                systemQuery.rows.forEach(user => {
                    console.log(`  • ID ${user.id}: ${user.username || 'N/A'}`);
                });
            }
            
            // 4. Verificar se os IDs específicos estão na lista
            console.log('\n\n✅ VERIFICAÇÃO FINAL:');
            console.log('=====================');
            
            const foundIds = systemQuery.rows.map(u => u.id);
            [15, 16, 17].forEach(id => {
                const found = foundIds.includes(id);
                console.log(`ID ${id}: ${found ? '✅ ENCONTRADO na consulta do sistema' : '❌ NÃO ENCONTRADO na consulta do sistema'}`);
            });
            
            // 5. Verificar se os usuários existem
            console.log('\n\n📋 VERIFICAÇÃO DE EXISTÊNCIA:');
            console.log('=============================');
            
            const existsQuery = await client.query(`
                SELECT COUNT(*) as total FROM users WHERE id IN (15, 16, 17)
            `);
            
            console.log(`Usuários com IDs 15, 16, 17 que existem no banco: ${existsQuery.rows[0].total}`);
            
            // 6. Mostrar próximos IDs para referência
            console.log('\n\n📊 CONTEXTO - USUÁRIOS PRÓXIMOS:');
            console.log('================================');
            
            const contextQuery = await client.query(`
                SELECT 
                    id,
                    username,
                    exchange_auto_trading,
                    CASE 
                        WHEN binance_api_key_encrypted IS NOT NULL AND binance_api_secret_encrypted IS NOT NULL THEN 'B'
                        ELSE ''
                    END || 
                    CASE 
                        WHEN bybit_api_key_encrypted IS NOT NULL AND bybit_api_secret_encrypted IS NOT NULL THEN 'Y'
                        ELSE ''
                    END as keys_available
                FROM users 
                WHERE id BETWEEN 10 AND 20
                ORDER BY id
            `);
            
            contextQuery.rows.forEach(user => {
                const status = user.exchange_auto_trading ? '🟢' : '🔴';
                console.log(`  ${status} ID ${user.id}: ${user.username || 'N/A'} | Auto: ${user.exchange_auto_trading} | Keys: ${user.keys_available || 'none'}`);
            });
            
        } finally {
            client.release();
        }
    }

    async close() {
        await this.pool.end();
    }
}

// Executar investigação
if (require.main === module) {
    const investigator = new UserInvestigator();
    investigator.investigate()
        .then(() => {
            console.log('\n🎯 INVESTIGAÇÃO CONCLUÍDA!');
            return investigator.close();
        })
        .then(() => {
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 ERRO na investigação:', error);
            process.exit(1);
        });
}

module.exports = UserInvestigator;
