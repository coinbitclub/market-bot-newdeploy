#!/bin/bash
# 🇱🇹 DEPLOY SIMPLIFICADO COINBITCLUB ENTERPRISE
# ============================================================================

echo "🇱🇹 ========================================================"
echo "   COINBITCLUB ENTERPRISE - DEPLOY VPS HOSTINGER"
echo "   Servidor: 31.97.72.77 | Lituânia"
echo "   Versão: 6.0.0"
echo "========================================================"
echo

# Variáveis
VPS_IP="31.97.72.77"
VPS_USER="root"

echo "📦 Pacote criado: coinbitclub-enterprise-v6.tar.gz"
echo "📊 Tamanho: $(ls -lh coinbitclub-enterprise-v6.tar.gz | awk '{print $5}')"
echo

echo "🔗 Para conectar ao servidor e fazer o deploy:"
echo "================================"
echo
echo "1️⃣ CONECTAR AO SERVIDOR:"
echo "ssh $VPS_USER@$VPS_IP"
echo
echo "2️⃣ FAZER UPLOAD DO PACOTE:"
echo "scp coinbitclub-enterprise-v6.tar.gz $VPS_USER@$VPS_IP:/opt/"
echo
echo "3️⃣ OU usar o comando de deploy direto:"
echo "bash -c 'curl -fsSL https://raw.githubusercontent.com/coinbitclub/market-bot-newdeploy/main/deploy-remote.sh | bash'"
echo
echo "================================"
echo

# Verificar conectividade
echo "🔍 Testando conectividade com o servidor..."
if ping -n 1 31.97.72.77 > nul 2>&1; then
    echo "✅ Servidor acessível"
else
    echo "❌ Servidor não acessível - verifique sua conexão"
fi

echo
echo "📋 PRÓXIMOS PASSOS MANUAIS:"
echo "============================"
echo "1. Conecte ao servidor: ssh root@31.97.72.77"
echo "2. Execute o script de deploy automático"
echo "3. Ou siga o guia: DEPLOY-MANUAL-HOSTINGER.md"
echo
echo "🌐 Após o deploy, acesse:"
echo "- Aplicação: http://31.97.72.77"
echo "- API Status: http://31.97.72.77/api/enterprise/status"
echo "- Webhook TradingView: http://31.97.72.77/api/enterprise/trading/webhooks/signal"
echo
