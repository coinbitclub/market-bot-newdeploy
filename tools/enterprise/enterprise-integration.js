/**
 * INTEGRAÇÃO ENTERPRISE PARA APP.JS
 * CoinBitClub Market Bot v6.0.0 Enterprise
 * 
 * Adicionar estas linhas ao app.js principal para integrar o sistema enterprise
 */

// ============================================
// 1. IMPORTAÇÕES (adicionar no topo do app.js)
// ============================================

const EnterpriseAPIs = require('./backend/enterprise-apis.js');
const EnterpriseUserManager = require('./backend/enterprise-user-manager.js');
const EnterpriseSubscriptionManager = require('./backend/enterprise-subscription-manager.js');

// ============================================
// 2. INICIALIZAÇÃO (adicionar no constructor)
// ============================================

// Inicializar sistema enterprise
this.enterpriseAPIs = new EnterpriseAPIs();
this.enterpriseUserManager = new EnterpriseUserManager();
this.enterpriseSubscriptionManager = new EnterpriseSubscriptionManager();

console.log('🚀 Sistema Enterprise v6.0.0 inicializado');

// ============================================
// 3. ROTAS (adicionar no setupRoutes())
// ============================================

// Integrar APIs enterprise
this.app.use('/api/enterprise', this.enterpriseAPIs.getRouter());

// Rota de status enterprise
this.app.get('/enterprise/status', async (req, res) => {
    try {
        // Verificar status dos componentes enterprise
        const [profileStats, subscriptionStats] = await Promise.all([
            this.enterpriseUserManager.getProfileStatistics(),
            this.enterpriseSubscriptionManager.getSubscriptionStatistics()
        ]);

        res.json({
            status: 'ENTERPRISE SYSTEM ONLINE',
            version: '6.0.0',
            timestamp: new Date().toISOString(),
            profileStatistics: profileStats,
            subscriptionStatistics: subscriptionStats,
            features: [
                'Sistema de Perfis Enterprise',
                'Integração Twilio SMS/OTP',
                'Pagamentos Stripe',
                'Sistema de Comissões',
                'Multi-níveis de Usuário',
                'Dashboard Administrativo'
            ]
        });
    } catch (error) {
        console.error('❌ Erro no status enterprise:', error.message);
        res.status(503).json({
            status: 'ENTERPRISE ERROR',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ============================================
// 4. MIDDLEWARE DE AUTENTICAÇÃO ENTERPRISE
// ============================================

// Middleware para verificar se usuário tem perfil enterprise válido
this.app.use('/api/protected', async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Token de acesso requerido' });
        }

        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verificar se usuário tem perfil enterprise
        const userProfile = await this.enterpriseUserManager.getUserProfile(decoded.id);
        
        if (!userProfile || !userProfile.dados_validados) {
            return res.status(403).json({ 
                error: 'Perfil enterprise não validado',
                requiresValidation: true
            });
        }

        req.user = decoded;
        req.enterpriseProfile = userProfile;
        next();

    } catch (error) {
        res.status(403).json({ error: 'Token inválido ou perfil não encontrado' });
    }
});

// ============================================
// 5. HEALTH CHECK ENTERPRISE (adicionar no health check existente)
// ============================================

// Modificar o health check existente para incluir enterprise
this.app.get('/health', async (req, res) => {
    try {
        // Health check básico existente
        const basicHealth = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime()),
            version: '6.0.0 Enterprise',
            environment: process.env.NODE_ENV || 'production'
        };

        // Adicionar verificações enterprise
        let enterpriseHealth = {};
        
        try {
            // Testar conexão enterprise
            const profileStats = await this.enterpriseUserManager.getProfileStatistics();
            enterpriseHealth = {
                enterprise: 'healthy',
                totalProfiles: profileStats.total,
                activeSubscriptions: profileStats.activeSubscriptions || 0
            };
        } catch (enterpriseError) {
            enterpriseHealth = {
                enterprise: 'degraded',
                error: enterpriseError.message
            };
        }

        res.status(200).json({
            ...basicHealth,
            ...enterpriseHealth
        });

    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

// ============================================
// 6. LOGS ENTERPRISE (adicionar no constructor)
// ============================================

// Enhanced logging para enterprise
this.app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const isEnterprise = req.path.startsWith('/api/enterprise');
    const logPrefix = isEnterprise ? '🏢 ENTERPRISE' : '📊 TRADING';
    
    console.log(`${timestamp} ${logPrefix} ${req.method} ${req.path} - ${req.ip}`);
    
    // Log especial para operações críticas enterprise
    if (isEnterprise && ['POST', 'PUT', 'DELETE'].includes(req.method)) {
        console.log(`🔐 Enterprise Operation: ${req.method} ${req.path} from ${req.ip}`);
    }
    
    next();
});

module.exports = {
    EnterpriseAPIs,
    EnterpriseUserManager,
    EnterpriseSubscriptionManager
};
