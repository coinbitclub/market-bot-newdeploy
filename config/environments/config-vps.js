#!/usr/bin/env node

/**
 * CONFIGURADOR AUTOMÁTICO PÓS-CRIAÇÃO DO VPS
 * Detecta IP e configura proxy automaticamente
 */

const { execSync } = require('child_process');
const axios = require('axios');

class PostVPSConfigurator {
    constructor() {
        this.doToken = process.env.DO_TOKEN;
        this.dropletName = 'coinbitclub-proxy';
        this.railwayUrl = 'https://coinbitclub-backend.railway.app';
    }

    async findDropletIP() {
        console.log('🔍 Buscando IP do VPS criado...');
        
        if (!this.doToken) {
            console.log('❌ Token DigitalOcean não encontrado!');
            console.log('💡 Configure: export DO_TOKEN="seu_token_aqui"');
            return null;
        }

        try {
            const response = await axios.get('https://api.digitalocean.com/v2/droplets', {
                headers: { 'Authorization': `Bearer ${this.doToken}` }
            });

            const droplets = response.data.droplets;
            const coinbitDroplet = droplets.find(d => 
                d.name.includes('coinbitclub') || 
                d.name.includes('proxy') ||
                d.tags.includes('coinbitclub')
            );

            if (coinbitDroplet && coinbitDroplet.networks.v4.length > 0) {
                const ip = coinbitDroplet.networks.v4[0].ip_address;
                console.log(`✅ VPS encontrado: ${coinbitDroplet.name}`);
                console.log(`🌐 IP: ${ip}`);
                console.log(`📊 Status: ${coinbitDroplet.status}`);
                return ip;
            }

            console.log('⚠️ VPS não encontrado ou ainda inicializando...');
            return null;

        } catch (error) {
            console.log(`❌ Erro ao buscar VPS: ${error.message}`);
            return null;
        }
    }

    generateSSHCommands(ip) {
        return `#!/bin/bash

# COMANDOS PARA CONFIGURAR O VPS ${ip}
echo "🚀 CONFIGURAÇÃO AUTOMÁTICA DO VPS"
echo "=================================="
echo ""

# 1. Conectar ao VPS
echo "1. 🔑 Conectando ao VPS..."
echo "ssh root@${ip}"
echo ""

# 2. Baixar e executar configuração
echo "2. 📥 Baixando script de configuração..."
cat << 'EOF' > setup-commands.sh
#!/bin/bash

# Atualizar sistema
apt-get update -y && apt-get upgrade -y

# Instalar dependências
apt-get install -y nginx curl ufw

# Configurar firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# Configurar Nginx para proxy
cat > /etc/nginx/sites-available/coinbitclub << 'NGINX_CONFIG'
upstream railway_backend {
    server ${this.railwayUrl.replace('https://', '')};
    keepalive 32;
}

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    
    access_log /var/log/nginx/coinbitclub.access.log;
    error_log /var/log/nginx/coinbitclub.error.log;
    
    location / {
        proxy_pass ${this.railwayUrl};
        proxy_http_version 1.1;
        
        proxy_set_header Host \\$host;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
        proxy_set_header Connection "";
        
        proxy_connect_timeout 10s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        proxy_buffering off;
        proxy_cache off;
    }
    
    location /proxy-health {
        return 200 "CoinBitClub Proxy OK";
        add_header Content-Type text/plain;
    }
}
NGINX_CONFIG

# Ativar configuração
ln -sf /etc/nginx/sites-available/coinbitclub /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar e reiniciar Nginx
nginx -t && systemctl restart nginx && systemctl enable nginx

echo "✅ Configuração concluída!"
echo "🌐 IP do proxy: $(curl -s ifconfig.me)"
echo "🧪 Teste: curl http://$(curl -s ifconfig.me)/proxy-health"

EOF

chmod +x setup-commands.sh

echo "3. ⚙️ Executar configuração:"
echo "./setup-commands.sh"
echo ""
echo "4. 🧪 Testar proxy:"
echo "curl http://${ip}/proxy-health"
echo ""
echo "5. 🎯 CONFIGURAR NAS EXCHANGES:"
echo "   Bybit: https://www.bybit.com/app/user/api-management"
echo "   Binance: https://www.binance.com/en/my/settings/api-management"
echo "   IP para configurar: ${ip}"
echo ""
echo "✅ Sistema pronto para trading 24/7!"`;
    }

    async configureVPS() {
        console.log('🎯 CONFIGURADOR PÓS-CRIAÇÃO VPS');
        console.log('==============================');
        console.log('');

        // Buscar IP do VPS
        const ip = await this.findDropletIP();
        
        if (!ip) {
            console.log('📝 CONFIGURAÇÃO MANUAL:');
            console.log('1. Acesse: https://cloud.digitalocean.com/droplets');
            console.log('2. Encontre o VPS "coinbitclub-proxy"');
            console.log('3. Copie o IP público');
            console.log('4. Execute: node config-vps.js SEU_IP_AQUI');
            return;
        }

        // Gerar comandos SSH
        const commands = this.generateSSHCommands(ip);
        require('fs').writeFileSync('configure-vps.sh', commands);
        
        console.log('✅ Script de configuração criado: configure-vps.sh');
        console.log('');
        console.log('🚀 PRÓXIMOS PASSOS:');
        console.log('==================');
        console.log('');
        console.log(`1. 🔑 Conectar ao VPS:`);
        console.log(`   ssh root@${ip}`);
        console.log('');
        console.log('2. 📥 No VPS, executar:');
        console.log('   curl -O https://raw.githubusercontent.com/coinbitclub/setup-proxy.sh');
        console.log('   chmod +x setup-proxy.sh');
        console.log(`   ./setup-proxy.sh ${this.railwayUrl}`);
        console.log('');
        console.log('3. 🧪 Testar:');
        console.log(`   curl http://${ip}/proxy-health`);
        console.log('');
        console.log('4. ⚙️ Configurar nas exchanges:');
        console.log(`   IP: ${ip}`);
        console.log('');
        
        // Salvar informações
        const info = {
            vps_ip: ip,
            railway_url: this.railwayUrl,
            created_at: new Date().toISOString(),
            next_steps: [
                `ssh root@${ip}`,
                'Executar setup-proxy.sh',
                'Testar conectividade',
                'Configurar IP nas exchanges'
            ]
        };
        
        require('fs').writeFileSync('vps-info.json', JSON.stringify(info, null, 2));
        console.log('💾 Informações salvas em: vps-info.json');
    }
}

if (require.main === module) {
    const configurator = new PostVPSConfigurator();
    configurator.configureVPS();
}

module.exports = PostVPSConfigurator;
