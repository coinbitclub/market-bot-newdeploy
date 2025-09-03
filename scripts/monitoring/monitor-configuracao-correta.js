#!/usr/bin/env node
/**
 * 🎯 MONITOR CONFIGURAÇÃO CORRETA - RAILWAY
 * =========================================
 * 
 * Monitora: Produção Testnet + Management Híbrido
 */

console.log('🎯 MONITOR CONFIGURAÇÃO CORRETA - RAILWAY');
console.log('=========================================');

const https = require('https');

class ConfigurationMonitor {
    constructor() {
        this.baseUrl = 'coinbitclub-market-bot-backend-production.up.railway.app';
        this.attempts = 0;
        this.maxAttempts = 8;
    }

    // Fazer requisição HTTP
    makeRequest(path) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: this.baseUrl,
                port: 443,
                path: path,
                method: 'GET',
                timeout: 15000
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
                return true;
            } else {
                console.log(`⚠️ Sistema respondeu com status ${response.statusCode}`);
                return false;
            }
            
        } catch (error) {
            console.log(`❌ Erro na conexão: ${error.message}`);
            return false;
        }
    }

    // Verificar configuração atual
    async checkCurrentMode() {
        console.log('\n🎯 Verificando configuração atual...');
        
        try {
            const response = await this.makeRequest('/api/current-mode');
            
            if (response.statusCode === 200) {
                console.log('✅ Endpoint configuração ativo!');
                
                try {
                    const data = JSON.parse(response.data);
                    console.log('🎯 Configuração atual:');
                    console.log('========================');
                    console.log(`🌐 Ambiente: ${data.environment}`);
                    console.log(`🔧 Modo: ${data.mode}`);
                    console.log(`💼 Trading: ${data.trading_type}`);
                    console.log(`🧪 Testnet forçado: ${data.testnet_forced}`);
                    console.log(`📝 Mensagem: ${data.message}`);
                    
                    // Verificar se está correto
                    const isCorrect = 
                        (data.environment === 'production' && data.mode === 'TESTNET') ||
                        (data.environment === 'management' && data.mode === 'HYBRID');
                    
                    if (isCorrect) {
                        console.log('\n🎉 CONFIGURAÇÃO CORRETA CONFIRMADA!');
                        return true;
                    } else {
                        console.log('\n⚠️ Configuração não está como esperado');
                        return false;
                    }
                } catch {
                    console.log('📊 Resposta raw:', response.data);
                    return false;
                }
            } else {
                console.log(`⚠️ Endpoint retornou status ${response.statusCode}`);
                return false;
            }
            
        } catch (error) {
            console.log(`❌ Erro ao verificar configuração: ${error.message}`);
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

    // Monitor completo
    async monitorConfiguration() {
        console.log('🚀 INICIANDO MONITORAMENTO CONFIGURAÇÃO...');
        console.log('==========================================');
        
        while (this.attempts < this.maxAttempts) {
            console.log(`\n⏰ ${new Date().toLocaleTimeString()} - Verificação ${this.attempts + 1}`);
            
            const healthOk = await this.checkHealth();
            
            if (healthOk) {
                console.log('\n🎯 Sistema online! Verificando configuração...');
                
                const configOk = await this.checkCurrentMode();
                const statusOk = await this.checkSystemStatus();
                
                if (configOk) {
                    console.log('\n🎉 CONFIGURAÇÃO CORRETA FUNCIONANDO!');
                    console.log('===================================');
                    console.log('✅ Sistema online no Railway');
                    console.log('✅ Configuração correta aplicada');
                    console.log('🧪 Produção: Testnet (seguro)');
                    console.log('🔧 Management: Híbrido (inteligente)');
                    console.log('🌐 URL:', `https://${this.baseUrl}`);
                    return true;
                }
            }
            
            this.attempts++;
            
            if (this.attempts < this.maxAttempts) {
                console.log('⏳ Aguardando 20 segundos para próxima verificação...');
                await new Promise(resolve => setTimeout(resolve, 20000));
            }
        }
        
        console.log('\n⚠️ TIMEOUT DO MONITORAMENTO');
        console.log('===========================');
        console.log('❌ Sistema não ficou online ou configuração incorreta');
        console.log('💡 Possíveis causas:');
        console.log('   - Deploy ainda em andamento no Railway');
        console.log('   - Erro de configuração');
        console.log('   - Problema de conectividade');
        
        return false;
    }
}

// Executar monitoramento
if (require.main === module) {
    const monitor = new ConfigurationMonitor();
    monitor.monitorConfiguration().then((success) => {
        if (success) {
            console.log('\n🎉 MONITORAMENTO CONCLUÍDO - CONFIGURAÇÃO CORRETA!');
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

module.exports = ConfigurationMonitor;
