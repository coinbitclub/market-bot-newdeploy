/**
 * 🚀 COINBITCLUB MARKETBOT - DEVELOPMENT STARTER
 * 
 * Script para iniciar o sistema em modo desenvolvimento
 * com carregamento automático das variáveis de ambiente
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

// Importar e iniciar a aplicação
const { EnterpriseApp } = require('./app');

async function startDevelopment() {
    console.log('🚀 INICIANDO COINBITCLUB MARKETBOT - MODO DESENVOLVIMENTO');
    console.log('═'.repeat(60));
    
    try {
        const app = new EnterpriseApp();
        await app.start();
        
        console.log('\n✅ SISTEMA ENTERPRISE PRONTO PARA DESENVOLVIMENTO!');
        console.log('📍 Endpoints disponíveis:');
        console.log('   🏠 GET  /           - Informações do sistema');
        console.log('   ❤️  GET  /health     - Health check');
        console.log('   📊 GET  /metrics    - Métricas de performance');
        console.log('═'.repeat(60));
        
    } catch (error) {
        console.error('❌ Erro ao iniciar modo desenvolvimento:', error.message);
        process.exit(1);
    }
}

// Iniciar em modo desenvolvimento
startDevelopment();
