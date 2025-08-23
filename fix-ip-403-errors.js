#!/usr/bin/env node
/**
 * 🌐 CORREÇÃO DE ERROS 403 - IP FIXO RAILWAY
 * =========================================
 * 
 * Este script corrige problemas de bloqueio de IP
 * nas exchanges Binance e Bybit
 */

console.log('🚨 SISTEMA DE CORREÇÃO DE ERROS 403');
console.log('==================================');

require('dotenv').config();
const axios = require('axios');

class IPErrorFixer {
    constructor() {
        this.currentIP = null;
        this.ngrokStatus = null;
        this.exchangeAccess = {};
    }

    // Verificar IP atual
    async checkCurrentIP() {
        try {
            console.log('🔍 Verificando IP atual...');
            const response = await axios.get('https://api.ipify.org?format=json', { timeout: 10000 });
            this.currentIP = response.data.ip;
            console.log(`🌐 IP Atual: ${this.currentIP}`);
            
            // Verificar geolocalização
            const geoResponse = await axios.get(`http://ip-api.com/json/${this.currentIP}`, { timeout: 10000 });
            if (geoResponse.data.status === 'success') {
                console.log(`📍 Localização: ${geoResponse.data.city}, ${geoResponse.data.region}, ${geoResponse.data.country}`);
                console.log(`🏢 ISP: ${geoResponse.data.isp}`);
                
                // Verificar se é região restrita
                const restrictedCountries = ['CN', 'MY', 'SG', 'JP'];
                if (restrictedCountries.includes(geoResponse.data.countryCode)) {
                    console.log(`⚠️ ALERTA: IP em região restrita (${geoResponse.data.country})`);
                    return false;
                }
            }
            
            return true;
            
        } catch (error) {
            console.log('❌ Erro ao verificar IP:', error.message);
            return false;
        }
    }

    // Verificar status do Ngrok
    async checkNgrokStatus() {
        try {
            console.log('\n🔗 Verificando status do Ngrok...');
            const response = await axios.get('http://127.0.0.1:4040/api/tunnels', { timeout: 5000 });
            
            if (response.data.tunnels && response.data.tunnels.length > 0) {
                const tunnel = response.data.tunnels[0];
                this.ngrokStatus = {
                    active: true,
                    url: tunnel.public_url,
                    name: tunnel.name,
                    proto: tunnel.proto
                };
                console.log(`✅ Ngrok Ativo: ${tunnel.public_url}`);
                return true;
            } else {
                console.log('❌ Ngrok não ativo');
                this.ngrokStatus = { active: false };
                return false;
            }
            
        } catch (error) {
            console.log('❌ Ngrok não está rodando:', error.message);
            this.ngrokStatus = { active: false, error: error.message };
            return false;
        }
    }

    // Testar acesso às exchanges
    async testExchangeAccess() {
        console.log('\n🏦 Testando acesso às exchanges...');
        
        const exchanges = [
            { name: 'Bybit Mainnet', url: 'https://api.bybit.com/v5/market/time' },
            { name: 'Bybit Testnet', url: 'https://api-testnet.bybit.com/v5/market/time' },
            { name: 'Binance Mainnet', url: 'https://api.binance.com/api/v3/time' },
            { name: 'Binance Testnet', url: 'https://testnet.binance.vision/api/v3/time' }
        ];

        for (const exchange of exchanges) {
            try {
                const response = await axios.get(exchange.url, { 
                    timeout: 10000,
                    headers: { 
                        'User-Agent': 'CoinBitClub-Railway-Bot/1.0',
                        'Accept': 'application/json'
                    }
                });
                
                this.exchangeAccess[exchange.name] = {
                    status: 'accessible',
                    responseTime: response.headers['x-response-time'] || 'unknown'
                };
                console.log(`✅ ${exchange.name}: Acessível`);
                
            } catch (error) {
                this.exchangeAccess[exchange.name] = {
                    status: 'blocked',
                    error: error.response?.status || error.code,
                    message: error.response?.data?.msg || error.message
                };
                
                if (error.response?.status === 403) {
                    console.log(`❌ ${exchange.name}: IP Bloqueado (403)`);
                } else if (error.response?.status === 451) {
                    console.log(`❌ ${exchange.name}: Região Restrita (451)`);
                } else {
                    console.log(`❌ ${exchange.name}: ${error.message}`);
                }
            }
        }
    }

    // Soluções recomendadas
    generateSolutions() {
        console.log('\n💡 SOLUÇÕES RECOMENDADAS:');
        console.log('========================');

        let hasBlockedExchanges = false;
        Object.entries(this.exchangeAccess).forEach(([name, access]) => {
            if (access.status === 'blocked') {
                hasBlockedExchanges = true;
            }
        });

        if (hasBlockedExchanges) {
            console.log('🔧 PROBLEMAS DETECTADOS - SOLUÇÕES:');
            console.log('');
            
            if (!this.ngrokStatus?.active) {
                console.log('1️⃣ ATIVAR NGROK (IP FIXO):');
                console.log('   • Configurar NGROK_AUTH_TOKEN no Railway');
                console.log('   • Configurar NGROK_ENABLED=true');
                console.log('   • Redeploy da aplicação');
                console.log('');
            }

            console.log('2️⃣ CONFIGURAR WHITELIST NAS EXCHANGES:');
            console.log('   • Bybit: Adicionar IP nas configurações da API');
            console.log('   • Binance: Adicionar IP na whitelist (se disponível)');
            console.log('');

            console.log('3️⃣ USAR APENAS TESTNET:');
            console.log('   • Configurar todas as chaves para ambiente testnet');
            console.log('   • Testnet tem menos restrições de IP');
            console.log('');

            console.log('4️⃣ CONFIGURAÇÃO RAILWAY:');
            console.log('   • Adicionar variável: USE_TESTNET_ONLY=true');
            console.log('   • Forçar uso apenas de ambientes testnet');
            
        } else {
            console.log('✅ TODOS OS EXCHANGES ACESSÍVEIS!');
            console.log('   Sistema funcionando corretamente');
        }
    }

    // Executar diagnóstico completo
    async runDiagnosis() {
        console.log('🚀 Iniciando diagnóstico completo...\n');

        const ipOk = await this.checkCurrentIP();
        const ngrokOk = await this.checkNgrokStatus();
        await this.testExchangeAccess();
        
        this.generateSolutions();

        console.log('\n📊 RELATÓRIO FINAL:');
        console.log('==================');
        console.log(`IP Status: ${ipOk ? '✅ OK' : '❌ Problema'}`);
        console.log(`Ngrok Status: ${ngrokOk ? '✅ Ativo' : '❌ Inativo'}`);
        
        const accessibleExchanges = Object.values(this.exchangeAccess).filter(a => a.status === 'accessible').length;
        const totalExchanges = Object.keys(this.exchangeAccess).length;
        console.log(`Exchanges Acessíveis: ${accessibleExchanges}/${totalExchanges}`);

        return {
            ipOk,
            ngrokOk,
            accessibleExchanges,
            totalExchanges,
            exchangeAccess: this.exchangeAccess
        };
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const fixer = new IPErrorFixer();
    fixer.runDiagnosis().then(result => {
        console.log('\n✅ Diagnóstico concluído');
        process.exit(result.accessibleExchanges === result.totalExchanges ? 0 : 1);
    }).catch(error => {
        console.error('❌ Erro no diagnóstico:', error.message);
        process.exit(1);
    });
}

module.exports = IPErrorFixer;
