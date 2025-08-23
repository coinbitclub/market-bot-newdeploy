#!/usr/bin/env node
/**
 * 🧹 LIMPEZA DE VARIÁVEIS DE AMBIENTE DO DEPLOY
 * Remove variáveis sensíveis e organiza o ambiente
 */

const fs = require('fs');

console.log('🧹 LIMPEZA DE VARIÁVEIS DE AMBIENTE DO DEPLOY');
console.log('============================================');

async function limparVariaveisEnv() {
    console.log('\n1️⃣ VERIFICANDO ARQUIVO .env...');
    
    if (!fs.existsSync('.env')) {
        console.log('   ❌ Arquivo .env não encontrado');
        return;
    }
    
    // Ler conteúdo atual
    let envContent = fs.readFileSync('.env', 'utf8');
    console.log('   ✅ Arquivo .env carregado');
    
    console.log('\n2️⃣ REMOVENDO VARIÁVEIS SENSÍVEIS...');
    
    // Lista de variáveis para remover do deploy
    const variaveisParaRemover = [
        'BINANCE_TESTNET_API_KEYYOUR_API_KEY_HEREBINANCE_TESTNET_API_SECRET',
        'BYBIT_TESTNET_API_KEYYOUR_API_KEY_HEREBYBIT_TESTNET_API_SECRET',
        'BINANCE_MANAGEMENT_API_KEYYOUR_API_KEY_HEREBINANCE_MANAGEMENT_API_SECRET',
        'BYBIT_MANAGEMENT_API_KEYYOUR_API_KEY_HEREBYBIT_MANAGEMENT_API_SECRET',
        'OPENAI_API_KEYYOUR_API_KEY_HERECOINSTATS_API_KEYYOUR_API_KEY_HERENGROK_AUTH_TOKEN',
        'JWT_SECRET',
        'ENCRYPTION_KEY',
        'WEBHOOK_SECRET'
    ];
    
    let linhasRemovidas = 0;
    let envLimpo = envContent.split('\n').filter(linha => {
        const deveRemover = variaveisParaRemover.some(variavel => 
            linha.startsWith(variavel + '=')
        );
        
        if (deveRemover) {
            console.log(`   🗑️ Removendo: ${linha.split('=')[0]}`);
            linhasRemovidas++;
            return false;
        }
        return true;
    }).join('\n');
    
    console.log(`   ✅ ${linhasRemovidas} variáveis removidas`);
    
    console.log('\n3️⃣ CRIANDO .env PARA PRODUÇÃO...');
    
    // Adicionar apenas variáveis seguras para produção
    const envProducao = `# ====================================================================
# COINBITCLUB PRODUCTION ENVIRONMENT - CLEAN VERSION
# ====================================================================

# DATABASE (Railway Production)
DATABASE_URL=postgresql://postgres:FDjupFGvAzzwbuZMRyVxlJBXsQtphlHv@maglev.proxy.rlwy.net:42095/railway

# SYSTEM CONFIGURATION
NODE_ENV=production
PORT=3000
ENABLE_REAL_TRADING=true

# BUSINESS RULES
MIN_BALANCE_BRAZIL_BRL=100
MIN_BALANCE_FOREIGN_USD=20

# COMMISSION RATES
COMMISSION_MONTHLY_BRAZIL=10
COMMISSION_MONTHLY_FOREIGN=10
COMMISSION_PREPAID_BRAZIL=20
COMMISSION_PREPAID_FOREIGN=20
AFFILIATE_NORMAL_RATE=1.5
AFFILIATE_VIP_RATE=5.0

# TRADING PARAMETERS
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

# SECURITY
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# LOGS
LOG_LEVEL=info
ENABLE_DETAILED_LOGS=true
ANALYTICS_ENABLED=true
PRODUCTION_MODE=true

# RAILWAY DEPLOYMENT
RAILWAY_ENVIRONMENT=production
RAILWAY_PROJECT_NAME=coinbitclub-market-bot
RAILWAY_SERVICE_NAME=backend

# TRADING SAFETY
POSITION_SAFETY_ENABLED=true
MANDATORY_STOP_LOSS=true
MANDATORY_TAKE_PROFIT=true

# =================================================================
# NOTA: VARIÁVEIS SENSÍVEIS DEVEM SER CONFIGURADAS NO RAILWAY:
# - OPENAI_API_KEY
# - COINSTATS_API_KEY  
# - JWT_SECRET
# - ENCRYPTION_KEY
# - WEBHOOK_SECRET
# =================================================================
`;

    // Salvar versão limpa
    fs.writeFileSync('.env.production', envProducao);
    console.log('   ✅ Arquivo .env.production criado');
    
    console.log('\n4️⃣ CRIANDO TEMPLATE PARA RAILWAY...');
    
    const railwayTemplate = `# VARIÁVEIS PARA CONFIGURAR NO RAILWAY
# ===================================

# APIs Externas (OBRIGATÓRIAS)
OPENAI_API_KEY=sk-proj-...
COINSTATS_API_KEY=ZFIxigBcVaCyXDL1Qp...

# Segurança (OBRIGATÓRIAS)
JWT_SECRET=coinbitclub-production-jwt-secret-ultra-secure-2025
ENCRYPTION_KEY=coinbitclub-encrypt-key-32-chars-123
WEBHOOK_SECRET=coinbitclub-webhook-secret-production-2025

# Exchanges (OPCIONAL - usar chaves do banco se não configurar)
BINANCE_API_KEY=
BINANCE_API_SECRET=
BYBIT_API_KEY=
BYBIT_API_SECRET=

# Stripe (QUANDO IMPLEMENTAR PAGAMENTOS)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# NGROK (PARA IP FIXO - OPCIONAL)
NGROK_AUTH_TOKEN=
NGROK_REGION=us
NGROK_SUBDOMAIN=coinbitclub-bot
`;

    fs.writeFileSync('railway-env-template.txt', railwayTemplate);
    console.log('   ✅ Template railway-env-template.txt criado');
    
    console.log('\n5️⃣ CRIANDO BACKUP DO .env ORIGINAL...');
    
    fs.writeFileSync('.env.backup', envContent);
    console.log('   ✅ Backup salvo em .env.backup');
    
    console.log('\n6️⃣ ATUALIZANDO .gitignore...');
    
    let gitignoreContent = '';
    if (fs.existsSync('.gitignore')) {
        gitignoreContent = fs.readFileSync('.gitignore', 'utf8');
    }
    
    const gitignoreItems = [
        '.env',
        '.env.local',
        '.env.backup',
        '.env.production',
        'railway-env-template.txt',
        'node_modules/',
        '*.log',
        'logs/',
        'temp/',
        '.DS_Store'
    ];
    
    gitignoreItems.forEach(item => {
        if (!gitignoreContent.includes(item)) {
            gitignoreContent += `\n${item}`;
        }
    });
    
    fs.writeFileSync('.gitignore', gitignoreContent);
    console.log('   ✅ .gitignore atualizado');
}

async function main() {
    await limparVariaveisEnv();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ LIMPEZA CONCLUÍDA COM SUCESSO!');
    console.log('='.repeat(50));
    
    console.log('\n📋 ARQUIVOS CRIADOS:');
    console.log('   📄 .env.production - Versão limpa para produção');
    console.log('   📄 .env.backup - Backup do arquivo original');
    console.log('   📄 railway-env-template.txt - Template para Railway');
    console.log('   📄 .gitignore - Atualizado');
    
    console.log('\n🚀 PRÓXIMOS PASSOS:');
    console.log('1. Usar .env.production localmente se necessário');
    console.log('2. Configurar variáveis sensíveis no Railway dashboard');
    console.log('3. Usar railway-env-template.txt como referência');
    console.log('4. Nunca fazer commit de chaves reais');
    
    console.log('\n⚠️ IMPORTANTE:');
    console.log('   • .env original foi preservado em .env.backup');
    console.log('   • Variáveis sensíveis removidas da versão de produção');
    console.log('   • Configure chaves reais apenas no Railway');
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { limparVariaveisEnv };
