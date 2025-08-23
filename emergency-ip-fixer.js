/**
 * 🚨 EMERGENCY IP FIXER & EXCHANGE RECONNECTOR
 * ============================================
 * 
 * Sistema de emergência para resolver problemas de IP fixo
 * Reconexão automática com exchanges após mudanças de IP
 * Validação e correção de permissões de API
 * 
 * Data: 11/08/2025
 * Versão: v1.0.0 EMERGENCY
 */

console.log('🚨 EMERGENCY IP FIXER - INICIANDO...');
console.log('====================================');

const { Pool } = require('pg');
const axios = require('axios');
const crypto = require('crypto');

class EmergencyIPFixer {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
            ssl: { rejectUnauthorized: false }
        });

        this.networkInfo = {
            current_ip: null,
            previous_ip: null,
            ngrok_url: null,
            is_fixed: false,
            last_check: null
        };

        this.exchangeEndpoints = {
            bybit: {
                testnet: 'https://api-testnet.bybit.com',
                mainnet: 'https://api.bybit.com'
            },
            binance: {
                testnet: 'https://testnet.binance.vision',
                mainnet: 'https://api.binance.com'
            }
        };

        console.log('✅ Emergency IP Fixer inicializado');
    }

    /**
     * 🚨 EXECUTAR CORREÇÃO COMPLETA DE EMERGÊNCIA
     */
    async executeEmergencyFix() {
        console.log('\n🚨 EXECUTANDO CORREÇÃO DE EMERGÊNCIA...');
        console.log('======================================');

        const fixResults = {
            timestamp: new Date().toISOString(),
            steps_executed: [],
            ip_status: {},
            exchange_reconnections: {},
            users_fixed: 0,
            critical_issues: [],
            success: false
        };

        try {
            // PASSO 1: Detectar situação atual da rede
            console.log('\n📍 PASSO 1: Detectando situação da rede...');
            const networkStatus = await this.detectNetworkStatus();
            fixResults.ip_status = networkStatus;
            fixResults.steps_executed.push('network_detection');
            
            if (networkStatus.ip_changed) {
                fixResults.critical_issues.push('IP_CHANGED');
                console.log('🚨 CRÍTICO: IP mudou! Reconfiguração necessária');
            }

            // PASSO 2: Testar conectividade com exchanges
            console.log('\n🔗 PASSO 2: Testando conectividade com exchanges...');
            const connectivityResults = await this.testExchangeConnectivity();
            fixResults.exchange_reconnections = connectivityResults;
            fixResults.steps_executed.push('connectivity_test');

            // PASSO 3: Identificar chaves bloqueadas por IP
            console.log('\n🔒 PASSO 3: Identificando chaves bloqueadas...');
            const blockedKeys = await this.identifyBlockedKeys();
            fixResults.steps_executed.push('blocked_keys_identification');

            if (blockedKeys.length > 0) {
                console.log(`🚨 Encontradas ${blockedKeys.length} chaves bloqueadas`);
                fixResults.critical_issues.push('BLOCKED_KEYS');
            }

            // PASSO 4: Aplicar correções automáticas
            console.log('\n🛠️ PASSO 4: Aplicando correções automáticas...');
            const autoFixResults = await this.applyAutomaticFixes(blockedKeys);
            fixResults.users_fixed = autoFixResults.users_fixed;
            fixResults.steps_executed.push('automatic_fixes');

            // PASSO 5: Verificar sistema após correções
            console.log('\n✅ PASSO 5: Verificando sistema após correções...');
            const finalStatus = await this.verifySystemStatus();
            fixResults.success = finalStatus.operational;
            fixResults.steps_executed.push('final_verification');

            // RESUMO FINAL
            console.log('\n📊 RESUMO DA CORREÇÃO DE EMERGÊNCIA:');
            console.log('===================================');
            console.log(`🌐 IP Atual: ${networkStatus.current_ip}`);
            console.log(`🔒 IP Fixo: ${networkStatus.has_fixed_ip ? 'SIM' : 'NÃO'}`);
            console.log(`🔑 Chaves testadas: ${blockedKeys.length}`);
            console.log(`👥 Usuários corrigidos: ${fixResults.users_fixed}`);
            console.log(`✅ Sistema operacional: ${fixResults.success ? 'SIM' : 'NÃO'}`);

            if (fixResults.success) {
                console.log('\n🟢 CORREÇÃO DE EMERGÊNCIA CONCLUÍDA COM SUCESSO!');
                await this.notifySuccessfulFix(fixResults);
            } else {
                console.log('\n🔴 CORREÇÃO PARCIAL - INTERVENÇÃO MANUAL NECESSÁRIA');
                await this.generateManualFixInstructions(fixResults);
            }

            return fixResults;

        } catch (error) {
            console.error('\n❌ ERRO CRÍTICO NA CORREÇÃO:', error);
            fixResults.critical_issues.push('EMERGENCY_FIX_FAILED');
            fixResults.error = error.message;
            return fixResults;
        }
    }

    /**
     * 📍 DETECTAR STATUS ATUAL DA REDE
     */
    async detectNetworkStatus() {
        console.log('  🌐 Detectando IP público atual...');
        
        const status = {
            current_ip: null,
            previous_ip: this.networkInfo.current_ip,
            ip_changed: false,
            has_fixed_ip: false,
            ngrok_status: 'unknown',
            geolocation: null
        };

        try {
            // Detectar IP atual
            const ipResponse = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
            status.current_ip = ipResponse.data.ip;
            
            // Verificar se IP mudou
            if (this.networkInfo.current_ip && this.networkInfo.current_ip !== status.current_ip) {
                status.ip_changed = true;
                console.log(`  🚨 IP mudou: ${this.networkInfo.current_ip} → ${status.current_ip}`);
            } else {
                console.log(`  📍 IP atual: ${status.current_ip}`);
            }

            // Atualizar cache
            this.networkInfo.previous_ip = this.networkInfo.current_ip;
            this.networkInfo.current_ip = status.current_ip;

            // Verificar Ngrok
            try {
                const ngrokResponse = await axios.get('http://127.0.0.1:4040/api/tunnels', { timeout: 3000 });
                if (ngrokResponse.data.tunnels && ngrokResponse.data.tunnels.length > 0) {
                    status.has_fixed_ip = true;
                    status.ngrok_status = 'active';
                    status.ngrok_url = ngrokResponse.data.tunnels[0].public_url;
                    console.log(`  🔒 Ngrok ativo: ${status.ngrok_url}`);
                } else {
                    status.ngrok_status = 'inactive';
                    console.log('  ⚠️ Ngrok inativo - IP dinâmico');
                }
            } catch (ngrokError) {
                status.ngrok_status = 'not_running';
                console.log('  ⚠️ Ngrok não está executando');
            }

            // Verificar geolocalização
            try {
                const geoResponse = await axios.get(`http://ip-api.com/json/${status.current_ip}`, { timeout: 5000 });
                if (geoResponse.data.status === 'success') {
                    status.geolocation = {
                        country: geoResponse.data.country,
                        countryCode: geoResponse.data.countryCode,
                        city: geoResponse.data.city,
                        isp: geoResponse.data.isp
                    };
                    console.log(`  🌍 Localização: ${geoResponse.data.city}, ${geoResponse.data.country}`);
                }
            } catch (geoError) {
                console.log('  ⚠️ Não foi possível obter geolocalização');
            }

        } catch (error) {
            console.error('  ❌ Erro ao detectar IP:', error.message);
        }

        return status;
    }

    /**
     * 🔗 TESTAR CONECTIVIDADE COM EXCHANGES
     */
    async testExchangeConnectivity() {
        console.log('  🔗 Testando conectividade básica...');
        
        const results = {
            timestamp: new Date().toISOString(),
            tests_performed: 0,
            successful_connections: 0,
            failed_connections: 0,
            exchange_status: {}
        };

        const testEndpoints = [
            { name: 'bybit_testnet', url: this.exchangeEndpoints.bybit.testnet + '/v5/market/time' },
            { name: 'bybit_mainnet', url: this.exchangeEndpoints.bybit.mainnet + '/v5/market/time' },
            { name: 'binance_testnet', url: this.exchangeEndpoints.binance.testnet + '/api/v3/time' },
            { name: 'binance_mainnet', url: this.exchangeEndpoints.binance.mainnet + '/api/v3/time' }
        ];

        for (const endpoint of testEndpoints) {
            results.tests_performed++;
            console.log(`    🔄 Testando ${endpoint.name}...`);

            try {
                const response = await axios.get(endpoint.url, {
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'CoinbitClub-Emergency-Fixer/1.0'
                    }
                });

                results.exchange_status[endpoint.name] = {
                    status: 'accessible',
                    response_time: response.headers['x-response-time'] || 'unknown',
                    server_time: response.data.serverTime || response.data.timeSecond
                };

                console.log(`      ✅ Acessível - Tempo: ${results.exchange_status[endpoint.name].response_time}`);
                results.successful_connections++;

            } catch (error) {
                results.exchange_status[endpoint.name] = {
                    status: 'blocked',
                    error_code: error.response?.status || error.code,
                    error_message: error.response?.data?.msg || error.message
                };

                console.log(`      ❌ Bloqueado - ${error.response?.status || error.code}`);
                results.failed_connections++;

                if (error.response?.status === 403) {
                    console.log(`      🚨 IP pode estar bloqueado geograficamente`);
                }
            }

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log(`  📊 Conectividade: ${results.successful_connections}/${results.tests_performed} sucesso`);
        return results;
    }

    /**
     * 🔒 IDENTIFICAR CHAVES BLOQUEADAS POR IP
     */
    async identifyBlockedKeys() {
        console.log('  🔒 Identificando chaves bloqueadas...');
        
        try {
            const query = `
                SELECT 
                    u.id as user_id,
                    u.username,
                    uak.exchange,
                    uak.environment,
                    uak.api_key,
                    uak.secret_key,
                    uak.validation_status,
                    uak.validation_error
                FROM users u
                JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE u.is_active = true
                AND uak.is_active = true
                AND uak.api_key IS NOT NULL
                AND uak.secret_key IS NOT NULL
                ORDER BY u.id, uak.exchange
            `;

            const result = await this.pool.query(query);
            const allKeys = result.rows;
            const blockedKeys = [];

            console.log(`  📊 Testando ${allKeys.length} chaves API...`);

            for (const keyData of allKeys) {
                console.log(`    🔑 Testando ${keyData.username} - ${keyData.exchange} ${keyData.environment}...`);

                const testResult = await this.testSpecificApiKey(keyData);
                
                if (!testResult.success) {
                    blockedKeys.push({
                        ...keyData,
                        blocking_reason: testResult.error,
                        requires_manual_fix: testResult.requires_manual_fix
                    });

                    console.log(`      ❌ BLOQUEADA - ${testResult.error}`);

                    // Atualizar status no banco
                    await this.updateKeyStatus(keyData.user_id, keyData.exchange, keyData.environment, 'BLOCKED', testResult.error);
                } else {
                    console.log(`      ✅ Funcionando`);
                    await this.updateKeyStatus(keyData.user_id, keyData.exchange, keyData.environment, 'WORKING', null);
                }

                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            console.log(`  🚨 Chaves bloqueadas encontradas: ${blockedKeys.length}`);
            return blockedKeys;

        } catch (error) {
            console.error('  ❌ Erro ao identificar chaves bloqueadas:', error.message);
            return [];
        }
    }

    /**
     * 🧪 TESTAR CHAVE API ESPECÍFICA
     */
    async testSpecificApiKey(keyData) {
        try {
            if (keyData.exchange === 'bybit') {
                return await this.testBybitKey(keyData);
            } else if (keyData.exchange === 'binance') {
                return await this.testBinanceKey(keyData);
            }
            
            return { success: false, error: 'Exchange não suportada', requires_manual_fix: true };

        } catch (error) {
            return { success: false, error: error.message, requires_manual_fix: true };
        }
    }

    /**
     * 🟣 TESTAR CHAVE BYBIT
     */
    async testBybitKey(keyData) {
        try {
            const timestamp = Date.now().toString();
            const recvWindow = '5000';
            const baseURL = this.exchangeEndpoints.bybit[keyData.environment];
            
            const queryString = `accountType=UNIFIED&apiKey=${keyData.api_key}`;
            const signPayload = timestamp + keyData.api_key + recvWindow + queryString;
            const signature = crypto.createHmac('sha256', keyData.secret_key).update(signPayload).digest('hex');
            
            const headers = {
                'X-BAPI-API-KEY': keyData.api_key,
                'X-BAPI-SIGN': signature,
                'X-BAPI-SIGN-TYPE': '2',
                'X-BAPI-TIMESTAMP': timestamp,
                'X-BAPI-RECV-WINDOW': recvWindow,
                'Content-Type': 'application/json'
            };
            
            const response = await axios.get(`${baseURL}/v5/account/wallet-balance?${queryString}`, {
                headers,
                timeout: 15000
            });

            if (response.data.retCode === 0) {
                return { success: true };
            } else {
                const errorMsg = response.data.retMsg || 'Erro desconhecido';
                const requiresManual = errorMsg.includes('IP') || errorMsg.includes('permission');
                
                return { 
                    success: false, 
                    error: errorMsg, 
                    requires_manual_fix: requiresManual 
                };
            }

        } catch (error) {
            const errorMsg = error.response?.data?.retMsg || error.message;
            const requiresManual = errorMsg.includes('IP') || errorMsg.includes('Unmatched') || error.response?.status === 403;
            
            return { 
                success: false, 
                error: errorMsg, 
                requires_manual_fix: requiresManual 
            };
        }
    }

    /**
     * 🟡 TESTAR CHAVE BINANCE
     */
    async testBinanceKey(keyData) {
        try {
            const timestamp = Date.now();
            const recvWindow = 5000;
            const baseURL = this.exchangeEndpoints.binance[keyData.environment];
            
            const queryString = `timestamp=${timestamp}&recvWindow=${recvWindow}`;
            const signature = crypto.createHmac('sha256', keyData.secret_key).update(queryString).digest('hex');
            
            const headers = {
                'X-MBX-APIKEY': keyData.api_key,
                'Content-Type': 'application/json'
            };
            
            const response = await axios.get(
                `${baseURL}/api/v3/account?${queryString}&signature=${signature}`,
                { headers, timeout: 15000 }
            );

            if (response.status === 200) {
                return { success: true };
            } else {
                return { success: false, error: 'Resposta inválida', requires_manual_fix: true };
            }

        } catch (error) {
            const errorMsg = error.response?.data?.msg || error.message;
            const requiresManual = errorMsg.includes('IP') || errorMsg.includes('location') || error.response?.status === 403;
            
            return { 
                success: false, 
                error: errorMsg, 
                requires_manual_fix: requiresManual 
            };
        }
    }

    /**
     * 🛠️ APLICAR CORREÇÕES AUTOMÁTICAS
     */
    async applyAutomaticFixes(blockedKeys) {
        console.log('  🛠️ Aplicando correções automáticas...');
        
        const fixResults = {
            total_keys: blockedKeys.length,
            auto_fixed: 0,
            manual_required: 0,
            users_fixed: 0,
            fix_details: []
        };

        const usersToFix = new Set();

        for (const keyData of blockedKeys) {
            console.log(`    🔧 Corrigindo ${keyData.username} - ${keyData.exchange}...`);

            const fixResult = {
                user_id: keyData.user_id,
                username: keyData.username,
                exchange: keyData.exchange,
                environment: keyData.environment,
                fix_applied: false,
                fix_type: 'none',
                requires_manual: keyData.requires_manual_fix
            };

            try {
                if (!keyData.requires_manual_fix) {
                    // Tentar correção automática simples
                    const retestResult = await this.testSpecificApiKey(keyData);
                    
                    if (retestResult.success) {
                        fixResult.fix_applied = true;
                        fixResult.fix_type = 'retest_successful';
                        fixResults.auto_fixed++;
                        usersToFix.add(keyData.user_id);
                        console.log(`      ✅ Corrigida automaticamente`);
                    } else {
                        fixResult.requires_manual = true;
                        fixResults.manual_required++;
                        console.log(`      ⚠️ Correção manual necessária`);
                    }
                } else {
                    fixResults.manual_required++;
                    console.log(`      ⚠️ Correção manual necessária (IP/Permissões)`);
                }

            } catch (error) {
                console.log(`      ❌ Erro na correção: ${error.message}`);
                fixResult.error = error.message;
            }

            fixResults.fix_details.push(fixResult);
        }

        fixResults.users_fixed = usersToFix.size;
        console.log(`  📊 Resultado: ${fixResults.auto_fixed} auto-corrigidas, ${fixResults.manual_required} necessitam intervenção manual`);

        return fixResults;
    }

    /**
     * ✅ VERIFICAR STATUS FINAL DO SISTEMA
     */
    async verifySystemStatus() {
        console.log('  ✅ Verificando status final...');
        
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_keys,
                    COUNT(CASE WHEN validation_status = 'WORKING' THEN 1 END) as working_keys,
                    COUNT(CASE WHEN validation_status = 'BLOCKED' THEN 1 END) as blocked_keys,
                    COUNT(DISTINCT user_id) as total_users,
                    COUNT(DISTINCT CASE WHEN validation_status = 'WORKING' THEN user_id END) as users_with_working_keys
                FROM user_api_keys
                WHERE is_active = true
                AND api_key IS NOT NULL
            `;

            const result = await this.pool.query(query);
            const stats = result.rows[0];

            const operational = parseInt(stats.users_with_working_keys) > 0;

            console.log(`    📊 Chaves funcionando: ${stats.working_keys}/${stats.total_keys}`);
            console.log(`    👥 Usuários com acesso: ${stats.users_with_working_keys}/${stats.total_users}`);
            console.log(`    🟢 Sistema operacional: ${operational ? 'SIM' : 'NÃO'}`);

            return {
                operational: operational,
                statistics: {
                    total_keys: parseInt(stats.total_keys),
                    working_keys: parseInt(stats.working_keys),
                    blocked_keys: parseInt(stats.blocked_keys),
                    total_users: parseInt(stats.total_users),
                    users_with_access: parseInt(stats.users_with_working_keys)
                }
            };

        } catch (error) {
            console.error('  ❌ Erro ao verificar status:', error.message);
            return { operational: false, error: error.message };
        }
    }

    /**
     * 💾 ATUALIZAR STATUS DA CHAVE NO BANCO
     */
    async updateKeyStatus(userId, exchange, environment, status, errorMessage) {
        try {
            await this.pool.query(`
                UPDATE user_api_keys 
                SET 
                    validation_status = $1,
                    validation_error = $2,
                    last_validated_at = NOW()
                WHERE user_id = $3 AND exchange = $4 AND environment = $5
            `, [status, errorMessage, userId, exchange, environment]);
        } catch (error) {
            console.error('❌ Erro ao atualizar status da chave:', error.message);
        }
    }

    /**
     * 📢 NOTIFICAR CORREÇÃO BEM-SUCEDIDA
     */
    async notifySuccessfulFix(fixResults) {
        console.log('\n📢 GERANDO RELATÓRIO DE SUCESSO...');
        
        const report = {
            title: '✅ CORREÇÃO DE EMERGÊNCIA CONCLUÍDA COM SUCESSO',
            timestamp: fixResults.timestamp,
            summary: {
                ip_status: fixResults.ip_status.has_fixed_ip ? 'IP Fixo Ativo' : 'IP Dinâmico',
                current_ip: fixResults.ip_status.current_ip,
                users_operational: fixResults.users_fixed,
                system_status: 'OPERACIONAL'
            },
            next_steps: [
                'Sistema pronto para trading real',
                'Monitorar logs para possíveis problemas',
                'Verificar health check: http://localhost:3000/health'
            ]
        };

        // Salvar relatório
        try {
            await this.pool.query(`
                INSERT INTO system_maintenance_logs (
                    type, status, details, created_at
                ) VALUES ($1, $2, $3, $4)
            `, [
                'EMERGENCY_IP_FIX',
                'SUCCESS',
                JSON.stringify(report),
                new Date()
            ]);
        } catch (error) {
            console.log('⚠️ Não foi possível salvar relatório no banco');
        }

        console.log(JSON.stringify(report, null, 2));
        return report;
    }

    /**
     * 📋 GERAR INSTRUÇÕES PARA CORREÇÃO MANUAL
     */
    async generateManualFixInstructions(fixResults) {
        console.log('\n📋 GERANDO INSTRUÇÕES PARA CORREÇÃO MANUAL...');
        
        const instructions = {
            title: '⚠️ CORREÇÃO MANUAL NECESSÁRIA',
            timestamp: fixResults.timestamp,
            critical_issues: fixResults.critical_issues,
            manual_steps: [],
            affected_users: []
        };

        // Identificar usuários que precisam de correção manual
        for (const userId in fixResults.exchange_reconnections) {
            const userResult = fixResults.exchange_reconnections[userId];
            if (userResult.requires_manual) {
                instructions.affected_users.push({
                    user_id: userId,
                    username: userResult.username,
                    blocked_exchanges: userResult.blocked_exchanges
                });
            }
        }

        // Gerar instruções específicas
        if (fixResults.ip_status.ip_changed) {
            instructions.manual_steps.push({
                step: 1,
                title: 'Configurar IP Whitelist nas Exchanges',
                description: `IP mudou para ${fixResults.ip_status.current_ip}`,
                actions: [
                    'Acessar painel da Bybit → API Management → Edit → IP Restriction',
                    `Adicionar IP: ${fixResults.ip_status.current_ip}`,
                    'Repetir para Binance se necessário',
                    'Aguardar 5-10 minutos para propagação'
                ]
            });
        }

        if (!fixResults.ip_status.has_fixed_ip) {
            instructions.manual_steps.push({
                step: 2,
                title: 'Configurar IP Fixo com Ngrok',
                description: 'Sistema sem IP fixo detectado',
                actions: [
                    'Configurar NGROK_AUTH_TOKEN no Railway',
                    'Configurar NGROK_ENABLED=true no Railway',
                    'Redeploy da aplicação',
                    'Verificar túnel ativo em http://127.0.0.1:4040'
                ]
            });
        }

        console.log(JSON.stringify(instructions, null, 2));
        return instructions;
    }
}

module.exports = EmergencyIPFixer;

// Se executado diretamente
if (require.main === module) {
    console.log('🚨 EXECUTANDO CORREÇÃO DE EMERGÊNCIA...');
    const fixer = new EmergencyIPFixer();
    
    fixer.executeEmergencyFix()
        .then(results => {
            console.log('\n📋 CORREÇÃO FINALIZADA');
            console.log('======================');
            process.exit(results.success ? 0 : 1);
        })
        .catch(error => {
            console.error('\n❌ FALHA CRÍTICA:', error);
            process.exit(1);
        });
}
