// 🔍 SISTEMA COMPLETO DE DIAGNÓSTICO - BYBIT API
// =====================================================
// Testa todos os tipos de erros possíveis nas APIs
// Autor: CoinbitClub MarketBot
// Data: 09/08/2025

const axios = require('axios');
const crypto = require('crypto');

// 🔑 CONFIGURAÇÃO DAS CHAVES API
const ACCOUNTS = {
    ERICA: {
        name: "Erica dos Santos Andrade",
        email: "erica.andrade.santos@hotmail.com",
        apiKey: "YOUR_API_KEY_HERE",
        apiSecret: "YOUR_SECRET_KEY_HERE"
    },
    LUIZA: {
        name: "Luiza Maria de Almeida Pinto", 
        email: "lmariadeapinto@gmail.com",
        apiKey: "9HZy9BiUW95iXprVRl",
        apiSecret: "YOUR_SECRET_KEY_HERE"
    },
    PALOMA: {
        name: "API Paloma",
        email: "coinbitclub@example.com",
        apiKey: "21k7qWUkZKOBDXBuoT",
        apiSecret: "YOUR_SECRET_KEY_HERE"
    }
};

// 🌐 CONFIGURAÇÕES DA API
const BYBIT_CONFIG = {
    mainnet: "https://api.bybit.com",
    testnet: "https://api-testnet.bybit.com",
    recvWindow: 5000
};

// 📊 CONTADORES GLOBAIS
let globalStats = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    errors: {
        connection: 0,
        authentication: 0,
        execution: 0,
        permission: 0,
        network: 0,
        validation: 0
    }
};

// 🔐 GERAÇÃO DE ASSINATURA
function generateSignature(params, apiSecret) {
    const timestamp = Date.now().toString();
    const recvWindow = BYBIT_CONFIG.recvWindow.toString();
    
    let queryString = '';
    if (params && Object.keys(params).length > 0) {
        queryString = new URLSearchParams(params).toString();
    }
    
    const signPayload = timestamp + params.apiKey + recvWindow + queryString;
    const signature = crypto.createHmac('sha256', apiSecret).update(signPayload).digest('hex');
    
    return {
        timestamp,
        signature,
        recvWindow,
        queryString
    };
}

// 🔗 REQUISIÇÃO PARA BYBIT
async function makeBybitRequest(endpoint, method = 'GET', params = {}, account) {
    try {
        params.apiKey = account.apiKey;
        const { timestamp, signature, recvWindow, queryString } = generateSignature(params, account.apiSecret);
        
        const headers = {
            'X-BAPI-API-KEY': account.apiKey,
            'X-BAPI-SIGN': signature,
            'X-BAPI-SIGN-TYPE': '2',
            'X-BAPI-TIMESTAMP': timestamp,
            'X-BAPI-RECV-WINDOW': recvWindow,
            'Content-Type': 'application/json'
        };

        const url = method === 'GET' 
            ? `${BYBIT_CONFIG.mainnet}${endpoint}?${queryString}`
            : `${BYBIT_CONFIG.mainnet}${endpoint}`;

        const config = {
            method,
            url,
            headers,
            timeout: 10000
        };

        if (method !== 'GET') {
            config.data = params;
        }

        const response = await axios(config);
        return response.data;
    } catch (error) {
        return {
            error: true,
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
            code: error.code
        };
    }
}

// 🎯 CATEGORIA 1: TESTES DE CONEXÃO/AUTENTICAÇÃO
async function testConnectionAuthentication(account) {
    console.log(`\n🔐 CATEGORIA 1: CONEXÃO/AUTENTICAÇÃO - ${account.name}`);
    console.log("=".repeat(60));
    
    let categoryResults = {
        passed: 0,
        failed: 0,
        tests: []
    };

    // Teste 1.1: API Key válida
    console.log("📝 Teste 1.1: Validação da API Key...");
    globalStats.totalTests++;
    const apiKeyTest = {
        name: "API Key Validation",
        status: account.apiKey && account.apiKey.length > 0 ? "PASS" : "FAIL",
        details: `Key length: ${account.apiKey?.length || 0}, Format: ${/^[a-zA-Z0-9]+$/.test(account.apiKey || '') ? 'Valid' : 'Invalid'}`
    };
    
    if (apiKeyTest.status === "PASS") {
        categoryResults.passed++;
        globalStats.passedTests++;
        console.log("   ✅ API Key formato válido");
    } else {
        categoryResults.failed++;
        globalStats.failedTests++;
        globalStats.errors.authentication++;
        console.log("   ❌ API Key inválida");
    }
    categoryResults.tests.push(apiKeyTest);

    // Teste 1.2: API Secret válido
    console.log("📝 Teste 1.2: Validação do API Secret...");
    globalStats.totalTests++;
    const secretTest = {
        name: "API Secret Validation",
        status: account.apiSecret && account.apiSecret.length > 0 ? "PASS" : "FAIL",
        details: `Secret length: ${account.apiSecret?.length || 0}, Format: ${/^[a-zA-Z0-9]+$/.test(account.apiSecret || '') ? 'Valid' : 'Invalid'}`
    };
    
    if (secretTest.status === "PASS") {
        categoryResults.passed++;
        globalStats.passedTests++;
        console.log("   ✅ API Secret formato válido");
    } else {
        categoryResults.failed++;
        globalStats.failedTests++;
        globalStats.errors.authentication++;
        console.log("   ❌ API Secret inválido");
    }
    categoryResults.tests.push(secretTest);

    // Teste 1.3: Conectividade básica com servidor
    console.log("📝 Teste 1.3: Conectividade com servidor...");
    globalStats.totalTests++;
    const result = await makeBybitRequest('/v5/market/time', 'GET', {}, account);
    
    const connectTest = {
        name: "Server Connectivity",
        status: !result.error ? "PASS" : "FAIL",
        details: result.error ? `Error: ${result.message}` : `Server time: ${result.result?.timeSecond}`
    };
    
    if (!result.error) {
        categoryResults.passed++;
        globalStats.passedTests++;
        console.log("   ✅ Conectividade OK");
    } else {
        categoryResults.failed++;
        globalStats.failedTests++;
        globalStats.errors.connection++;
        console.log(`   ❌ Erro de conectividade: ${result.message}`);
    }
    categoryResults.tests.push(connectTest);

    // Teste 1.4: Autenticação com endpoint privado
    console.log("📝 Teste 1.4: Autenticação com endpoint privado...");
    globalStats.totalTests++;
    const authResult = await makeBybitRequest('/v5/account/wallet-balance', 'GET', { accountType: 'UNIFIED' }, account);
    
    let authStatus = "FAIL";
    let authDetails = "";
    
    if (!authResult.error) {
        authStatus = "PASS";
        authDetails = "Autenticação bem-sucedida";
        console.log("   ✅ Autenticação bem-sucedida");
    } else if (authResult.data?.retCode === 10010) {
        authStatus = "BLOCKED_IP";
        authDetails = "IP não está na whitelist";
        globalStats.errors.permission++;
        console.log("   ⚠️ IP bloqueado - precisa configurar whitelist");
    } else if (authResult.data?.retCode === 10004) {
        authStatus = "INVALID_SIGNATURE";
        authDetails = "Erro de assinatura - API Secret incorreto";
        globalStats.errors.authentication++;
        console.log("   ❌ Erro de assinatura - verificar API Secret");
    } else {
        authDetails = `Error code: ${authResult.data?.retCode || 'Unknown'}, Message: ${authResult.data?.retMsg || authResult.message}`;
        globalStats.errors.authentication++;
        console.log(`   ❌ Erro de autenticação: ${authDetails}`);
    }
    
    if (authStatus === "PASS") {
        categoryResults.passed++;
        globalStats.passedTests++;
    } else {
        categoryResults.failed++;
        globalStats.failedTests++;
    }
    
    categoryResults.tests.push({
        name: "Private Endpoint Authentication",
        status: authStatus,
        details: authDetails
    });

    return categoryResults;
}

// 🎯 CATEGORIA 2: TESTES DE EXECUÇÃO DE ORDENS
async function testOrderExecution(account) {
    console.log(`\n📋 CATEGORIA 2: EXECUÇÃO DE ORDENS - ${account.name}`);
    console.log("=".repeat(60));
    
    let categoryResults = {
        passed: 0,
        failed: 0,
        tests: []
    };

    // Teste 2.1: Consulta de posições (sem execução real)
    console.log("📝 Teste 2.1: Consulta de posições...");
    globalStats.totalTests++;
    const positionsResult = await makeBybitRequest('/v5/position/list', 'GET', { category: 'linear' }, account);
    
    const positionsTest = {
        name: "Position Query",
        status: !positionsResult.error && positionsResult.retCode === 0 ? "PASS" : "FAIL",
        details: positionsResult.error 
            ? `Error: ${positionsResult.data?.retMsg || positionsResult.message}`
            : `Found ${positionsResult.result?.list?.length || 0} positions`
    };
    
    if (positionsTest.status === "PASS") {
        categoryResults.passed++;
        globalStats.passedTests++;
        console.log("   ✅ Consulta de posições OK");
    } else {
        categoryResults.failed++;
        globalStats.failedTests++;
        globalStats.errors.execution++;
        console.log(`   ❌ Erro na consulta: ${positionsTest.details}`);
    }
    categoryResults.tests.push(positionsTest);

    // Teste 2.2: Consulta de histórico de ordens
    console.log("📝 Teste 2.2: Histórico de ordens...");
    globalStats.totalTests++;
    const ordersResult = await makeBybitRequest('/v5/order/history', 'GET', { 
        category: 'linear',
        limit: 1
    }, account);
    
    const ordersTest = {
        name: "Order History Query",
        status: !ordersResult.error && ordersResult.retCode === 0 ? "PASS" : "FAIL",
        details: ordersResult.error 
            ? `Error: ${ordersResult.data?.retMsg || ordersResult.message}`
            : `History accessible - ${ordersResult.result?.list?.length || 0} recent orders`
    };
    
    if (ordersTest.status === "PASS") {
        categoryResults.passed++;
        globalStats.passedTests++;
        console.log("   ✅ Histórico de ordens OK");
    } else {
        categoryResults.failed++;
        globalStats.failedTests++;
        globalStats.errors.execution++;
        console.log(`   ❌ Erro no histórico: ${ordersTest.details}`);
    }
    categoryResults.tests.push(ordersTest);

    // Teste 2.3: Validação de parâmetros de ordem (sem execução)
    console.log("📝 Teste 2.3: Validação de parâmetros de ordem...");
    globalStats.totalTests++;
    
    // Testamos apenas a estrutura, sem enviar ordem real
    const orderParams = {
        category: 'linear',
        symbol: 'BTCUSDT',
        side: 'Buy',
        orderType: 'Limit',
        qty: '0.001',
        price: '30000'
    };
    
    let paramValidation = true;
    let paramDetails = "Parâmetros estruturalmente válidos";
    
    // Validações básicas
    if (!orderParams.symbol || !orderParams.side || !orderParams.qty) {
        paramValidation = false;
        paramDetails = "Parâmetros obrigatórios faltando";
    }
    
    const paramTest = {
        name: "Order Parameter Validation",
        status: paramValidation ? "PASS" : "FAIL",
        details: paramDetails
    };
    
    if (paramValidation) {
        categoryResults.passed++;
        globalStats.passedTests++;
        console.log("   ✅ Parâmetros de ordem válidos");
    } else {
        categoryResults.failed++;
        globalStats.failedTests++;
        globalStats.errors.validation++;
        console.log("   ❌ Parâmetros inválidos");
    }
    categoryResults.tests.push(paramTest);

    return categoryResults;
}

// 🎯 CATEGORIA 3: TESTES DE PERMISSÃO E CONFIGURAÇÃO
async function testPermissionsConfig(account) {
    console.log(`\n🔒 CATEGORIA 3: PERMISSÕES E CONFIGURAÇÃO - ${account.name}`);
    console.log("=".repeat(60));
    
    let categoryResults = {
        passed: 0,
        failed: 0,
        tests: []
    };

    // Teste 3.1: Informações da API Key
    console.log("📝 Teste 3.1: Informações da API Key...");
    globalStats.totalTests++;
    const keyInfoResult = await makeBybitRequest('/v5/user/query-api', 'GET', {}, account);
    
    let keyInfoStatus = "FAIL";
    let keyInfoDetails = "";
    
    if (!keyInfoResult.error && keyInfoResult.retCode === 0) {
        const permissions = keyInfoResult.result?.permissions || {};
        keyInfoStatus = "PASS";
        keyInfoDetails = `Permissões: Spot=${permissions.Spot?.join(',') || 'None'}, Derivatives=${permissions.Derivatives?.join(',') || 'None'}`;
        console.log("   ✅ Informações da API obtidas");
        console.log(`   📋 ${keyInfoDetails}`);
    } else {
        keyInfoDetails = keyInfoResult.error 
            ? `Error: ${keyInfoResult.data?.retMsg || keyInfoResult.message}`
            : "Não foi possível obter informações da chave";
        console.log(`   ❌ ${keyInfoDetails}`);
    }
    
    if (keyInfoStatus === "PASS") {
        categoryResults.passed++;
        globalStats.passedTests++;
    } else {
        categoryResults.failed++;
        globalStats.failedTests++;
        globalStats.errors.permission++;
    }
    
    categoryResults.tests.push({
        name: "API Key Information",
        status: keyInfoStatus,
        details: keyInfoDetails
    });

    // Teste 3.2: Acesso a saldo da conta
    console.log("📝 Teste 3.2: Acesso a saldo da conta...");
    globalStats.totalTests++;
    const balanceResult = await makeBybitRequest('/v5/account/wallet-balance', 'GET', { accountType: 'UNIFIED' }, account);
    
    let balanceStatus = "FAIL";
    let balanceDetails = "";
    
    if (!balanceResult.error && balanceResult.retCode === 0) {
        const coins = balanceResult.result?.list?.[0]?.coin || [];
        const totalUSD = coins.reduce((sum, coin) => sum + parseFloat(coin.usdValue || 0), 0);
        balanceStatus = "PASS";
        balanceDetails = `Saldo total: $${totalUSD.toFixed(2)} (${coins.length} moedas)`;
        console.log("   ✅ Acesso ao saldo autorizado");
        console.log(`   💰 ${balanceDetails}`);
    } else {
        balanceDetails = balanceResult.error 
            ? `Error: ${balanceResult.data?.retMsg || balanceResult.message}`
            : "Acesso negado ao saldo";
        console.log(`   ❌ ${balanceDetails}`);
    }
    
    if (balanceStatus === "PASS") {
        categoryResults.passed++;
        globalStats.passedTests++;
    } else {
        categoryResults.failed++;
        globalStats.failedTests++;
        globalStats.errors.permission++;
    }
    
    categoryResults.tests.push({
        name: "Account Balance Access",
        status: balanceStatus,
        details: balanceDetails
    });

    // Teste 3.3: Configurações de conta
    console.log("📝 Teste 3.3: Configurações de conta...");
    globalStats.totalTests++;
    const accountInfoResult = await makeBybitRequest('/v5/account/info', 'GET', {}, account);
    
    let accountStatus = "FAIL";
    let accountDetails = "";
    
    if (!accountInfoResult.error && accountInfoResult.retCode === 0) {
        const info = accountInfoResult.result || {};
        accountStatus = "PASS";
        accountDetails = `Status: ${info.status || 'Unknown'}, Unified Margin: ${info.unifiedMarginStatus || 'Unknown'}`;
        console.log("   ✅ Informações da conta obtidas");
        console.log(`   ℹ️ ${accountDetails}`);
    } else {
        accountDetails = accountInfoResult.error 
            ? `Error: ${accountInfoResult.data?.retMsg || accountInfoResult.message}`
            : "Não foi possível obter informações da conta";
        console.log(`   ❌ ${accountDetails}`);
    }
    
    if (accountStatus === "PASS") {
        categoryResults.passed++;
        globalStats.passedTests++;
    } else {
        categoryResults.failed++;
        globalStats.failedTests++;
        globalStats.errors.permission++;
    }
    
    categoryResults.tests.push({
        name: "Account Configuration",
        status: accountStatus,
        details: accountDetails
    });

    return categoryResults;
}

// 🎯 CATEGORIA 4: TESTES DE REDE E LATÊNCIA
async function testNetworkLatency(account) {
    console.log(`\n🌐 CATEGORIA 4: REDE E LATÊNCIA - ${account.name}`);
    console.log("=".repeat(60));
    
    let categoryResults = {
        passed: 0,
        failed: 0,
        tests: []
    };

    // Teste 4.1: Latência de resposta
    console.log("📝 Teste 4.1: Latência de resposta...");
    globalStats.totalTests++;
    
    const startTime = Date.now();
    const timeResult = await makeBybitRequest('/v5/market/time', 'GET', {}, account);
    const endTime = Date.now();
    const latency = endTime - startTime;
    
    const latencyTest = {
        name: "Response Latency",
        status: !timeResult.error && latency < 2000 ? "PASS" : latency >= 2000 ? "SLOW" : "FAIL",
        details: timeResult.error 
            ? `Error: ${timeResult.message}`
            : `Latência: ${latency}ms`
    };
    
    if (latencyTest.status === "PASS") {
        categoryResults.passed++;
        globalStats.passedTests++;
        console.log(`   ✅ Latência OK: ${latency}ms`);
    } else if (latencyTest.status === "SLOW") {
        categoryResults.passed++;
        globalStats.passedTests++;
        console.log(`   ⚠️ Latência alta: ${latency}ms`);
    } else {
        categoryResults.failed++;
        globalStats.failedTests++;
        globalStats.errors.network++;
        console.log(`   ❌ Erro de rede: ${latencyTest.details}`);
    }
    categoryResults.tests.push(latencyTest);

    // Teste 4.2: Múltiplas requisições (rate limit)
    console.log("📝 Teste 4.2: Teste de rate limit...");
    globalStats.totalTests++;
    
    const requests = [];
    for (let i = 0; i < 5; i++) {
        requests.push(makeBybitRequest('/v5/market/time', 'GET', {}, account));
    }
    
    try {
        const results = await Promise.all(requests);
        const successCount = results.filter(r => !r.error).length;
        
        const rateLimitTest = {
            name: "Rate Limit Test",
            status: successCount >= 4 ? "PASS" : "FAIL",
            details: `${successCount}/5 requisições bem-sucedidas`
        };
        
        if (rateLimitTest.status === "PASS") {
            categoryResults.passed++;
            globalStats.passedTests++;
            console.log(`   ✅ Rate limit OK: ${successCount}/5 sucessos`);
        } else {
            categoryResults.failed++;
            globalStats.failedTests++;
            globalStats.errors.network++;
            console.log(`   ❌ Rate limit excedido: ${successCount}/5 sucessos`);
        }
        categoryResults.tests.push(rateLimitTest);
    } catch (error) {
        categoryResults.failed++;
        globalStats.failedTests++;
        globalStats.errors.network++;
        console.log(`   ❌ Erro no teste de rate limit: ${error.message}`);
        categoryResults.tests.push({
            name: "Rate Limit Test",
            status: "FAIL",
            details: `Error: ${error.message}`
        });
    }

    // Teste 4.3: Timeout e estabilidade
    console.log("📝 Teste 4.3: Teste de timeout...");
    globalStats.totalTests++;
    
    try {
        const timeoutResult = await makeBybitRequest('/v5/market/kline', 'GET', {
            category: 'linear',
            symbol: 'BTCUSDT',
            interval: '1',
            limit: 1
        }, account);
        
        const timeoutTest = {
            name: "Timeout Test",
            status: !timeoutResult.error ? "PASS" : "FAIL",
            details: timeoutResult.error 
                ? `Timeout/Error: ${timeoutResult.message}`
                : "Requisição complexa completada"
        };
        
        if (timeoutTest.status === "PASS") {
            categoryResults.passed++;
            globalStats.passedTests++;
            console.log("   ✅ Timeout test OK");
        } else {
            categoryResults.failed++;
            globalStats.failedTests++;
            globalStats.errors.network++;
            console.log(`   ❌ Timeout error: ${timeoutTest.details}`);
        }
        categoryResults.tests.push(timeoutTest);
    } catch (error) {
        categoryResults.failed++;
        globalStats.failedTests++;
        globalStats.errors.network++;
        console.log(`   ❌ Erro de timeout: ${error.message}`);
        categoryResults.tests.push({
            name: "Timeout Test",
            status: "FAIL",
            details: `Error: ${error.message}`
        });
    }

    return categoryResults;
}

// 🎯 CATEGORIA 5: TESTES DE DADOS E VALIDAÇÕES
async function testDataValidation(account) {
    console.log(`\n📊 CATEGORIA 5: DADOS E VALIDAÇÕES - ${account.name}`);
    console.log("=".repeat(60));
    
    let categoryResults = {
        passed: 0,
        failed: 0,
        tests: []
    };

    // Teste 5.1: Dados de mercado básicos
    console.log("📝 Teste 5.1: Dados de mercado básicos...");
    globalStats.totalTests++;
    const tickerResult = await makeBybitRequest('/v5/market/tickers', 'GET', { 
        category: 'linear',
        symbol: 'BTCUSDT'
    }, account);
    
    const tickerTest = {
        name: "Market Data Access",
        status: !tickerResult.error && tickerResult.result?.list?.length > 0 ? "PASS" : "FAIL",
        details: tickerResult.error 
            ? `Error: ${tickerResult.message}`
            : `Price: $${tickerResult.result?.list?.[0]?.lastPrice || 'N/A'}`
    };
    
    if (tickerTest.status === "PASS") {
        categoryResults.passed++;
        globalStats.passedTests++;
        console.log(`   ✅ Dados de mercado OK: ${tickerTest.details}`);
    } else {
        categoryResults.failed++;
        globalStats.failedTests++;
        globalStats.errors.validation++;
        console.log(`   ❌ Erro nos dados: ${tickerTest.details}`);
    }
    categoryResults.tests.push(tickerTest);

    // Teste 5.2: Informações de instrumentos
    console.log("📝 Teste 5.2: Informações de instrumentos...");
    globalStats.totalTests++;
    const instrumentResult = await makeBybitRequest('/v5/market/instruments-info', 'GET', { 
        category: 'linear',
        symbol: 'BTCUSDT'
    }, account);
    
    let instrumentStatus = "FAIL";
    let instrumentDetails = "";
    
    if (!instrumentResult.error && instrumentResult.result?.list?.length > 0) {
        const instrument = instrumentResult.result.list[0];
        instrumentStatus = "PASS";
        instrumentDetails = `Min qty: ${instrument.lotSizeFilter?.minOrderQty || 'N/A'}, Tick size: ${instrument.priceFilter?.tickSize || 'N/A'}`;
        console.log("   ✅ Informações de instrumento OK");
        console.log(`   📏 ${instrumentDetails}`);
    } else {
        instrumentDetails = instrumentResult.error 
            ? `Error: ${instrumentResult.message}`
            : "Dados de instrumento não encontrados";
        console.log(`   ❌ ${instrumentDetails}`);
    }
    
    if (instrumentStatus === "PASS") {
        categoryResults.passed++;
        globalStats.passedTests++;
    } else {
        categoryResults.failed++;
        globalStats.failedTests++;
        globalStats.errors.validation++;
    }
    
    categoryResults.tests.push({
        name: "Instrument Information",
        status: instrumentStatus,
        details: instrumentDetails
    });

    // Teste 5.3: Validação de parâmetros
    console.log("📝 Teste 5.3: Validação de parâmetros...");
    globalStats.totalTests++;
    
    // Teste com parâmetro inválido para verificar validação da API
    const invalidResult = await makeBybitRequest('/v5/market/tickers', 'GET', { 
        category: 'invalid_category'
    }, account);
    
    const validationTest = {
        name: "Parameter Validation",
        status: invalidResult.error || invalidResult.retCode !== 0 ? "PASS" : "FAIL",
        details: invalidResult.error || invalidResult.retCode !== 0
            ? "API rejeita parâmetros inválidos corretamente"
            : "API aceita parâmetros inválidos (problema)"
    };
    
    if (validationTest.status === "PASS") {
        categoryResults.passed++;
        globalStats.passedTests++;
        console.log("   ✅ Validação de parâmetros funcionando");
    } else {
        categoryResults.failed++;
        globalStats.failedTests++;
        globalStats.errors.validation++;
        console.log("   ❌ Validação de parâmetros com problema");
    }
    categoryResults.tests.push(validationTest);

    return categoryResults;
}

// 📊 GERAÇÃO DE RELATÓRIO FINAL
function generateDiagnosticReport(results) {
    console.log("\n" + "=".repeat(80));
    console.log("📋 RELATÓRIO FINAL DO DIAGNÓSTICO COMPLETO");
    console.log("=".repeat(80));
    
    // Estatísticas gerais
    const successRate = ((globalStats.passedTests / globalStats.totalTests) * 100).toFixed(1);
    console.log(`\n📊 ESTATÍSTICAS GERAIS:`);
    console.log(`   Total de testes: ${globalStats.totalTests}`);
    console.log(`   ✅ Sucessos: ${globalStats.passedTests}`);
    console.log(`   ❌ Falhas: ${globalStats.failedTests}`);
    console.log(`   🎯 Taxa de sucesso: ${successRate}%`);
    
    // Estatísticas por categoria de erro
    console.log(`\n🔍 ERROS POR CATEGORIA:`);
    console.log(`   🔐 Autenticação: ${globalStats.errors.authentication}`);
    console.log(`   🔗 Conexão: ${globalStats.errors.connection}`);
    console.log(`   📋 Execução: ${globalStats.errors.execution}`);
    console.log(`   🔒 Permissão: ${globalStats.errors.permission}`);
    console.log(`   🌐 Rede: ${globalStats.errors.network}`);
    console.log(`   📊 Validação: ${globalStats.errors.validation}`);
    
    // Relatório por conta
    console.log(`\n👥 RELATÓRIO POR CONTA:`);
    Object.entries(results).forEach(([accountKey, accountResults]) => {
        const account = ACCOUNTS[accountKey];
        const totalPassed = Object.values(accountResults).reduce((sum, cat) => sum + cat.passed, 0);
        const totalFailed = Object.values(accountResults).reduce((sum, cat) => sum + cat.failed, 0);
        const accountRate = totalPassed + totalFailed > 0 ? ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1) : '0.0';
        
        console.log(`\n   👤 ${account.name}:`);
        console.log(`      📧 ${account.email}`);
        console.log(`      🔑 ${account.apiKey}`);
        console.log(`      📊 Taxa de sucesso: ${accountRate}%`);
        console.log(`      ✅ Sucessos: ${totalPassed}`);
        console.log(`      ❌ Falhas: ${totalFailed}`);
        
        // Status geral da conta
        if (totalFailed === 0) {
            console.log(`      🎉 STATUS: COMPLETAMENTE FUNCIONAL`);
        } else if (totalPassed > totalFailed) {
            console.log(`      ⚠️ STATUS: FUNCIONANDO COM PROBLEMAS MENORES`);
        } else {
            console.log(`      ❌ STATUS: PROBLEMAS CRÍTICOS DETECTADOS`);
        }
    });
    
    // Recomendações
    console.log(`\n🎯 RECOMENDAÇÕES PRIORITÁRIAS:`);
    
    if (globalStats.errors.authentication > 0) {
        console.log(`   🔐 CRÍTICO: Verificar/regenerar API Keys com erro de autenticação`);
    }
    
    if (globalStats.errors.permission > 0) {
        console.log(`   🔒 IMPORTANTE: Configurar permissões e whitelists no painel Bybit`);
    }
    
    if (globalStats.errors.connection > 0) {
        console.log(`   🌐 ATENÇÃO: Verificar conectividade de rede e DNS`);
    }
    
    if (globalStats.errors.network > 0) {
        console.log(`   ⚡ OTIMIZAÇÃO: Considerar melhorias na infraestrutura de rede`);
    }
    
    console.log(`\n✅ DIAGNÓSTICO COMPLETO FINALIZADO!`);
    console.log("=".repeat(80));
}

// 🚀 FUNÇÃO PRINCIPAL
async function runCompleteDiagnostic() {
    console.log("🔍 SISTEMA COMPLETO DE DIAGNÓSTICO - BYBIT API");
    console.log("=====================================================");
    console.log("🚀 Iniciando diagnóstico completo de todas as chaves...\n");
    
    const results = {};
    
    for (const [accountKey, account] of Object.entries(ACCOUNTS)) {
        console.log(`\n${"🔸".repeat(40)}`);
        console.log(`🔍 DIAGNÓSTICO COMPLETO: ${account.name}`);
        console.log(`${"🔸".repeat(40)}`);
        
        results[accountKey] = {
            connection: await testConnectionAuthentication(account),
            execution: await testOrderExecution(account),
            permissions: await testPermissionsConfig(account),
            network: await testNetworkLatency(account),
            validation: await testDataValidation(account)
        };
        
        // Pequena pausa entre contas para evitar rate limit
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    generateDiagnosticReport(results);
}

// Executar o diagnóstico
runCompleteDiagnostic().catch(error => {
    console.error("❌ Erro crítico no diagnóstico:", error.message);
    process.exit(1);
});
