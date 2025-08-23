#!/usr/bin/env node

/**
 * 🧪 TESTE DE CONEXÃO COM USUÁRIOS REAIS
 * ======================================
 * 
 * Script para testar conexões enterprise com usuários do banco de dados
 */

const { Pool } = require('pg');
const EnterpriseExchangeConnector = require('./enterprise-exchange-connector');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function testarConexaoUsuarios() {
    console.log('🧪 TESTANDO CONEXÃO COM USUÁRIOS REAIS');
    console.log('======================================');

    const connector = new EnterpriseExchangeConnector();
    
    try {
        // 1. Buscar usuários ativos com chaves
        console.log('\n🔍 BUSCANDO USUÁRIOS ATIVOS...');
        
        const usuarios = await pool.query(`
            SELECT DISTINCT
                u.id,
                u.username,
                u.email,
                u.plan_type,
                u.is_active,
                COUNT(CASE WHEN ea.api_key IS NOT NULL THEN 1 END) as total_chaves
            FROM users u
            LEFT JOIN exchange_accounts ea ON u.id = ea.user_id
            WHERE u.is_active = true
            GROUP BY u.id, u.username, u.email, u.plan_type, u.is_active
            HAVING COUNT(CASE WHEN ea.api_key IS NOT NULL THEN 1 END) > 0
            ORDER BY u.id
        `);

        if (usuarios.rows.length === 0) {
            console.log('❌ Nenhum usuário ativo encontrado com chaves API');
            return;
        }

        console.log(`✅ Encontrados ${usuarios.rows.length} usuários com chaves API`);

        // 2. Para cada usuário, buscar suas chaves e testar
        for (const usuario of usuarios.rows) {
            console.log(`\n👤 TESTANDO USUÁRIO: ${usuario.username} (ID: ${usuario.id})`);
            console.log(`📧 Email: ${usuario.email}`);
            console.log(`📋 Plano: ${usuario.plan_type}`);
            console.log(`🔑 Total de chaves: ${usuario.total_chaves}`);
            console.log('─'.repeat(60));

            // Buscar chaves específicas do usuário
            const chaves = await pool.query(`
                SELECT 
                    exchange_name,
                    api_key,
                    secret_key,
                    testnet,
                    is_active
                FROM exchange_accounts
                WHERE user_id = $1 
                AND api_key IS NOT NULL 
                AND secret_key IS NOT NULL
                ORDER BY exchange_name, testnet
            `, [usuario.id]);

            if (chaves.rows.length === 0) {
                console.log('  ⚠️ Usuário sem chaves válidas');
                continue;
            }

            // Testar cada chave
            let sucessos = 0;
            let falhas = 0;

            for (const chave of chaves.rows) {
                const exchangeInfo = chave.testnet ? 'TESTNET' : 'MAINNET';
                const status = chave.is_active ? '🟢' : '🔴';
                
                console.log(`\n  ${status} ${chave.exchange_name} ${exchangeInfo}:`);
                console.log(`    🔑 API Key: ${chave.api_key.substring(0, 8)}...${chave.api_key.substring(-4)}`);
                console.log(`    🔐 Secret: ${chave.secret_key ? '***Presente***' : 'AUSENTE'}`);
                console.log(`    📊 Status: ${chave.is_active ? 'ATIVO' : 'INATIVO'}`);

                if (!chave.is_active) {
                    console.log(`    ⏭️ Pulando chave inativa`);
                    continue;
                }

                // Testar conexão enterprise
                console.log(`    🔄 Testando conexão enterprise...`);
                
                try {
                    const startTime = Date.now();
                    
                    const resultado = await connector.connectAndValidateExchange(
                        usuario.id,
                        chave.api_key,
                        chave.secret_key,
                        chave.exchange_name.toLowerCase()
                    );

                    const tempoExecucao = Date.now() - startTime;

                    if (resultado.success) {
                        console.log(`    ✅ SUCESSO! (${tempoExecucao}ms)`);
                        console.log(`       🎯 Exchange detectada: ${resultado.exchange} ${resultado.environment}`);
                        console.log(`       📊 Conta: ${resultado.accountInfo?.accountType || 'N/A'}`);
                        if (resultado.accountInfo?.totalWalletBalance) {
                            console.log(`       💰 Saldo: ${resultado.accountInfo.totalWalletBalance} USDT`);
                        }
                        if (resultado.balances && resultado.balances.length > 0) {
                            console.log(`       💼 Ativos: ${resultado.balances.length} moedas`);
                        }
                        sucessos++;
                    } else {
                        console.log(`    ❌ FALHA! (${tempoExecucao}ms)`);
                        console.log(`       🔍 Motivo: ${resultado.error}`);
                        console.log(`       📋 Detalhes: ${resultado.details || 'N/A'}`);
                        falhas++;
                    }

                } catch (error) {
                    console.log(`    💥 ERRO CRÍTICO!`);
                    console.log(`       ❌ ${error.message}`);
                    falhas++;
                }

                // Pequena pausa entre testes
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Resumo do usuário
            const total = sucessos + falhas;
            const taxa = total > 0 ? ((sucessos / total) * 100).toFixed(1) : '0.0';
            
            console.log(`\n  📊 RESUMO ${usuario.username}:`);
            console.log(`     ✅ Sucessos: ${sucessos}`);
            console.log(`     ❌ Falhas: ${falhas}`);
            console.log(`     📈 Taxa de sucesso: ${taxa}%`);
        }

        // 3. Verificar conexões registradas no sistema enterprise
        console.log(`\n\n📊 VERIFICANDO SISTEMA ENTERPRISE`);
        console.log('=================================');

        const conexoesEnterprise = await pool.query(`
            SELECT 
                u.username,
                uec.exchange,
                uec.environment,
                uec.is_active,
                uec.last_validated,
                uec.connection_attempts,
                uec.last_error
            FROM user_exchange_connections uec
            JOIN users u ON uec.user_id = u.id
            ORDER BY u.username, uec.exchange, uec.environment
        `);

        if (conexoesEnterprise.rows.length > 0) {
            console.log(`✅ ${conexoesEnterprise.rows.length} conexões enterprise registradas:`);
            
            for (const conn of conexoesEnterprise.rows) {
                const status = conn.is_active ? '🟢 ATIVO' : '🔴 INATIVO';
                console.log(`\n  ${status} ${conn.username}: ${conn.exchange} ${conn.environment}`);
                
                if (conn.last_validated) {
                    console.log(`    🕐 Última validação: ${new Date(conn.last_validated).toLocaleString()}`);
                }
                
                console.log(`    🔄 Tentativas: ${conn.connection_attempts || 0}`);
                
                if (conn.last_error) {
                    console.log(`    ❌ Último erro: ${conn.last_error.substring(0, 80)}...`);
                }
            }
        } else {
            console.log('⚠️ Nenhuma conexão enterprise registrada');
        }

        // 4. Estatísticas gerais
        console.log(`\n\n📈 ESTATÍSTICAS GERAIS`);
        console.log('=====================');

        const stats = await pool.query(`
            SELECT 
                COUNT(DISTINCT u.id) as usuarios_com_chaves,
                COUNT(ea.id) as total_chaves,
                COUNT(CASE WHEN ea.is_active = true THEN 1 END) as chaves_ativas,
                COUNT(DISTINCT uec.user_id) as usuarios_enterprise,
                COUNT(uec.id) as conexoes_enterprise,
                COUNT(CASE WHEN uec.is_active = true THEN 1 END) as conexoes_enterprise_ativas
            FROM users u
            LEFT JOIN exchange_accounts ea ON u.id = ea.user_id
            LEFT JOIN user_exchange_connections uec ON u.id = uec.user_id
            WHERE u.is_active = true
        `);

        const estatisticas = stats.rows[0];
        
        console.log(`👥 Usuários com chaves: ${estatisticas.usuarios_com_chaves}`);
        console.log(`🔑 Total de chaves: ${estatisticas.total_chaves}`);
        console.log(`✅ Chaves ativas: ${estatisticas.chaves_ativas}`);
        console.log(`🏢 Usuários enterprise: ${estatisticas.usuarios_enterprise}`);
        console.log(`🔗 Conexões enterprise: ${estatisticas.conexoes_enterprise}`);
        console.log(`🟢 Conexões enterprise ativas: ${estatisticas.conexoes_enterprise_ativas}`);

        // Taxa de adoção enterprise
        if (estatisticas.usuarios_com_chaves > 0) {
            const taxaAdocao = ((estatisticas.usuarios_enterprise / estatisticas.usuarios_com_chaves) * 100).toFixed(1);
            console.log(`📊 Taxa de adoção enterprise: ${taxaAdocao}%`);
        }

    } catch (error) {
        console.error('\n❌ Erro no teste:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await pool.end();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    testarConexaoUsuarios()
        .then(() => {
            console.log('\n✅ TESTE DE CONEXÃO CONCLUÍDO!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 ERRO:', error.message);
            process.exit(1);
        });
}

module.exports = { testarConexaoUsuarios };
