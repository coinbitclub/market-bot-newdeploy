/**
 * 🚀 COINBITCLUB MARKETBOT - PHASE 4 STARTER
 * 
 * Script para iniciar o sistema Phase 4 em modo desenvolvimento
 * com todas as funcionalidades de configuração centralizada
 */

const path = require('path');
const fs = require('fs');

// Carregar variáveis de ambiente de desenvolvimento
function loadDevelopmentEnv() {
    const envFile = path.join(__dirname, '.env.development');
    
    if (fs.existsSync(envFile)) {
        const envContent = fs.readFileSync(envFile, 'utf8');
        
        envContent.split('\n').forEach(line => {
            line = line.trim();
            
            // Ignorar comentários e linhas vazias
            if (line && !line.startsWith('#')) {
                const [key, ...valueParts] = line.split('=');
                if (key && valueParts.length) {
                    const value = valueParts.join('=');
                    process.env[key.trim()] = value.trim();
                }
            }
        });
        
        console.log('✅ Variáveis de ambiente de desenvolvimento carregadas');
    } else {
        console.log('⚠️ Arquivo .env.development não encontrado');
    }
}

// Carregar ENV primeiro
loadDevelopmentEnv();

// Importar e iniciar a aplicação Phase 4
const { EnterpriseAppPhase4 } = require('./app-phase4');

async function startPhase4Development() {
    console.log('🚀 INICIANDO COINBITCLUB MARKETBOT - PHASE 4 DEVELOPMENT');
    console.log('═'.repeat(70));
    
    try {
        const app = new EnterpriseAppPhase4();
        await app.start();
        
        console.log('\n✅ SISTEMA ENTERPRISE PHASE 4 PRONTO!');
        console.log('🔧 FUNCIONALIDADES AVANÇADAS ATIVAS:');
        console.log('   🛡️  Security     - Rate limiting, CORS, Helmet');
        console.log('   🎛️  Features     - Feature flags dinâmicos');
        console.log('   🔒 Secrets      - Gerenciamento seguro de chaves');
        console.log('   📊 Monitoring   - Alertas e métricas avançadas');
        console.log('');
        console.log('📍 ENDPOINTS PHASE 4:');
        console.log('   🏠 GET  /              - Sistema info');
        console.log('   ❤️  GET  /health        - Health check avançado');
        console.log('   📊 GET  /metrics       - Métricas detalhadas');
        console.log('   🎛️  GET  /features      - Feature flags status');
        console.log('   🚨 GET  /alerts        - Sistema de alertas');
        console.log('   🔐 GET  /config        - Configurações (dev only)');
        console.log('   🛡️  GET  /security-status - Status de segurança');
        console.log('   💰 POST /api/trading/order - Trading (com feature flag)');
        console.log('   🔑 POST /api/auth/login    - Login (rate limited)');
        console.log('   📈 GET  /api/data/:symbol  - Dados de mercado');
        console.log('═'.repeat(70));
        
    } catch (error) {
        console.error('❌ Erro ao iniciar Phase 4:', error.message);
        process.exit(1);
    }
}

// Iniciar em modo Phase 4
startPhase4Development();
