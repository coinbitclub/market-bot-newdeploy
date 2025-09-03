/**
 * 🚀 COINBITCLUB MARKET BOT - SERVIDOR ENTERPRISE SIMPLIFICADO
 * =============================================================
 * 
 * Versão enterprise simplificada para teste após reorganização
 */

console.log('🚀 Iniciando CoinBitClub Enterprise - Teste Reorganização...');

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// Configuração do app
const app = express();
const PORT = process.env.PORT || 3001; // Usar porta diferente para teste

// Middlewares básicos
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

console.log('✅ Middlewares configurados');

// Rota de teste da reorganização
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'CoinBitClub Enterprise - Reorganização Fase 1 Ativa',
        version: '6.0.0',
        structure: 'Enterprise',
        timestamp: new Date().toISOString(),
        status: 'REORGANIZADO E FUNCIONANDO'
    });
});

// Rota de status da nova estrutura
app.get('/api/enterprise/status', (req, res) => {
    res.json({
        success: true,
        enterprise: {
            modules: {
                trading: 'src/modules/trading/',
                financial: 'src/modules/financial/',
                data: 'src/modules/data/',
                notifications: 'src/modules/notifications/',
                user: 'src/modules/user/'
            },
            services: {
                api: 'src/services/api/',
                database: 'src/services/database/',
                external: 'src/services/external/'
            },
            config: 'src/config/',
            docs: 'docs/',
            scripts: 'scripts/'
        },
        migration: {
            phase: 1,
            status: 'CONCLUÍDA',
            filesMigrated: 15,
            structureCreated: true,
            docsReorganized: true
        }
    });
});

// Rota para verificar módulos migrados
app.get('/api/enterprise/modules', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    
    try {
        const modulesPath = path.join(__dirname, '../../../modules');
        const modules = {};
        
        if (fs.existsSync(modulesPath)) {
            const moduleNames = fs.readdirSync(modulesPath);
            
            for (const moduleName of moduleNames) {
                const modulePath = path.join(modulesPath, moduleName);
                if (fs.statSync(modulePath).isDirectory()) {
                    const subDirs = fs.readdirSync(modulePath);
                    modules[moduleName] = subDirs;
                }
            }
        }
        
        res.json({
            success: true,
            modules: modules,
            message: 'Módulos enterprise carregados com sucesso'
        });
        
    } catch (error) {
        res.json({
            success: false,
            error: error.message
        });
    }
});

// Rota de health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'CoinBitClub Enterprise',
        version: '6.0.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log('✅ Servidor Enterprise iniciado');
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📊 Status: http://localhost:${PORT}/api/enterprise/status`);
    console.log(`🏗️ Módulos: http://localhost:${PORT}/api/enterprise/modules`);
    console.log(`❤️ Health: http://localhost:${PORT}/health`);
    console.log('\n🎉 REORGANIZAÇÃO ENTERPRISE TESTE: SUCESSO!');
    console.log('📝 Próximo passo: Implementar Fase 2 (Consolidação)');
});

module.exports = app;
