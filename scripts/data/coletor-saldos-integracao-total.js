/**
 * 🚀 COLETOR DE SALDOS - INTEGRAÇÃO TOTAL V2.0
 * Sistema integrado para coleta de saldos REAIS das exchanges
 * Conectado com Order Execution Engine V2.0
 * 
 * @author CoinBitClub
 * @version 2.0
 * @date 2025-01-08
 */

const { Pool } = require('pg');
const axios = require('axios');
const crypto = require('crypto');

// 🎯 CONFIGURAÇÃO DATABASE RAILWAY
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

/**
 * 🟣 VERIFICAR SALDO BYBIT REAL V2.0
 */
async function verificarSaldoBybitReal(usuario) {
    try {
        console.log(`🟣 [BYBIT] Verificando saldo para ${usuario.nome}...`);
        
        const timestamp = Date.now().toString();
        const recvWindow = '5000';
        const queryString = 'accountType=UNIFIED';
        
        // Assinatura Bybit V5
        const signaturePayload = timestamp + usuario.api_key + recvWindow + queryString;
        const signature = crypto.createHmac('sha256', usuario.api_secret).update(signaturePayload).digest('hex');
        
        const baseUrl = usuario.environment === 'testnet' ? 
            'https://api-testnet.bybit.com' : 'https://api.bybit.com';
        
        const response = await axios.get(`${baseUrl}/v5/account/wallet-balance?${queryString}`, {
            headers: {
                'X-BAPI-API-KEY': usuario.api_key,
                'X-BAPI-SIGN': signature,
                'X-BAPI-TIMESTAMP': timestamp,
                'X-BAPI-RECV-WINDOW': recvWindow,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        const data = response.data;
        if (data.retCode === 0) {
            const walletBalance = data.result?.list?.[0]?.totalWalletBalance || 0;
            const equity = data.result?.list?.[0]?.totalEquity || 0;
            const availableBalance = data.result?.list?.[0]?.totalAvailableBalance || 0;
            
            console.log(`✅ [BYBIT] ${usuario.nome}: $${walletBalance} USDT`);
            
            return {
                balance: parseFloat(walletBalance),
                equity: parseFloat(equity),
                available: parseFloat(availableBalance),
                status: 'success',
                exchange: 'bybit',
                environment: usuario.environment || 'mainnet'
            };
        }
        
        throw new Error(`Bybit API Error: ${data.retMsg || 'Falha na autenticação'}`);
        
    } catch (error) {
        console.error(`❌ [BYBIT] Erro ${usuario.nome}:`, error.message);
        return {
            balance: 0,
            equity: 0,
            available: 0,
            status: 'error',
            error: error.response?.data?.retMsg || error.message,
            exchange: 'bybit',
            environment: usuario.environment || 'mainnet'
        };
    }
}

/**
 * 🟡 VERIFICAR SALDO BINANCE REAL V2.0
 */
async function verificarSaldoBinanceReal(usuario) {
    try {
        console.log(`🟡 [BINANCE] Verificando saldo para ${usuario.nome}...`);
        
        const timestamp = Date.now();
        const recvWindow = 5000;
        const queryString = `timestamp=${timestamp}&recvWindow=${recvWindow}`;
        const signature = crypto.createHmac('sha256', usuario.api_secret).update(queryString).digest('hex');
        
        const baseUrl = usuario.environment === 'testnet' ? 
            'https://testnet.binance.vision' : 'https://api.binance.com';
        
        const response = await axios.get(`${baseUrl}/api/v3/account?${queryString}&signature=${signature}`, {
            headers: {
                'X-MBX-APIKEY': usuario.api_key,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        if (response.status === 200) {
            const usdtBalance = response.data.balances?.find(b => b.asset === 'USDT');
            const balance = usdtBalance ? parseFloat(usdtBalance.free) + parseFloat(usdtBalance.locked) : 0;
            const available = usdtBalance ? parseFloat(usdtBalance.free) : 0;
            
            console.log(`✅ [BINANCE] ${usuario.nome}: $${balance} USDT`);
            
            return {
                balance: balance,
                equity: balance, // Para Binance, equity = balance
                available: available,
                status: 'success',
                exchange: 'binance',
                environment: usuario.environment || 'mainnet'
            };
        }
        
        throw new Error(`Binance HTTP ${response.status}`);
        
    } catch (error) {
        console.error(`❌ [BINANCE] Erro ${usuario.nome}:`, error.message);
        return {
            balance: 0,
            equity: 0,
            available: 0,
            status: 'error',
            error: error.response?.data?.msg || error.message,
            exchange: 'binance',
            environment: usuario.environment || 'mainnet'
        };
    }
}

/**
 * 💰 COLETAR SALDOS DE TODOS OS USUÁRIOS ATIVOS
 */
async function coletarSaldosUsuariosAtivos() {
    try {
        console.log('\n🚀 INICIANDO COLETA DE SALDOS REAIS - V2.0');
        console.log('🔍 Buscando usuários ativos (IDs: 14, 15, 16)...\n');
        
        const query = `
            SELECT 
                u.id,
                u.username as nome,
                u.email,
                k.exchange,
                k.api_key,
                k.api_secret,
                k.environment,
                u.is_active as ativo,
                u.created_at,
                u.updated_at
            FROM users u 
            JOIN user_api_keys k ON u.id = k.user_id
            WHERE u.id IN (14, 15, 16) 
            AND u.is_active = true 
            AND k.is_active = true
            ORDER BY u.id
        `;
        
        const result = await pool.query(query);
        const usuarios = result.rows;
        
        if (usuarios.length === 0) {
            console.log('⚠️ Nenhum usuário ativo encontrado para coleta de saldos');
            return;
        }
        
        console.log(`📊 Encontrados ${usuarios.length} usuários ativos para verificação\n`);
        
        const resultados = [];
        let totalCapital = 0;
        let usuariosOperacionais = 0;
        
        // Processar cada usuário
        for (const usuario of usuarios) {
            console.log(`👤 Processando: ${usuario.nome} (ID: ${usuario.id}) - ${usuario.exchange.toUpperCase()}`);
            
            let saldoInfo;
            
            if (usuario.exchange === 'bybit') {
                saldoInfo = await verificarSaldoBybitReal(usuario);
            } else if (usuario.exchange === 'binance') {
                saldoInfo = await verificarSaldoBinanceReal(usuario);
            } else {
                console.log(`❌ Exchange não suportada: ${usuario.exchange}`);
                continue;
            }
            
            // Salvar no banco de dados
            if (saldoInfo.status === 'success') {
                try {
                    await pool.query(`
                        INSERT INTO user_balances (
                            user_id, 
                            exchange, 
                            balance_usd, 
                            available_balance,
                            last_update
                        ) VALUES ($1, $2, $3, $4, NOW())
                        ON CONFLICT (user_id, exchange) 
                        DO UPDATE SET
                            balance_usd = EXCLUDED.balance_usd,
                            available_balance = EXCLUDED.available_balance,
                            last_update = NOW()
                    `, [
                        usuario.id,
                        saldoInfo.exchange,
                        saldoInfo.balance,
                        saldoInfo.available
                    ]);
                    
                    totalCapital += saldoInfo.balance;
                    usuariosOperacionais++;
                    
                } catch (dbError) {
                    console.error(`❌ Erro ao salvar saldo no banco:`, dbError.message);
                }
            }
            
            resultados.push({
                usuario: usuario.nome,
                id: usuario.id,
                exchange: usuario.exchange.toUpperCase(),
                saldo: saldoInfo.balance,
                disponivel: saldoInfo.available,
                status: saldoInfo.status,
                environment: saldoInfo.environment,
                error: saldoInfo.error || null
            });
            
            console.log(); // Linha em branco para separar
        }
        
        // RELATÓRIO FINAL
        console.log('\n📈 RELATÓRIO FINAL DE COLETA DE SALDOS');
        console.log('====================================');
        console.log(`🎯 Total de usuários processados: ${usuarios.length}`);
        console.log(`✅ Usuários operacionais: ${usuariosOperacionais}`);
        console.log(`💰 Capital total disponível: $${totalCapital.toFixed(2)} USDT`);
        console.log(`📊 Taxa de sucesso: ${((usuariosOperacionais/usuarios.length)*100).toFixed(1)}%`);
        
        console.log('\n👥 DETALHAMENTO POR USUÁRIO:');
        resultados.forEach(r => {
            const status = r.status === 'success' ? '✅' : '❌';
            console.log(`${status} ${r.usuario} (${r.exchange}): $${r.saldo.toFixed(2)} USDT ${r.status === 'error' ? `- ${r.error}` : ''}`);
        });
        
        // VERIFICAR INTEGRAÇÃO COM ORDER EXECUTION ENGINE
        console.log('\n🔧 VERIFICAÇÃO DE INTEGRAÇÃO:');
        const engineQuery = await pool.query(`
            SELECT COUNT(*) as total_execucoes,
                   COUNT(CASE WHEN status = 'EXECUTED' THEN 1 END) as sucessos,
                   COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as recentes
            FROM order_executions_v2 
            WHERE user_id IN (14, 15, 16)
        `);
        
        const engineStats = engineQuery.rows[0];
        console.log(`📋 Total de execuções registradas: ${engineStats.total_execucoes}`);
        console.log(`✅ Execuções bem-sucedidas: ${engineStats.sucessos}`);
        console.log(`🕐 Execuções nas últimas 24h: ${engineStats.recentes}`);
        
        console.log('\n🎯 STATUS DO SISTEMA:');
        if (usuariosOperacionais >= 2 && totalCapital >= 300) {
            console.log('🟢 SISTEMA OPERACIONAL - Pronto para trading automático');
        } else if (usuariosOperacionais >= 1) {
            console.log('🟡 SISTEMA PARCIAL - Operação limitada');
        } else {
            console.log('🔴 SISTEMA INDISPONÍVEL - Necessária correção das chaves API');
        }
        
        console.log(`\n⏰ Coleta concluída em: ${new Date().toLocaleString('pt-BR')}`);
        
        return {
            success: true,
            totalUsers: usuarios.length,
            operationalUsers: usuariosOperacionais,
            totalCapital: totalCapital,
            results: resultados,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('❌ ERRO CRÍTICO na coleta de saldos:', error);
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    } finally {
        await pool.end();
    }
}

// 🚀 EXECUTAR COLETA SE CHAMADO DIRETAMENTE
if (require.main === module) {
    coletarSaldosUsuariosAtivos()
        .then(resultado => {
            if (resultado.success) {
                console.log('\n✅ COLETA DE SALDOS CONCLUÍDA COM SUCESSO');
                process.exit(0);
            } else {
                console.log('\n❌ FALHA NA COLETA DE SALDOS');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('❌ ERRO FATAL:', error);
            process.exit(1);
        });
}

module.exports = {
    coletarSaldosUsuariosAtivos,
    verificarSaldoBybitReal,
    verificarSaldoBinanceReal
};
