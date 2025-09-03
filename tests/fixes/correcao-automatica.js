/**
 * 🔧 CORREÇÃO AUTOMÁTICA DOS PROBLEMAS IDENTIFICADOS
 * 
 * Script para corrigir os problemas do sistema em produção
 */

const { Pool } = require('pg');
const axios = require('axios');

class CorrecaoAutomatica {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL
        });
    }

    async corrigirBancoDados() {
        console.log('🗄️ CORRIGINDO BANCO DE DADOS...\n');

        try {
            // 1. Remover duplicatas
            console.log('🧹 Removendo registros duplicados...');
            const cleanupQuery = `
                DELETE FROM balances 
                WHERE id NOT IN (
                    SELECT MIN(id) 
                    FROM balances 
                    GROUP BY user_id, asset, account_type, exchange
                )
            `;
            
            const deleteResult = await this.pool.query(cleanupQuery);
            console.log(`✅ ${deleteResult.rowCount} registros duplicados removidos`);

            // 2. Criar função UPSERT
            console.log('🔧 Criando função UPSERT...');
            const upsertFunction = `
                CREATE OR REPLACE FUNCTION upsert_balance(
                    p_user_id INT,
                    p_asset VARCHAR,
                    p_balance DECIMAL,
                    p_account_type VARCHAR,
                    p_exchange VARCHAR
                ) RETURNS VOID AS $$
                BEGIN
                    INSERT INTO balances (user_id, asset, balance, account_type, exchange, updated_at, created_at)
                    VALUES (p_user_id, p_asset, p_balance, p_account_type, p_exchange, NOW(), NOW())
                    ON CONFLICT (user_id, asset, account_type, exchange)
                    DO UPDATE SET 
                        balance = EXCLUDED.balance,
                        updated_at = NOW();
                EXCEPTION
                    WHEN unique_violation THEN
                        UPDATE balances SET
                            balance = p_balance,
                            updated_at = NOW()
                        WHERE user_id = p_user_id 
                          AND asset = p_asset 
                          AND account_type = p_account_type
                          AND exchange = p_exchange;
                END;
                $$ LANGUAGE plpgsql;
            `;
            
            await this.pool.query(upsertFunction);
            console.log('✅ Função UPSERT criada com sucesso\n');

        } catch (error) {
            console.log('❌ Erro na correção do banco:', error.message);
        }
    }

    async identificarIPAtual() {
        console.log('🌐 IDENTIFICANDO IP PARA WHITELIST...\n');

        try {
            const response = await axios.get('https://api.ipify.org?format=json');
            const ip = response.data.ip;
            
            console.log(`🔢 IP ATUAL: ${ip}`);
            console.log('📋 ADICIONE ESTE IP NAS EXCHANGES:');
            console.log('   🟡 Bybit: https://www.bybit.com/app/user/api-management');
            console.log('   🟡 Binance: https://www.binance.com/en/my/settings/api-management\n');
            
            return ip;
        } catch (error) {
            console.log('❌ Erro ao obter IP:', error.message);
            return null;
        }
    }

    async corrigirConfiguracaoBybit() {
        console.log('🔧 CORRIGINDO CONFIGURAÇÃO BYBIT...\n');

        // Obter configurações do banco
        const query = `
            SELECT id, user_id, api_key, api_secret, exchange, is_testnet
            FROM user_api_keys 
            WHERE exchange = 'bybit' AND is_active = true
        `;
        
        try {
            const result = await this.pool.query(query);
            
            console.log(`📊 ${result.rows.length} configurações Bybit encontradas:`);
            
            for (const config of result.rows) {
                console.log(`\n👤 User ${config.user_id}:`);
                console.log(`   🔑 API Key: ${config.api_key.substring(0, 8)}...`);
                console.log(`   🧪 Testnet: ${config.is_testnet ? 'Sim' : 'Não'}`);
                
                // Testar conexão com diferentes account types
                await this.testarBybitAccountTypes(config);
            }
            
        } catch (error) {
            console.log('❌ Erro ao verificar configs Bybit:', error.message);
        }
    }

    async testarBybitAccountTypes(config) {
        const crypto = require('crypto');
        
        const accountTypes = ['UNIFIED', 'SPOT', 'FUTURES'];
        
        for (const accountType of accountTypes) {
            try {
                const timestamp = Date.now();
                const baseUrl = config.is_testnet 
                    ? 'https://api-testnet.bybit.com' 
                    : 'https://api.bybit.com';
                
                const params = `accountType=${accountType}&timestamp=${timestamp}`;
                const signature = crypto
                    .createHmac('sha256', config.api_secret)
                    .update(timestamp + config.api_key + 5000 + params)
                    .digest('hex');
                
                const headers = {
                    'X-BAPI-API-KEY': config.api_key,
                    'X-BAPI-TIMESTAMP': timestamp,
                    'X-BAPI-RECV-WINDOW': 5000,
                    'X-BAPI-SIGN': signature
                };
                
                const response = await axios.get(
                    `${baseUrl}/v5/account/wallet-balance?${params}`,
                    { headers, timeout: 10000 }
                );
                
                if (response.data.retCode === 0) {
                    console.log(`   ✅ ${accountType}: Funcionando`);
                    
                    // Atualizar banco com account type válido
                    await this.pool.query(
                        'UPDATE user_api_keys SET account_type = $1 WHERE id = $2',
                        [accountType, config.id]
                    );
                    break;
                } else {
                    console.log(`   ❌ ${accountType}: ${response.data.retMsg}`);
                }
                
            } catch (error) {
                console.log(`   ❌ ${accountType}: ${error.response?.data?.retMsg || error.message}`);
            }
        }
    }

    async validarAPIKeysBinance() {
        console.log('🔧 VALIDANDO API KEYS BINANCE...\n');

        const query = `
            SELECT id, user_id, api_key, api_secret, is_testnet
            FROM user_api_keys 
            WHERE exchange = 'binance' AND is_active = true
        `;
        
        try {
            const result = await this.pool.query(query);
            
            for (const config of result.rows) {
                console.log(`\n👤 User ${config.user_id}:`);
                console.log(`   🔑 API Key: ${config.api_key.substring(0, 8)}...`);
                
                await this.testarBinanceConnection(config);
            }
            
        } catch (error) {
            console.log('❌ Erro ao validar Binance:', error.message);
        }
    }

    async testarBinanceConnection(config) {
        const crypto = require('crypto');
        
        try {
            const timestamp = Date.now();
            const baseUrl = config.is_testnet 
                ? 'https://testnet.binance.vision' 
                : 'https://api.binance.com';
            
            const params = `timestamp=${timestamp}`;
            const signature = crypto
                .createHmac('sha256', config.api_secret)
                .update(params)
                .digest('hex');
            
            const headers = {
                'X-MBX-APIKEY': config.api_key
            };
            
            const response = await axios.get(
                `${baseUrl}/api/v3/account?${params}&signature=${signature}`,
                { headers, timeout: 10000 }
            );
            
            if (response.data.accountType) {
                console.log(`   ✅ Conexão OK - Tipo: ${response.data.accountType}`);
                console.log(`   💰 Saldos: ${response.data.balances?.length || 0} ativos`);
            }
            
        } catch (error) {
            const errorMsg = error.response?.data?.msg || error.message;
            console.log(`   ❌ Erro: ${errorMsg}`);
            
            if (errorMsg.includes('Invalid API-key')) {
                console.log(`   💡 Verificar: Formato da API key e permissões`);
            } else if (errorMsg.includes('IP')) {
                console.log(`   💡 Verificar: IP não está na whitelist`);
            }
        }
    }

    async executarCorrecoes() {
        console.log('🚀 INICIANDO CORREÇÕES AUTOMÁTICAS\n');
        console.log('Data:', new Date().toLocaleString());
        console.log('='.repeat(60) + '\n');

        try {
            // 1. Corrigir banco
            await this.corrigirBancoDados();
            
            // 2. Identificar IP
            const ip = await this.identificarIPAtual();
            
            // 3. Corrigir Bybit
            await this.corrigirConfiguracaoBybit();
            
            // 4. Validar Binance
            await this.validarAPIKeysBinance();
            
            console.log('\n🎯 PRÓXIMAS AÇÕES MANUAIS:');
            console.log(`1. Adicionar IP ${ip} nas exchanges`);
            console.log('2. Verificar permissões das API keys');
            console.log('3. Confirmar que contas têm UNIFIED account ativo');
            console.log('4. Reiniciar sistema após whitelist do IP');
            
        } catch (error) {
            console.log('💥 Erro geral:', error.message);
        } finally {
            await this.pool.end();
        }
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const correcao = new CorrecaoAutomatica();
    correcao.executarCorrecoes()
        .then(() => {
            console.log('\n✅ Correções automáticas finalizadas!');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Erro nas correções:', error.message);
            process.exit(1);
        });
}

module.exports = CorrecaoAutomatica;
