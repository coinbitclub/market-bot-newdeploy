#!/usr/bin/env node

/**
 * 🔐 TESTE DE CONEXÃO COM CHAVES DESCRIPTOGRAFADAS
 * ===============================================
 * 
 * Script para testar conexões enterprise usando as chaves reais descriptografadas
 */

const { Pool } = require('pg');
const EnterpriseExchangeConnector = require('./enterprise-exchange-connector');
const crypto = require('crypto');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

class DecryptorService {
    constructor() {
        // Chave de criptografia padrão (mesmo do sistema original)
        this.encryptionKey = process.env.ENCRYPTION_KEY || 'CoinBitClubSecretKey32CharsForProd';
    }

    async decryptUserKeys(encryptedKey, encryptedSecret) {
        try {
            const algorithm = 'aes-256-cbc';
            const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);

            // Descriptografar API Key
            const keyBuffer = Buffer.from(encryptedKey, 'hex');
            const keyIv = keyBuffer.slice(0, 16);
            const keyEncrypted = keyBuffer.slice(16);
            const keyDecipher = crypto.createDecipheriv(algorithm, key, keyIv);
            const apiKey = keyDecipher.update(keyEncrypted, null, 'utf8') + keyDecipher.final('utf8');

            // Descriptografar API Secret
            const secretBuffer = Buffer.from(encryptedSecret, 'hex');
            const secretIv = secretBuffer.slice(0, 16);
            const secretEncrypted = secretBuffer.slice(16);
            const secretDecipher = crypto.createDecipheriv(algorithm, key, secretIv);
            const apiSecret = secretDecipher.update(secretEncrypted, null, 'utf8') + secretDecipher.final('utf8');

            return {
                success: true,
                apiKey,
                apiSecret
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

async function testarConexoesDescriptografadas() {
    console.log('🔐 TESTANDO CONEXÕES COM CHAVES DESCRIPTOGRAFADAS');
    console.log('================================================');

    const connector = new EnterpriseExchangeConnector();
    const decryptor = new DecryptorService();
    
    try {
        // 1. Buscar usuários com chaves criptografadas
        console.log('\n🔍 BUSCANDO CHAVES CRIPTOGRAFADAS...');

        const chavesUsuarios = await pool.query(`
            SELECT 
                uak.id,
                u.id as user_id,
                u.username,
                u.email,
                uak.exchange,
                uak.environment,
                uak.api_key_encrypted,
                uak.secret_key_encrypted,
                uak.api_key_iv,
                uak.secret_key_iv,
                uak.is_active,
                uak.last_validated
            FROM user_api_keys uak
            JOIN users u ON uak.user_id = u.id
            WHERE u.is_active = true
            AND uak.is_active = true
            AND uak.api_key_encrypted IS NOT NULL
            AND uak.secret_key_encrypted IS NOT NULL
            ORDER BY u.id, uak.exchange, uak.environment
        `);

        if (chavesUsuarios.rows.length === 0) {
            console.log('❌ Nenhuma chave criptografada válida encontrada');
            return;
        }

        console.log(`✅ Encontradas ${chavesUsuarios.rows.length} chaves criptografadas para testar`);

        // 2. Testar cada chave
        let sucessos = 0;
        let falhas = 0;
        let errosDescriptografia = 0;

        for (const chaveData of chavesUsuarios.rows) {
            console.log(`\n👤 TESTANDO: ${chaveData.username} (ID: ${chaveData.user_id})`);
            console.log(`📧 Email: ${chaveData.email}`);
            console.log(`🔑 Chave ID: ${chaveData.id}`);
            console.log(`📊 Exchange: ${chaveData.exchange} ${chaveData.environment}`);
            console.log(`🕐 Última validação: ${chaveData.last_validated || 'Nunca'}`);
            console.log('─'.repeat(60));

            try {
                // Descriptografar as chaves
                console.log('  🔓 Descriptografando chaves...');
                
                const decryptResult = await decryptor.decryptUserKeys(
                    chaveData.api_key_encrypted,
                    chaveData.secret_key_encrypted
                );

                if (!decryptResult.success) {
                    console.log(`  ❌ Erro na descriptografia: ${decryptResult.error}`);
                    errosDescriptografia++;
                    continue;
                }

                const { apiKey, apiSecret } = decryptResult;
                
                console.log(`  ✅ Chaves descriptografadas com sucesso`);
                console.log(`  🔑 API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(-4)}`);
                console.log(`  🔐 Secret: ${apiSecret ? '***Presente***' : 'AUSENTE'}`);

                // Testar conexão enterprise
                console.log('  🔄 Testando conexão enterprise...');
                
                const startTime = Date.now();
                
                const resultado = await connector.connectAndValidateExchange(
                    chaveData.user_id,
                    apiKey,
                    apiSecret,
                    chaveData.exchange.toLowerCase()
                );

                const tempoExecucao = Date.now() - startTime;

                if (resultado.success) {
                    console.log(`  ✅ SUCESSO! (${tempoExecucao}ms)`);
                    console.log(`     🎯 Exchange detectada: ${resultado.exchange} ${resultado.environment}`);
                    console.log(`     📊 Conta: ${resultado.accountInfo?.accountType || 'N/A'}`);
                    
                    if (resultado.accountInfo?.totalWalletBalance) {
                        console.log(`     💰 Saldo total: ${resultado.accountInfo.totalWalletBalance} USDT`);
                    }
                    
                    if (resultado.balances && resultado.balances.length > 0) {
                        const saldosPositivos = resultado.balances.filter(b => parseFloat(b.free) > 0);
                        console.log(`     💼 Ativos: ${resultado.balances.length} moedas (${saldosPositivos.length} com saldo)`);
                        
                        if (saldosPositivos.length > 0) {
                            console.log(`     💎 Top 3 ativos:`);
                            saldosPositivos
                                .sort((a, b) => parseFloat(b.free) - parseFloat(a.free))
                                .slice(0, 3)
                                .forEach(asset => {
                                    console.log(`       - ${asset.asset}: ${asset.free}`);
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
                    `, [chaveData.id]);

                    sucessos++;
                } else {
                    console.log(`  ❌ FALHA! (${tempoExecucao}ms)`);
                    console.log(`     🔍 Motivo: ${resultado.error}`);
                    console.log(`     📋 Detalhes: ${resultado.details || 'N/A'}`);

                    // Atualizar status no banco
                    await pool.query(`
                        UPDATE user_api_keys 
                        SET 
                            last_validated = NOW(),
                            validation_status = 'invalid',
                            validation_error = $2
                        WHERE id = $1
                    `, [chaveData.id, resultado.error]);

                    falhas++;
                }

            } catch (error) {
                console.log(`  💥 ERRO CRÍTICO!`);
                console.log(`     ❌ ${error.message}`);

                // Atualizar status no banco
                await pool.query(`
                    UPDATE user_api_keys 
                    SET 
                        last_validated = NOW(),
                        validation_status = 'error',
                        validation_error = $2
                    WHERE id = $1
                `, [chaveData.id, error.message]);

                falhas++;
            }

            // Pausa entre testes
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // 3. Relatório final
        console.log('\n\n📊 RELATÓRIO FINAL DE TESTES');
        console.log('============================');

        const total = sucessos + falhas + errosDescriptografia;
        
        console.log(`✅ Conexões bem-sucedidas: ${sucessos}`);
        console.log(`❌ Conexões falhadas: ${falhas}`);
        console.log(`🔐 Erros de descriptografia: ${errosDescriptografia}`);
        console.log(`📊 Total testado: ${total}`);

        if (total > 0) {
            const taxaSucesso = ((sucessos / total) * 100).toFixed(1);
            console.log(`📈 Taxa de sucesso: ${taxaSucesso}%`);
        }

        // 4. Estado atual do sistema enterprise
        console.log('\n🏢 ESTADO DO SISTEMA ENTERPRISE:');
        console.log('===============================');

        const estadoEnterprise = await pool.query(`
            SELECT 
                COUNT(*) as total_conexoes,
                COUNT(CASE WHEN is_active = true THEN 1 END) as conexoes_ativas,
                COUNT(DISTINCT user_id) as usuarios_conectados,
                COUNT(CASE WHEN last_validated > NOW() - INTERVAL '1 hour' THEN 1 END) as validadas_recentemente
            FROM user_exchange_connections
        `);

        const estado = estadoEnterprise.rows[0];
        console.log(`🔗 Total de conexões enterprise: ${estado.total_conexoes}`);
        console.log(`✅ Conexões ativas: ${estado.conexoes_ativas}`);
        console.log(`👥 Usuários conectados: ${estado.usuarios_conectados}`);
        console.log(`⏰ Validadas na última hora: ${estado.validadas_recentemente}`);

        // 5. Resumo de validações
        console.log('\n📋 STATUS DAS VALIDAÇÕES:');

        const statusValidacoes = await pool.query(`
            SELECT 
                validation_status,
                COUNT(*) as quantidade
            FROM user_api_keys
            WHERE is_active = true
            GROUP BY validation_status
            ORDER BY quantidade DESC
        `);

        for (const status of statusValidacoes.rows) {
            const emoji = status.validation_status === 'valid' ? '✅' : 
                         status.validation_status === 'invalid' ? '❌' : 
                         status.validation_status === 'error' ? '💥' : '⚠️';
            console.log(`  ${emoji} ${status.validation_status || 'pending'}: ${status.quantidade} chaves`);
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
    testarConexoesDescriptografadas()
        .then(() => {
            console.log('\n✅ TESTE COM CHAVES DESCRIPTOGRAFADAS CONCLUÍDO!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 ERRO:', error.message);
            process.exit(1);
        });
}

module.exports = { testarConexoesDescriptografadas };
