#!/usr/bin/env node

/**
 * 🔍 VERIFICADOR DE IP FIXO ATUAL
 * ==============================
 * 
 * Descobre qual é o IP fixo ativo do sistema
 */

const axios = require('axios');
const { execSync } = require('child_process');
require('dotenv').config();

class IPFixoChecker {
    async verificarIPAtual() {
        console.log('🔍 VERIFICAÇÃO DE IP FIXO ATIVO');
        console.log('=' .repeat(50));

        // 1. Verificar se Ngrok está rodando localmente
        await this.checkNgrokLocal();

        // 2. Verificar Railway deploy
        await this.checkRailwayDeploy();

        // 3. Verificar configurações de ambiente
        await this.checkEnvConfig();

        // 4. Testar IPs externos
        await this.checkExternalIPs();
    }

    async checkNgrokLocal() {
        console.log('\n1️⃣ Verificando Ngrok Local...');
        
        try {
            const response = await axios.get('http://127.0.0.1:4040/api/tunnels', { timeout: 5000 });
            
            if (response.data && response.data.tunnels && response.data.tunnels.length > 0) {
                const tunnel = response.data.tunnels[0];
                const publicUrl = tunnel.public_url;
                const ip = publicUrl.replace('https://', '').replace('http://', '').split('.')[0];
                
                console.log('✅ Ngrok ATIVO localmente!');
                console.log(`🌐 URL Pública: ${publicUrl}`);
                console.log(`📍 IP/Subdomínio: ${ip}`);
                console.log(`🚀 Protocolo: ${tunnel.proto}`);
                
                return publicUrl;
            } else {
                console.log('⚠️ Ngrok rodando mas sem túneis ativos');
            }
        } catch (error) {
            console.log('❌ Ngrok não está rodando localmente');
        }
        return null;
    }

    async checkRailwayDeploy() {
        console.log('\n2️⃣ Verificando Railway Deploy...');
        
        // URLs possíveis do Railway
        const possibleUrls = [
            'https://coinbitclub-market-bot-production.up.railway.app',
            'https://web-production-XXXX.up.railway.app',
            'https://backend-production-XXXX.up.railway.app'
        ];

        for (const url of possibleUrls) {
            try {
                const response = await axios.get(`${url}/health`, { timeout: 10000 });
                console.log(`✅ Railway ATIVO: ${url}`);
                console.log(`📊 Status: ${response.status}`);
                
                // Verificar se há informação de Ngrok no response
                if (response.data && response.data.ngrok_url) {
                    console.log(`🌐 Ngrok URL: ${response.data.ngrok_url}`);
                }
                
                return url;
            } catch (error) {
                console.log(`❌ ${url} - não acessível`);
            }
        }
        
        console.log('⚠️ Nenhum deploy Railway encontrado ativo');
        return null;
    }

    async checkEnvConfig() {
        console.log('\n3️⃣ Verificando Configurações...');
        
        const ngrokToken = process.env.NGROK_AUTH_TOKEN;
        const ngrokRegion = process.env.NGROK_REGION || 'us';
        const ngrokSubdomain = process.env.NGROK_SUBDOMAIN;
        
        if (ngrokToken) {
            console.log('✅ NGROK_AUTH_TOKEN configurado');
            console.log(`🌍 Região: ${ngrokRegion}`);
            
            if (ngrokSubdomain) {
                console.log(`🏷️ Subdomínio: ${ngrokSubdomain}`);
                console.log(`🌐 URL esperada: https://${ngrokSubdomain}.ngrok.io`);
            } else {
                console.log('⚠️ Subdomínio não configurado (URL será aleatória)');
            }
        } else {
            console.log('❌ NGROK_AUTH_TOKEN não configurado');
        }
    }

    async checkExternalIPs() {
        console.log('\n4️⃣ Verificando IPs Externos...');
        
        try {
            // Verificar IP público atual
            const ipResponse = await axios.get('https://api.ipify.org', { timeout: 5000 });
            console.log(`🌐 IP Público Atual: ${ipResponse.data}`);
            
            // Verificar geolocalização
            const geoResponse = await axios.get(`http://ip-api.com/json/${ipResponse.data}`, { timeout: 5000 });
            if (geoResponse.data.status === 'success') {
                console.log(`📍 Localização: ${geoResponse.data.city}, ${geoResponse.data.country}`);
                console.log(`🏢 Provedor: ${geoResponse.data.isp}`);
            }
            
        } catch (error) {
            console.log('❌ Erro ao verificar IP externo');
        }
    }

    async descobrirIPFixo() {
        console.log('\n🎯 RESUMO DO IP FIXO:');
        console.log('=' .repeat(50));
        
        // Verificar se há arquivo de informações do Ngrok
        try {
            if (require('fs').existsSync('./ngrok-info.json')) {
                const ngrokInfo = JSON.parse(require('fs').readFileSync('./ngrok-info.json', 'utf8'));
                console.log(`✅ SEU IP FIXO: ${ngrokInfo.url}`);
                console.log(`🏷️ Subdomínio: ${ngrokInfo.subdomain || 'não definido'}`);
                console.log(`📅 Estabelecido: ${new Date(ngrokInfo.timestamp).toLocaleString()}`);
                console.log('🔒 Este é o URL que deve ser usado nas exchanges');
                console.log('📋 Configure este IP no whitelist da Bybit/Binance');
                console.log('');
                console.log('🔗 URLs para whitelist:');
                console.log(`   • Webhook: ${ngrokInfo.url}/webhook`);
                console.log(`   • API: ${ngrokInfo.url}/api/*`);
                console.log(`   • Health: ${ngrokInfo.url}/health`);
                return ngrokInfo.url;
            }
        } catch (error) {
            console.log('⚠️ Erro ao ler informações do Ngrok:', error.message);
        }
        
        // Se Ngrok está configurado
        const ngrokSubdomain = process.env.NGROK_SUBDOMAIN;
        const ngrokEnabled = process.env.NGROK_ENABLED === 'true';
        
        if (ngrokEnabled && ngrokSubdomain) {
            const ngrokUrl = `https://${ngrokSubdomain}.ngrok.io`;
            console.log(`✅ SEU IP FIXO CONFIGURADO: ${ngrokUrl}`);
            console.log('🔒 Este é o URL que deve ser usado nas exchanges');
            console.log('📋 Configure este IP no whitelist da Bybit/Binance');
            console.log('');
            console.log('⚠️ ATENÇÃO: Ngrok pode não estar ativo ainda');
            console.log('   Aguarde alguns minutos após o deploy');
            console.log('   Ou reinicie o serviço no Railway');
            return ngrokUrl;
        }
        
        console.log('⚠️ IP fixo não está configurado ainda');
        console.log('💡 Para configurar:');
        console.log('   1. Configure NGROK_AUTH_TOKEN no Railway');
        console.log('   2. Configure NGROK_SUBDOMAIN=coinbitclub-bot');
        console.log('   3. Configure NGROK_ENABLED=true');
        console.log('   4. Redeploy o sistema');
        console.log('');
        console.log('📖 Consulte o arquivo DEPLOY-GUIDE.md para instruções completas');
        
        return null;
    }
}

// Executar verificação
async function main() {
    const checker = new IPFixoChecker();
    await checker.verificarIPAtual();
    await checker.descobrirIPFixo();
}

main().catch(console.error);
