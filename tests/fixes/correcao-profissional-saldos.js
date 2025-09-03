/**
 * 🎯 CORREÇÃO PROFISSIONAL DOS PROBLEMAS IDENTIFICADOS
 * Baseado no diagnóstico dos logs do sistema
 */

const { Pool } = require('pg');
const crypto = require('crypto');

class ProblemasSaldosCorretor {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
            ssl: { rejectUnauthorized: false }
        });
    }

    async executar() {
        console.log('🎯 INICIANDO CORREÇÃO PROFISSIONAL DOS PROBLEMAS DE SALDOS');
        console.log('========================================================');

        try {
            await this.analisarProblemasEstruturais();
            await this.corrigirProblemasChaves();
            await this.verificarCriptografia();
            await this.atualizarStatusValidacao();
            await this.sugerirSolucoes();
            
        } catch (error) {
            console.error('❌ Erro na correção:', error.message);
        } finally {
            await this.pool.end();
        }
    }

    async analisarProblemasEstruturais() {
        console.log('\n1️⃣ ANÁLISE DE PROBLEMAS ESTRUTURAIS:');
        
        // Verificar estrutura da tabela
        const estrutura = await this.pool.query(`
            SELECT column_name, data_type, character_maximum_length
            FROM information_schema.columns 
            WHERE table_name = 'user_api_keys'
            AND column_name IN ('api_keyYOUR_API_KEY_HEREsecret_key', 'api_key_encrypted', 'secret_key_encrypted')
            ORDER BY column_name
        `);

        console.log('   📋 Colunas de chaves encontradas:');
        estrutura.rows.forEach(col => {
            const length = col.character_maximum_length || 'ilimitado';
            console.log(`      • ${col.column_name}: ${col.data_type} (${length})`);
        });

        // Verificar se há chaves truncadas
        const chavesTruncadas = await this.pool.query(`
            SELECT 
                u.id, u.username, uak.exchange,
                LENGTH(uak.api_key) as api_len,
                LENGTH(uak.secret_key) as secret_len,
                CASE 
                    WHEN uak.exchange = 'bybit' AND LENGTH(uak.api_key) < 18 THEN 'API_TRUNCADA'
                    WHEN uak.exchange = 'bybit' AND LENGTH(uak.secret_key) < 36 THEN 'SECRET_TRUNCADA'
                    WHEN uak.exchange = 'binance' AND LENGTH(uak.api_key) < 60 THEN 'API_TRUNCADA'
                    WHEN uak.exchange = 'binance' AND LENGTH(uak.secret_key) < 60 THEN 'SECRET_TRUNCADA'
                    ELSE 'OK'
                END as status_length
            FROM users u
            JOIN user_api_keys uak ON u.id = uak.user_id
            WHERE u.id IN (14, 15, 16)
            ORDER BY u.id
        `);

        console.log('\n   🔍 Análise de comprimento das chaves:');
        chavesTruncadas.rows.forEach(chave => {
            const status = chave.status_length === 'OK' ? '✅' : '❌';
            console.log(`      ${status} ID ${chave.id} (${chave.username}) - ${chave.exchange}:`);
            console.log(`         API: ${chave.api_len} chars, Secret: ${chave.secret_len} chars`);
            if (chave.status_length !== 'OK') {
                console.log(`         🚨 PROBLEMA: ${chave.status_length}`);
            }
        });
    }

    async corrigirProblemasChaves() {
        console.log('\n2️⃣ CORREÇÃO DE PROBLEMAS DAS CHAVES:');

        // Verificar formato das chaves
        const chavesProblematicas = await this.pool.query(`
            SELECT 
                id, user_id, exchange,
                SUBSTRING(api_key, 1, 10) as api_preview,
                SUBSTRING(secret_key, 1, 10) as secret_preview,
                LENGTH(api_key) as api_length,
                LENGTH(secret_key) as secret_length,
                validation_status,
                validation_error
            FROM user_api_keys
            WHERE user_id IN (14, 15, 16)
            AND (validation_status != 'valid' OR validation_status IS NULL)
            ORDER BY user_id, exchange
        `);

        if (chavesProblematicas.rows.length === 0) {
            console.log('   ✅ Nenhuma chave problemática encontrada');
            return;
        }

        console.log('   🔧 Chaves que precisam de correção:');
        for (const chave of chavesProblematicas.rows) {
            console.log(`\n      📋 ID ${chave.id} (User ${chave.user_id}) - ${chave.exchange}:`);
            console.log(`         🔑 API: ${chave.api_preview}... (${chave.api_length} chars)`);
            console.log(`         🔐 Secret: ${chave.secret_preview}... (${chave.secret_length} chars)`);
            console.log(`         📊 Status: ${chave.validation_status || 'null'}`);
            console.log(`         ❌ Erro: ${chave.validation_error || 'nenhum'}`);

            // Identificar tipo de problema
            const problemas = [];
            
            if (chave.exchange === 'bybit') {
                if (chave.api_length < 18) problemas.push('API key muito curta para Bybit');
                if (chave.secret_length < 36) problemas.push('Secret key muito curta para Bybit');
            }
            
            if (chave.exchange === 'binance') {
                if (chave.api_length < 60) problemas.push('API key muito curta para Binance');
                if (chave.secret_length < 60) problemas.push('Secret key muito curta para Binance');
            }

            if (problemas.length > 0) {
                console.log('         🚨 PROBLEMAS IDENTIFICADOS:');
                problemas.forEach(p => console.log(`            • ${p}`));
            }
        }
    }

    async verificarCriptografia() {
        console.log('\n3️⃣ VERIFICAÇÃO DE CRIPTOGRAFIA:');

        const chavesFormatcheck = await this.pool.query(`
            SELECT 
                id, user_id, exchange,
                CASE 
                    WHEN api_key ~ '^[A-Za-z0-9+/]*={0,2}$' AND LENGTH(api_key) % 4 = 0 THEN 'base64'
                    WHEN api_key ~ '^[a-f0-9]+$' THEN 'hex'
                    WHEN api_key ~ '^[A-Za-z0-9]{20,}$' THEN 'alphanumeric'
                    ELSE 'unknown'
                END as api_format,
                CASE 
                    WHEN secret_key ~ '^[A-Za-z0-9+/]*={0,2}$' AND LENGTH(secret_key) % 4 = 0 THEN 'base64'
                    WHEN secret_key ~ '^[a-f0-9]+$' THEN 'hex'
                    WHEN secret_key ~ '^[A-Za-z0-9]{30,}$' THEN 'alphanumeric'
                    ELSE 'unknown'
                END as secret_format
            FROM user_api_keys
            WHERE user_id IN (14, 15, 16)
            ORDER BY user_id, exchange
        `);

        console.log('   🔍 Análise de formato das chaves:');
        chavesFormatcheck.rows.forEach(chave => {
            console.log(`      📋 ID ${chave.id} (User ${chave.user_id}) - ${chave.exchange}:`);
            console.log(`         🔑 API Format: ${chave.api_format}`);
            console.log(`         🔐 Secret Format: ${chave.secret_format}`);
            
            if (chave.api_format === 'base64' || chave.secret_format === 'base64') {
                console.log('         🔒 DETECTADO: Chaves podem estar criptografadas');
            }
        });
    }

    async atualizarStatusValidacao() {
        console.log('\n4️⃣ ATUALIZAÇÃO DE STATUS DE VALIDAÇÃO:');

        // Marcar chaves com problemas conhecidos
        await this.pool.query(`
            UPDATE user_api_keys 
            SET 
                validation_status = 'needs_review',
                validation_error = CASE 
                    WHEN exchange = 'bybit' AND LENGTH(api_key) < 18 THEN 'API key muito curta'
                    WHEN exchange = 'bybit' AND LENGTH(secret_key) < 36 THEN 'Secret key muito curta'
                    WHEN exchange = 'binance' AND LENGTH(api_key) < 60 THEN 'API key formato inválido'
                    WHEN exchange = 'binance' AND LENGTH(secret_key) < 60 THEN 'Secret key formato inválido'
                    ELSE validation_error
                END,
                updated_at = NOW()
            WHERE user_id IN (14, 15, 16)
            AND (
                (exchange = 'bybit' AND (LENGTH(api_key) < 18 OR LENGTH(secret_key) < 36))
                OR
                (exchange = 'binance' AND (LENGTH(api_key) < 60 OR LENGTH(secret_key) < 60))
            )
        `);

        console.log('   ✅ Status de validação atualizado para chaves problemáticas');
    }

    async sugerirSolucoes() {
        console.log('\n5️⃣ SOLUÇÕES RECOMENDADAS:');
        
        const problemasPorTipo = await this.pool.query(`
            SELECT 
                exchange,
                COUNT(*) as total_problemas,
                STRING_AGG(DISTINCT validation_error, '; ') as tipos_erros
            FROM user_api_keys
            WHERE user_id IN (14, 15, 16)
            AND validation_status = 'needs_review'
            GROUP BY exchange
        `);

        console.log('\n   📋 RESUMO DOS PROBLEMAS:');
        problemasPorTipo.rows.forEach(prob => {
            console.log(`\n      🏢 ${prob.exchange.toUpperCase()}:`);
            console.log(`         📊 ${prob.total_problemas} problema(s) encontrado(s)`);
            console.log(`         ❌ Tipos: ${prob.tipos_erros}`);
            
            if (prob.exchange === 'bybit') {
                console.log('         💡 SOLUÇÕES:');
                console.log('            1. Verificar se as chaves não foram truncadas no banco');
                console.log('            2. Adicionar IP do servidor à whitelist no Bybit');
                console.log('            3. Regenerar chaves API sem restrição de IP');
                console.log('            4. Verificar se as chaves são para conta Unified (accountType)');
            }
            
            if (prob.exchange === 'binance') {
                console.log('         💡 SOLUÇÕES:');
                console.log('            1. Verificar formato das chaves (devem ter 64 chars)');
                console.log('            2. Confirmar que são chaves válidas da Binance');
                console.log('            3. Verificar se não estão criptografadas incorretamente');
                console.log('            4. Testar ambiente correto (testnet vs mainnet)');
            }
        });

        console.log('\n   🎯 PRÓXIMOS PASSOS RECOMENDADOS:');
        console.log('      1. Corrigir chaves truncadas no banco de dados');
        console.log('      2. Configurar whitelist de IP nas exchanges');
        console.log('      3. Implementar sistema de decriptografia se necessário');
        console.log('      4. Executar novo teste de validação');

        // Estatísticas finais
        const estatisticas = await this.pool.query(`
            SELECT 
                COUNT(*) as total_chaves,
                COUNT(CASE WHEN validation_status = 'valid' THEN 1 END) as chaves_validas,
                COUNT(CASE WHEN validation_status = 'needs_review' THEN 1 END) as chaves_problematicas,
                COUNT(CASE WHEN validation_status IS NULL THEN 1 END) as chaves_nao_testadas
            FROM user_api_keys
            WHERE user_id IN (14, 15, 16)
        `);

        const stats = estatisticas.rows[0];
        console.log('\n   📊 ESTATÍSTICAS FINAIS:');
        console.log(`      🔢 Total de chaves: ${stats.total_chaves}`);
        console.log(`      ✅ Chaves válidas: ${stats.chaves_validas}`);
        console.log(`      🔧 Chaves problemáticas: ${stats.chaves_problematicas}`);
        console.log(`      ❓ Chaves não testadas: ${stats.chaves_nao_testadas}`);
    }
}

// Executar correção
const corretor = new ProblemasSaldosCorretor();
corretor.executar().then(() => {
    console.log('\n✅ CORREÇÃO PROFISSIONAL CONCLUÍDA!');
    process.exit(0);
}).catch(error => {
    console.error('❌ Erro na execução:', error.message);
    process.exit(1);
});
