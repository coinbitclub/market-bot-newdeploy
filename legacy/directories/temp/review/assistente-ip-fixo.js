#!/usr/bin/env node

/**
 * ASSISTENTE INTELIGENTE PARA IMPLEMENTAÇÃO DE IP FIXO
 * Automatiza todo o processo de configuração
 */

const axios = require('axios');
const { execSync } = require('child_process');

class IPFixoAssistant {
    constructor() {
        this.railwayUrl = 'https://coinbitclub-market-bot-production.up.railway.app';
        this.dropletName = 'coinbitclub-proxy';
    }

    async detectRailwayUrl() {
        console.log('🔍 Detectando URL do Railway...');
        
        // Tentar várias URLs possíveis
        const possibleUrls = [
            'https://coinbitclub-market-bot-production.up.railway.app',
            'https://coinbitclub-backend.railway.app',
            'https://coinbitclub-market-bot.railway.app'
        ];

        for (const url of possibleUrls) {
            try {
                const response = await axios.get(`${url}/health`, { timeout: 5000 });
                if (response.status === 200) {
                    console.log(`✅ Railway encontrado: ${url}`);
                    this.railwayUrl = url;
                    return url;
                }
            } catch (error) {
                console.log(`❌ ${url} não responde`);
            }
        }

        console.log('⚠️ URL do Railway não detectada automaticamente');
        console.log('💡 Configure manualmente na variável railwayUrl');
        return this.railwayUrl;
    }

    generateDigitalOceanScript() {
        return `#!/bin/bash

# SCRIPT PARA CRIAR VPS DIGITALOCEAN
echo "🏗️ Criando VPS para proxy IP fixo..."

# Verificar token
if [ -z "$DO_TOKEN" ]; then
    echo "❌ Configure seu token DigitalOcean:"
    echo "export DO_TOKEN='dop_v1_SEU_TOKEN_AQUI'"
    echo ""
    echo "🔗 Obter token em: https://cloud.digitalocean.com/account/api/tokens"
    exit 1
fi

# Criar droplet
echo "📡 Criando droplet ${this.dropletName}..."
RESPONSE=$(curl -s -X POST \\
    -H "Content-Type: application/json" \\
    -H "Authorization: Bearer $DO_TOKEN" \\
    -d '{
        "name": "${this.dropletName}",
        "region": "nyc3",
        "size": "s-1vcpu-1gb",
        "image": "ubuntu-22-04-x64",
        "ssh_keys": [],
        "backups": false,
        "ipv6": false,
        "monitoring": true,
        "tags": ["coinbitclub", "proxy", "trading"]
    }' \\
    "https://api.digitalocean.com/v2/droplets")

# Extrair ID do droplet
DROPLET_ID=$(echo $RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$DROPLET_ID" ]; then
    echo "❌ Erro ao criar droplet:"
    echo "$RESPONSE"
    exit 1
fi

echo "✅ Droplet criado com ID: $DROPLET_ID"
echo "⏳ Aguardando inicialização (60 segundos)..."
sleep 60

# Obter IP do droplet
IP_RESPONSE=$(curl -s -H "Authorization: Bearer $DO_TOKEN" \\
    "https://api.digitalocean.com/v2/droplets/$DROPLET_ID")

DROPLET_IP=$(echo $IP_RESPONSE | grep -o '"ip":"[^"]*' | cut -d'"' -f4)

echo "🌐 IP do droplet: $DROPLET_IP"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "1. Conectar: ssh root@$DROPLET_IP"
echo "2. Executar configuração:"
echo "   curl -O https://raw.githubusercontent.com/coinbitclub/setup-proxy.sh"
echo "   chmod +x setup-proxy.sh"
echo "   ./setup-proxy.sh ${this.railwayUrl}"
echo ""
echo "💾 Salvando informações..."
echo "DROPLET_ID=$DROPLET_ID" > droplet_info.txt
echo "DROPLET_IP=$DROPLET_IP" >> droplet_info.txt
echo "RAILWAY_URL=${this.railwayUrl}" >> droplet_info.txt

echo "✅ VPS criado! IP: $DROPLET_IP"`;
    }

    generateNginxSetup() {
        return `#!/bin/bash

# CONFIGURAÇÃO AUTOMÁTICA DO NGINX PROXY
echo "🔧 Configurando proxy Nginx para CoinBitClub..."

RAILWAY_URL="\${1:-${this.railwayUrl}}"

# Atualizar sistema
echo "📦 Atualizando sistema..."
apt-get update -y && apt-get upgrade -y

# Instalar Nginx e ferramentas
echo "🔧 Instalando Nginx..."
apt-get install -y nginx curl ufw certbot python3-certbot-nginx htop

# Configurar firewall
echo "🔥 Configurando firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Configurar Nginx
echo "⚙️ Configurando Nginx..."
cat > /etc/nginx/sites-available/coinbitclub << 'NGINX_CONFIG'
# Configuração otimizada para trading automatizado
upstream railway_backend {
    server RAILWAY_HOST;
    keepalive 32;
}

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    
    # Logs detalhados
    access_log /var/log/nginx/coinbitclub.access.log;
    error_log /var/log/nginx/coinbitclub.error.log;
    
    # Configurações otimizadas para API trading
    client_max_body_size 10M;
    client_body_timeout 30s;
    client_header_timeout 30s;
    
    # Proxy principal para Railway
    location / {
        proxy_pass $RAILWAY_URL;
        proxy_http_version 1.1;
        
        # Headers essenciais
        proxy_set_header Host \\$host;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
        proxy_set_header Connection "";
        
        # Timeouts otimizados para trading
        proxy_connect_timeout 10s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Desabilitar cache para dados em tempo real
        proxy_buffering off;
        proxy_cache off;
        proxy_no_cache 1;
        proxy_cache_bypass 1;
        
        # Headers para APIs de exchange
        proxy_set_header User-Agent "CoinBitClub-Proxy/1.0";
        proxy_set_header Accept "application/json";
    }
    
    # Health check do proxy
    location /proxy-health {
        return 200 "CoinBitClub Proxy OK";
        add_header Content-Type text/plain;
        access_log off;
    }
    
    # Status detalhado
    location /proxy-status {
        return 200 '{
            "status": "operational",
            "service": "CoinBitClub Trading Proxy",
            "backend": "$RAILWAY_URL",
            "timestamp": "\\$time_iso8601",
            "server_ip": "\\$server_addr"
        }';
        add_header Content-Type application/json;
    }
}
NGINX_CONFIG

# Substituir URL do Railway
sed -i "s|\\$RAILWAY_URL|$RAILWAY_URL|g" /etc/nginx/sites-available/coinbitclub

# Ativar configuração
ln -sf /etc/nginx/sites-available/coinbitclub /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Configuração global do Nginx
cat > /etc/nginx/nginx.conf << 'NGINX_GLOBAL'
user www-data;
worker_processes auto;
pid /run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    # Configurações básicas
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    # MIME types
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Logs
    log_format main '\\$remote_addr - \\$remote_user [\\$time_local] "\\$request" '
                   '\\$status \\$body_bytes_sent "\\$http_referer" '
                   '"\\$http_user_agent" "\\$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log;
    
    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Sites
    include /etc/nginx/sites-enabled/*;
}
NGINX_GLOBAL

# Testar configuração
echo "🧪 Testando configuração Nginx..."
nginx -t

if [ $? -eq 0 ]; then
    # Reiniciar Nginx
    systemctl restart nginx
    systemctl enable nginx
    
    echo "✅ Nginx configurado com sucesso!"
    echo ""
    echo "🌐 IP deste servidor: $(curl -s ifconfig.me)"
    echo "🔗 Railway backend: $RAILWAY_URL"
    echo ""
    echo "🧪 Testando conectividade..."
    sleep 3
    
    # Testar proxy
    if curl -s http://localhost/proxy-health | grep -q "OK"; then
        echo "✅ Proxy health check: OK"
    else
        echo "❌ Proxy health check: FALHOU"
    fi
    
    if curl -s http://localhost/health | grep -q "healthy"; then
        echo "✅ Railway via proxy: OK"
    else
        echo "⚠️ Railway via proxy: Verifique conectividade"
    fi
    
    echo ""
    echo "📊 STATUS FINAL:"
    systemctl status nginx --no-pager -l
    
    echo ""
    echo "🎯 CONFIGURE ESTE IP NAS EXCHANGES:"
    echo "$(curl -s ifconfig.me)"
    
else
    echo "❌ Erro na configuração do Nginx"
    nginx -t
    exit 1
fi`;
    }

    generateTestScript() {
        return `#!/usr/bin/env node

/**
 * TESTE AUTOMÁTICO DE CONECTIVIDADE DO PROXY
 */

const axios = require('axios');

async function testProxy() {
    const proxyIp = process.argv[2];
    
    if (!proxyIp) {
        console.log('❌ Uso: node test-proxy.js IP_DO_VPS');
        process.exit(1);
    }
    
    console.log('🧪 TESTE DE CONECTIVIDADE COMPLETO');
    console.log('==================================');
    console.log(\`🌐 Testando IP: \${proxyIp}\`);
    console.log('');
    
    const tests = [
        {
            name: 'Health Check do Proxy',
            url: \`http://\${proxyIp}/proxy-health\`,
            expected: 'OK'
        },
        {
            name: 'Status do Proxy',
            url: \`http://\${proxyIp}/proxy-status\`,
            expected: 'operational'
        },
        {
            name: 'Railway via Proxy',
            url: \`http://\${proxyIp}/health\`,
            expected: 'healthy'
        },
        {
            name: 'API Status via Proxy',
            url: \`http://\${proxyIp}/status\`,
            expected: 'OK'
        }
    ];
    
    let passed = 0;
    
    for (const test of tests) {
        try {
            console.log(\`📡 \${test.name}...\`);
            const response = await axios.get(test.url, { timeout: 10000 });
            
            if (response.status === 200 && JSON.stringify(response.data).includes(test.expected)) {
                console.log(\`   ✅ PASSOU (\${response.status})\`);
                passed++;
            } else {
                console.log(\`   ⚠️ RESPOSTA INESPERADA (\${response.status})\`);
            }
        } catch (error) {
            console.log(\`   ❌ FALHOU: \${error.message}\`);
        }
    }
    
    console.log('');
    console.log('📊 RESULTADO FINAL:');
    console.log(\`✅ Testes passou: \${passed}/\${tests.length}\`);
    
    if (passed === tests.length) {
        console.log('🎉 PROXY FUNCIONANDO PERFEITAMENTE!');
        console.log('');
        console.log('🔑 CONFIGURE NAS EXCHANGES:');
        console.log(\`   IP: \${proxyIp}\`);
        console.log('   Bybit: API Management > Edit > IP Restriction');
        console.log('   Binance: API Management > Edit > IP Access Restriction');
        console.log('');
        console.log('🚀 Sistema pronto para trading 24/7!');
    } else {
        console.log('⚠️ Alguns testes falharam. Verifique configuração.');
    }
}

testProxy();`;
    }

    async generateAllFiles() {
        console.log('🚀 GERANDO ARQUIVOS DE IMPLEMENTAÇÃO');
        console.log('====================================');
        console.log('');

        // Detectar URL do Railway
        await this.detectRailwayUrl();

        console.log('📝 Gerando scripts de implementação...');

        // Criar script de criação do VPS
        require('fs').writeFileSync('create-vps.sh', this.generateDigitalOceanScript());
        console.log('✅ create-vps.sh criado');

        // Criar script de configuração do Nginx
        require('fs').writeFileSync('setup-proxy.sh', this.generateNginxSetup());
        console.log('✅ setup-proxy.sh criado');

        // Criar script de teste
        require('fs').writeFileSync('test-proxy.js', this.generateTestScript());
        console.log('✅ test-proxy.js criado');

        // Tornar scripts executáveis
        try {
            execSync('chmod +x create-vps.sh setup-proxy.sh');
            console.log('✅ Permissões de execução configuradas');
        } catch (error) {
            console.log('⚠️ Configure permissões manualmente: chmod +x *.sh');
        }

        console.log('');
        console.log('🎯 IMPLEMENTAÇÃO PASSO A PASSO:');
        console.log('===============================');
        console.log('');
        console.log('1. 🔑 Configure token DigitalOcean:');
        console.log('   export DO_TOKEN="dop_v1_SEU_TOKEN_AQUI"');
        console.log('   # Obter em: https://cloud.digitalocean.com/account/api/tokens');
        console.log('');
        console.log('2. 🏗️ Criar VPS:');
        console.log('   ./create-vps.sh');
        console.log('');
        console.log('3. 🔧 Configurar proxy (use IP retornado):');
        console.log('   ssh root@IP_DO_VPS');
        console.log('   # No servidor VPS:');
        console.log('   curl -O https://raw.githubusercontent.com/seu-repo/setup-proxy.sh');
        console.log('   chmod +x setup-proxy.sh');
        console.log(`   ./setup-proxy.sh ${this.railwayUrl}`);
        console.log('');
        console.log('4. 🧪 Testar conectividade:');
        console.log('   node test-proxy.js IP_DO_VPS');
        console.log('');
        console.log('5. ⚙️ Configurar IP nas exchanges');
        console.log('6. ✅ Sistema operacional!');
        console.log('');
        console.log('💰 Custo: $9/mês');
        console.log('⏱️ Tempo: 2-3 horas');
        console.log('🎯 Resultado: IP fixo para trading 24/7');
    }
}

if (require.main === module) {
    const assistant = new IPFixoAssistant();
    assistant.generateAllFiles();
}

module.exports = IPFixoAssistant;
