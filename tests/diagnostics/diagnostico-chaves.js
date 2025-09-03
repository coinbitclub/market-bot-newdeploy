#!/usr/bin/env node

/**
 * 🔍 DIAGNÓSTICO DE CHAVES API - INVESTIGAÇÃO EMERGENCIAL
 * =======================================================
 * 
 * Verificar por que o sistema de validação não está encontrando
 * as chaves que já foram testadas com sucesso anteriormente
 */

const { Pool } = require('pg');

// Configuração do banco
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function diagnosticoCompleto() {
    try {
        console.log('🔍 DIAGNÓSTICO COMPLETO - CHAVES API');
        console.log('===================================');
        
        // 1. Verificar existência das tabelas
        console.log('\n📋 1. VERIFICANDO TABELAS...');
        const tabelas = await pool.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('users', 'user_api_keys')
            ORDER BY table_name
        `);
        
        console.log('Tabelas encontradas:', tabelas.rows.map(r => r.table_name).join(', '));
        
        if (tabelas.rows.length < 2) {
            console.log('❌ ERRO CRÍTICO: Tabelas necessárias não existem!');
            
            // Verificar todas as tabelas disponíveis
            const todasTabelas = await pool.query(`
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            `);
            console.log('Tabelas disponíveis:', todasTabelas.rows.map(r => r.table_name));
            
            await pool.end();
            return;
        }
        
        // 2. Verificar estrutura da tabela users
        console.log('\n👥 2. VERIFICANDO USUÁRIOS...');
        try {
            const usuarios = await pool.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN is_active = true THEN 1 END) as ativos,
                    COUNT(CASE WHEN is_active = false THEN 1 END) as inativos
                FROM users
            `);
            
            const userStats = usuarios.rows[0];
            console.log(`   Total: ${userStats.total}`);
            console.log(`   Ativos: ${userStats.ativos}`);
            console.log(`   Inativos: ${userStats.inativos}`);
            
            // Listar usuários específicos
            const listaUsuarios = await pool.query(`
                SELECT id, username, email, is_active 
                FROM users 
                ORDER BY id
            `);
            
            console.log('\n   📋 Lista de usuários:');
            listaUsuarios.rows.forEach(u => {
                console.log(`      ID ${u.id}: ${u.username} (${u.email}) - Ativo: ${u.is_active}`);
            });
            
        } catch (error) {
            console.log('❌ Erro ao verificar usuários:', error.message);
        }
        
        // 3. Verificar estrutura da tabela user_api_keys
        console.log('\n🔑 3. VERIFICANDO CHAVES API...');
        try {
            const chaves = await pool.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN is_active = true THEN 1 END) as ativas,
                    COUNT(CASE WHEN is_active = false THEN 1 END) as inativas,
                    COUNT(CASE WHEN api_key IS NOT NULL THEN 1 END) as com_api_key,
                    COUNT(CASE WHEN secret_key IS NOT NULL THEN 1 END) as com_secret,
                    COUNT(CASE WHEN is_active = true AND api_key IS NOT NULL AND secret_key IS NOT NULL THEN 1 END) as validas_completas
                FROM user_api_keys
            `);
            
            const keyStats = chaves.rows[0];
            console.log(`   Total: ${keyStats.total}`);
            console.log(`   Ativas: ${keyStats.ativas}`);
            console.log(`   Inativas: ${keyStats.inativas}`);
            console.log(`   Com API Key: ${keyStats.com_api_key}`);
            console.log(`   Com Secret: ${keyStats.com_secret}`);
            console.log(`   Válidas completas: ${keyStats.validas_completas}`);
            
            // Listar chaves específicas
            const listaChaves = await pool.query(`
                SELECT 
                    id, user_id, exchange, environment, is_active,
                    CASE WHEN api_key IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as tem_api_key,
                    CASE WHEN secret_key IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as tem_secret,
                    validation_status,
                    last_validated_at
                FROM user_api_keys 
                ORDER BY user_id, exchange, environment
            `);
            
            console.log('\n   📋 Lista de chaves API:');
            listaChaves.rows.forEach(k => {
                console.log(`      ID ${k.id}: User ${k.user_id} - ${k.exchange} ${k.environment} - Ativa:${k.is_active} API:${k.tem_api_key} Secret:${k.tem_secret} Status:${k.validation_status || 'NULL'}`);
            });
            
        } catch (error) {
            console.log('❌ Erro ao verificar chaves:', error.message);
        }
        
        // 4. Testar a query exata do sistema de validação
        console.log('\n🔍 4. TESTANDO QUERY DO SISTEMA DE VALIDAÇÃO...');
        try {
            const queryValidacao = `
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
            
            const resultadoValidacao = await pool.query(queryValidacao);
            console.log(`   Resultado: ${resultadoValidacao.rows.length} chaves encontradas`);
            
            if (resultadoValidacao.rows.length > 0) {
                console.log('\n   ✅ CHAVES ENCONTRADAS PELA QUERY DE VALIDAÇÃO:');
                resultadoValidacao.rows.forEach(r => {
                    console.log(`      ${r.username} - ${r.exchange} ${r.environment} (Key ID: ${r.key_id})`);
                });
            } else {
                console.log('\n   ❌ NENHUMA CHAVE ENCONTRADA PELA QUERY DE VALIDAÇÃO');
                
                // Investigar cada condição individualmente
                console.log('\n   🔍 Investigando condições específicas...');
                
                // Usuários ativos
                const usuariosAtivos = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_active = true');
                console.log(`      Usuários ativos: ${usuariosAtivos.rows[0].count}`);
                
                // Chaves ativas
                const chavesAtivas = await pool.query('SELECT COUNT(*) as count FROM user_api_keys WHERE is_active = true');
                console.log(`      Chaves ativas: ${chavesAtivas.rows[0].count}`);
                
                // Chaves com api_key
                const chavesComApiKey = await pool.query('SELECT COUNT(*) as count FROM user_api_keys WHERE api_key IS NOT NULL');
                console.log(`      Chaves com API key: ${chavesComApiKey.rows[0].count}`);
                
                // Chaves com secret_key
                const chavesComSecret = await pool.query('SELECT COUNT(*) as count FROM user_api_keys WHERE secret_key IS NOT NULL');
                console.log(`      Chaves com secret: ${chavesComSecret.rows[0].count}`);
                
                // JOIN entre tabelas
                const joinTabelas = await pool.query('SELECT COUNT(*) as count FROM users u JOIN user_api_keys uak ON u.id = uak.user_id');
                console.log(`      JOIN users <-> user_api_keys: ${joinTabelas.rows[0].count}`);
            }
            
        } catch (error) {
            console.log('❌ Erro na query de validação:', error.message);
        }
        
        // 5. Verificar se existe a chave ERICA que foi testada com sucesso
        console.log('\n👤 5. PROCURANDO CHAVE DA ERICA (TESTADA COM SUCESSO)...');
        try {
            const chaveErica = await pool.query(`
                SELECT 
                    u.username, u.email, u.is_active as user_ativo,
                    uak.id, uak.exchange, uak.environment, uak.is_active as key_ativa,
                    CASE WHEN uak.api_key IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as tem_api_key,
                    CASE WHEN uak.secret_key IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as tem_secret,
                    LEFT(uak.api_key, 10) as api_key_preview
                FROM users u
                LEFT JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE LOWER(u.username) LIKE '%erica%' 
                OR LOWER(u.email) LIKE '%erica%'
                OR uak.api_key LIKE '%2iNeN%'
                ORDER BY u.id
            `);
            
            if (chaveErica.rows.length > 0) {
                console.log('   ✅ ENCONTRADA INFORMAÇÃO DA ERICA:');
                chaveErica.rows.forEach(e => {
                    if (e.id) {
                        console.log(`      ${e.username} (${e.email}): ${e.exchange} ${e.environment}`);
                        console.log(`         User ativo: ${e.user_ativo}, Key ativa: ${e.key_ativa}`);
                        console.log(`         Tem API: ${e.tem_api_key}, Tem Secret: ${e.tem_secret}`);
                        console.log(`         API Key preview: ${e.api_key_preview}...`);
                    } else {
                        console.log(`      ${e.username} (${e.email}): SEM CHAVES API`);
                    }
                });
            } else {
                console.log('   ❌ CHAVE DA ERICA NÃO ENCONTRADA NO BANCO');
                
                // Buscar qualquer chave que comece com 2iNeN
                const chaveComecaComINeN = await pool.query(`
                    SELECT * FROM user_api_keys 
                    WHERE api_key LIKE '2iNeN%'
                `);
                
                if (chaveComecaComINeN.rows.length > 0) {
                    console.log('   🔍 Encontrada chave com início "2iNeN":');
                    console.log('      ', chaveComecaComINeN.rows[0]);
                } else {
                    console.log('   ❌ Nenhuma chave encontrada com início "2iNeN"');
                }
            }
            
        } catch (error) {
            console.log('❌ Erro ao procurar chave da Erica:', error.message);
        }
        
        console.log('\n🏁 DIAGNÓSTICO CONCLUÍDO');
        console.log('========================');
        
        await pool.end();
        
    } catch (error) {
        console.error('❌ Erro geral no diagnóstico:', error.message);
        console.error('Stack:', error.stack);
        await pool.end();
    }
}

// Executar diagnóstico
diagnosticoCompleto();
