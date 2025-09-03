#!/usr/bin/env node

/**
 * 🔧 CORREÇÃO URGENTE - CHAVES NÃO ENCONTRADAS
 * ============================================
 * 
 * Script para identificar e corrigir o problema das chaves
 */

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function corrigirProblemaChaves() {
    try {
        console.log('🔧 CORREÇÃO URGENTE - CHAVES NÃO ENCONTRADAS');
        console.log('============================================');
        console.log('');

        // 1. Status atual
        console.log('📊 1. STATUS ATUAL DO BANCO:');
        console.log('----------------------------');
        
        const usuarios = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN is_active = true THEN 1 END) as ativos,
                COUNT(CASE WHEN is_active = false THEN 1 END) as inativos
            FROM users
        `);
        
        const user_stats = usuarios.rows[0];
        console.log(`👥 Usuários: ${user_stats.total} total (${user_stats.ativos} ativos, ${user_stats.inativos} inativos)`);
        
        const chaves = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN is_active = true THEN 1 END) as ativas,
                COUNT(CASE WHEN is_active = false THEN 1 END) as inativas,
                COUNT(CASE WHEN api_key IS NOT NULL AND secret_key IS NOT NULL THEN 1 END) as com_dados
            FROM user_api_keys
        `);
        
        const key_stats = chaves.rows[0];
        console.log(`🔑 Chaves: ${key_stats.total} total (${key_stats.ativas} ativas, ${key_stats.inativas} inativas, ${key_stats.com_dados} com dados)`);
        
        // 2. Detalhes dos usuários
        console.log('\n👥 2. DETALHES DOS USUÁRIOS:');
        console.log('---------------------------');
        
        const detalhesUsuarios = await pool.query('SELECT id, username, email, is_active, created_at FROM users ORDER BY id');
        detalhesUsuarios.rows.forEach(u => {
            const status = u.is_active ? '🟢 ATIVO' : '🔴 INATIVO';
            console.log(`   ${u.id}: ${u.username} (${u.email}) - ${status}`);
        });
        
        // 3. Detalhes das chaves
        console.log('\n🔑 3. DETALHES DAS CHAVES:');
        console.log('-------------------------');
        
        const detalhesChaves = await pool.query(`
            SELECT 
                uak.id, 
                uak.user_id, 
                u.username,
                uak.exchange, 
                uak.environment, 
                uak.is_active,
                uak.api_key IS NOT NULL as tem_api_key,
                uak.secret_key IS NOT NULL as tem_secret_key,
                LENGTH(uak.api_key) as api_key_length,
                LENGTH(uak.secret_key) as secret_key_length
            FROM user_api_keys uak
            JOIN users u ON uak.user_id = u.id
            ORDER BY uak.user_id, uak.exchange
        `);
        
        detalhesChaves.rows.forEach(c => {
            const status = c.is_active ? '🟢' : '🔴';
            const api = c.tem_api_key ? `✅(${c.api_key_length})` : '❌';
            const secret = c.tem_secret_key ? `✅(${c.secret_key_length})` : '❌';
            
            console.log(`   ${status} ${c.id}: ${c.username} - ${c.exchange} ${c.environment} | API:${api} Secret:${secret}`);
        });
        
        // 4. APLICAR CORREÇÕES
        console.log('\n🔧 4. APLICANDO CORREÇÕES:');
        console.log('-------------------------');
        
        // Ativar usuários inativos
        if (parseInt(user_stats.inativos) > 0) {
            console.log(`🔧 Ativando ${user_stats.inativos} usuários inativos...`);
            await pool.query('UPDATE users SET is_active = true WHERE is_active = false');
            console.log('✅ Usuários ativados');
        }
        
        // Ativar chaves inativas que têm dados
        if (parseInt(key_stats.inativas) > 0) {
            console.log(`🔧 Ativando chaves inativas com dados...`);
            const chavesAtivadas = await pool.query(`
                UPDATE user_api_keys 
                SET is_active = true 
                WHERE is_active = false 
                AND api_key IS NOT NULL 
                AND secret_key IS NOT NULL
                RETURNING id
            `);
            console.log(`✅ ${chavesAtivadas.rows.length} chaves ativadas`);
        }
        
        // 5. Testar query do sistema de validação
        console.log('\n🧪 5. TESTANDO QUERY DE VALIDAÇÃO:');
        console.log('----------------------------------');
        
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
        console.log(`📊 Resultado: ${resultadoValidacao.rows.length} chaves encontradas para validação`);
        
        if (resultadoValidacao.rows.length > 0) {
            console.log('\n✅ CHAVES ENCONTRADAS:');
            resultadoValidacao.rows.forEach(c => {
                console.log(`   🔑 ${c.username} - ${c.exchange} ${c.environment} (Key ID: ${c.key_id})`);
            });
            
            console.log('\n🎉 PROBLEMA RESOLVIDO!');
            console.log('======================');
            console.log('✅ Sistema de validação deve funcionar agora');
            
        } else {
            console.log('\n❌ PROBLEMA PERSISTENTE');
            console.log('======================');
            console.log('As correções não resolveram o problema');
            console.log('Possível problema na estrutura do banco de dados');
        }
        
        await pool.end();
        
    } catch (error) {
        console.error('❌ Erro durante correção:', error.message);
        console.error('Stack:', error.stack);
        await pool.end();
        process.exit(1);
    }
}

// Executar correção
corrigirProblemaChaves();
