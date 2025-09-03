/**
 * 🌐 SISTEMA DE AUTO-CORREÇÃO DE IP PARA EXCHANGES
 * ===============================================
 * Detecta problemas de IP e oferece soluções automáticas
 */

const axios = require('axios');

class ExchangeIPFixer {
    constructor() {
        this.currentIP = null;
        this.ngrokInfo = null;
    }

    async getCurrentIP() {
        try {
            const response = await axios.get('https://httpbin.org/ip', { timeout: 5000 });
            this.currentIP = response.data.origin;
            return this.currentIP;
        } catch (error) {
            console.log('⚠️ Não foi possível obter IP atual:', error.message);
            return null;
        }
    }

    async checkNgrokStatus() {
        try {
            const fs = require('fs');
            if (fs.existsSync('./ngrok-info.json')) {
                this.ngrokInfo = JSON.parse(fs.readFileSync('./ngrok-info.json', 'utf8'));
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    async diagnoseIPIssues() {
        console.log('\n🔍 DIAGNÓSTICO DE IP PARA EXCHANGES');
        console.log('==================================');

        const currentIP = await this.getCurrentIP();
        const hasNgrok = await this.checkNgrokStatus();

        console.log(`🌐 IP atual: ${currentIP || 'Não detectado'}`);
        console.log(`🔧 Ngrok ativo: ${hasNgrok ? 'SIM' : 'NÃO'}`);

        if (hasNgrok) {
            console.log(`🌐 URL Ngrok: ${this.ngrokInfo.url}`);
            console.log(`🔢 IP Ngrok: ${this.ngrokInfo.ip}`);
        }

        return {
            currentIP,
            hasNgrok,
            ngrokInfo: this.ngrokInfo
        };
    }

    generateSolutions(exchangeError) {
        const solutions = [];

        if (exchangeError.includes('Unmatched IP')) {
            solutions.push({
                problem: 'IP não está na whitelist da exchange',
                solutions: [
                    `🔧 Adicione o IP ${this.currentIP} na whitelist do Bybit`,
                    '🌐 Ou ative o Ngrok para IP fixo: node ativar-ip-fixo.js',
                    '📋 Configurar IP fixo evita este problema permanentemente'
                ]
            });
        }

        if (exchangeError.includes('Invalid API-key')) {
            solutions.push({
                problem: 'Chave API inválida ou sem permissões',
                solutions: [
                    '🔑 Verificar se as API keys estão corretas',
                    '🛡️ Confirmar permissões de trading nas configurações',
                    '📅 Verificar se as keys não expiraram'
                ]
            });
        }

        if (exchangeError.includes('accountType is null')) {
            solutions.push({
                problem: 'Tipo de conta não especificado',
                solutions: [
                    '📊 Configurar accountType nas chamadas da API',
                    '🔧 Ajustar parâmetros do Bybit V5',
                    '🔄 Usar fallback para Bybit V2 se necessário'
                ]
            });
        }

        return solutions;
    }

    async suggestAutoFix() {
        const diagnosis = await this.diagnoseIPIssues();
        
        console.log('\n💡 SUGESTÕES DE CORREÇÃO AUTOMÁTICA:');
        console.log('===================================');

        if (!diagnosis.hasNgrok && diagnosis.currentIP) {
            console.log('🔧 SOLUÇÃO RECOMENDADA: Ativar IP Fixo');
            console.log('   1. Execute: node ativar-ip-fixo.js');
            console.log('   2. Configure whitelist nas exchanges');
            console.log('   3. Reinicie o sistema');
            console.log('');
            console.log('✅ BENEFÍCIOS:');
            console.log('   • IP consistente para todas as conexões');
            console.log('   • Whitelist permanente nas exchanges');
            console.log('   • Bypass de restrições geográficas');
            console.log('   • Maior estabilidade no trading');
        }

        if (diagnosis.hasNgrok) {
            console.log('✅ IP FIXO JÁ ATIVO');
            console.log('🔧 PRÓXIMOS PASSOS:');
            console.log(`   • Adicione ${diagnosis.ngrokInfo.ip} nas whitelists`);
            console.log('   • Bybit: Account > API Management > Whitelist');
            console.log('   • Binance: Account > API Management > Restrict IP');
        }

        return diagnosis;
    }
}

module.exports = ExchangeIPFixer;
