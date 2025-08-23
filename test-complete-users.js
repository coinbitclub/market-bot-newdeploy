#!/usr/bin/env node

/**
 * 🎯 TESTE COMPLETO DE CONEXÃO COM TODOS OS USUÁRIOS
 * ================================================
 * 
 * Teste final de todas as chaves reais dos usuários
 */

const { Pool } = require('pg');
const EnterpriseExchangeConnector = require('./enterprise-exchange-connector');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function testeCompletoUsuarios() {
    console.log('🎯 TESTE COMPLETO DE CONEXÃO COM USUÁRIOS REAIS');
    console.log('===============================================');

    const connector = new EnterpriseExchangeConnector();
    
    try {
        // 1. Buscar todos os usuários com chaves
        console.log('\n👥 BUSCANDO USUÁRIOS COM CHAVES...');

        const usuarios = await pool.query(`
            SELECT 
                uak.id as key_id,
                u.id as user_id,
                u.username,
                u.email,
                u.plan_type,
                uak.exchange,
                uak.environment,
                uak.api_key_encrypted as api_key,
                uak.secret_key_encrypted as secret_key,
                uak.validation_status,
                uak.last_validated,
                uak.is_active
            FROM user_api_keys uak
            JOIN users u ON uak.user_id = u.id
            WHERE u.is_active = true
            AND uak.is_active = true
            AND uak.api_key_encrypted IS NOT NULL
            AND uak.secret_key_encrypted IS NOT NULL
            ORDER BY u.id, uak.exchange, uak.environment
        `);

        if (usuarios.rows.length === 0) {
            console.log('❌ Nenhum usuário com chaves encontrado');
            return;
        }

        console.log(`✅ Encontrados ${usuarios.rows.length} registros de chaves para testar`);

        // 2. Estatísticas iniciais
        const stats = {
            total: usuarios.rows.length,
            usuarios_unicos: new Set(usuarios.rows.map(u => u.user_id)).size,
            por_exchange: {},
            sucessos: 0,
            falhas: 0,
            ip_restricted: 0,
            invalid_keys: 0,
            outros_erros: 0
        };

        usuarios.rows.forEach(u => {
            const key = `${u.exchange}_${u.environment}`;
            stats.por_exchange[key] = (stats.por_exchange[key] || 0) + 1;
        });

        console.log(`👥 Usuários únicos: ${stats.usuarios_unicos}`);
        console.log(`📊 Por exchange:`);
        Object.entries(stats.por_exchange).forEach(([exchange, count]) => {
            console.log(`   - ${exchange}: ${count} chaves`);
        });

        // 3. Testar cada chave
        console.log('\n🧪 INICIANDO TESTES...');
        console.log('='.repeat(80));

        for (const user of usuarios.rows) {
            console.log(`\n👤 ${user.username} (ID: ${user.user_id}) - ${user.plan_type}`);
            console.log(`📧 ${user.email}`);
            console.log(`🔑 Chave ${user.key_id}: ${user.exchange} ${user.environment}`);
            console.log(`📊 Status atual: ${user.validation_status || 'pending'}`);
            console.log(`🕐 Última validação: ${user.last_validated || 'Nunca'}`);
            console.log('-'.repeat(70));

            try {
                const startTime = Date.now();
                
                const resultado = await connector.connectAndValidateExchange(
                    user.user_id,
                    user.api_key,
                    user.secret_key,
                    user.exchange.toLowerCase()
                );

                const tempoExecucao = Date.now() - startTime;

                if (resultado.success) {
                    console.log(`✅ SUCESSO! (${tempoExecucao}ms)`);
                    console.log(`   🎯 Exchange detectada: ${resultado.exchange} ${resultado.environment}`);
                    console.log(`   📊 Tipo de conta: ${resultado.accountInfo?.accountType || 'N/A'}`);
                    
                    if (resultado.accountInfo?.totalWalletBalance) {
                        console.log(`   💰 Saldo total: ${resultado.accountInfo.totalWalletBalance} USDT`);
                    }
                    
                    if (resultado.balances && resultado.balances.length > 0) {
                        const comSaldo = resultado.balances.filter(b => parseFloat(b.free) > 0);
                        console.log(`   💼 Ativos: ${resultado.balances.length} moedas (${comSaldo.length} com saldo > 0)`);
                        
                        if (comSaldo.length > 0) {
                            const topAtivos = comSaldo
                                .sort((a, b) => parseFloat(b.free) - parseFloat(a.free))
                                .slice(0, 3);
                            
                            console.log(`   💎 Principais ativos:`);
                            topAtivos.forEach(asset => {
                                console.log(`     - ${asset.asset}: ${asset.free}`);
                            });
                        }
                    }

                    // Atualizar status no banco
                    await pool.query(`
                        UPDATE user_api_keys 
                        SET 
                            last_validated = NOW(),
                            validation_status = 'valid',
                            validation_error = NULL
                        WHERE id = $1
                    `, [user.key_id]);

                    stats.sucessos++;

                } else {
                    console.log(`❌ FALHA! (${tempoExecucao}ms)`);
                    console.log(`   🔍 Erro: ${resultado.error}`);
                    console.log(`   📋 Detalhes: ${resultado.details || 'N/A'}`);

                    // Categorizar o tipo de erro
                    if (resultado.error?.includes('Unmatched IP') || resultado.error?.includes('IP')) {
                        stats.ip_restricted++;
                        console.log(`   🔒 DIAGNÓSTICO: Restrição de IP`);
                    } else if (resultado.error?.includes('invalid') || resultado.error?.includes('Invalid')) {
                        stats.invalid_keys++;
                        console.log(`   🔑 DIAGNÓSTICO: Chave inválida`);
                    } else {
                        stats.outros_erros++;
                        console.log(`   ⚠️ DIAGNÓSTICO: Outro erro`);
                    }

                    // Atualizar status no banco
                    await pool.query(`
                        UPDATE user_api_keys 
                        SET 
                            last_validated = NOW(),
                            validation_status = 'invalid',
                            validation_error = $2
                        WHERE id = $1
                    `, [user.key_id, resultado.error]);

                    stats.falhas++;
                }

            } catch (error) {
                console.log(`💥 ERRO CRÍTICO!`);
                console.log(`   ❌ ${error.message}`);

                await pool.query(`
                    UPDATE user_api_keys 
                    SET 
                        last_validated = NOW(),
                        validation_status = 'error',
                        validation_error = $2
                    WHERE id = $1
                `, [user.key_id, error.message]);

                stats.falhas++;
                stats.outros_erros++;
            }

            // Pausa entre testes para evitar rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // 4. Relatório final
        console.log('\n\n📊 RELATÓRIO FINAL DE TESTES');
        console.log('============================');

        console.log(`📈 Estatísticas gerais:`);
        console.log(`   📊 Total testado: ${stats.total}`);
        console.log(`   ✅ Sucessos: ${stats.sucessos}`);
        console.log(`   ❌ Falhas: ${stats.falhas}`);
        console.log(`   📉 Taxa de sucesso: ${((stats.sucessos / stats.total) * 100).toFixed(1)}%`);

        console.log(`\n🔍 Análise de erros:`);
        console.log(`   🔒 Restrições de IP: ${stats.ip_restricted}`);
        console.log(`   🔑 Chaves inválidas: ${stats.invalid_keys}`);
        console.log(`   ⚠️ Outros erros: ${stats.outros_erros}`);

        // 5. Estado do sistema enterprise após os testes
        console.log('\n🏢 ESTADO DO SISTEMA ENTERPRISE:');
        console.log('===============================');

        const sistemaEnterprise = await pool.query(`
            SELECT 
                COUNT(*) as total_conexoes,
                COUNT(CASE WHEN is_active = true THEN 1 END) as conexoes_ativas,
                COUNT(DISTINCT user_id) as usuarios_enterprise
            FROM user_exchange_connections
        `);

        const statusSistema = sistemaEnterprise.rows[0];
        console.log(`🔗 Conexões enterprise registradas: ${statusSistema.total_conexoes}`);
        console.log(`✅ Conexões ativas: ${statusSistema.conexoes_ativas}`);
        console.log(`👥 Usuários no sistema enterprise: ${statusSistema.usuarios_enterprise}`);

        // 6. Recomendações
        console.log('\n💡 RECOMENDAÇÕES:');
        console.log('=================');

        if (stats.ip_restricted > 0) {
            console.log(`🔒 ${stats.ip_restricted} chaves com restrição de IP:`);
            console.log(`   - Verificar IPs autorizados nas exchanges`);
            console.log(`   - Adicionar IP do servidor: [IP_DO_SERVIDOR]`);
            console.log(`   - Ou remover restrições de IP das chaves`);
        }

        if (stats.invalid_keys > 0) {
            console.log(`🔑 ${stats.invalid_keys} chaves inválidas:`);
            console.log(`   - Verificar se as chaves não expiraram`);
            console.log(`   - Confirmar permissões das chaves`);
            console.log(`   - Solicitar novas chaves aos usuários`);
        }

        if (stats.sucessos > 0) {
            console.log(`✅ ${stats.sucessos} conexões funcionando:`);
            console.log(`   - Sistema enterprise operacional`);
            console.log(`   - Monitoramento automático ativo`);
            console.log(`   - Pronto para trading automatizado`);
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
    testeCompletoUsuarios()
        .then(() => {
            console.log('\n🎉 TESTE COMPLETO FINALIZADO!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 ERRO:', error.message);
            process.exit(1);
        });
}

module.exports = { testeCompletoUsuarios };
