#!/usr/bin/env node

/**
 * 🔍 EXPLORADOR DE TABELAS E CHAVES
 * =================================
 * 
 * Script para encontrar onde estão armazenadas as chaves dos usuários
 */

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function explorarTabelas() {
    console.log('🔍 EXPLORANDO ESTRUTURA DO BANCO');
    console.log('================================');

    try {
        // 1. Listar todas as tabelas
        console.log('\n📋 TODAS AS TABELAS:');
        const tabelas = await pool.query(`
            SELECT table_name, table_type
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);

        for (const tabela of tabelas.rows) {
            console.log(`  📋 ${tabela.table_name} (${tabela.table_type})`);
        }

        // 2. Buscar tabelas que podem conter chaves
        console.log('\n🔑 TABELAS SUSPEITAS DE CONTER CHAVES:');
        const tabelasSuspeitas = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND (
                table_name LIKE '%key%' OR 
                table_name LIKE '%api%' OR 
                table_name LIKE '%binance%' OR 
                table_name LIKE '%bybit%' OR
                table_name LIKE '%exchange%' OR
                table_name LIKE '%account%'
            )
            ORDER BY table_name
        `);

        if (tabelasSuspeitas.rows.length > 0) {
            for (const tabela of tabelasSuspeitas.rows) {
                console.log(`  🔍 ${tabela.table_name}`);
                
                // Verificar colunas da tabela
                const colunas = await pool.query(`
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = $1 
                    AND table_schema = 'public'
                    ORDER BY ordinal_position
                `, [tabela.table_name]);

                const colunasComChaves = colunas.rows.filter(col => 
                    col.column_name.includes('key') || 
                    col.column_name.includes('api') || 
                    col.column_name.includes('secret')
                );

                if (colunasComChaves.length > 0) {
                    console.log(`    🔑 Colunas com chaves:`);
                    for (const col of colunasComChaves) {
                        console.log(`      - ${col.column_name} (${col.data_type})`);
                    }

                    // Verificar se tem dados
                    const contagem = await pool.query(`SELECT COUNT(*) as total FROM ${tabela.table_name}`);
                    console.log(`    📊 Total de registros: ${contagem.rows[0].total}`);

                    if (contagem.rows[0].total > 0) {
                        // Mostrar alguns registros de exemplo (sem expor chaves)
                        const amostra = await pool.query(`
                            SELECT ${colunasComChaves.map(c => `
                                CASE 
                                    WHEN ${c.column_name} IS NOT NULL THEN CONCAT(LEFT(${c.column_name}, 8), '...', RIGHT(${c.column_name}, 4))
                                    ELSE NULL 
                                END as ${c.column_name}_preview
                            `).join(', ')}
                            FROM ${tabela.table_name} 
                            WHERE ${colunasComChaves[0].column_name} IS NOT NULL
                            LIMIT 3
                        `);

                        if (amostra.rows.length > 0) {
                            console.log(`    🔍 Amostras (ofuscadas):`);
                            for (const registro of amostra.rows) {
                                console.log(`      ${JSON.stringify(registro)}`);
                            }
                        }
                    }
                    console.log('');
                }
            }
        } else {
            console.log('  ⚠️ Nenhuma tabela suspeita encontrada');
        }

        // 3. Verificar especificamente as tabelas de usuários
        console.log('\n👥 VERIFICANDO TABELA USERS:');
        const users = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        `);

        if (users.rows.length > 0) {
            console.log('  📋 Colunas da tabela users:');
            for (const col of users.rows) {
                console.log(`    - ${col.column_name} (${col.data_type})`);
            }

            // Verificar quantos usuários ativos
            const userCount = await pool.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN is_active = true THEN 1 END) as ativos
                FROM users
            `);
            console.log(`  📊 Total: ${userCount.rows[0].total} | Ativos: ${userCount.rows[0].ativos}`);

            // Mostrar alguns usuários de exemplo
            const exemploUsers = await pool.query(`
                SELECT id, username, email, plan_type, is_active 
                FROM users 
                WHERE is_active = true 
                ORDER BY id 
                LIMIT 5
            `);

            if (exemploUsers.rows.length > 0) {
                console.log('  👤 Usuários ativos (amostra):');
                for (const user of exemploUsers.rows) {
                    console.log(`    ID ${user.id}: ${user.username} (${user.email}) - ${user.plan_type}`);
                }
            }
        } else {
            console.log('  ❌ Tabela users não encontrada');
        }

        // 4. Buscar em todas as tabelas por colunas que possam conter chaves API
        console.log('\n🕵️ BUSCA PROFUNDA POR CHAVES API:');
        const todasTabelas = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
        `);

        for (const tabela of todasTabelas.rows) {
            try {
                const colunas = await pool.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = $1 
                    AND table_schema = 'public'
                    AND (
                        column_name ILIKE '%api%' OR 
                        column_name ILIKE '%key%' OR 
                        column_name ILIKE '%secret%' OR
                        column_name ILIKE '%binance%' OR
                        column_name ILIKE '%bybit%'
                    )
                `, [tabela.table_name]);

                if (colunas.rows.length > 0) {
                    console.log(`  🔍 ${tabela.table_name}:`);
                    for (const col of colunas.rows) {
                        console.log(`    - ${col.column_name}`);
                    }

                    // Verificar se tem dados não nulos
                    const temDados = await pool.query(`
                        SELECT COUNT(*) as total 
                        FROM ${tabela.table_name} 
                        WHERE ${colunas.rows[0].column_name} IS NOT NULL
                    `);
                    
                    if (temDados.rows[0].total > 0) {
                        console.log(`    📊 ${temDados.rows[0].total} registros com dados`);
                    }
                }
            } catch (error) {
                // Ignorar erros de tabelas que não conseguimos acessar
            }
        }

    } catch (error) {
        console.error('❌ Erro na exploração:', error.message);
    } finally {
        await pool.end();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    explorarTabelas()
        .then(() => {
            console.log('\n✅ EXPLORAÇÃO CONCLUÍDA!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 ERRO:', error.message);
            process.exit(1);
        });
}

module.exports = { explorarTabelas };
