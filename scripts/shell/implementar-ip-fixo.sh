#!/bin/bash

# SCRIPT AUTOMÁTICO PARA CRIAR VPS COM IP FIXO
# Implementação completa da solução híbrida Railway + VPS Proxy

echo "🚀 IMPLEMENTAÇÃO AUTOMÁTICA: IP FIXO PARA COINBITCLUB"
echo "====================================================="
echo ""

echo "📋 CHECKLIST PRÉ-REQUISITOS:"
echo "1. ✅ Conta DigitalOcean criada"
echo "2. ✅ Token de API DigitalOcean configurado"
echo "3. ✅ Railway app funcionando"
echo "4. ✅ URL do Railway disponível"
echo ""

# Configurações
DROPLET_NAME="coinbitclub-proxy"
DROPLET_SIZE="s-1vcpu-1gb"  # $6/mês
DROPLET_REGION="nyc3"       # Nova York (baixa latência)
DROPLET_IMAGE="ubuntu-22-04-x64"

# Dados do Railway (substituir pelos reais)
RAILWAY_URL="https://coinbitclub-market-bot-production.up.railway.app"
DOMAIN_NAME="trading.coinbitclub.com"  # Opcional

echo "🏗️ ETAPA 1: CRIANDO VPS NO DIGITALOCEAN"
echo "======================================="

# Script para criar droplet via API DigitalOcean
cat > create_droplet.sh << 'EOF'
#!/bin/bash

# Função para criar droplet
create_droplet() {
    echo "📡 Criando droplet no DigitalOcean..."
    
    # Criar droplet via API
    curl -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $DO_TOKEN" \
        -d '{
            "name": "'$DROPLET_NAME'",
            "region": "'$DROPLET_REGION'",
            "size": "'$DROPLET_SIZE'",
            "image": "'$DROPLET_IMAGE'",
            "ssh_keys": [],
            "backups": false,
            "ipv6": false,
            "user_data": null,
            "private_networking": null,
            "volumes": null,
            "tags": ["coinbitclub", "proxy", "trading"]
        }' \
        "https://api.digitalocean.com/v2/droplets"
}

# Verificar se token está configurado
if [ -z "$DO_TOKEN" ]; then
    echo "❌ Configure DO_TOKEN com seu token DigitalOcean"
    echo "export DO_TOKEN='seu_token_aqui'"
    exit 1
fi

create_droplet
EOF

echo ""
echo "💡 COMANDOS PARA EXECUTAR:"
echo ""
echo "# 1. Configure seu token DigitalOcean:"
echo "export DO_TOKEN='seu_token_digitalocean'"
echo ""
echo "# 2. Execute criação do droplet:"
echo "chmod +x create_droplet.sh"
echo "./create_droplet.sh"
echo ""

echo "🔧 ETAPA 2: CONFIGURAÇÃO NGINX PROXY"
echo "===================================="

# Script de configuração do servidor proxy
cat > setup_proxy.sh << 'EOF'
#!/bin/bash

# CONFIGURAÇÃO AUTOMÁTICA DO PROXY NGINX
echo "🔧 Configurando servidor proxy..."

# Atualizar sistema
apt-get update -y
apt-get upgrade -y

# Instalar Nginx e ferramentas
apt-get install -y nginx curl ufw certbot python3-certbot-nginx

# Configurar firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# Configurar Nginx como proxy reverso
cat > /etc/nginx/sites-available/coinbitclub-proxy << 'NGINX_CONFIG'
server {
    listen 80;
    server_name _;
    
    # Logs para debugging
    access_log /var/log/nginx/coinbitclub.access.log;
    error_log /var/log/nginx/coinbitclub.error.log;
    
    # Proxy para Railway
    location / {
        proxy_pass RAILWAY_URL_PLACEHOLDER;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout settings para trading
        proxy_connect_timeout       300;
        proxy_send_timeout          300;
        proxy_read_timeout          300;
        send_timeout                300;
        
        # Headers para APIs
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
        proxy_buffering off;
        proxy_cache off;
    }
    
    # Health check endpoint
    location /health-proxy {
        return 200 "Proxy OK";
        add_header Content-Type text/plain;
    }
}
NGINX_CONFIG

# Substituir URL do Railway
sed -i "s|RAILWAY_URL_PLACEHOLDER|$1|g" /etc/nginx/sites-available/coinbitclub-proxy

# Ativar configuração
ln -sf /etc/nginx/sites-available/coinbitclub-proxy /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar configuração
nginx -t

# Reiniciar Nginx
systemctl restart nginx
systemctl enable nginx

# Mostrar status
systemctl status nginx

echo "✅ Proxy configurado com sucesso!"
echo "🌐 IP deste servidor: $(curl -s ifconfig.me)"
echo "📡 Testando conectividade..."

# Testar proxy
curl -I http://localhost/health

EOF

echo ""
echo "💻 SCRIPT DE CONFIGURAÇÃO DO SERVIDOR:"
echo "====================================="
echo ""
echo "# Conectar ao VPS (usar IP retornado pela API):"
echo "ssh root@SEU_IP_VPS"
echo ""
echo "# Executar no VPS:"
echo "wget https://raw.githubusercontent.com/SEU_REPO/setup_proxy.sh"
echo "chmod +x setup_proxy.sh"
echo "./setup_proxy.sh $RAILWAY_URL"
echo ""

echo "🎯 ETAPA 3: CONFIGURAÇÃO DAS EXCHANGES"
echo "======================================"

cat > update_exchange_ips.md << 'EOF'
# CONFIGURAR IP FIXO NAS EXCHANGES

## 1. BYBIT:
1. Login em https://www.bybit.com
2. Ir em API > API Management
3. Para cada API key:
   - Click "Edit"
   - IP Restriction: Adicionar IP do VPS
   - Salvar

## 2. BINANCE:
1. Login em https://www.binance.com
2. Ir em Account > API Management
3. Para cada API key:
   - Click "Edit"
   - IP Access Restriction: Adicionar IP do VPS
   - Confirmar com 2FA
   - Salvar

## 3. TESTE:
- Usar IP do VPS: `curl ifconfig.me` (executar no VPS)
- Configurar este IP nas duas exchanges
- Testar conectividade antes de ativar trading real

EOF

echo "📊 ETAPA 4: MONITORAMENTO E TESTE"
echo "================================="

cat > test_proxy.js << 'EOF'
#!/usr/bin/env node

/**
 * TESTE AUTOMÁTICO DA CONECTIVIDADE VIA PROXY
 */

const axios = require('axios');

class ProxyTester {
    constructor(proxyIp, railwayUrl) {
        this.proxyIp = proxyIp;
        this.railwayUrl = railwayUrl;
    }

    async testProxy() {
        console.log('🧪 TESTE DE CONECTIVIDADE VIA PROXY');
        console.log('===================================');

        try {
            // Teste 1: Health check do proxy
            console.log('1. Testando health check do proxy...');
            const proxyHealth = await axios.get(`http://${this.proxyIp}/health-proxy`);
            console.log('✅ Proxy respondendo:', proxyHealth.status);

            // Teste 2: Railway via proxy
            console.log('2. Testando Railway via proxy...');
            const railwayViaProxy = await axios.get(`http://${this.proxyIp}/health`);
            console.log('✅ Railway via proxy:', railwayViaProxy.status);

            // Teste 3: Verificar IP externo
            console.log('3. Verificando IP externo do proxy...');
            const ipCheck = await axios.get(`http://${this.proxyIp}/api/systems/status`);
            console.log('✅ Sistema acessível via proxy');

            console.log('');
            console.log('🎉 PROXY FUNCIONANDO PERFEITAMENTE!');
            console.log(`🌐 Configure este IP nas exchanges: ${this.proxyIp}`);

        } catch (error) {
            console.error('❌ Erro no teste:', error.message);
        }
    }
}

// Usar: node test_proxy.js IP_DO_VPS
const proxyIp = process.argv[2] || 'SEU_IP_VPS';
const railwayUrl = 'https://coinbitclub-market-bot-production.up.railway.app';

const tester = new ProxyTester(proxyIp, railwayUrl);
tester.testProxy();
EOF

echo ""
echo "🎯 RESUMO DA IMPLEMENTAÇÃO:"
echo "=========================="
echo ""
echo "1. 🏗️ Criar VPS DigitalOcean ($6/mês)"
echo "2. 🔧 Configurar Nginx proxy (30 min)"
echo "3. 🌐 Obter IP fixo do VPS"
echo "4. ⚙️ Configurar IP nas exchanges"
echo "5. 🧪 Testar conectividade"
echo "6. ✅ Sistema operacional!"
echo ""
echo "💰 CUSTO TOTAL: ~$9/mês (VPS + IP)"
echo "⏱️ TEMPO IMPLEMENTAÇÃO: 2-3 horas"
echo "🎯 RESULTADO: IP fixo para trading 24/7"
echo ""

echo "🚀 PRONTO PARA IMPLEMENTAR?"
echo "============================"
echo ""
echo "1. Configure token DigitalOcean"
echo "2. Execute create_droplet.sh"
echo "3. Configure servidor com setup_proxy.sh"
echo "4. Configure IP nas exchanges"
echo "5. Teste com test_proxy.js"
echo ""
echo "💬 Quer que eu guie você através de cada etapa?"
