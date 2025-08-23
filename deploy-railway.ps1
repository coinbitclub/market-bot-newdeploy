# ====================================================================
# DEPLOY RAILWAY - COINBITCLUB TRADING BOT DASHBOARD
# ====================================================================

echo "🚀 DEPLOYANDO COINBITCLUB DASHBOARD NO RAILWAY..."
echo "=================================================="

# 1. Verificar se Railway CLI está instalado
echo "📦 Verificando Railway CLI..."
if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
    echo "❌ Railway CLI não encontrado. Instalando..."
    npm install -g @railway/cli
}

# 2. Login no Railway (se necessário)
echo "🔐 Verificando autenticação Railway..."
railway status

# 3. Configurar variáveis de ambiente no Railway
echo "⚙️ Configurando variáveis de ambiente..."
railway variables set DATABASE_URL="postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway"
railway variables set NODE_ENV="production"
railway variables set PORT="3000"

# 4. Deploy da aplicação
echo "🚀 Iniciando deploy..."
railway up

echo "✅ Deploy finalizado!"
echo "🌐 Aguarde alguns minutos para o dashboard ficar disponível"
echo "📊 O link será exibido após o deploy completo"
