/**
 * 📈 EXEMPLOS DE TRADES - COINBITCLUB
 * =================================
 * Exemplos práticos de como executar trades via API
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001';

class ExemplosTrades {
    constructor() {
        this.api = axios.create({
            baseURL: API_BASE,
            timeout: 30000
        });
    }

    /**
     * 📊 VERIFICAR STATUS DO SISTEMA
     */
    async verificarStatus() {
        try {
            console.log('📊 Verificando status do sistema...');
            const response = await this.api.get('/status');
            
            console.log('✅ Status:', response.data);
            return response.data;
            
        } catch (error) {
            console.error('❌ Erro ao verificar status:', error.message);
            return null;
        }
    }

    /**
     * 💰 OBTER SALDOS
     */
    async obterSaldos() {
        try {
            console.log('💰 Obtendo saldos...');
            const response = await this.api.get('/balances');
            
            console.log('✅ Saldos:');
            response.data.balances.forEach(balance => {
                if (balance.balance) {
                    console.log(`   👤 ${balance.username} (${balance.exchange}): $${balance.balance.totalUSD} USDT`);
                } else {
                    console.log(`   ❌ ${balance.username}: ${balance.error}`);
                }
            });
            
            return response.data;
            
        } catch (error) {
            console.error('❌ Erro ao obter saldos:', error.message);
            return null;
        }
    }

    /**
     * 📈 TRADE INDIVIDUAL - COMPRAR BTC
     */
    async comprarBTC(userId = 1, percentage = 10) {
        try {
            console.log(`📈 Comprando BTC (${percentage}% do saldo)...`);
            
            const tradeData = {
                userId: userId,
                exchange: 'bybit',
                environment: 'mainnet',
                symbol: 'BTC/USDT',
                side: 'buy',
                percentage: percentage
            };
            
            const response = await this.api.post('/trade', tradeData);
            
            if (response.data.success) {
                console.log('✅ Trade executado com sucesso!');
                console.log(`   Order ID: ${response.data.orderId}`);
                console.log(`   Símbolo: ${response.data.symbol}`);
                console.log(`   Quantidade: ${response.data.quantity}`);
            } else {
                console.log('❌ Falha no trade:', response.data.error);
            }
            
            return response.data;
            
        } catch (error) {
            console.error('❌ Erro no trade:', error.response?.data || error.message);
            return null;
        }
    }

    /**
     * 📉 TRADE INDIVIDUAL - VENDER BTC
     */
    async venderBTC(userId = 1, percentage = 50) {
        try {
            console.log(`📉 Vendendo BTC (${percentage}% da posição)...`);
            
            const tradeData = {
                userId: userId,
                exchange: 'bybit',
                environment: 'mainnet',
                symbol: 'BTC/USDT',
                side: 'sell',
                percentage: percentage
            };
            
            const response = await this.api.post('/trade', tradeData);
            
            if (response.data.success) {
                console.log('✅ Trade executado com sucesso!');
                console.log(`   Order ID: ${response.data.orderId}`);
                console.log(`   Símbolo: ${response.data.symbol}`);
                console.log(`   Quantidade: ${response.data.quantity}`);
            } else {
                console.log('❌ Falha no trade:', response.data.error);
            }
            
            return response.data;
            
        } catch (error) {
            console.error('❌ Erro no trade:', error.response?.data || error.message);
            return null;
        }
    }

    /**
     * 🚀 TRADE PARA TODOS - COMPRAR ETH
     */
    async comprarETHParaTodos(percentage = 5) {
        try {
            console.log(`🚀 Comprando ETH para todos os usuários (${percentage}% do saldo)...`);
            
            const tradeData = {
                symbol: 'ETH/USDT',
                side: 'buy',
                percentage: percentage
            };
            
            const response = await this.api.post('/trade/all', tradeData);
            
            if (response.data.success) {
                console.log('✅ Trades executados para todos!');
                console.log(`   Total de usuários: ${response.data.results.length}`);
                
                response.data.results.forEach(result => {
                    if (result.success) {
                        console.log(`   ✅ ${result.username}: Order ${result.orderId}`);
                    } else {
                        console.log(`   ❌ ${result.username}: ${result.error}`);
                    }
                });
            } else {
                console.log('❌ Falha nos trades:', response.data.error);
            }
            
            return response.data;
            
        } catch (error) {
            console.error('❌ Erro nos trades:', error.response?.data || error.message);
            return null;
        }
    }

    /**
     * 🔄 FORÇAR VALIDAÇÃO
     */
    async forcarValidacao() {
        try {
            console.log('🔄 Forçando validação das conexões...');
            
            const response = await this.api.post('/validate');
            
            if (response.data.success) {
                console.log('✅ Validação executada!');
                console.log(`   Conexões validadas: ${response.data.validatedConnections}`);
            } else {
                console.log('❌ Falha na validação:', response.data.error);
            }
            
            return response.data;
            
        } catch (error) {
            console.error('❌ Erro na validação:', error.response?.data || error.message);
            return null;
        }
    }

    /**
     * 🧪 EXECUTAR DEMO COMPLETA
     */
    async executarDemo() {
        console.log('\n🧪 EXECUTANDO DEMO DE TRADES');
        console.log('============================');
        
        // 1. Verificar status
        const status = await this.verificarStatus();
        if (!status || !status.isRunning) {
            console.log('❌ Sistema não está rodando!');
            return;
        }
        
        // 2. Obter saldos
        await this.obterSaldos();
        
        // 3. Forçar validação
        await this.forcarValidacao();
        
        // 4. Aguardar um pouco
        console.log('\n⏳ Aguardando 5 segundos...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 5. Comprar BTC para usuário 1
        await this.comprarBTC(1, 5); // 5% do saldo
        
        // 6. Aguardar um pouco
        console.log('\n⏳ Aguardando 3 segundos...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 7. Comprar ETH para todos
        await this.comprarETHParaTodos(3); // 3% do saldo
        
        console.log('\n🎉 Demo concluída!');
    }
}

// Executar demo se chamado diretamente
if (require.main === module) {
    const exemplos = new ExemplosTrades();
    
    // Aguardar sistema inicializar
    setTimeout(() => {
        exemplos.executarDemo().catch(console.error);
    }, 10000); // 10 segundos
}

module.exports = ExemplosTrades;
