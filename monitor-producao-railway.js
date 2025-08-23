#!/usr/bin/env node
/**
 * 🌐 MONITOR DE PRODUÇÃO REAL - RAILWAY
 * =====================================
 * 
 * Monitora status do deploy em produção real
 */

console.log('🌐 MONITOR PRODUÇÃO REAL RAILWAY');
console.log('================================');

const https = require('https');

class ProductionMonitor {
    constructor() {
        this.baseUrl = 'coinbitclub-market-bot-backend-production.up.railway.app';
        this.attempts = 0;
        this.maxAttempts = 10;
    }

    // Fazer requisição HTTP simples
    makeRequest(path) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: this.baseUrl,
                port: 443,
                path: path,
                method: 'GET',
                timeout: 10000
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
                        headers: res.headers
                    });
                });
            });

            req.on('error', (err) => {
                reject(err);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.end();
        });
    }

    // Verificar saúde do sistema
    async checkHealth() {
        console.log(`\n🔍 Tentativa ${this.attempts + 1}/${this.maxAttempts} - Verificando saúde...`);
        
        try {
            const response = await this.makeRequest('/health');
            
            if (response.statusCode === 200) {
                console.log('✅ Sistema online - Status 200');
                
                try {
                    const data = JSON.parse(response.data);
                    console.log('📊 Dados de saúde:', JSON.stringify(data, null, 2));
                } catch {
                    console.log('📊 Resposta raw:', response.data);
                }
                
                return true;
            } else {
                console.log(`⚠️ Sistema respondeu com status ${response.statusCode}`);
                console.log('📊 Resposta:', response.data);
                return false;
            }
            
        } catch (error) {
            console.log(`❌ Erro na conexão: ${error.message}`);
            return false;
        }
    }

    // Verificar modo de produção
    async checkProductionMode() {
        console.log('\n🌐 Verificando modo de produção...');
        
        try {
            const response = await this.makeRequest('/api/production-mode');
            
            if (response.statusCode === 200) {
                console.log('✅ Endpoint produção ativo!');
                
                try {
                    const data = JSON.parse(response.data);
                    console.log('🎯 Modo de produção:', JSON.stringify(data, null, 2));
                    
                    if (data.mode === 'PRODUCTION_REAL' && data.mainnet_active === true) {
                        console.log('🎉 MODO PRODUÇÃO REAL CONFIRMADO!');
                        return true;
                    } else {
                        console.log('⚠️ Modo não está em produção real');
                        return false;
                    }
                } catch {
                    console.log('📊 Resposta raw:', response.data);
                }
            } else {
                console.log(`⚠️ Endpoint retornou status ${response.statusCode}`);
                return false;
            }
            
        } catch (error) {
            console.log(`❌ Erro ao verificar produção: ${error.message}`);
            return false;
        }
    }

    // Verificar status geral
    async checkSystemStatus() {
        console.log('\n📊 Verificando status geral...');
        
        try {
            const response = await this.makeRequest('/api/system/status');
            
            if (response.statusCode === 200) {
                console.log('✅ Status do sistema ativo!');
                
                try {
                    const data = JSON.parse(response.data);
                    console.log('📊 Status completo:', JSON.stringify(data, null, 2));
                } catch {
                    console.log('📊 Resposta raw:', response.data);
                }
                
                return true;
            } else {
                console.log(`⚠️ Status retornou ${response.statusCode}`);
                return false;
            }
            
        } catch (error) {
            console.log(`❌ Erro no status: ${error.message}`);
            return false;
        }
    }

    // Monitor completo com retry
    async monitorDeployment() {
        console.log('🚀 INICIANDO MONITORAMENTO...');
        console.log('============================');
        
        while (this.attempts < this.maxAttempts) {
            console.log(`\n⏰ ${new Date().toLocaleTimeString()} - Verificação ${this.attempts + 1}`);
            
            const healthOk = await this.checkHealth();
            
            if (healthOk) {
                console.log('\n🎯 Sistema online! Verificando recursos...');
                
                const productionOk = await this.checkProductionMode();
                const statusOk = await this.checkSystemStatus();
                
                if (productionOk) {
                    console.log('\n🎉 DEPLOY COMPLETO E MODO PRODUÇÃO REAL ATIVO!');
                    console.log('===============================================');
                    console.log('✅ Sistema online no Railway');
                    console.log('✅ Modo produção real confirmado');
                    console.log('✅ Trading mainnet ativo');
                    console.log('🌐 URL:', `https://${this.baseUrl}`);
                    return true;
                }
            }
            
            this.attempts++;
            
            if (this.attempts < this.maxAttempts) {
                console.log('⏳ Aguardando 30 segundos para próxima verificação...');
                await new Promise(resolve => setTimeout(resolve, 30000));
            }
        }
        
        console.log('\n⚠️ TIMEOUT DO MONITORAMENTO');
        console.log('===========================');
        console.log('❌ Sistema não ficou online no tempo esperado');
        console.log('💡 Verificar logs do Railway manually');
        console.log('🔗 https://railway.app/dashboard');
        
        return false;
    }
}

// Executar monitoramento
if (require.main === module) {
    const monitor = new ProductionMonitor();
    monitor.monitorDeployment().then((success) => {
        if (success) {
            console.log('\n🎉 MONITORAMENTO CONCLUÍDO COM SUCESSO!');
            process.exit(0);
        } else {
            console.log('\n❌ MONITORAMENTO FALHOU');
            process.exit(1);
        }
    }).catch(error => {
        console.error('❌ Erro no monitor:', error.message);
        process.exit(1);
    });
}

module.exports = ProductionMonitor;
