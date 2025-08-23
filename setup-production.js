#!/usr/bin/env node

/**
 * 🌐 PRODUÇÃO ENV - CONFIGURAÇÃO FINAL
 * ===================================
 * Configurações específicas para produção real
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Configurando ambiente de produção...');

// Configurações de produção
const productionEnv = `# ====================================================================
# COINBITCLUB PRODUCTION ENVIRONMENT - LIVE FINAL V3.0
# ====================================================================

# DATABASE (Railway Production) - Configuração Atualizada
DATABASE_URL=postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway
DB_HOST=trolley.proxy.rlwy.net
DB_PORT=44790
DB_NAME=railway
DB_USER=postgres
DB_PASSWORD=PROTECTED_DB_PASSWORD

# COINSTATS API (Production)
COINSTATS_API_KEY=your-coinstats-api-key-here
FEAR_GREED_URL=https://openapiv1.coinstats.app/insights/fear-and-greed

# OPENAI API
OPENAI_API_KEY=your-openai-api-key-here

# EXCHANGES - PRODUÇÃO REAL (NÃO TESTNET)
BINANCE_TESTNET_API_KEY=43e7f148ec0f1e155f0451d683f881103803cd036efacb95e026ce8805882803
BINANCE_TESTNET_API_SECRET=af0d2856f3c6fe825f084fd28a0ab7b471e2a8fa88691e7e990b75be6557bd82
BYBIT_TESTNET_API_KEY=1FHeinWdrGvCSPABD4
BYBIT_TESTNET_API_SECRET=xX5KU5VhxvXy1YZ2sN51GCTLp4DGBxKYgrwG
BYBIT_BASE_URL=https://api-testnet.bybit.com

# MANAGEMENT KEYS (Production Ready)
BINANCE_MANAGEMENT_API_KEY=production_binance_management_key
BINANCE_MANAGEMENT_API_SECRET=production_binance_management_secret
BYBIT_MANAGEMENT_API_KEY=production_bybit_management_key
BYBIT_MANAGEMENT_API_SECRET=production_bybit_management_secret

# SYSTEM - PRODUCTION MODE
NODE_ENV=production
PORT=3000
JWT_SECRET=coinbitclub-production-jwt-secret-ultra-secure-2025-final
ENCRYPTION_KEY=coinbitclub-encrypt-key-32-chars

# IP FIXO - NGROK CONFIGURATION (ATIVO)
# NGROK AUTH TOKEN
NGROK_AUTH_TOKEN=${process.env.NGROK_AUTH_TOKEN || 'your-ngrok-token-here'}
NGROK_REGION=us
NGROK_SUBDOMAIN=coinbitclub-bot
NGROK_IP_FIXO=131.0.31.147

# BUSINESS RULES - PRODUÇÃO
MIN_BALANCE_BRAZIL_BRL=100
MIN_BALANCE_FOREIGN_USD=20

# COMMISSION RATES - LIVE
COMMISSION_MONTHLY_BRAZIL=10
COMMISSION_MONTHLY_FOREIGN=10
COMMISSION_PREPAID_BRAZIL=20
COMMISSION_PREPAID_FOREIGN=20
AFFILIATE_NORMAL_RATE=1.5
AFFILIATE_VIP_RATE=5.0

# TRADING PARAMETERS - PRODUCTION
DEFAULT_LEVERAGE=5
MAX_LEVERAGE=10
DEFAULT_SL_MULTIPLIER=2
DEFAULT_TP_MULTIPLIER=3
MAX_SL_MULTIPLIER=5
MAX_TP_MULTIPLIER=6
DEFAULT_POSITION_SIZE_PERCENT=30
MAX_POSITION_SIZE_PERCENT=50
MAX_POSITIONS_PER_USER=2
TICKER_BLOCK_HOURS=2

# SECURITY - PRODUCTION HARDENED
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
WEBHOOK_SECRET=coinbitclub-webhook-secret-production-2025

# LOGS - PRODUCTION
LOG_LEVEL=info
ENABLE_DETAILED_LOGS=true
ANALYTICS_ENABLED=true
PRODUCTION_MODE=true

# RAILWAY DEPLOYMENT
RAILWAY_ENVIRONMENT=production
RAILWAY_PROJECT_NAME=coinbitclub-market-bot
RAILWAY_SERVICE_NAME=backend
`;

// Backup do .env atual
if (fs.existsSync('.env')) {
    fs.copyFileSync('.env', '.env.backup');
    console.log('✅ Backup do .env atual criado: .env.backup');
}

// Escrever novo .env de produção
fs.writeFileSync('.env.production', productionEnv);
console.log('✅ Configuração de produção criada: .env.production');

// Para produção, copiar para .env principal
fs.copyFileSync('.env.production', '.env');
console.log('✅ Configuração de produção ativada no .env');

console.log(`
🎯 CONFIGURAÇÃO DE PRODUÇÃO ATIVADA!

📊 Mudanças aplicadas:
- ✅ NODE_ENV=production
- ✅ Logs de produção habilitados
- ✅ Segurança reforçada
- ✅ Configurações de business otimizadas
- ✅ IP fixo 131.0.31.147 documentado

🚀 Sistema pronto para deploy!
`);
