require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');

class ExchangeAPIFixer {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
    }

    async diagnoseIPIssues() {
        console.log('🌐 Diagnosticando problemas de IP e acesso...\n');
        
        const diagnostics = {
            current_ip: null,
            location: null,
            ngrok_status: null,
            exchange_access: {},
            recommendations: []
        };

        try {
            // 1. Verificar IP atual
            console.log('🔍 Verificando IP público atual...');
            const ipResponse = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
            diagnostics.current_ip = ipResponse.data.ip;
            console.log(`   IP atual: ${diagnostics.current_ip}`);

            // 2. Verificar localização
            const geoResponse = await axios.get(`http://ip-api.com/json/${diagnostics.current_ip}`, { timeout: 5000 });
            if (geoResponse.data.status === 'success') {
                diagnostics.location = {
                    country: geoResponse.data.country,
                    countryCode: geoResponse.data.countryCode,
                    region: geoResponse.data.regionName,
                    city: geoResponse.data.city,
                    isp: geoResponse.data.isp
                };
                console.log(`   Localização: ${diagnostics.location.city}, ${diagnostics.location.country} (${diagnostics.location.countryCode})`);
                console.log(`   ISP: ${diagnostics.location.isp}`);

                // Verificar se é região restrita
                const restrictedCountries = ['US', 'CN', 'MY', 'SG', 'JP', 'KR'];
                if (restrictedCountries.includes(diagnostics.location.countryCode)) {
                    console.log(`   ⚠️  AVISO: Região pode ser restrita para algumas exchanges`);
                    diagnostics.recommendations.push({
                        type: 'WARNING',
                        issue: `IP em região potencialmente restrita: ${diagnostics.location.country}`,
                        solution: 'Configure Ngrok com região europeia ou use VPN'
                    });
                }
            }

        } catch (error) {
            console.log(`   ❌ Erro ao verificar IP: ${error.message}`);
        }

        // 3. Verificar Ngrok
        try {
            console.log('\n🔍 Verificando status do Ngrok...');
            const ngrokResponse = await axios.get('http://127.0.0.1:4040/api/tunnels', { timeout: 3000 });
            
            if (ngrokResponse.data.tunnels && ngrokResponse.data.tunnels.length > 0) {
                const tunnel = ngrokResponse.data.tunnels[0];
                diagnostics.ngrok_status = {
                    active: true,
                    url: tunnel.public_url,
                    region: tunnel.config?.region || 'unknown'
                };
                console.log(`   ✅ Ngrok ativo: ${tunnel.public_url}`);
                console.log(`   Região: ${tunnel.config?.region || 'padrão'}`);
                
                // Testar IP do túnel Ngrok
                try {
                    const tunnelTest = await axios.get(`${tunnel.public_url}/health`, { timeout: 5000 });
                    console.log(`   ✅ Túnel respondendo corretamente`);
                } catch (error) {
                    console.log(`   ⚠️  Túnel não responde: ${error.message}`);
                }
                
            } else {
                diagnostics.ngrok_status = { active: false };
                console.log(`   ❌ Ngrok não tem túneis ativos`);
                diagnostics.recommendations.push({
                    type: 'ERROR',
                    issue: 'Ngrok não está criando túneis',
                    solution: 'Verificar NGROK_AUTH_TOKEN e reiniciar serviço'
                });
            }
        } catch (error) {
            diagnostics.ngrok_status = { active: false, error: error.message };
            console.log(`   ❌ Ngrok não está rodando: ${error.message}`);
            diagnostics.recommendations.push({
                type: 'ERROR',
                issue: 'Ngrok não está acessível',
                solution: 'Configurar variáveis NGROK_* e redeploy no Railway'
            });
        }

        return diagnostics;
    }

    async testExchangeAccess() {
        console.log('\n🏦 Testando acesso às exchanges...\n');
        
        const exchanges = [
            { 
                name: 'Bybit Mainnet', 
                url: 'https://api.bybit.com/v5/market/time',
                key: 'bybit_mainnet'
            },
            { 
                name: 'Bybit Testnet', 
                url: 'https://api-testnet.bybit.com/v5/market/time',
                key: 'bybit_testnet'
            },
            { 
                name: 'Binance Mainnet', 
                url: 'https://api.binance.com/api/v3/time',
                key: 'binance_mainnet'
            },
            { 
                name: 'Binance Testnet', 
                url: 'https://testnet.binance.vision/api/v3/time',
                key: 'binance_testnet'
            }
        ];

        const results = {};

        for (const exchange of exchanges) {
            console.log(`🔍 Testando ${exchange.name}...`);
            
            try {
                const response = await axios.get(exchange.url, {
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'CoinBitClub-Bot/1.0',
                        'Accept': 'application/json'
                    }
                });

                results[exchange.key] = {
                    status: 'accessible',
                    response_time: response.headers['x-response-time'] || 'unknown',
                    server_time: response.data.serverTime || response.data.time || response.data.result?.timeSecond
                };

                console.log(`   ✅ Acessível - Tempo: ${results[exchange.key].server_time}`);

            } catch (error) {
                results[exchange.key] = {
                    status: 'blocked',
                    error_code: error.response?.status || error.code,
                    error_message: error.response?.data?.msg || error.message,
                    full_error: error.response?.data || error.message
                };

                console.log(`   ❌ Bloqueado - ${error.response?.status || error.code}: ${error.response?.data?.msg || error.message}`);

                // Análise específica do erro
                if (error.response?.status === 403) {
                    console.log(`      💡 Diagnóstico: IP provavelmente não está no whitelist`);
                } else if (error.response?.status === 451 || error.message.includes('restricted')) {
                    console.log(`      💡 Diagnóstico: Região geográfica bloqueada`);
                } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                    console.log(`      💡 Diagnóstico: Problema de conectividade de rede`);
                }
            }
        }

        return results;
    }

    async checkUserAPIKeys() {
        console.log('\n🔑 Verificando chaves de API dos usuários...\n');
        
        try {
            const usersQuery = `
                SELECT id, name, binance_api_key, binance_secret_key, 
                       bybit_api_key, bybit_secret_key, created_at
                FROM users 
                WHERE (binance_api_key IS NOT NULL AND binance_api_key != '') 
                   OR (bybit_api_key IS NOT NULL AND bybit_api_key != '')
                ORDER BY id
            `;
            
            const users = await this.pool.query(usersQuery);
            console.log(`📊 Encontrados ${users.rows.length} usuários com chaves de API`);

            const issues = [];

            for (const user of users.rows) {
                console.log(`\n👤 Usuário ${user.id} (${user.name}):`);
                
                // Verificar formato das chaves Binance
                if (user.binance_api_key) {
                    console.log(`   🔍 Binance API Key: ${user.binance_api_key.substring(0, 8)}...`);
                    
                    if (user.binance_api_key.length < 50 || user.binance_api_key.length > 70) {
                        console.log(`   ⚠️  Chave Binance com formato suspeito (length: ${user.binance_api_key.length})`);
                        issues.push({
                            user_id: user.id,
                            issue: 'Binance API key com formato inválido',
                            details: `Comprimento: ${user.binance_api_key.length} (esperado: 50-70)`
                        });
                    }
                    
                    if (!user.binance_secret_key || user.binance_secret_key.length < 50) {
                        console.log(`   ❌ Secret key da Binance ausente ou inválida`);
                        issues.push({
                            user_id: user.id,
                            issue: 'Binance secret key inválida ou ausente'
                        });
                    }
                }

                // Verificar formato das chaves Bybit
                if (user.bybit_api_key) {
                    console.log(`   🔍 Bybit API Key: ${user.bybit_api_key.substring(0, 8)}...`);
                    
                    if (user.bybit_api_key.length < 20 || user.bybit_api_key.length > 50) {
                        console.log(`   ⚠️  Chave Bybit com formato suspeito (length: ${user.bybit_api_key.length})`);
                        issues.push({
                            user_id: user.id,
                            issue: 'Bybit API key com formato inválido',
                            details: `Comprimento: ${user.bybit_api_key.length} (esperado: 20-50)`
                        });
                    }
                    
                    if (!user.bybit_secret_key || user.bybit_secret_key.length < 30) {
                        console.log(`   ❌ Secret key da Bybit ausente ou inválida`);
                        issues.push({
                            user_id: user.id,
                            issue: 'Bybit secret key inválida ou ausente'
                        });
                    }
                }

                if (!user.binance_api_key && !user.bybit_api_key) {
                    console.log(`   ⚠️  Usuário sem nenhuma chave de API configurada`);
                    issues.push({
                        user_id: user.id,
                        issue: 'Nenhuma chave de API configurada'
                    });
                }
            }

            return { users: users.rows, issues };

        } catch (error) {
            console.error('❌ Erro ao verificar chaves de API:', error);
            return { users: [], issues: [] };
        }
    }

    async generateSolutions() {
        console.log('\n🔧 Gerando soluções recomendadas...\n');
        
        const solutions = {
            immediate_actions: [],
            configuration_changes: [],
            whitelist_ips: []
        };

        // 1. Testar acesso atual
        const exchangeResults = await this.testExchangeAccess();
        
        // 2. Verificar IP atual
        try {
            const ipResponse = await axios.get('https://api.ipify.org?format=json');
            const currentIP = ipResponse.data.ip;
            solutions.whitelist_ips.push(currentIP);
            
            console.log(`📋 SOLUÇÕES RECOMENDADAS:`);
            console.log(`\n1. 🌐 CONFIGURAÇÃO DE IP:`);
            console.log(`   Adicionar nos whitelists das exchanges: ${currentIP}`);
            
        } catch (error) {
            console.log('❌ Não foi possível obter IP atual');
        }

        // 3. Analisar erros e gerar soluções
        let hasIPWhitelistIssues = false;
        let hasGeoBlockIssues = false;

        Object.entries(exchangeResults).forEach(([exchange, result]) => {
            if (result.status === 'blocked') {
                if (result.error_code === 403) {
                    hasIPWhitelistIssues = true;
                } else if (result.error_code === 451 || result.error_message?.includes('restricted')) {
                    hasGeoBlockIssues = true;
                }
            }
        });

        console.log(`\n2. 🔧 AÇÕES IMEDIATAS:`);
        
        if (hasIPWhitelistIssues) {
            console.log(`   ✅ Configurar whitelist de IP nas exchanges`);
            solutions.immediate_actions.push('Configure IP whitelist nas exchanges');
            
            console.log(`\n   📝 Instruções para Bybit:`);
            console.log(`      1. Login no Bybit -> API Management`);
            console.log(`      2. Editar API key -> IP Restrictions`);
            console.log(`      3. Adicionar IP: ${solutions.whitelist_ips[0] || '[IP_ATUAL]'}`);
            
            console.log(`\n   📝 Instruções para Binance:`);
            console.log(`      1. Login no Binance -> API Management`);
            console.log(`      2. Edit -> IP Access Restriction`);
            console.log(`      3. Adicionar IP: ${solutions.whitelist_ips[0] || '[IP_ATUAL]'}`);
        }

        if (hasGeoBlockIssues) {
            console.log(`   ✅ Configurar Ngrok com região permitida`);
            solutions.configuration_changes.push('NGROK_REGION=eu');
            
            console.log(`\n   📝 Configuração no Railway:`);
            console.log(`      NGROK_REGION=eu (ou 'us', 'ap' conforme permitido)`);
            console.log(`      Redeploy após alteração`);
        }

        // 4. Verificar banco de dados
        try {
            await this.pool.query('SELECT 1');
            console.log(`\n3. 🗄️  DATABASE:`);
            console.log(`   ✅ Executar fix-database-duplicates.js para limpar dados duplicados`);
            solutions.immediate_actions.push('Executar limpeza de duplicatas no banco');
            
        } catch (error) {
            console.log(`\n3. 🗄️  DATABASE:`);
            console.log(`   ❌ Problema de conexão com banco: ${error.message}`);
        }

        console.log(`\n4. 🚀 COMANDOS PARA EXECUTAR:`);
        console.log(`   node fix-database-duplicates.js`);
        console.log(`   node -e "const f = require('./fix-database-duplicates.js'); new f().run()"`);

        return solutions;
    }

    async run() {
        console.log('🚀 DIAGNÓSTICO COMPLETO DE PROBLEMAS DE API\n');
        console.log('='.repeat(50));
        
        try {
            // 1. Diagnóstico de IP
            const ipDiagnostics = await this.diagnoseIPIssues();
            
            // 2. Teste de acesso às exchanges
            const exchangeResults = await this.testExchangeAccess();
            
            // 3. Verificação de chaves de API
            const apiKeyResults = await this.checkUserAPIKeys();
            
            // 4. Gerar soluções
            const solutions = await this.generateSolutions();
            
            console.log('\n' + '='.repeat(50));
            console.log('🎯 RESUMO DOS PROBLEMAS ENCONTRADOS:\n');
            
            let problemCount = 0;
            
            Object.entries(exchangeResults).forEach(([exchange, result]) => {
                if (result.status === 'blocked') {
                    problemCount++;
                    console.log(`❌ ${exchange}: ${result.error_code} - ${result.error_message}`);
                }
            });
            
            if (apiKeyResults.issues.length > 0) {
                problemCount += apiKeyResults.issues.length;
                console.log(`❌ ${apiKeyResults.issues.length} problemas com chaves de API`);
            }
            
            if (problemCount === 0) {
                console.log('✅ Nenhum problema crítico encontrado!');
            } else {
                console.log(`\n🔧 ${problemCount} problemas precisam ser resolvidos`);
            }
            
            console.log('\n📞 Para suporte, execute: GET /api/ip-diagnostic');
            
        } catch (error) {
            console.error('💥 Erro durante diagnóstico:', error);
        } finally {
            await this.pool.end();
        }
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const fixer = new ExchangeAPIFixer();
    fixer.run();
}

module.exports = ExchangeAPIFixer;
