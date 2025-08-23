/**
 * 🚀 SCRIPT DE INICIALIZAÇÃO - SISTEMA DE AFILIAÇÃO
 * ==============================================
 */

const fs = require('fs');
const path = require('path');

async function initializeAffiliateSystem() {
    console.log('🚀 Inicializando Sistema de Afiliação...');
    
    try {
        // Carregar configuração
        const configPath = path.join(__dirname, 'affiliate-system-config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        console.log('✅ Configuração carregada');
        console.log('✅ Sistema de afiliação inicializado com sucesso!');
        
        return config;
    } catch (error) {
        console.error('❌ Erro ao inicializar sistema:', error.message);
        throw error;
    }
}

if (require.main === module) {
    initializeAffiliateSystem()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { initializeAffiliateSystem };