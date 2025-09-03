/**
 * 🔧 INTEGRAÇÃO DO ENTERPRISE v6.0.0 NO APP.JS
 * Atualizar app.js para usar dados reais do Enterprise
 */

const fs = require('fs');
const path = require('path');

function integrarEnterpriseNoApp() {
    console.log('🔧 INTEGRANDO ENTERPRISE v6.0.0 NO APP.JS...');
    
    try {
        const appPath = path.join(__dirname, 'app.js');
        let appContent = fs.readFileSync(appPath, 'utf8');
        
        // Verificar se já tem a integração
        if (appContent.includes('enterpriseSystem')) {
            console.log('✅ Enterprise já integrado no app.js');
            return;
        }
        
        // Importar endpoint corrigido
        const endpointImport = `
const { getAnaliseIAReal } = require('./dashboard-ia-endpoint-fixed');
`;
        
        // Adicionar após as importações existentes
        const importIndex = appContent.indexOf('require(\'dotenv\').config();');
        if (importIndex !== -1) {
            const insertPoint = appContent.indexOf('\n', importIndex) + 1;
            appContent = appContent.slice(0, insertPoint) + endpointImport + appContent.slice(insertPoint);
        }
        
        // Criar novo método para o endpoint
        const novoMetodo = `
    // ✅ ENDPOINT CORRIGIDO PARA ENTERPRISE v6.0.0
    async getAnaliseIAReal(req, res) {
        return getAnaliseIAReal(req, res, enterpriseSystem, this.pool);
    }
`;
        
        // Procurar onde adicionar o método
        const classIndex = appContent.indexOf('class AppServer');
        if (classIndex !== -1) {
            // Encontrar o final da classe
            const endClassIndex = appContent.lastIndexOf('}');
            appContent = appContent.slice(0, endClassIndex) + novoMetodo + '\n' + appContent.slice(endClassIndex);
        }
        
        // Salvar arquivo atualizado
        fs.writeFileSync(appPath, appContent);
        console.log('✅ App.js integrado com Enterprise v6.0.0');
        
    } catch (error) {
        console.error('❌ Erro na integração:', error.message);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    integrarEnterpriseNoApp();
}

module.exports = { integrarEnterpriseNoApp };
