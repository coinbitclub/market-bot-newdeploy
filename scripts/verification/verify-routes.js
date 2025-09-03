/**
 * VERIFICAÇÃO ESTÁTICA DAS ROTAS CORRIGIDAS
 * =========================================
 * Analisa o código do hybrid-server.js para verificar se todas as rotas críticas estão definidas
 */

const fs = require('fs');

console.log('🔍 VERIFICAÇÃO ESTÁTICA DAS ROTAS CORRIGIDAS');
console.log('=============================================');

try {
    // Ler o arquivo hybrid-server.js
    const serverCode = fs.readFileSync('hybrid-server.js', 'utf8');
    
    console.log('✅ Arquivo hybrid-server.js carregado');
    console.log(`📏 Tamanho: ${serverCode.length} caracteres`);
    console.log('');
    
    // Rotas críticas que devem estar presentes
    const criticalRoutes = [
        { pattern: /app\.get\(['"']\/health['"]/, name: 'GET /health', description: 'Health check' },
        { pattern: /app\.get\(['"']\/status['"]/, name: 'GET /status', description: 'Status principal' },
        { pattern: /app\.get\(['"']\/api\/system\/status['"]/, name: 'GET /api/system/status', description: 'API system status' },
        { pattern: /app\.get\(['"']\/api\/dashboard\/summary['"]/, name: 'GET /api/dashboard/summary', description: 'Dashboard summary' },
        { pattern: /app\.post\(['"']\/api\/webhooks\/signal['"]/, name: 'POST /api/webhooks/signal', description: 'Webhook signal POST' },
        { pattern: /app\.get\(['"']\/api\/webhooks\/signal['"]/, name: 'GET /api/webhooks/signal', description: 'Webhook signal GET' },
        { pattern: /app\.post\(['"']\/webhook['"]/, name: 'POST /webhook', description: 'Webhook geral POST' },
        { pattern: /app\.get\(['"']\/webhook['"]/, name: 'GET /webhook', description: 'Webhook geral GET' },
        { pattern: /app\.post\(['"']\/api\/webhooks\/trading['"]/, name: 'POST /api/webhooks/trading', description: 'Trading webhook POST' },
        { pattern: /app\.get\(['"']\/api\/webhooks\/trading['"]/, name: 'GET /api/webhooks/trading', description: 'Trading webhook GET' }
    ];
    
    // Middleware crítico
    const criticalMiddleware = [
        { pattern: /app\.use\(express\.json\(\)/, name: 'express.json()', description: 'JSON parsing middleware' },
        { pattern: /app\.use\(express\.urlencoded/, name: 'express.urlencoded()', description: 'URL encoding middleware' }
    ];
    
    let foundRoutes = 0;
    let foundMiddleware = 0;
    
    console.log('🔍 Verificando rotas críticas:');
    console.log('==============================');
    
    criticalRoutes.forEach(route => {
        const found = route.pattern.test(serverCode);
        const icon = found ? '✅' : '❌';
        console.log(`${icon} ${route.name.padEnd(30)} - ${route.description}`);
        if (found) foundRoutes++;
    });
    
    console.log('');
    console.log('🔍 Verificando middleware crítico:');
    console.log('==================================');
    
    criticalMiddleware.forEach(middleware => {
        const found = middleware.pattern.test(serverCode);
        const icon = found ? '✅' : '❌';
        console.log(`${icon} ${middleware.name.padEnd(25)} - ${middleware.description}`);
        if (found) foundMiddleware++;
    });
    
    console.log('');
    console.log('📊 RELATÓRIO DE VERIFICAÇÃO:');
    console.log('============================');
    console.log(`✅ Rotas encontradas: ${foundRoutes}/${criticalRoutes.length}`);
    console.log(`✅ Middleware encontrado: ${foundMiddleware}/${criticalMiddleware.length}`);
    
    const routePercentage = Math.round((foundRoutes / criticalRoutes.length) * 100);
    const middlewarePercentage = Math.round((foundMiddleware / criticalMiddleware.length) * 100);
    
    console.log(`📈 Taxa de rotas: ${routePercentage}%`);
    console.log(`📈 Taxa de middleware: ${middlewarePercentage}%`);
    
    console.log('');
    
    // Verificações adicionais
    console.log('🔍 Verificações adicionais:');
    console.log('===========================');
    
    const additionalChecks = [
        { check: /app\.listen\(port/, name: 'Servidor iniciando', found: false },
        { check: /console\.log.*SERVER.*START/, name: 'Logs de inicialização', found: false },
        { check: /systemState/, name: 'Estado do sistema', found: false },
        { check: /loadMainSystem/, name: 'Carregamento sistema principal', found: false },
        { check: /webhook.*recebido/, name: 'Logs de webhook', found: false }
    ];
    
    additionalChecks.forEach(check => {
        check.found = check.check.test(serverCode);
        const icon = check.found ? '✅' : '❌';
        console.log(`${icon} ${check.name}`);
    });
    
    console.log('');
    
    // Análise final
    const allCriticalRoutesPresent = foundRoutes === criticalRoutes.length;
    const allMiddlewarePresent = foundMiddleware === criticalMiddleware.length;
    const additionalChecksOk = additionalChecks.filter(c => c.found).length >= 3;
    
    if (allCriticalRoutesPresent && allMiddlewarePresent && additionalChecksOk) {
        console.log('🎉 VERIFICAÇÃO COMPLETA: TUDO OK!');
        console.log('=================================');
        console.log('✅ Todas as rotas críticas estão definidas');
        console.log('✅ Middleware essencial configurado');
        console.log('✅ Estrutura do servidor adequada');
        console.log('✅ Logs e monitoramento presentes');
        console.log('');
        console.log('🚀 PRONTO PARA TESTES E DEPLOY!');
        console.log('');
        console.log('💡 Próximos passos:');
        console.log('  1. Iniciar servidor: node hybrid-server.js');
        console.log('  2. Testar endpoints: node test-endpoints-final.js');
        console.log('  3. Fazer deploy: git push origin main');
    } else {
        console.log('⚠️ PROBLEMAS ENCONTRADOS:');
        console.log('=========================');
        
        if (!allCriticalRoutesPresent) {
            console.log(`❌ Faltam ${criticalRoutes.length - foundRoutes} rotas críticas`);
        }
        
        if (!allMiddlewarePresent) {
            console.log(`❌ Faltam ${criticalMiddleware.length - foundMiddleware} middlewares`);
        }
        
        if (!additionalChecksOk) {
            console.log('❌ Estrutura do servidor pode estar incompleta');
        }
        
        console.log('');
        console.log('🔧 Revise o código e execute novamente');
    }
    
    // Salvar relatório
    const report = {
        timestamp: new Date().toISOString(),
        routesFound: foundRoutes,
        totalRoutes: criticalRoutes.length,
        middlewareFound: foundMiddleware,
        totalMiddleware: criticalMiddleware.length,
        routePercentage,
        middlewarePercentage,
        allCriticalRoutesPresent,
        allMiddlewarePresent,
        additionalChecksOk,
        readyForDeploy: allCriticalRoutesPresent && allMiddlewarePresent && additionalChecksOk
    };
    
    fs.writeFileSync('static-verification-report.json', JSON.stringify(report, null, 2));
    console.log('📝 Relatório salvo em: static-verification-report.json');
    
} catch (error) {
    console.error('❌ Erro na verificação:', error.message);
    console.log('');
    console.log('💡 Certifique-se de estar no diretório correto com o arquivo hybrid-server.js');
}

console.log('');
console.log('🎯 Verificação estática concluída!');
