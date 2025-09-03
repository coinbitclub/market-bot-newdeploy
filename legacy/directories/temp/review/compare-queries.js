#!/usr/bin/env node

/**
 * 🔍 COMPARAÇÃO DE CONSULTAS
 * ==========================
 * 
 * Compara as diferentes consultas para entender a diferença
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

class QueryComparator {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
            ssl: { rejectUnauthorized: false }
        });
    }

    async compareQueries() {
        console.log('🔍 COMPARANDO CONSULTAS PARA ENCONTRAR A DIFERENÇA...\n');
        
        const client = await this.pool.connect();
        
        try {
            // CONSULTA 1: Do user-exchange-manager.js (ATUAL)
            console.log('📋 CONSULTA 1 - user-exchange-manager.js (ATUAL):');
            console.log('==================================================');
            const query1 = `
                SELECT 
                    id,
                    username,
                    email,
                    exchange_auto_trading,
                    exchange_testnet_mode,
                    api_validation_status,
                    CASE WHEN binance_api_key_encrypted IS NOT NULL THEN true ELSE false END as has_binance,
                    CASE WHEN bybit_api_key_encrypted IS NOT NULL THEN true ELSE false END as has_bybit
                FROM users 
                WHERE 
                    exchange_auto_trading = true 
                    AND (
                        binance_api_key_encrypted IS NOT NULL 
                        OR bybit_api_key_encrypted IS NOT NULL
                    )
                ORDER BY id
            `;
            
            const result1 = await client.query(query1);
            console.log(`Usuários encontrados: ${result1.rows.length}`);
            result1.rows.forEach(user => {
                console.log(`  • ID ${user.id}: ${user.username} | Binance: ${user.has_binance} | Bybit: ${user.has_bybit}`);
            });
            
            // CONSULTA 2: Corrigida (KEY + SECRET)
            console.log('\n\n📋 CONSULTA 2 - CORRIGIDA (KEY + SECRET):');
            console.log('=========================================');
            const query2 = `
                SELECT 
                    id,
                    username,
                    email,
                    exchange_auto_trading,
                    exchange_testnet_mode,
                    api_validation_status,
                    CASE WHEN binance_api_key_encrypted IS NOT NULL AND binance_api_secret_encrypted IS NOT NULL THEN true ELSE false END as has_binance_complete,
                    CASE WHEN bybit_api_key_encrypted IS NOT NULL AND bybit_api_secret_encrypted IS NOT NULL THEN true ELSE false END as has_bybit_complete
                FROM users 
                WHERE 
                    exchange_auto_trading = true 
                    AND (
                        (binance_api_key_encrypted IS NOT NULL AND binance_api_secret_encrypted IS NOT NULL)
                        OR (bybit_api_key_encrypted IS NOT NULL AND bybit_api_secret_encrypted IS NOT NULL)
                    )
                ORDER BY id
            `;
            
            const result2 = await client.query(query2);
            console.log(`Usuários encontrados: ${result2.rows.length}`);
            result2.rows.forEach(user => {
                console.log(`  • ID ${user.id}: ${user.username} | Binance: ${user.has_binance_complete} | Bybit: ${user.has_bybit_complete}`);
            });
            
            // Análise específica dos usuários 15, 16, 17
            console.log('\n\n🔍 ANÁLISE ESPECÍFICA - IDs 15, 16, 17:');
            console.log('=======================================');
            
            const detailQuery = `
                SELECT 
                    id,
                    username,
                    exchange_auto_trading,
                    binance_api_key_encrypted IS NOT NULL as has_binance_key,
                    binance_api_secret_encrypted IS NOT NULL as has_binance_secret,
                    bybit_api_key_encrypted IS NOT NULL as has_bybit_key,
                    bybit_api_secret_encrypted IS NOT NULL as has_bybit_secret,
                    -- Status nas duas consultas
                    CASE WHEN 
                        exchange_auto_trading = true AND (
                            binance_api_key_encrypted IS NOT NULL OR bybit_api_key_encrypted IS NOT NULL
                        ) 
                    THEN true ELSE false END as appears_in_query1,
                    CASE WHEN 
                        exchange_auto_trading = true AND (
                            (binance_api_key_encrypted IS NOT NULL AND binance_api_secret_encrypted IS NOT NULL) OR
                            (bybit_api_key_encrypted IS NOT NULL AND bybit_api_secret_encrypted IS NOT NULL)
                        ) 
                    THEN true ELSE false END as appears_in_query2
                FROM users 
                WHERE id IN (15, 16, 17)
                ORDER BY id
            `;
            
            const detailResult = await client.query(detailQuery);
            
            if (detailResult.rows.length === 0) {
                console.log('❌ Usuários 15, 16, 17 não encontrados no banco de dados!');
            } else {
                detailResult.rows.forEach(user => {
                    console.log(`\n🔹 USUÁRIO ${user.id} (${user.username || 'N/A'}):`);
                    console.log(`   Auto Trading: ${user.exchange_auto_trading}`);
                    console.log(`   Binance Key: ${user.has_binance_key ? '✅' : '❌'}`);
                    console.log(`   Binance Secret: ${user.has_binance_secret ? '✅' : '❌'}`);
                    console.log(`   Bybit Key: ${user.has_bybit_key ? '✅' : '❌'}`);
                    console.log(`   Bybit Secret: ${user.has_bybit_secret ? '✅' : '❌'}`);
                    console.log(`   Aparece na Consulta 1 (atual): ${user.appears_in_query1 ? '✅ SIM' : '❌ NÃO'}`);
                    console.log(`   Aparece na Consulta 2 (corrigida): ${user.appears_in_query2 ? '✅ SIM' : '❌ NÃO'}`);
                    
                    if (!user.appears_in_query2 && user.exchange_auto_trading) {
                        if (!user.has_binance_key && !user.has_bybit_key) {
                            console.log(`   🚨 PROBLEMA: Não tem chaves de API em nenhuma exchange`);
                        } else if (user.has_binance_key && !user.has_binance_secret) {
                            console.log(`   🚨 PROBLEMA: Tem chave Binance mas não tem secret`);
                        } else if (user.has_bybit_key && !user.has_bybit_secret) {
                            console.log(`   🚨 PROBLEMA: Tem chave Bybit mas não tem secret`);
                        }
                    }
                });
            }
            
            // Mostrar diferença entre as consultas
            console.log('\n\n📊 DIFERENÇA ENTRE AS CONSULTAS:');
            console.log('================================');
            
            const ids1 = result1.rows.map(u => u.id);
            const ids2 = result2.rows.map(u => u.id);
            
            console.log(`Consulta 1 (atual): ${ids1.length} usuários`);
            console.log(`Consulta 2 (corrigida): ${ids2.length} usuários`);
            
            const onlyInQuery1 = ids1.filter(id => !ids2.includes(id));
            const onlyInQuery2 = ids2.filter(id => !ids1.includes(id));
            
            if (onlyInQuery1.length > 0) {
                console.log(`\n❗ IDs que aparecem apenas na Consulta 1 (problema): ${onlyInQuery1.join(', ')}`);
            }
            
            if (onlyInQuery2.length > 0) {
                console.log(`\n✅ IDs que aparecem apenas na Consulta 2: ${onlyInQuery2.join(', ')}`);
            }
            
        } finally {
            client.release();
        }
    }

    async close() {
        await this.pool.end();
    }
}

// Executar comparação
if (require.main === module) {
    const comparator = new QueryComparator();
    comparator.compareQueries()
        .then(() => {
            console.log('\n🎯 COMPARAÇÃO CONCLUÍDA!');
            return comparator.close();
        })
        .then(() => {
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 ERRO na comparação:', error);
            process.exit(1);
        });
}

module.exports = QueryComparator;
