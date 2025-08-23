#!/usr/bin/env node

/**
 * SISTEMA DE GERENCIAMENTO DE IP DINÂMICO PARA RAILWAY
 * Implementa soluções para contornar a limitação de IP não fixo
 */

const axios = require('axios');
const { Pool } = require('pg');

class DynamicIPManager {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
            ssl: { rejectUnauthorized: false }
        });
        this.currentIP = null;
        this.lastIPCheck = null;
        this.ipCheckInterval = 5 * 60 * 1000; // 5 minutos
    }

    /**
     * OBTER IP PÚBLICO ATUAL DO SERVIDOR
     */
    async getCurrentPublicIP() {
        try {
            const services = [
                'https://api.ipify.org?format=json',
                'https://ipapi.co/json/',
                'https://ifconfig.me/ip',
                'https://icanhazip.com/',
                'https://checkip.amazonaws.com/'
            ];

            for (const service of services) {
                try {
                    const response = await axios.get(service, { timeout: 5000 });
                    
                    if (service.includes('ipify')) {
                        return response.data.ip;
                    } else if (service.includes('ipapi')) {
                        return response.data.ip;
                    } else {
                        return response.data.trim();
                    }
                } catch (serviceError) {
                    console.log(`⚠️ Serviço ${service} falhou:`, serviceError.message);
                    continue;
                }
            }
            
            throw new Error('Todos os serviços de IP falharam');
        } catch (error) {
            console.error('❌ Erro ao obter IP público:', error.message);
            return null;
        }
    }

    /**
     * VERIFICAR SE IP MUDOU
     */
    async checkIPChange() {
        const newIP = await this.getCurrentPublicIP();
        
        if (!newIP) {
            return { changed: false, error: 'Não foi possível obter IP' };
        }

        const changed = this.currentIP && this.currentIP !== newIP;
        
        if (changed) {
            console.log(`🔄 IP mudou de ${this.currentIP} para ${newIP}`);
        }

        this.currentIP = newIP;
        this.lastIPCheck = new Date();

        return { 
            changed, 
            oldIP: this.currentIP,
            newIP: newIP,
            timestamp: this.lastIPCheck
        };
    }

    /**
     * SALVAR HISTÓRICO DE IPs NO BANCO
     */
    async saveIPHistory(ip, status = 'active') {
        try {
            const client = await this.pool.connect();
            
            // Criar tabela se não existir
            await client.query(`
                CREATE TABLE IF NOT EXISTS server_ip_history (
                    id SERIAL PRIMARY KEY,
                    ip_address VARCHAR(45) NOT NULL,
                    status VARCHAR(20) DEFAULT 'active',
                    first_detected TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    usage_count INTEGER DEFAULT 1,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            `);

            // Verificar se IP já existe
            const existingIP = await client.query(
                'SELECT id, usage_count FROM server_ip_history WHERE ip_address = $1',
                [ip]
            );

            if (existingIP.rows.length > 0) {
                // Atualizar IP existente
                await client.query(`
                    UPDATE server_ip_history SET
                        last_seen = NOW(),
                        usage_count = usage_count + 1,
                        status = $2
                    WHERE ip_address = $1
                `, [ip, status]);
            } else {
                // Inserir novo IP
                await client.query(`
                    INSERT INTO server_ip_history (ip_address, status)
                    VALUES ($1, $2)
                `, [ip, status]);
            }

            client.release();
            return true;

        } catch (error) {
            console.error('❌ Erro ao salvar histórico de IP:', error.message);
            return false;
        }
    }

    /**
     * OBTER LISTA DE IPs UTILIZADOS
     */
    async getIPHistory() {
        try {
            const client = await this.pool.connect();
            
            const result = await client.query(`
                SELECT 
                    ip_address,
                    status,
                    first_detected,
                    last_seen,
                    usage_count
                FROM server_ip_history 
                ORDER BY last_seen DESC
                LIMIT 10
            `);

            client.release();
            return result.rows;

        } catch (error) {
            console.error('❌ Erro ao obter histórico de IP:', error.message);
            return [];
        }
    }

    /**
     * SOLUÇÃO 1: CONFIGURAR TODAS AS EXCHANGES SEM RESTRIÇÃO DE IP
     */
    async recommendIPlessConfiguration() {
        console.log('💡 SOLUÇÃO 1: CONFIGURAÇÃO SEM RESTRIÇÃO DE IP');
        console.log('==============================================');
        console.log('');

        console.log('🔧 CONFIGURAÇÕES RECOMENDADAS POR EXCHANGE:');
        console.log('');

        console.log('📊 BYBIT:');
        console.log('   1. Acesse: https://bybit.com/ (mainnet) ou https://testnet.bybit.com/ (testnet)');
        console.log('   2. Login > API > API Management');
        console.log('   3. Create New Key ou Edit Key existente');
        console.log('   4. IP Restriction: DEIXAR VAZIO ou * (asterisco)');
        console.log('   5. Permissions necessárias:');
        console.log('      ✅ Read-Write');
        console.log('      ✅ Contract Trading');
        console.log('      ✅ Spot Trading');
        console.log('      ✅ Wallet');
        console.log('');

        console.log('📊 BINANCE:');
        console.log('   1. Acesse: https://binance.com/ (mainnet) ou https://testnet.binance.vision/ (testnet)');
        console.log('   2. Account > API Management');
        console.log('   3. Create API ou Edit existente');
        console.log('   4. IP Restriction: Unrestricted (sem restrição)');
        console.log('   5. Permissions necessárias:');
        console.log('      ✅ Enable Reading');
        console.log('      ✅ Enable Spot & Margin Trading');
        console.log('      ✅ Enable Futures');
        console.log('');

        console.log('⚠️ SEGURANÇA:');
        console.log('   • APIs sem restrição de IP são menos seguras');
        console.log('   • Use apenas para desenvolvimento/teste inicial');
        console.log('   • Monitore atividade suspeita');
        console.log('   • Considere limites de retirada baixos');
    }

    /**
     * SOLUÇÃO 2: IMPLEMENTAR PROXY REVERSO COM IP FIXO
     */
    async implementProxyConfiguration() {
        console.log('💡 SOLUÇÃO 2: PROXY REVERSO COM IP FIXO');
        console.log('=======================================');
        console.log('');

        console.log('🔧 OPÇÕES DE IMPLEMENTAÇÃO:');
        console.log('');

        console.log('1️⃣ CLOUDFLARE + RAILWAY:');
        console.log('   • Configure Cloudflare como proxy');
        console.log('   • Use Cloudflare Workers para requests fixos');
        console.log('   • IP de saída mais estável');
        console.log('');

        console.log('2️⃣ AWS LAMBDA + FIXED IP:');
        console.log('   • Lambda com VPC e NAT Gateway');
        console.log('   • Elastic IP para saída fixa');
        console.log('   • Proxy requests para exchanges');
        console.log('');

        console.log('3️⃣ VPS DEDICADO (RECOMENDADO):');
        console.log('   • DigitalOcean Droplet ($6/mês)');
        console.log('   • AWS EC2 t3.micro');
        console.log('   • Google Cloud Compute Engine');
        console.log('   • IP público fixo garantido');
        console.log('');

        // Gerar configuração de proxy
        await this.generateProxyConfig();
    }

    /**
     * GERAR CONFIGURAÇÃO DE PROXY
     */
    async generateProxyConfig() {
        console.log('📝 CONFIGURAÇÃO DE PROXY NGINX:');
        console.log('');

        const nginxConfig = `
# /etc/nginx/sites-available/coinbitclub-proxy
server {
    listen 80;
    server_name seu-dominio.com;
    
    # Proxy para API Bybit
    location /api/bybit/ {
        proxy_pass https://api.bybit.com/;
        proxy_ssl_server_name on;
        proxy_set_header Host api.bybit.com;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Headers necessários para APIs
        proxy_set_header User-Agent "CoinBitClub-Bot/1.0";
        proxy_set_header Accept "application/json";
    }
    
    # Proxy para API Binance
    location /api/binance/ {
        proxy_pass https://api.binance.com/;
        proxy_ssl_server_name on;
        proxy_set_header Host api.binance.com;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}`;

        console.log(nginxConfig);
        console.log('');
    }

    /**
     * SOLUÇÃO 3: IMPLEMENTAR DETECÇÃO AUTOMÁTICA DE IP
     */
    async implementAutoIPDetection() {
        console.log('💡 SOLUÇÃO 3: DETECÇÃO AUTOMÁTICA DE IP');
        console.log('=======================================');
        console.log('');

        console.log('🤖 SISTEMA AUTOMÁTICO:');
        console.log('   1. Detecta mudanças de IP a cada 5 minutos');
        console.log('   2. Notifica mudanças por webhook/email');
        console.log('   3. Salva histórico no banco de dados');
        console.log('   4. Gera lista de IPs para configurar nas exchanges');
        console.log('');

        // Implementar detecção automática
        const currentIP = await this.getCurrentPublicIP();
        
        if (currentIP) {
            console.log(`🌐 IP ATUAL: ${currentIP}`);
            await this.saveIPHistory(currentIP);
            
            const history = await this.getIPHistory();
            console.log('');
            console.log('📊 HISTÓRICO DE IPs:');
            history.forEach((record, index) => {
                console.log(`   ${index + 1}. ${record.ip_address} (usado ${record.usage_count}x)`);
                console.log(`      Primeira vez: ${new Date(record.first_detected).toLocaleString('pt-BR')}`);
                console.log(`      Última vez: ${new Date(record.last_seen).toLocaleString('pt-BR')}`);
                console.log('');
            });

            console.log('💡 CONFIGURE ESTES IPs NAS EXCHANGES:');
            const uniqueIPs = [...new Set(history.map(h => h.ip_address))];
            uniqueIPs.forEach(ip => {
                console.log(`   • ${ip}`);
            });
        }
    }

    /**
     * SOLUÇÃO 4: MIDDLEWARE DE RETRY COM DIFERENTES ESTRATÉGIAS
     */
    generateRetryMiddleware() {
        console.log('💡 SOLUÇÃO 4: MIDDLEWARE DE RETRY INTELIGENTE');
        console.log('==============================================');
        console.log('');

        const middlewareCode = `
// middleware-ip-retry.js
class IPRetryMiddleware {
    constructor() {
        this.retryStrategies = [
            'direct',           // Conexão direta
            'cloudflare',       // Via Cloudflare
            'different_port',   // Porta diferente
            'delay_retry'       // Retry com delay
        ];
    }

    async makeRequestWithRetry(url, options = {}) {
        for (const strategy of this.retryStrategies) {
            try {
                console.log(\`🔄 Tentando estratégia: \${strategy}\`);
                
                const result = await this.executeStrategy(strategy, url, options);
                console.log(\`✅ Sucesso com estratégia: \${strategy}\`);
                return result;
                
            } catch (error) {
                console.log(\`❌ Falha com \${strategy}: \${error.message}\`);
                
                if (error.message.includes('Unmatched IP')) {
                    console.log('🚨 Erro de IP detectado, tentando próxima estratégia...');
                    continue;
                }
                
                // Se não for erro de IP, relançar
                throw error;
            }
        }
        
        throw new Error('Todas as estratégias de retry falharam');
    }

    async executeStrategy(strategy, url, options) {
        switch (strategy) {
            case 'direct':
                return await axios(url, options);
                
            case 'cloudflare':
                // Usar proxy Cloudflare se configurado
                const cfUrl = url.replace('api.bybit.com', 'cf-proxy.seu-dominio.com');
                return await axios(cfUrl, options);
                
            case 'different_port':
                // Tentar porta alternativa
                const altUrl = url.replace(':443', ':80');
                return await axios(altUrl, options);
                
            case 'delay_retry':
                await new Promise(resolve => setTimeout(resolve, 2000));
                return await axios(url, options);
                
            default:
                throw new Error(\`Estratégia desconhecida: \${strategy}\`);
        }
    }
}`;

        console.log(middlewareCode);
        console.log('');
    }

    /**
     * EXECUTAR DIAGNÓSTICO COMPLETO DE IP
     */
    async runFullDiagnosis() {
        console.log('🔍 DIAGNÓSTICO COMPLETO DE IP DINÂMICO');
        console.log('======================================');
        console.log('');

        // 1. Verificar IP atual
        await this.implementAutoIPDetection();
        
        console.log('⏳ Aguarde 3 segundos...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('');

        // 2. Mostrar soluções
        await this.recommendIPlessConfiguration();
        
        console.log('⏳ Aguarde 3 segundos...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('');

        await this.implementProxyConfiguration();
        
        console.log('⏳ Aguarde 3 segundos...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('');

        this.generateRetryMiddleware();

        console.log('📋 RESUMO DE SOLUÇÕES:');
        console.log('');
        console.log('🚀 IMEDIATAS (Hoje):');
        console.log('   1. Configure APIs sem restrição de IP');
        console.log('   2. Use Testnet primeiro');
        console.log('   3. Implemente middleware de retry');
        console.log('');
        console.log('🔧 MÉDIO PRAZO (Esta semana):');
        console.log('   1. Configure VPS com IP fixo');
        console.log('   2. Implemente proxy reverso');
        console.log('   3. Configure Cloudflare');
        console.log('');
        console.log('🏗️ LONGO PRAZO (Produção):');
        console.log('   1. Infraestrutura dedicada');
        console.log('   2. Load balancer com IPs fixos');
        console.log('   3. Monitoramento de IP automático');

        await this.pool.end();
    }

    /**
     * MONITORAMENTO CONTÍNUO DE IP
     */
    startIPMonitoring() {
        console.log('🔄 Iniciando monitoramento contínuo de IP...');
        
        setInterval(async () => {
            try {
                const result = await this.checkIPChange();
                
                if (result.changed) {
                    console.log(`🚨 IP MUDOU! Novo IP: ${result.newIP}`);
                    await this.saveIPHistory(result.newIP);
                    
                    // Aqui você pode implementar notificações
                    // await this.notifyIPChange(result);
                }
            } catch (error) {
                console.error('❌ Erro no monitoramento de IP:', error.message);
            }
        }, this.ipCheckInterval);
    }
}

// Executar diagnóstico
if (require.main === module) {
    const ipManager = new DynamicIPManager();
    ipManager.runFullDiagnosis();
}

module.exports = DynamicIPManager;
