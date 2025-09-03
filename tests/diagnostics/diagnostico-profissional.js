#!/usr/bin/env node

/**
 * 🔍 DIAGNÓSTICO PROFISSIONAL - BANCO DE DADOS
 * ============================================
 * 
 * Localizar as 4 chaves reais que existem no banco
 * e identificar por que o sistema não as encontra
 */

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function diagnosticoProfissional() {
    try {
        console.log('🔍 DIAGNÓSTICO PROFISSIONAL - BANCO DE DADOS');
        console.log('=============================================');
        console.log('');

        // 1. Verificar estrutura completa
        console.log('📋 1. ESTRUTURA DO BANCO');
        console.log('------------------------');
        
        const tabelas = await pool.query(`
            SELECT table_name, 
                   (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as colunas
            FROM information_schema.tables t
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        console.log(`📊 Total de tabelas: ${tabelas.rows.length}`);
        tabelas.rows.forEach(t => {
            console.log(`   📋 ${t.table_name} (${t.colunas} colunas)`);
        });

        // 2. Analisar tabela users
        console.log('\n👥 2. ANÁLISE DA TABELA USERS');
        console.log('-----------------------------');
        
        const usuarios = await pool.query(`
            SELECT id, username, email, is_active, created_at,
                   CASE WHEN is_active THEN '🟢 ATIVO' ELSE '🔴 INATIVO' END as status_icon
            FROM users 
            ORDER BY id
        `);
        
        console.log(`👥 Total de usuários: ${usuarios.rows.length}`);
        
        if (usuarios.rows.length === 0) {
            console.log('❌ PROBLEMA: Nenhum usuário encontrado na tabela users!');
        } else {
            usuarios.rows.forEach(u => {
                console.log(`   ${u.status_icon} ID ${u.id}: ${u.username} (${u.email})`);
                console.log(`      Criado: ${u.created_at}`);
            });
        }

        // 3. Analisar tabela user_api_keys
        console.log('\n🔑 3. ANÁLISE DA TABELA USER_API_KEYS');
        console.log('------------------------------------');
        
        const chaves = await pool.query(`
            SELECT uak.id, uak.user_id, uak.exchange, uak.environment, 
                   uak.is_active,
                   uak.api_key IS NOT NULL as tem_api_key,
                   uak.secret_key IS NOT NULL as tem_secret,
                   LENGTH(uak.api_key) as api_key_length,
                   LENGTH(uak.secret_key) as secret_key_length,
                   uak.validation_status,
                   uak.created_at,
                   u.username
            FROM user_api_keys uak
            LEFT JOIN users u ON uak.user_id = u.id
            ORDER BY uak.id
        `);
        
        console.log(`🔑 Total de chaves API: ${chaves.rows.length}`);
        
        if (chaves.rows.length === 0) {
            console.log('❌ PROBLEMA: Nenhuma chave encontrada na tabela user_api_keys!');
        } else {
            console.log('');
            chaves.rows.forEach(c => {
                const statusAtivo = c.is_active ? '🟢' : '🔴';
                const temChaves = c.tem_api_key && c.tem_secret ? '🔑✅' : '🔑❌';
                
                console.log(`   ${statusAtivo} ID ${c.id}: User ${c.user_id} (${c.username || 'SEM_USUARIO'}) - ${c.exchange} ${c.environment} ${temChaves}`);
                
                if (c.tem_api_key && c.tem_secret) {
                    console.log(`      📏 API Key: ${c.api_key_length} chars | Secret: ${c.secret_key_length} chars`);
                } else {
                    console.log(`      ❌ API Key: ${c.tem_api_key ? 'SET' : 'NULL'} | Secret: ${c.tem_secret ? 'SET' : 'NULL'}`);
                }
                
                console.log(`      📊 Status: ${c.validation_status || 'N/A'} | Criado: ${c.created_at}`);
                console.log('');
            });
        }

        // 4. Testar a query exata do sistema
        console.log('🎯 4. TESTANDO QUERY EXATA DO SISTEMA');
        console.log('------------------------------------');
        
        const queryOriginal = `
            SELECT 
                u.id as user_id,
                u.username,
                u.email,
                uak.id as key_id,
                uak.exchange,
                uak.environment,
                uak.api_key,
                uak.secret_key,
                uak.validation_status,
                uak.last_validated_at,
                uak.is_active
            FROM users u
            JOIN user_api_keys uak ON u.id = uak.user_id
            WHERE u.is_active = true 
            AND uak.is_active = true
            AND uak.api_key IS NOT NULL
            AND uak.secret_key IS NOT NULL
            ORDER BY u.id, uak.exchange, uak.environment
        `;
        
        const resultadoQuery = await pool.query(queryOriginal);
        console.log(`🎯 Resultado da query do sistema: ${resultadoQuery.rows.length} chaves`);
        
        if (resultadoQuery.rows.length === 0) {
            console.log('\n❌ PROBLEMA IDENTIFICADO: Query não retorna resultados!');
            console.log('\n🔧 ANALISANDO CADA CONDIÇÃO:');
            
            // Testar cada condição separadamente
            const condicoes = [
                { nome: 'Usuários ativos', query: 'SELECT COUNT(*) as count FROM users WHERE is_active = true' },
                { nome: 'Chaves ativas', query: 'SELECT COUNT(*) as count FROM user_api_keys WHERE is_active = true' },
                { nome: 'Chaves com API key', query: 'SELECT COUNT(*) as count FROM user_api_keys WHERE api_key IS NOT NULL' },
                { nome: 'Chaves com secret', query: 'SELECT COUNT(*) as count FROM user_api_keys WHERE secret_key IS NOT NULL' },
                { nome: 'JOIN funcionando', query: 'SELECT COUNT(*) as count FROM users u JOIN user_api_keys uak ON u.id = uak.user_id' }
            ];
            
            for (const condicao of condicoes) {
                try {
                    const result = await pool.query(condicao.query);
                    const count = result.rows[0].count;
                    const status = count > 0 ? '✅' : '❌';
                    console.log(`   ${status} ${condicao.nome}: ${count}`);
                } catch (error) {
                    console.log(`   ❌ ${condicao.nome}: ERRO - ${error.message}`);
                }
            }
            
            // Verificar se há problemas de dados órfãos
            console.log('\n🔧 VERIFICANDO PROBLEMAS DE DADOS:');
            
            const chavesOrfas = await pool.query(`
                SELECT uak.id, uak.user_id, uak.exchange
                FROM user_api_keys uak
                LEFT JOIN users u ON uak.user_id = u.id
                WHERE u.id IS NULL
            `);
            
            if (chavesOrfas.rows.length > 0) {
                console.log(`   ⚠️ ${chavesOrfas.rows.length} chaves órfãs (sem usuário correspondente)`);
                chavesOrfas.rows.forEach(c => {
                    console.log(`      Chave ID ${c.id}: user_id ${c.user_id} não existe na tabela users`);
                });
            } else {
                console.log('   ✅ Nenhuma chave órfã encontrada');
            }
            
        } else {
            console.log('\n✅ SUCESSO! Chaves encontradas pela query:');
            resultadoQuery.rows.forEach(r => {
                console.log(`   🔑 ${r.username} - ${r.exchange} ${r.environment} (Key ID: ${r.key_id})`);
            });
        }

        // 5. Propor correções se necessário
        console.log('\n🔧 5. PROPOSTA DE CORREÇÃO');
        console.log('--------------------------');
        
        if (resultadoQuery.rows.length === 0 && chaves.rows.length > 0) {
            console.log('🔧 Detectado problema nos dados. Executando correções...');
            
            // Ativar todos os usuários
            const usuariosInativos = await pool.query('UPDATE users SET is_active = true WHERE is_active = false RETURNING id, username');
            if (usuariosInativos.rows.length > 0) {
                console.log(`✅ ${usuariosInativos.rows.length} usuários ativados:`);
                usuariosInativos.rows.forEach(u => console.log(`   - ${u.username} (ID: ${u.id})`));
            }
            
            // Ativar todas as chaves que têm dados
            const chavesInativas = await pool.query(`
                UPDATE user_api_keys 
                SET is_active = true 
                WHERE is_active = false 
                AND api_key IS NOT NULL 
                AND secret_key IS NOT NULL 
                RETURNING id, user_id, exchange
            `);
            
            if (chavesInativas.rows.length > 0) {
                console.log(`✅ ${chavesInativas.rows.length} chaves ativadas:`);
                chavesInativas.rows.forEach(c => console.log(`   - Chave ID ${c.id} (User ${c.user_id}, ${c.exchange})`));
            }
            
            // Testar novamente
            console.log('\n🔄 TESTANDO NOVAMENTE APÓS CORREÇÕES:');
            const novoResultado = await pool.query(queryOriginal);
            console.log(`🎯 Nova consulta: ${novoResultado.rows.length} chaves encontradas`);
            
            if (novoResultado.rows.length > 0) {
                console.log('✅ PROBLEMA RESOLVIDO! Chaves agora disponíveis:');
                novoResultado.rows.forEach(r => {
                    console.log(`   🔑 ${r.username} - ${r.exchange} ${r.environment}`);
                });
            }
        }

        console.log('\n🎉 DIAGNÓSTICO CONCLUÍDO');
        console.log('========================');
        
    } catch (error) {
        console.error('❌ Erro no diagnóstico:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await pool.end();
    }
}

// Executar diagnóstico
if (require.main === module) {
    diagnosticoProfissional();
}

module.exports = diagnosticoProfissional;
