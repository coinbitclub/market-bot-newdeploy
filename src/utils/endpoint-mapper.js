#!/usr/bin/env node

/**
 * 🗺️ MAPEAMENTO COMPLETO DE ENDPOINTS
 * ==================================
 * 
 * Analisa todos os endpoints do sistema e suas dependências de banco de dados
 */

const fs = require('fs');
const path = require('path');

class EndpointMapper {
    constructor() {
        this.endpoints = new Map();
        this.databaseDependencies = new Map();
        this.backendPath = __dirname;
    }

    async mapAllEndpoints() {
        console.log('🗺️ MAPEAMENTO COMPLETO DE ENDPOINTS');
        console.log('===================================');
        
        // Mapear endpoints do app.js principal
        await this.mapMainAppEndpoints();
        
        // Mapear endpoints das APIs administrativas
        await this.mapAdminApiEndpoints();
        
        // Mapear outros endpoints
        await this.mapOtherEndpoints();
        
        // Gerar relatório
        this.generateReport();
    }

    async mapMainAppEndpoints() {
        console.log('\n📋 ENDPOINTS PRINCIPAIS (app.js)');
        console.log('================================');
        
        const mainEndpoints = [
            // Health & Status
            { method: 'GET', path: '/health', description: 'Health check básico', db: false },
            { method: 'GET', path: '/status', description: 'Status com verificação de BD', db: ['users', 'positions', 'trades'] },
            { method: 'GET', path: '/', description: 'Status principal do sistema', db: false },
            { method: 'GET', path: '/system-status', description: 'Status detalhado com contadores', db: ['users', 'positions', 'trades'] },
            
            // Webhooks & Signals
            { method: 'POST', path: '/webhook', description: 'Webhook principal TradingView', db: ['users', 'signals', 'positions', 'active_positions'] },
            { method: 'POST', path: '/api/webhooks/signal', description: 'API webhook alternativo', db: ['users', 'signals', 'positions', 'active_positions'] },
            { method: 'GET', path: '/webhook', description: 'Info sobre webhook', db: false },
            
            // Validation & Commission
            { method: 'POST', path: '/validate-position', description: 'Validar position safety', db: false },
            { method: 'POST', path: '/calculate-commission', description: 'Calcular comissões', db: false },
            { method: 'GET', path: '/commission-plans', description: 'Info dos planos de comissão', db: false },
            
            // Financial System
            { method: 'GET', path: '/api/user/:userId/balances', description: 'Consultar saldos do usuário', db: ['users', 'transactions'] },
            { method: 'POST', path: '/api/stripe/recharge', description: 'Processar recarga Stripe', db: ['users', 'transactions'] },
            { method: 'POST', path: '/api/admin/create-coupon', description: 'Criar cupom administrativo', db: ['users', 'coupons'] },
            { method: 'POST', path: '/api/user/use-coupon', description: 'Usar cupom', db: ['users', 'coupons', 'coupon_usage'] },
            { method: 'POST', path: '/api/user/request-withdrawal', description: 'Solicitar saque', db: ['users', 'transactions'] },
            { method: 'POST', path: '/api/affiliate/convert-commission', description: 'Converter comissão para crédito', db: ['users', 'transactions'] },
            { method: 'GET', path: '/api/admin/financial-summary', description: 'Relatório financeiro geral', db: ['users', 'transactions', 'coupons'] },
            { method: 'GET', path: '/api/admin/generate-coupon-code', description: 'Gerar código de cupom', db: false },
            
            // Data APIs
            { method: 'GET', path: '/api/users', description: 'Listar usuários', db: ['users'] },
            { method: 'GET', path: '/api/positions', description: 'Listar posições ativas', db: ['positions', 'users'] },
            { method: 'GET', path: '/api/signals', description: 'Listar sinais', db: ['signals'] },
            { method: 'GET', path: '/api/trading/status', description: 'Status do trading', db: false },
            
            // Dashboard & Reports
            { method: 'GET', path: '/dashboard', description: 'Dashboard operacional completo', db: ['users', 'positions', 'signals', 'fear_greed_index', 'top100_data'] },
            
            // Simulated APIs (for demo)
            { method: 'GET', path: '/api/balance', description: 'Saldos simulados', db: false },
            { method: 'GET', path: '/api/financial/summary', description: 'Resumo financeiro', db: ['users', 'transactions'] },
            { method: 'GET', path: '/api/market/data', description: 'Dados de mercado simulados', db: false },
            { method: 'GET', path: '/api/dominance', description: 'Dominância BTC simulada', db: false },
            { method: 'POST', path: '/api/register', description: 'Registro simulado', db: false },
            { method: 'POST', path: '/api/login', description: 'Login simulado', db: false }
        ];

        mainEndpoints.forEach(endpoint => {
            console.log(`${endpoint.method.padEnd(6)} ${endpoint.path.padEnd(40)} - ${endpoint.description}`);
            
            this.endpoints.set(endpoint.path, {
                method: endpoint.method,
                description: endpoint.description,
                file: 'app.js',
                databaseTables: endpoint.db || []
            });
            
            if (endpoint.db && endpoint.db.length > 0) {
                endpoint.db.forEach(table => {
                    if (!this.databaseDependencies.has(table)) {
                        this.databaseDependencies.set(table, []);
                    }
                    this.databaseDependencies.get(table).push(endpoint.path);
                });
            }
        });
    }

    async mapAdminApiEndpoints() {
        console.log('\n📋 ENDPOINTS ADMINISTRATIVOS (apis-administrativas.js)');
        console.log('=====================================================');
        
        const adminEndpoints = [
            // Auth
            { method: 'POST', path: '/api/auth/login', description: 'Login administrativo', db: ['users'] },
            { method: 'POST', path: '/api/auth/refresh', description: 'Refresh token', db: ['users'] },
            { method: 'POST', path: '/api/auth/logout', description: 'Logout', db: false },
            { method: 'GET', path: '/api/auth/profile', description: 'Perfil do usuário', db: ['users'] },
            
            // User Management
            { method: 'GET', path: '/api/users', description: 'Listar usuários (admin)', db: ['users'] },
            { method: 'POST', path: '/api/users', description: 'Criar usuário', db: ['users'] },
            { method: 'GET', path: '/api/users/:id', description: 'Buscar usuário', db: ['users'] },
            { method: 'PUT', path: '/api/users/:id', description: 'Atualizar usuário', db: ['users'] },
            { method: 'DELETE', path: '/api/users/:id', description: 'Desativar usuário', db: ['users'] },
            { method: 'POST', path: '/api/users/:id/promote', description: 'Promover usuário', db: ['users'] },
            { method: 'GET', path: '/api/users/:id/history', description: 'Histórico do usuário', db: ['users', 'transactions', 'positions'] },
            
            // Password & SMS
            { method: 'POST', path: '/api/auth/reset-password', description: 'Reset senha', db: ['users'] },
            { method: 'POST', path: '/api/auth/reset-password-sms', description: 'Reset senha via SMS', db: ['users'] },
            
            // Affiliates
            { method: 'GET', path: '/api/affiliates', description: 'Listar afiliados', db: ['users', 'affiliates'] },
            { method: 'GET', path: '/api/affiliates/:id/referrals', description: 'Indicados do afiliado', db: ['users', 'affiliates'] },
            { method: 'GET', path: '/api/affiliates/:id/commissions', description: 'Comissões do afiliado', db: ['commission_records'] },
            
            // Reports
            { method: 'GET', path: '/api/reports/users', description: 'Relatório de usuários', db: ['users', 'transactions'] },
            { method: 'GET', path: '/api/reports/sms', description: 'Relatório SMS', db: ['sms_logs'] },
            { method: 'GET', path: '/api/reports/admin-actions', description: 'Relatório ações admin', db: ['admin_actions'] },
            
            // System
            { method: 'GET', path: '/api/system/config', description: 'Configuração do sistema', db: ['system_config'] },
            { method: 'GET', path: '/api/system/health', description: 'Health check sistema', db: false },
            { method: 'POST', path: '/api/system/test-sms', description: 'Testar SMS', db: false }
        ];

        adminEndpoints.forEach(endpoint => {
            console.log(`${endpoint.method.padEnd(6)} ${endpoint.path.padEnd(45)} - ${endpoint.description}`);
            
            this.endpoints.set(endpoint.path, {
                method: endpoint.method,
                description: endpoint.description,
                file: 'apis-administrativas.js',
                databaseTables: endpoint.db || []
            });
            
            if (endpoint.db && endpoint.db.length > 0) {
                endpoint.db.forEach(table => {
                    if (!this.databaseDependencies.has(table)) {
                        this.databaseDependencies.set(table, []);
                    }
                    this.databaseDependencies.get(table).push(endpoint.path);
                });
            }
        });
    }

    async mapOtherEndpoints() {
        console.log('\n📋 OUTROS ENDPOINTS ESPECIALIZADOS');
        console.log('==================================');
        
        // Verificar se existem outros arquivos com endpoints
        const otherFiles = [
            'dashboard-real-final.js',
            'signal-tracking-api.js',
            'financial-apis.js'
        ];

        for (const file of otherFiles) {
            const filePath = path.join(this.backendPath, file);
            if (fs.existsSync(filePath)) {
                console.log(`📄 Encontrado: ${file}`);
                // Aqui poderíamos fazer parsing do arquivo para encontrar endpoints
            }
        }
    }

    generateReport() {
        console.log('\n📊 RELATÓRIO DE DEPENDÊNCIAS DE BANCO DE DADOS');
        console.log('==============================================');
        
        for (const [table, endpoints] of this.databaseDependencies.entries()) {
            console.log(`\n🗄️ TABELA: ${table.toUpperCase()}`);
            console.log(`   📊 Usada por ${endpoints.length} endpoint(s):`);
            endpoints.forEach(endpoint => {
                console.log(`      • ${endpoint}`);
            });
        }
        
        console.log('\n📈 ESTATÍSTICAS');
        console.log('===============');
        console.log(`📌 Total de endpoints: ${this.endpoints.size}`);
        console.log(`📌 Tabelas utilizadas: ${this.databaseDependencies.size}`);
        
        const endpointsWithDb = Array.from(this.endpoints.values()).filter(e => e.databaseTables.length > 0);
        console.log(`📌 Endpoints que usam BD: ${endpointsWithDb.length}`);
        console.log(`📌 Endpoints sem BD: ${this.endpoints.size - endpointsWithDb.length}`);
        
        console.log('\n🎯 TABELAS MAIS CRÍTICAS');
        console.log('========================');
        
        const tableCounts = Array.from(this.databaseDependencies.entries())
            .map(([table, endpoints]) => ({ table, count: endpoints.length }))
            .sort((a, b) => b.count - a.count);
            
        tableCounts.slice(0, 10).forEach((item, index) => {
            console.log(`${(index + 1).toString().padStart(2)}. ${item.table.padEnd(20)} - ${item.count} endpoint(s)`);
        });
    }

    async generateDatabaseValidationSQL() {
        console.log('\n📝 GERANDO SQL DE VALIDAÇÃO');
        console.log('===========================');
        
        const criticalTables = Array.from(this.databaseDependencies.keys());
        
        const sqlValidation = `
-- 🔍 VALIDAÇÃO DE INTEGRIDADE DO BANCO DE DADOS
-- =============================================
-- Gerado automaticamente pelo EndpointMapper

-- Verificar existência das tabelas críticas
${criticalTables.map(table => `
SELECT '${table}' as table_name, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '${table}') 
            THEN 'EXISTS' 
            ELSE 'MISSING' 
       END as status;`).join('\n')}

-- Verificar campos NULL em tabelas críticas
SELECT 
    table_name,
    column_name,
    COUNT(*) as null_count
FROM (
    ${criticalTables.map(table => `
    SELECT '${table}' as table_name, column_name
    FROM information_schema.columns 
    WHERE table_name = '${table}' 
    AND is_nullable = 'NO'`).join(' UNION ALL ')}
) critical_columns
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = critical_columns.table_name
)
GROUP BY table_name, column_name
ORDER BY table_name, null_count DESC;
        `;
        
        // Salvar SQL de validação
        fs.writeFileSync(
            path.join(this.backendPath, 'database-validation-endpoints.sql'),
            sqlValidation.trim()
        );
        
        console.log('✅ SQL de validação salvo em: database-validation-endpoints.sql');
    }
}

// Executar mapeamento
if (require.main === module) {
    const mapper = new EndpointMapper();
    mapper.mapAllEndpoints().then(() => {
        return mapper.generateDatabaseValidationSQL();
    });
}

module.exports = EndpointMapper;
