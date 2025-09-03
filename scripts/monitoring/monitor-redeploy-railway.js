#!/usr/bin/env node
/**
 * 🚀 MONITOR DE REDEPLOY RAILWAY
 * ==============================
 * 
 * Monitora quando a aplicação volta ao ar após redeploy
 */

console.log('🚀 MONITOR DE REDEPLOY RAILWAY');
console.log('==============================');

const https = require('https');

class RedeployMonitor {
    constructor() {
        this.baseUrl = 'coinbitclub-market-bot-backend-production.up.railway.app';
        this.attempts = 0;
        this.maxAttempts = 20; // 10 minutos de monitoramento
        this.appFoundTime = null;
    }

    // Fazer requisição para detectar quando app volta
    checkAppStatus() {
        return new Promise((resolve) => {
            const options = {
                hostname: this.baseUrl,
                port: 443,
                path: '/health',
                method: 'GET',
                timeout: 10000,
                headers: {
                    'User-Agent': 'RedeployMonitor/1.0'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        data: data,
                        headers: res.headers,
                        timestamp: new Date().toISOString()
                    });
                });
            });

            req.on('error', (err) => {
                resolve({
                    error: err.message,
                    timestamp: new Date().toISOString()
                });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve({
                    error: 'Timeout',
                    timestamp: new Date().toISOString()
                });
            });

            req.end();
        });
    }

    // Verificar status detalhado
    async analyzeStatus(result) {
        const time = new Date().toLocaleTimeString();
        
        if (result.error) {
            console.log(`❌ [${time}] Erro de conexão: ${result.error}`);
            return 'connection_error';
        }
        
        if (result.data && result.data.includes('Application not found')) {
            console.log(`🚫 [${time}] Aplicação ainda não encontrada (Status: ${result.statusCode})`);
            return 'app_not_found';
        }
        
        if (result.statusCode === 200) {
            console.log(`✅ [${time}] APLICAÇÃO ONLINE! Status 200 - Health check funcionando`);
            if (!this.appFoundTime) {
                this.appFoundTime = new Date();
                console.log(`🎉 [${time}] PRIMEIRA RESPOSTA VÁLIDA DETECTADA!`);
            }
            return 'app_online';
        }
        
        if (result.statusCode === 404 && !result.data.includes('Application not found')) {
            console.log(`🔄 [${time}] App respondendo mas endpoint /health não encontrado (404)`);
            console.log(`💡 [${time}] Isso pode significar que o app está online mas sem health check`);
            if (!this.appFoundTime) {
                this.appFoundTime = new Date();
                console.log(`🎉 [${time}] APLICAÇÃO DETECTADA (sem health check)!`);
            }
            return 'app_online_no_health';
        }
        
        if (result.statusCode >= 500) {
            console.log(`⚠️ [${time}] Erro do servidor: ${result.statusCode}`);
            return 'server_error';
        }
        
        console.log(`❓ [${time}] Status inesperado: ${result.statusCode}`);
        return 'unknown_status';
    }

    // Testar endpoint específico após detectar que app está online
    async testSpecificEndpoint(endpoint) {
        return new Promise((resolve) => {
            const options = {
                hostname: this.baseUrl,
                port: 443,
                path: endpoint,
                method: 'GET',
                timeout: 5000
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        endpoint: endpoint,
                        working: res.statusCode >= 200 && res.statusCode < 500
                    });
                });
            });

            req.on('error', () => {
                resolve({
                    statusCode: 0,
                    endpoint: endpoint,
                    working: false
                });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve({
                    statusCode: 0,
                    endpoint: endpoint,
                    working: false
                });
            });

            req.end();
        });
    }

    // Testar endpoints críticos quando app estiver online
    async testCriticalEndpoints() {
        console.log('\n🧪 TESTANDO ENDPOINTS CRÍTICOS...');
        
        const criticalEndpoints = [
            '/',
            '/health',
            '/api/system/status',
            '/api/current-mode',
            '/api/dashboard/summary'
        ];
        
        const results = [];
        
        for (const endpoint of criticalEndpoints) {
            const result = await this.testSpecificEndpoint(endpoint);
            results.push(result);
            
            const status = result.working ? '✅' : '❌';
            console.log(`${status} ${endpoint} [${result.statusCode}]`);
        }
        
        const workingCount = results.filter(r => r.working).length;
        const totalCount = results.length;
        const successRate = Math.round((workingCount / totalCount) * 100);
        
        console.log(`\n📊 Endpoints funcionando: ${workingCount}/${totalCount} (${successRate}%)`);
        
        return {
            results,
            workingCount,
            totalCount,
            successRate
        };
    }

    // Monitor completo de redeploy
    async monitorRedeploy() {
        console.log('\n🔍 INICIANDO MONITORAMENTO DE REDEPLOY...');
        console.log('=========================================');
        console.log(`🌐 URL: https://${this.baseUrl}`);
        console.log(`⏰ Máximo: ${this.maxAttempts} tentativas (${this.maxAttempts * 30} segundos)`);
        
        while (this.attempts < this.maxAttempts) {
            this.attempts++;
            
            console.log(`\n[${this.attempts}/${this.maxAttempts}] Verificando status...`);
            
            const result = await this.checkAppStatus();
            const status = await this.analyzeStatus(result);
            
            if (status === 'app_online' || status === 'app_online_no_health') {
                console.log('\n🎉 APLICAÇÃO DETECTADA ONLINE!');
                console.log('==============================');
                
                // Aguardar um pouco para estabilizar
                console.log('⏳ Aguardando 5 segundos para estabilização...');
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                // Testar endpoints críticos
                const endpointResults = await this.testCriticalEndpoints();
                
                console.log('\n🎯 REDEPLOY CONCLUÍDO!');
                console.log('=====================');
                console.log(`✅ Aplicação online: ${this.appFoundTime.toLocaleTimeString()}`);
                console.log(`📊 Taxa de sucesso: ${endpointResults.successRate}%`);
                console.log(`🌐 URL: https://${this.baseUrl}`);
                
                if (endpointResults.successRate >= 60) {
                    console.log('\n🎉 SISTEMA FUNCIONANDO COM SUCESSO!');
                    return {
                        success: true,
                        successRate: endpointResults.successRate,
                        appOnlineTime: this.appFoundTime
                    };
                } else {
                    console.log('\n⚠️ SISTEMA ONLINE MAS COM PROBLEMAS');
                    return {
                        success: false,
                        successRate: endpointResults.successRate,
                        appOnlineTime: this.appFoundTime
                    };
                }
            }
            
            if (this.attempts < this.maxAttempts) {
                console.log('⏳ Aguardando 30 segundos para próxima verificação...');
                await new Promise(resolve => setTimeout(resolve, 30000));
            }
        }
        
        console.log('\n⏰ TIMEOUT DO MONITORAMENTO');
        console.log('===========================');
        console.log('❌ Aplicação não ficou online no tempo esperado');
        console.log('💡 Possíveis problemas:');
        console.log('   - Deploy ainda em andamento');
        console.log('   - Erro no código da aplicação');
        console.log('   - Problemas de dependências');
        console.log('   - Problemas de memória/recursos no Railway');
        
        return {
            success: false,
            timeout: true
        };
    }
}

// Executar monitoramento
if (require.main === module) {
    const monitor = new RedeployMonitor();
    monitor.monitorRedeploy().then((result) => {
        if (result.success) {
            console.log('\n🎉 MONITORAMENTO CONCLUÍDO - APLICAÇÃO FUNCIONANDO!');
            process.exit(0);
        } else {
            console.log('\n❌ MONITORAMENTO FALHOU OU TIMEOUT');
            process.exit(1);
        }
    }).catch(error => {
        console.error('❌ Erro no monitoramento:', error.message);
        process.exit(1);
    });
}

module.exports = RedeployMonitor;
