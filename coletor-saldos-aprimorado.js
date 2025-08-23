const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: {
        rejectUnauthorized: false
    }
});

class ColetorSaldosAprimorado {
    constructor() {
        this.collectCount = 0;
        this.isRunning = false;
        console.log('✅ Coletor de Saldos Aprimorado inicializado');
    }

    async executeCollection() {
        if (this.isRunning) {
            console.log('⏳ Coleta já em andamento, aguardando...');
            return;
        }

        this.isRunning = true;

        try {
            this.collectCount++;
            const timestamp = new Date().toLocaleString('pt-BR');
            
            console.log(`\n🔄 COLETA APRIMORADA #${this.collectCount} - ${timestamp}`);
            console.log('='.repeat(60));
            
            // ESTRATÉGIA 1: Tentar buscar da tabela user_api_keys primeiro
            let users = await this.getUsersFromApiKeysTable();
            
            // ESTRATÉGIA 2: Se não encontrar, buscar da tabela users
            if (users.length === 0) {
                console.log('⚠️ Nenhum usuário encontrado em user_api_keys, buscando em users...');
                users = await this.getUsersFromUsersTable();
            }

            if (users.length === 0) {
                console.log('❌ Nenhum usuário com chaves API válidas encontrado em ambas as tabelas');
                return;
            }

            console.log(`💰 Coletando saldos de ${users.length} configurações...\n`);

            const results = [];

            for (const user of users) {
                console.log(`👤 USUÁRIO ${user.id} (${user.username}) - ${user.exchange.toUpperCase()}:`);
                
                let balance = 0;
                const environment = user.environment || 'testnet';
                
                try {
                    if (user.exchange === 'bybit') {
                        balance = await this.getBybitBalance(user.api_key, user.api_secret, environment);
                    } else if (user.exchange === 'binance') {
                        balance = await this.getBinanceBalance(user.api_key, user.api_secret, environment);
                    }

                    console.log(`💰 Saldo obtido: $${balance.toFixed(2)}`);

                    // Salvar no banco
                    await this.saveBalance(user.id, user.exchange, balance, environment);

                    results.push({
                        userId: user.id,
                        username: user.username,
                        exchange: user.exchange,
                        balance: balance,
                        status: 'success'
                    });

                } catch (error) {
                    console.log(`❌ Erro: ${error.message}`);
                    results.push({
                        userId: user.id,
                        username: user.username,
                        exchange: user.exchange,
                        balance: 0,
                        status: 'error',
                        error: error.message
                    });
                }

                console.log(''); // Linha em branco
            }

            // Relatório final
            const successful = results.filter(r => r.status === 'success').length;
            const failed = results.filter(r => r.status === 'error').length;
            const totalBalance = results.reduce((sum, r) => sum + r.balance, 0);

            console.log('📊 RESUMO DA COLETA:');
            console.log(`✅ Sucessos: ${successful}`);
            console.log(`❌ Falhas: ${failed}`);
            console.log(`💰 Saldo Total: $${totalBalance.toFixed(2)}`);
            console.log('='.repeat(60));

        } catch (error) {
            console.error('❌ Erro na coleta:', error.message);
        } finally {
            this.isRunning = false;
        }
    }

    async getUsersFromApiKeysTable() {
        try {
            const result = await pool.query(`
                SELECT DISTINCT u.id, u.username, uak.exchange, uak.api_key, uak.api_secret, uak.environment
                FROM users u
                INNER JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE u.is_active = true 
                AND uak.is_active = true
                AND uak.api_key IS NOT NULL 
                AND uak.api_secret IS NOT NULL
                AND uak.validation_status = 'valid'
                ORDER BY u.id, uak.exchange
            `);
            
            console.log(`📋 Encontrados ${result.rows.length} usuários na tabela user_api_keys`);
            return result.rows;
        } catch (error) {
            console.log(`⚠️ Erro ao buscar em user_api_keys: ${error.message}`);
            return [];
        }
    }

    async getUsersFromUsersTable() {
        try {
            const result = await pool.query(`
                SELECT id, username, 
                       CASE 
                           WHEN bybit_api_key IS NOT NULL THEN 'bybit'
                           WHEN binance_api_key IS NOT NULL THEN 'binance'
                       END as exchange,
                       CASE 
                           WHEN bybit_api_key IS NOT NULL THEN bybit_api_key
                           WHEN binance_api_key IS NOT NULL THEN binance_api_key
                       END as api_key,
                       CASE 
                           WHEN bybit_api_secret IS NOT NULL THEN bybit_api_secret
                           WHEN binance_api_secret IS NOT NULL THEN binance_api_secret
                       END as api_secret,
                       'testnet' as environment
                FROM users 
                WHERE (bybit_api_key IS NOT NULL OR binance_api_key IS NOT NULL)
                AND is_active = true
                ORDER BY id
            `);
            
            console.log(`📋 Encontrados ${result.rows.length} usuários na tabela users`);
            return result.rows;
        } catch (error) {
            console.log(`⚠️ Erro ao buscar em users: ${error.message}`);
            return [];
        }
    }

    async getBybitBalance(apiKey, apiSecret, environment = 'testnet') {
        const { RestClientV5 } = require('bybit-api');
        
        const isMainnet = environment === 'mainnet';
        
        const client = new RestClientV5({
            key: apiKey,
            secret: apiSecret,
            testnet: !isMainnet
        });

        try {
            const response = await client.getWalletBalance({ accountType: 'UNIFIED' });
            
            if (response.retCode === 0 && response.result?.list?.[0]?.coin) {
                const usdtCoin = response.result.list[0].coin.find(c => c.coin === 'USDT');
                return parseFloat(usdtCoin?.walletBalance || '0');
            }
            
            return 0;
        } catch (error) {
            throw new Error(`Bybit API: ${error.message}`);
        }
    }

    async getBinanceBalance(apiKey, apiSecret, environment = 'testnet') {
        const Binance = require('node-binance-api');
        
        const binance = Binance().options({
            APIKEY: apiKey,
            APISECRET: apiSecret,
            test: environment === 'testnet'
        });

        try {
            const account = await binance.balance();
            const usdtBalance = parseFloat(account.USDT?.available || '0');
            return usdtBalance;
        } catch (error) {
            throw new Error(`Binance API: ${error.message}`);
        }
    }

    async saveBalance(userId, exchange, balance, environment) {
        try {
            await pool.query(`
                INSERT INTO balances (user_id, exchange, balance, environment, collected_at)
                VALUES ($1, $2, $3, $4, NOW())
            `, [userId, exchange, balance, environment]);
        } catch (error) {
            console.log(`⚠️ Erro ao salvar saldo: ${error.message}`);
        }
    }

    startScheduled() {
        // Executar imediatamente
        this.executeCollection();
        
        // Configurar execução a cada 2 minutos
        setInterval(() => {
            this.executeCollection();
        }, 2 * 60 * 1000);
        
        console.log('⏰ Coletor agendado para execução a cada 2 minutos');
    }
}

module.exports = ColetorSaldosAprimorado;
