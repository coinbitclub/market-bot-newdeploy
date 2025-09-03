#!/usr/bin/env node
/**
 * 🔥 SISTEMA PRINCIPAL - COINBITCLUB TRADING REAL
 * Orquestrador completo com execução real de ordens
 */

const { Pool } = require('pg');
const ccxt = require('ccxt');

console.log('🔥 COINBITCLUB - SISTEMA PRINCIPAL TRADING REAL');
console.log('=============================================');

class CoinbitClubTradingSystem {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
            ssl: { rejectUnauthorized: false }
        });
        
        this.tradingEnabled = process.env.ENABLE_REAL_TRADING === 'true';
        this.activeUsers = new Map();
        this.exchanges = new Map();
        this.systemStats = {
            startTime: new Date(),
            signalsProcessed: 0,
            ordersExecuted: 0,
            totalProfit: 0,
            errors: 0
        };
        
        console.log(`🎯 Trading Real: ${this.tradingEnabled ? 'ATIVADO' : 'SIMULAÇÃO'}`);
    }
    
    async initialize() {
        console.log('\n🚀 Inicializando sistema...');
        
        try {
            // 1. Carregar usuários ativos
            await this.loadActiveUsers();
            
            // 2. Configurar exchanges
            await this.setupExchanges();
            
            // 3. Iniciar monitoramento
            await this.startMonitoring();
            
            // 4. Iniciar sistema de sinais
            await this.startSignalProcessor();
            
            console.log('\n✅ Sistema inicializado com sucesso!');
            console.log(`📊 Usuários ativos: ${this.activeUsers.size}`);
            console.log(`🔗 Exchanges conectadas: ${this.exchanges.size}`);
            
            return true;
            
        } catch (error) {
            console.error('\n❌ Erro na inicialização:', error.message);
            return false;
        }
    }
    
    async loadActiveUsers() {
        console.log('👥 Carregando usuários ativos...');
        
        const users = await this.pool.query(`
            SELECT 
                id, username, 
                binance_api_key, binance_api_secret,
                bybit_api_key, bybit_api_secret,
                trading_active, ativo,
                balance_brl, balance_usd, balance,
                risk_percentage, leverage_preference
            FROM users 
            WHERE 
                (binance_api_key IS NOT NULL OR bybit_api_key IS NOT NULL)
                AND (trading_active = true OR ativo = true)
                AND (balance_brl > 0 OR balance_usd > 0 OR balance > 0)
            ORDER BY id
        `);
        
        console.log(`   📊 Encontrados ${users.rows.length} usuários qualificados`);
        
        for (const user of users.rows) {
            this.activeUsers.set(user.id, {
                ...user,
                activePositions: 0,
                totalProfit: 0,
                lastOrderTime: null,
                exchangeConnections: new Map()
            });
            
            console.log(`   ✅ ${user.username} - Saldo: $${(user.balance_brl || 0) + (user.balance_usd || 0)}`);
        }
    }
    
    async setupExchanges() {
        console.log('🔗 Configurando exchanges...');
        
        // Para cada usuário, tentar conectar com suas exchanges
        for (const [userId, user] of this.activeUsers) {
            
            // Configurar Binance se tiver chaves
            if (user.binance_api_key && user.binance_api_secret) {
                try {
                    const binance = new ccxt.binance({
                        apiKey: user.binance_api_key,
                        secret: user.binance_api_secret,
                        sandbox: true, // Testnet por segurança
                        enableRateLimit: true,
                        options: { defaultType: 'future' }
                    });
                    
                    // Testar conexão
                    await binance.fetchBalance();
                    
                    user.exchangeConnections.set('binance', binance);
                    console.log(`   🟡 Binance conectado para ${user.username}`);
                    
                } catch (error) {
                    console.log(`   ❌ Erro Binance ${user.username}: ${error.message}`);
                }
            }
            
            // Configurar Bybit se tiver chaves
            if (user.bybit_api_key && user.bybit_api_secret) {
                try {
                    const bybit = new ccxt.bybit({
                        apiKey: user.bybit_api_key,
                        secret: user.bybit_api_secret,
                        sandbox: true, // Testnet por segurança
                        enableRateLimit: true,
                        options: { defaultType: 'linear' }
                    });
                    
                    // Testar conexão
                    await bybit.fetchBalance();
                    
                    user.exchangeConnections.set('bybit', bybit);
                    console.log(`   🟣 Bybit conectado para ${user.username}`);
                    
                } catch (error) {
                    console.log(`   ❌ Erro Bybit ${user.username}: ${error.message}`);
                }
            }
        }
    }
    
    async startMonitoring() {
        console.log('📊 Iniciando monitoramento...');
        
        // Monitorar a cada 30 segundos
        setInterval(async () => {
            await this.updateSystemStats();
        }, 30000);
        
        // Relatório a cada 5 minutos
        setInterval(async () => {
            await this.printSystemReport();
        }, 5 * 60 * 1000);
    }
    
    async startSignalProcessor() {
        console.log('📡 Iniciando processador de sinais...');
        
        // Verificar novos sinais a cada 10 segundos
        setInterval(async () => {
            await this.processNewSignals();
        }, 10000);
    }
    
    async processNewSignals() {
        try {
            // Buscar sinais novos (últimos 5 minutos)
            const signals = await this.pool.query(`
                SELECT * FROM trading_signals 
                WHERE created_at > NOW() - INTERVAL '5 minutes'
                AND processed = false
                ORDER BY created_at DESC
            `);
            
            for (const signal of signals.rows) {
                if (this.tradingEnabled) {
                    await this.executeSignalForAllUsers(signal);
                } else {
                    console.log(`📡 Sinal simulado: ${signal.symbol} ${signal.action}`);
                }
                
                // Marcar como processado
                await this.pool.query(`
                    UPDATE trading_signals 
                    SET processed = true 
                    WHERE id = $1
                `, [signal.id]);
                
                this.systemStats.signalsProcessed++;
            }
            
        } catch (error) {
            console.error('Erro ao processar sinais:', error.message);
            this.systemStats.errors++;
        }
    }
    
    async executeSignalForAllUsers(signal) {
        console.log(`\n🚀 EXECUTANDO SINAL: ${signal.symbol} ${signal.action}`);
        
        for (const [userId, user] of this.activeUsers) {
            
            // Verificar se usuário pode operar
            if (user.exchangeConnections.size === 0) {
                console.log(`   ⚠️ ${user.username}: Sem exchanges conectadas`);
                continue;
            }
            
            // Calcular tamanho da posição baseado no saldo
            const totalBalance = (user.balance_brl || 0) + (user.balance_usd || 0);
            const positionSize = totalBalance * (user.risk_percentage || 30) / 100;
            
            if (positionSize < 10) {
                console.log(`   ⚠️ ${user.username}: Saldo insuficiente ($${totalBalance})`);
                continue;
            }
            
            // Escolher melhor exchange
            const exchange = this.selectBestExchange(user, signal.symbol);
            if (!exchange) {
                console.log(`   ⚠️ ${user.username}: Nenhuma exchange disponível para ${signal.symbol}`);
                continue;
            }
            
            try {
                // EXECUTAR ORDEM REAL
                await this.executeRealOrder(user, exchange, signal, positionSize);
                
            } catch (error) {
                console.error(`   ❌ ${user.username}: Erro na execução - ${error.message}`);
                this.systemStats.errors++;
            }
        }
    }
    
    selectBestExchange(user, symbol) {
        // Priorizar Bybit para contratos perpétuos
        if (user.exchangeConnections.has('bybit') && symbol.includes('USDT')) {
            return { name: 'bybit', client: user.exchangeConnections.get('bybit') };
        }
        
        // Usar Binance como fallback
        if (user.exchangeConnections.has('binance')) {
            return { name: 'binance', client: user.exchangeConnections.get('binance') };
        }
        
        return null;
    }
    
    async executeRealOrder(user, exchange, signal, positionSize) {
        console.log(`   🎯 ${user.username}: Executando ${signal.action} ${signal.symbol} ($${positionSize})`);
        
        try {
            // Configurar parâmetros da ordem
            const symbol = signal.symbol.replace('.P', ''); // Remover sufixo TradingView
            const side = signal.action.toLowerCase();
            const amount = this.calculateAmount(positionSize, signal.price || 50000);
            
            // EXECUTAR ORDEM REAL NA EXCHANGE
            const order = await exchange.client.createMarketOrder(symbol, side, amount);
            
            console.log(`   ✅ ${user.username}: Ordem executada!`);
            console.log(`      📋 ID: ${order.id}`);
            console.log(`      💰 Quantidade: ${order.amount}`);
            console.log(`      💵 Preço: ${order.price || 'MARKET'}`);
            
            // Registrar no banco
            await this.recordOrderExecution(user.id, exchange.name, order, signal);
            
            user.lastOrderTime = new Date();
            this.systemStats.ordersExecuted++;
            
            return order;
            
        } catch (error) {
            throw new Error(`Falha na execução: ${error.message}`);
        }
    }
    
    calculateAmount(positionSizeUSD, price) {
        // Calcular quantidade baseada no tamanho da posição em USD
        return Math.max(0.001, positionSizeUSD / price);
    }
    
    async recordOrderExecution(userId, exchange, order, signal) {
        try {
            await this.pool.query(`
                INSERT INTO real_orders (
                    user_id, exchange, symbol, side, order_type,
                    quantity, price, order_id, status,
                    signal_id, executed_at, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
            `, [
                userId, exchange, order.symbol, order.side, order.type || 'market',
                order.amount, order.price, order.id, order.status || 'executed',
                signal.id, new Date()
            ]);
            
        } catch (error) {
            console.error('Erro ao registrar ordem:', error.message);
        }
    }
    
    async updateSystemStats() {
        // Atualizar estatísticas em tempo real
        const now = new Date();
        const uptime = Math.floor((now - this.systemStats.startTime) / 1000);
        
        process.title = `CoinbitClub Trading [${this.systemStats.ordersExecuted} ordens] [${uptime}s]`;
    }
    
    async printSystemReport() {
        console.log('\n📊 RELATÓRIO DO SISTEMA');
        console.log('=' * 30);
        
        const uptime = Math.floor((new Date() - this.systemStats.startTime) / 1000 / 60);
        
        console.log(`⏰ Uptime: ${uptime} minutos`);
        console.log(`👥 Usuários ativos: ${this.activeUsers.size}`);
        console.log(`📡 Sinais processados: ${this.systemStats.signalsProcessed}`);
        console.log(`💰 Ordens executadas: ${this.systemStats.ordersExecuted}`);
        console.log(`❌ Erros: ${this.systemStats.errors}`);
        console.log(`🎯 Trading: ${this.tradingEnabled ? 'REAL' : 'SIMULAÇÃO'}`);
        
        // Estatísticas por usuário
        let totalPositions = 0;
        for (const [userId, user] of this.activeUsers) {
            const exchanges = Array.from(user.exchangeConnections.keys()).join(', ');
            console.log(`   ${user.username}: ${exchanges} (${user.activePositions} posições)`);
            totalPositions += user.activePositions;
        }
        
        console.log(`📈 Total posições ativas: ${totalPositions}`);
        console.log('');
    }
}

// Inicializar sistema principal
async function main() {
    const system = new CoinbitClubTradingSystem();
    
    console.log('🔥 Configurações:');
    console.log(`   ENABLE_REAL_TRADING: ${process.env.ENABLE_REAL_TRADING}`);
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'Configurado' : 'Não configurado'}`);
    
    const success = await system.initialize();
    
    if (success) {
        console.log('\n🚀 SISTEMA OPERACIONAL - AGUARDANDO SINAIS');
        console.log('Pressione Ctrl+C para parar');
        
        // Manter o processo ativo
        process.on('SIGINT', async () => {
            console.log('\n🛑 Encerrando sistema...');
            await system.pool.end();
            process.exit(0);
        });
        
    } else {
        console.log('\n❌ Falha na inicialização - encerrando');
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { CoinbitClubTradingSystem };
