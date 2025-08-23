/**
 * 🚀 SISTEMA DE TRADING INTEGRADO - FLUXO OPERACIONAL COMPLETO
 * 
 * Sistema unificado que integra:
 * - Monitoramento de saldos (Binance & Bybit)
 * - Abertura de posições automáticas
 * - Monitoramento de posições ativas
 * - Fechamento de posições com Stop Loss/Take Profit
 * - Dashboard operacional em tempo real
 * 
 * @author CoinBitClub
 * @version 3.0
 * @date 2025-08-10
 */

const { Pool } = require('pg');
const axios = require('axios');
const crypto = require('crypto');
const WebSocket = require('ws');

// 🎯 CONFIGURAÇÃO DATABASE RAILWAY
const pool = new Pool({
    connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

class TradingSystemIntegrated {
    constructor() {
        this.activePositions = new Map();
        this.userBalances = new Map();
        this.isRunning = false;
        this.monitoringInterval = null;
        this.balanceUpdateInterval = null;
        
        console.log('🚀 SISTEMA DE TRADING INTEGRADO INICIADO');
        console.log('='.repeat(50));
    }

    /**
     * 🔄 INICIALIZAR SISTEMA COMPLETO
     */
    async initialize() {
        try {
            console.log('\n🔧 Inicializando sistemas...');
            
            // 1. Verificar conectividade do banco
            await this.testDatabaseConnection();
            
            // 2. Carregar usuários ativos
            await this.loadActiveUsers();
            
            // 3. Inicializar monitoramento de saldos
            await this.startBalanceMonitoring();
            
            // 4. Inicializar monitoramento de posições
            await this.startPositionMonitoring();
            
            // 5. Configurar sistema de alertas
            await this.setupAlertSystem();
            
            this.isRunning = true;
            console.log('✅ Sistema totalmente operacional!');
            
        } catch (error) {
            console.error('❌ Erro na inicialização:', error.message);
            throw error;
        }
    }

    /**
     * 🗄️ TESTAR CONEXÃO COM BANCO DE DADOS
     */
    async testDatabaseConnection() {
        try {
            const result = await pool.query('SELECT NOW() as current_time');
            console.log(`✅ Banco conectado: ${result.rows[0].current_time}`);
            return true;
        } catch (error) {
            console.error('❌ Erro de conexão com banco:', error.message);
            throw error;
        }
    }

    /**
     * 👥 CARREGAR USUÁRIOS ATIVOS
     */
    async loadActiveUsers() {
        try {
            // Buscar usuários com chaves API válidas (tanto na tabela users quanto user_api_keys)
            const usersQuery = await pool.query(`
                SELECT DISTINCT 
                    u.id, 
                    u.username,
                    u.ativo as is_active,
                    // Chaves da tabela users (legado)
                    u.binance_api_key as user_binance_key,
                    u.binance_api_secret as user_binance_secret,
                    u.bybit_api_key as user_bybit_key,
                    u.bybit_api_secret as user_bybit_secret,
                    -- Chaves da tabela user_api_keys (novo)
                    uak.exchange,
                    uak.api_key as uak_api_key,
                    uak.api_secret as uak_api_secret,
                    uak.environment,
                    uak.validation_status
                FROM users u
                LEFT JOIN user_api_keys uak ON u.id = uak.user_id AND uak.is_active = true
                WHERE u.ativo = true 
                AND (
                    (u.binance_api_key IS NOT NULL AND u.binance_api_secret IS NOT NULL) OR
                    (u.bybit_api_key IS NOT NULL AND u.bybit_api_secret IS NOT NULL) OR
                    (uak.api_key IS NOT NULL AND uak.api_secret IS NOT NULL)
                )
                ORDER BY u.id
            `);

            console.log(`👥 Encontrados ${usersQuery.rows.length} usuários ativos com chaves API`);
            
            // Organizar usuários por exchange
            const usersByExchange = {};
            
            for (const user of usersQuery.rows) {
                if (!usersByExchange[user.id]) {
                    usersByExchange[user.id] = {
                        id: user.id,
                        username: user.username,
                        exchanges: {}
                    };
                }

                // Chaves da tabela user_api_keys (prioridade)
                if (user.uak_api_key && user.uak_api_secret) {
                    usersByExchange[user.id].exchanges[user.exchange] = {
                        apiKey: user.uak_api_key,
                        apiSecret: user.uak_api_secret,
                        environment: user.environment || 'mainnet',
                        source: 'user_api_keys'
                    };
                }
                // Fallback para chaves da tabela users
                else {
                    if (user.user_binance_key && user.user_binance_secret) {
                        usersByExchange[user.id].exchanges['binance'] = {
                            apiKey: user.user_binance_key,
                            apiSecret: user.user_binance_secret,
                            environment: 'mainnet',
                            source: 'users_table'
                        };
                    }
                    if (user.user_bybit_key && user.user_bybit_secret) {
                        usersByExchange[user.id].exchanges['bybit'] = {
                            apiKey: user.user_bybit_key,
                            apiSecret: user.user_bybit_secret,
                            environment: 'mainnet',
                            source: 'users_table'
                        };
                    }
                }
            }

            this.activeUsers = Object.values(usersByExchange);
            
            console.log('\n📊 Resumo dos usuários carregados:');
            this.activeUsers.forEach(user => {
                const exchanges = Object.keys(user.exchanges);
                console.log(`  - ${user.username} (ID: ${user.id}): ${exchanges.join(', ')}`);
            });

            return this.activeUsers;
            
        } catch (error) {
            console.error('❌ Erro ao carregar usuários:', error.message);
            throw error;
        }
    }

    /**
     * 💰 INICIAR MONITORAMENTO DE SALDOS
     */
    async startBalanceMonitoring() {
        console.log('\n💰 Iniciando monitoramento de saldos...');
        
        // Execução imediata
        await this.updateAllBalances();
        
        // Configurar execução periódica (a cada 2 minutos)
        this.balanceUpdateInterval = setInterval(async () => {
            try {
                await this.updateAllBalances();
            } catch (error) {
                console.error('❌ Erro no monitoramento de saldos:', error.message);
            }
        }, 2 * 60 * 1000); // 2 minutos
        
        console.log('✅ Monitoramento de saldos ativo (intervalo: 2min)');
    }

    /**
     * 💰 ATUALIZAR TODOS OS SALDOS
     */
    async updateAllBalances() {
        const timestamp = new Date().toLocaleString('pt-BR');
        console.log(`\n🔄 ATUALIZAÇÃO DE SALDOS - ${timestamp}`);
        console.log('='.repeat(40));
        
        let totalUpdated = 0;
        let totalValue = 0;

        for (const user of this.activeUsers) {
            console.log(`\n👤 ${user.username} (ID: ${user.id}):`);
            
            for (const [exchange, config] of Object.entries(user.exchanges)) {
                try {
                    let balance = 0;
                    
                    if (exchange === 'binance') {
                        balance = await this.getBinanceBalance(config.apiKey, config.apiSecret, config.environment);
                    } else if (exchange === 'bybit') {
                        balance = await this.getBybitBalance(config.apiKey, config.apiSecret, config.environment);
                    }
                    
                    if (balance > 0) {
                        // Salvar no banco
                        await this.saveUserBalance(user.id, exchange, balance, config.environment);
                        
                        console.log(`  ✅ ${exchange.toUpperCase()}: $${balance.toFixed(2)} USDT`);
                        totalUpdated++;
                        totalValue += balance;
                        
                        // Atualizar cache local
                        this.userBalances.set(`${user.id}_${exchange}`, balance);
                    } else {
                        console.log(`  ⚠️ ${exchange.toUpperCase()}: Sem saldo ou erro`);
                    }
                    
                } catch (error) {
                    console.log(`  ❌ ${exchange.toUpperCase()}: ${error.message}`);
                }
            }
        }
        
        console.log(`\n📊 RESUMO: ${totalUpdated} saldos atualizados | Total: $${totalValue.toFixed(2)} USDT`);
    }

    /**
     * 🟡 OBTER SALDO BINANCE
     */
    async getBinanceBalance(apiKey, apiSecret, environment = 'mainnet') {
        try {
            const baseUrl = environment === 'testnet' ? 
                'https://testnet.binance.vision' : 'https://api.binance.com';
            
            const timestamp = Date.now();
            const queryString = `timestamp=${timestamp}`;
            const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');
            
            const response = await axios.get(`${baseUrl}/api/v3/account`, {
                params: { timestamp, signature },
                headers: { 'X-MBX-APIKEY': apiKey },
                timeout: 10000
            });
            
            const usdtBalance = response.data.balances?.find(b => b.asset === 'USDT');
            return usdtBalance ? parseFloat(usdtBalance.free) + parseFloat(usdtBalance.locked) : 0;
            
        } catch (error) {
            console.log(`    ❌ Binance Error: ${error.response?.data?.msg || error.message}`);
            return 0;
        }
    }

    /**
     * 🟣 OBTER SALDO BYBIT
     */
    async getBybitBalance(apiKey, apiSecret, environment = 'mainnet') {
        try {
            const baseUrl = environment === 'testnet' ? 
                'https://api-testnet.bybit.com' : 'https://api.bybit.com';
            
            const timestamp = Date.now().toString();
            const recvWindow = '20000';
            
            const params = { accountType: 'UNIFIED' };
            const queryString = new URLSearchParams(params).toString();
            
            const signaturePayload = timestamp + apiKey + recvWindow + queryString;
            const signature = crypto.createHmac('sha256', apiSecret).update(signaturePayload).digest('hex');
            
            const response = await axios.get(`${baseUrl}/v5/account/wallet-balance`, {
                params,
                headers: {
                    'X-BAPI-API-KEY': apiKey,
                    'X-BAPI-SIGN': signature,
                    'X-BAPI-SIGN-TYPE': '2',
                    'X-BAPI-TIMESTAMP': timestamp,
                    'X-BAPI-RECV-WINDOW': recvWindow,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            });

            if (response.data.retCode === 0 && response.data.result?.list) {
                const accounts = response.data.result.list;
                let totalBalance = 0;
                
                for (const account of accounts) {
                    const coins = account.coin || [];
                    for (const coin of coins) {
                        if (coin.coin === 'USDT') {
                            totalBalance += parseFloat(coin.walletBalance || 0);
                        }
                    }
                }
                
                return totalBalance;
            }
            
            return 0;
            
        } catch (error) {
            console.log(`    ❌ Bybit Error: ${error.response?.data?.retMsg || error.message}`);
            return 0;
        }
    }

    /**
     * 💾 SALVAR SALDO DO USUÁRIO
     */
    async saveUserBalance(userId, exchange, balance, environment) {
        try {
            await pool.query(`
                DELETE FROM balances 
                WHERE user_id = $1 AND exchange = $2 AND asset = 'USDT'
            `, [userId, exchange]);
            
            await pool.query(`
                INSERT INTO balances (user_id, exchange, wallet_balance, asset, account_type, created_at, last_updated, balance_usd, environment)
                VALUES ($1, $2, $3, 'USDT', $4, NOW(), NOW(), $5, $6)
            `, [userId, exchange, balance, exchange === 'bybit' ? 'UNIFIED' : 'SPOT', balance, environment]);
            
        } catch (error) {
            console.log(`    ⚠️ Erro ao salvar saldo: ${error.message}`);
        }
    }

    /**
     * 📈 INICIAR MONITORAMENTO DE POSIÇÕES
     */
    async startPositionMonitoring() {
        console.log('\n📈 Iniciando monitoramento de posições...');
        
        // Execução imediata
        await this.monitorAllPositions();
        
        // Configurar execução periódica (a cada 30 segundos)
        this.monitoringInterval = setInterval(async () => {
            try {
                await this.monitorAllPositions();
            } catch (error) {
                console.error('❌ Erro no monitoramento de posições:', error.message);
            }
        }, 30 * 1000); // 30 segundos
        
        console.log('✅ Monitoramento de posições ativo (intervalo: 30s)');
    }

    /**
     * 📈 MONITORAR TODAS AS POSIÇÕES
     */
    async monitorAllPositions() {
        const timestamp = new Date().toLocaleString('pt-BR');
        console.log(`\n📊 MONITORAMENTO POSIÇÕES - ${timestamp}`);
        
        let totalPositions = 0;
        let totalPnL = 0;

        for (const user of this.activeUsers) {
            for (const [exchange, config] of Object.entries(user.exchanges)) {
                try {
                    if (exchange === 'bybit') {
                        const positions = await this.getBybitPositions(config.apiKey, config.apiSecret, config.environment);
                        
                        if (positions.length > 0) {
                            console.log(`📊 ${user.username} (Bybit) - ${positions.length} posição(ões):`);
                            
                            for (const pos of positions) {
                                const pnl = parseFloat(pos.unrealisedPnl || 0);
                                const emoji = pnl >= 0 ? '📈' : '📉';
                                
                                console.log(`  ${emoji} ${pos.symbol}: ${pos.side} ${pos.size} | PnL: $${pnl.toFixed(2)}`);
                                
                                totalPositions++;
                                totalPnL += pnl;
                                
                                // Salvar posição no banco
                                await this.savePosition(user.id, exchange, pos);
                            }
                        }
                    }
                } catch (error) {
                    console.log(`❌ Erro ${exchange}: ${error.message}`);
                }
            }
        }

        if (totalPositions > 0) {
            console.log(`📊 TOTAL: ${totalPositions} posições | PnL Global: $${totalPnL.toFixed(2)}`);
        }
    }

    /**
     * 🟣 OBTER POSIÇÕES BYBIT
     */
    async getBybitPositions(apiKey, apiSecret, environment = 'mainnet') {
        try {
            const baseUrl = environment === 'testnet' ? 
                'https://api-testnet.bybit.com' : 'https://api.bybit.com';
            
            const timestamp = Date.now().toString();
            const recvWindow = '20000';
            
            const params = { category: 'linear', settleCoin: 'USDT' };
            const queryString = new URLSearchParams(params).toString();
            
            const signaturePayload = timestamp + apiKey + recvWindow + queryString;
            const signature = crypto.createHmac('sha256', apiSecret).update(signaturePayload).digest('hex');
            
            const response = await axios.get(`${baseUrl}/v5/position/list`, {
                params,
                headers: {
                    'X-BAPI-API-KEY': apiKey,
                    'X-BAPI-SIGN': signature,
                    'X-BAPI-SIGN-TYPE': '2',
                    'X-BAPI-TIMESTAMP': timestamp,
                    'X-BAPI-RECV-WINDOW': recvWindow,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            if (response.data.retCode === 0 && response.data.result?.list) {
                // Filtrar apenas posições com tamanho > 0
                return response.data.result.list.filter(pos => parseFloat(pos.size) > 0);
            }
            
            return [];
            
        } catch (error) {
            console.log(`❌ Erro Bybit Positions: ${error.response?.data?.retMsg || error.message}`);
            return [];
        }
    }

    /**
     * 💾 SALVAR POSIÇÃO
     */
    async savePosition(userId, exchange, position) {
        try {
            await pool.query(`
                INSERT INTO active_positions (
                    user_id, exchange, symbol, side, position_size, entry_price, mark_price, 
                    unrealized_pnl, position_value, leverage, created_at, updated_at, is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW(), true)
                ON CONFLICT (user_id, exchange, symbol) 
                DO UPDATE SET 
                    side = $4, position_size = $5, entry_price = $6, mark_price = $7,
                    unrealized_pnl = $8, position_value = $9, leverage = $10, updated_at = NOW(), is_active = true
            `, [
                userId, exchange, position.symbol, position.side, 
                parseFloat(position.size), parseFloat(position.avgPrice || 0),
                parseFloat(position.markPrice || 0), parseFloat(position.unrealisedPnl || 0),
                parseFloat(position.positionValue || 0), parseFloat(position.leverage || 1)
            ]);
            
        } catch (error) {
            console.log(`⚠️ Erro ao salvar posição: ${error.message}`);
        }
    }

    /**
     * 🚨 CONFIGURAR SISTEMA DE ALERTAS
     */
    async setupAlertSystem() {
        console.log('🚨 Sistema de alertas configurado');
        
        // Monitorar PnL crítico
        setInterval(async () => {
            await this.checkCriticalPnL();
        }, 60 * 1000); // 1 minuto
    }

    /**
     * 🚨 VERIFICAR PNL CRÍTICO
     */
    async checkCriticalPnL() {
        try {
            for (const [key, position] of this.activePositions.entries()) {
                const pnlPercent = (position.unrealisedPnl / position.positionValue) * 100;
                
                if (pnlPercent <= -10) { // -10% ou pior
                    console.log(`🚨 ALERTA: ${position.symbol} com PnL crítico: ${pnlPercent.toFixed(2)}%`);
                    // Aqui você pode implementar lógica de fechamento automático
                }
            }
        } catch (error) {
            console.log(`⚠️ Erro no sistema de alertas: ${error.message}`);
        }
    }

    /**
     * 📊 OBTER STATUS DO SISTEMA
     */
    getSystemStatus() {
        return {
            isRunning: this.isRunning,
            activeUsers: this.activeUsers?.length || 0,
            totalBalances: this.userBalances.size,
            totalPositions: this.activePositions.size,
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 🛑 PARAR SISTEMA
     */
    stop() {
        console.log('\n🛑 Parando sistema de trading...');
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        
        if (this.balanceUpdateInterval) {
            clearInterval(this.balanceUpdateInterval);
        }
        
        this.isRunning = false;
        console.log('✅ Sistema parado com sucesso');
    }
}

// 🚀 INICIALIZAR SISTEMA
const tradingSystem = new TradingSystemIntegrated();

async function iniciarSistemaCompleto() {
    try {
        await tradingSystem.initialize();
        
        // Status a cada 5 minutos
        setInterval(() => {
            const status = tradingSystem.getSystemStatus();
            console.log(`\n📊 STATUS: ${status.activeUsers} usuários | ${status.totalPositions} posições | Uptime: ${Math.floor(status.uptime/60)}min`);
        }, 5 * 60 * 1000);
        
    } catch (error) {
        console.error('💥 Falha crítica:', error.message);
        process.exit(1);
    }
}

// Tratamento de sinais para parada graceful
process.on('SIGINT', () => {
    console.log('\n🛑 Recebido SIGINT - Parando sistema...');
    tradingSystem.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Recebido SIGTERM - Parando sistema...');
    tradingSystem.stop();
    process.exit(0);
});

// 🚀 EXECUTAR
if (require.main === module) {
    iniciarSistemaCompleto();
}

module.exports = TradingSystemIntegrated;
