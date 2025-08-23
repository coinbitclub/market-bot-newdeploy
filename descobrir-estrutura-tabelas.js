/**
 * 🔍 DESCOBRIR ESTRUTURA REAL DAS TABELAS
 * 
 * Script para identificar as colunas corretas das tabelas
 */

const { Pool } = require('pg');

class EstruturaTabelasDiagnostico {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL
        });
    }

    async descobrirEstrutura() {
        console.log('🔍 DESCOBRINDO ESTRUTURA DAS TABELAS\n');
        console.log('='.repeat(60));

        const tabelas = ['users', 'user_api_keys', 'balances', 'signals', 'positions'];

        for (const tabela of tabelas) {
            try {
                console.log(`\n📋 TABELA: ${tabela.toUpperCase()}`);
                console.log('-'.repeat(40));

                // Descobrir colunas da tabela
                const query = `
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns 
                    WHERE table_name = $1 
                    ORDER BY ordinal_position
                `;
                
                const result = await this.pool.query(query, [tabela]);
                
                if (result.rows.length > 0) {
                    console.log('✅ Colunas encontradas:');
                    result.rows.forEach(col => {
                        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
                        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
                        console.log(`   ${col.column_name} (${col.data_type}) ${nullable}${defaultVal}`);
                    });

                    // Mostrar dados de exemplo
                    try {
                        const sampleQuery = `SELECT * FROM ${tabela} LIMIT 3`;
                        const sampleResult = await this.pool.query(sampleQuery);
                        
                        if (sampleResult.rows.length > 0) {
                            console.log('\n📊 Dados de exemplo:');
                            sampleResult.rows.forEach((row, i) => {
                                console.log(`   Registro ${i + 1}:`, JSON.stringify(row, null, 4));
                            });
                        } else {
                            console.log('\n📊 Tabela vazia');
                        }
                    } catch (sampleError) {
                        console.log('\n📊 Erro ao buscar dados de exemplo:', sampleError.message);
                    }

                } else {
                    console.log('❌ Tabela não encontrada');
                }

            } catch (error) {
                console.log(`❌ Erro ao verificar tabela ${tabela}:`, error.message);
            }
        }
    }

    async gerarQuerysCorretas() {
        console.log('\n\n🔧 GERANDO QUERIES CORRETAS BASEADAS NA ESTRUTURA REAL\n');
        console.log('='.repeat(60));

        // Verificar estrutura específica da tabela balances
        try {
            const balancesColumns = await this.pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'balances'
                ORDER BY ordinal_position
            `);

            console.log('📋 COLUNAS DA TABELA BALANCES:');
            const colunas = balancesColumns.rows.map(row => row.column_name);
            console.log('   ', colunas.join(', '));

            // Verificar se existe coluna de saldo
            const colunaSaldo = colunas.find(col => 
                col.includes('balance') || 
                col.includes('amount') || 
                col.includes('total') ||
                col.includes('free') ||
                col.includes('used')
            );

            console.log(`\n💰 COLUNA DE SALDO IDENTIFICADA: ${colunaSaldo || 'NÃO ENCONTRADA'}`);

        } catch (error) {
            console.log('❌ Erro ao verificar colunas balances:', error.message);
        }

        // Verificar estrutura da tabela user_api_keys
        try {
            const userKeysColumns = await this.pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'user_api_keys'
                ORDER BY ordinal_position
            `);

            console.log('\n📋 COLUNAS DA TABELA USER_API_KEYS:');
            const colunas = userKeysColumns.rows.map(row => row.column_name);
            console.log('   ', colunas.join(', '));

        } catch (error) {
            console.log('❌ Erro ao verificar colunas user_api_keys:', error.message);
        }

        // Sugerir queries corretas
        console.log('\n💡 QUERIES SUGERIDAS:');
        console.log(`
-- Query para monitorar saldos (corrigida):
SELECT 
    u.id as user_id,
    u.username,
    u.email,
    uk.exchange,
    uk.is_testnet,
    COUNT(*) as total_balances
FROM users u
LEFT JOIN user_api_keys uk ON u.id = uk.user_id
LEFT JOIN balances b ON u.id = b.user_id
WHERE uk.is_active = true
GROUP BY u.id, u.username, u.email, uk.exchange, uk.is_testnet;

-- Query para verificar API keys:
SELECT 
    id, user_id, exchange, 
    SUBSTRING(api_key, 1, 8) as api_key_preview,
    is_active, is_testnet, created_at
FROM user_api_keys 
WHERE is_active = true;
        `);
    }

    async executarDiagnostico() {
        console.log('🚀 DIAGNÓSTICO DE ESTRUTURA DE TABELAS INICIADO\n');
        console.log('Data:', new Date().toLocaleString());
        console.log('='.repeat(60));

        try {
            await this.descobrirEstrutura();
            await this.gerarQuerysCorretas();

        } catch (error) {
            console.log('💥 Erro geral:', error.message);
        } finally {
            await this.pool.end();
        }

        console.log('\n✅ DIAGNÓSTICO CONCLUÍDO!');
        console.log('💡 Use as informações acima para corrigir as queries');
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const diagnostico = new EstruturaTabelasDiagnostico();
    diagnostico.executarDiagnostico()
        .catch(error => {
            console.error('💥 Erro no diagnóstico:', error.message);
            process.exit(1);
        });
}

module.exports = EstruturaTabelasDiagnostico;
