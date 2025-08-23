#!/bin/bash

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
echo "📡 Criando droplet coinbitclub-proxy..."
RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $DO_TOKEN" \
    -d '{
        "name": "coinbitclub-proxy",
        "region": "nyc3",
        "size": "s-1vcpu-1gb",
        "image": "ubuntu-22-04-x64",
        "ssh_keys": [],
        "backups": false,
        "ipv6": false,
        "monitoring": true,
        "tags": ["coinbitclub", "proxy", "trading"]
    }' \
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
IP_RESPONSE=$(curl -s -H "Authorization: Bearer $DO_TOKEN" \
    "https://api.digitalocean.com/v2/droplets/$DROPLET_ID")

DROPLET_IP=$(echo $IP_RESPONSE | grep -o '"ip":"[^"]*' | cut -d'"' -f4)

echo "🌐 IP do droplet: $DROPLET_IP"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "1. Conectar: ssh root@$DROPLET_IP"
echo "2. Executar configuração:"
echo "   curl -O https://raw.githubusercontent.com/coinbitclub/setup-proxy.sh"
echo "   chmod +x setup-proxy.sh"
echo "   ./setup-proxy.sh https://coinbitclub-backend.railway.app"
echo ""
echo "💾 Salvando informações..."
echo "DROPLET_ID=$DROPLET_ID" > droplet_info.txt
echo "DROPLET_IP=$DROPLET_IP" >> droplet_info.txt
echo "RAILWAY_URL=https://coinbitclub-backend.railway.app" >> droplet_info.txt

echo "✅ VPS criado! IP: $DROPLET_IP"