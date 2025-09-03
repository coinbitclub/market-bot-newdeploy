const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

// 📊 Coletor Fear & Greed Index com CoinStats (Primário) e Alternative.me (Fallback)
const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config();

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

class FearGreedCollector {
    constructor() {
        this.isRunning = false;
        this.intervalId = null;
        this.logger = this.createLogger();
    }

    createLogger() {
        return {
            info: (msg) => console.log(`[${new Date().toISOString()}] [FEAR_GREED] [INFO] ${msg}`),
            error: (msg) => console.log(`[${new Date().toISOString()}] [FEAR_GREED] [ERROR] ${msg}`),
            warn: (msg) => console.log(`[${new Date().toISOString()}] [FEAR_GREED] [WARN] ${msg}`)
        };
    }

    async collectFearGreedData() {
        // Prioridade 1: CoinStats (nossa API do Railway)
        try {
            if (process.env.COINSTATS_API_KEY) {
                this.logger.info('🔄 Coletando Fear & Greed da CoinStats (Primário)...');
                
                const response = await axios.get('https://openapiv1.coinstats.app/insights/fear-and-greed', {
                    headers: {
                        'X-API-KEY"YOUR_COINSTATS_API_KEYYOUR_API_KEY_HERE
                    };
                }
            }
        } catch (error) {
            this.logger.error(`Erro CoinStats: ${error.message}`);
        }

        // Fallback: Alternative.me (gratuito)
        try {
            this.logger.info('🔄 Usando Alternative.me como fallback...');
            
            const response = await axios.get('https://api.alternative.me/fng/?limit=1');
            const fearGreedData = response.data.data[0];
            
            this.logger.info(`📊 Alternative.me - Dados coletados: ${fearGreedData.value} (${fearGreedData.value_classification})`);
            
            return {
                value: parseInt(fearGreedData.value),
                value_classification: fearGreedData.value_classification,
                timestamp_unix: fearGreedData.timestamp,
                time_until_update: fearGreedData.time_until_update,
                source: 'alternative.me'
            };
            
        } catch (error) {
            this.logger.error(`Erro ao coletar dados da Alternative.me: ${error.message}`);
            throw new Error('Falha em ambas as APIs de Fear & Greed');
        }
    }
class FearGreedCollector {
    constructor() {
        this.isRunning = false;
        this.intervalId = null;
        this.updateInterval = 30 * 60 * 1000; // 30 minutos
        this.lastValue = null;
    }

    async logMessage(message, type = 'INFO') {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [FEAR_GREED] [${type}] ${message}`);
        
        try {
            await pool.query(`
                INSERT INTO system_logs (component, level, message, timestamp, data)
                VALUES ($1, $2, $3, $4, $5)
            `, ['fear_greed_collector', type, message, new Date(), {}]);
        } catch (err) {
            console.error('Erro ao salvar log:', err.message);
        }
    }

    async createFearGreedTable() {
        try {
            this.logMessage('📊 Criando tabela fear_greed_index...');
            
            await pool.query(`
                CREATE TABLE IF NOT EXISTS fear_greed_index (
                    id SERIAL PRIMARY KEY,
                    value INTEGER NOT NULL,
                    value_classification VARCHAR(50) NOT NULL,
                    timestamp_unix BIGINT,
                    time_until_update VARCHAR(50),
                    source VARCHAR(50) DEFAULT 'alternative.me',
                    collected_at TIMESTAMP DEFAULT NOW(),
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);
            
            // Criar índices
            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_fear_greed_collected_at ON fear_greed_index(collected_at);
                CREATE INDEX IF NOT EXISTS idx_fear_greed_value ON fear_greed_index(value);
                CREATE INDEX IF NOT EXISTS idx_fear_greed_classification ON fear_greed_index(value_classification);
            `);
            
            this.logMessage('✅ Tabela fear_greed_index criada com sucesso');
            
        } catch (error) {
            this.logMessage(`❌ Erro ao criar tabela: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async collectFearGreedFromAlternative() {
        try {
            this.logMessage('🔄 Coletando Fear & Greed Index da Alternative.me...');
            
            const response = await axios.get('https://api.alternative.me/fng/', {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (response.data && response.data.data && response.data.data[0]) {
                const fearGreedData = response.data.data[0];
                
                this.logMessage(`📊 Dados coletados: ${fearGreedData.value} (${fearGreedData.value_classification})`);
                
                return {
                    value: parseInt(fearGreedData.value),
                    value_classification: fearGreedData.value_classification,
                    timestamp_unix: fearGreedData.timestamp,
                    time_until_update: fearGreedData.time_until_update || null,
                    source: 'alternative.me'
                };
            }
            
            throw new Error('Dados inválidos recebidos da API');
            
        } catch (error) {
            this.logMessage(`❌ Erro ao coletar da Alternative.me: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async collectMarketCapData() {
        try {
            this.logMessage('📊 Coletando dados de Market Cap...');
            
            // Primeiro tentar CoinStats (mais confiável)
            if (process.env.COINSTATS_API_KEY) {
                try {
                    const response = await axios.get('https://openapiv1.coinstats.app/coins?page=1&limit=100', {
                        timeout: 10000,
                        headers: {
                            'Accept': 'application/json',
                            'X-API-KEY"YOUR_COINSTATS_API_KEYYOUR_API_KEY_HERE);
                        const btcDominance = btcCoin ? (btcCoin.marketCap / totalMarketCap) * 100 : null;
                        
                        this.logMessage(`📈 Market Cap: $${(totalMarketCap/1e12).toFixed(2)}T | BTC Dom: ${btcDominance?.toFixed(2)}%`);
                        
                        return {
                            market_cap_total: totalMarketCap,
                            volume_24h: totalVolume,
                            btc_dominance: btcDominance,
                            market_cap_change_24h: null // CoinStats não tem essa info específica
                        };
                    }
                } catch (error) {
                    this.logMessage(`⚠️ CoinStats falhou para market cap: ${error.message}`, 'WARN');
                }
            }
            
            // Fallback: CoinGecko (API pública)
            try {
                this.logMessage('🔄 Tentando CoinGecko como fallback...');
                const response = await axios.get('https://api.coingecko.com/api/v3/global', {
                    timeout: 10000,
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                if (response.data && response.data.data) {
                    const globalData = response.data.data;
                    this.logMessage(`📈 Market Cap: $${(globalData.total_market_cap.usd/1e12).toFixed(2)}T | BTC Dom: ${globalData.market_cap_percentage.btc?.toFixed(2)}%`);
                    
                    return {
                        market_cap_total: globalData.total_market_cap.usd,
                        volume_24h: globalData.total_volume.usd,
                        btc_dominance: globalData.market_cap_percentage.btc,
                        market_cap_change_24h: globalData.market_cap_change_percentage_24h_usd
                    };
                }
            } catch (error) {
                this.logMessage(`⚠️ CoinGecko falhou para market cap: ${error.message}`, 'WARN');
            }
            
            this.logMessage('⚠️ Nenhuma fonte de market cap funcionou', 'WARN');
            return {
                market_cap_total: null,
                volume_24h: null,
                btc_dominance: null,
                market_cap_change_24h: null
            };
            
        } catch (error) {
            this.logMessage(`❌ Erro ao coletar market cap: ${error.message}`, 'ERROR');
            return {
                market_cap_total: null,
                volume_24h: null,
                btc_dominance: null,
                market_cap_change_24h: null
            };
        }
    }

    async collectFearGreedFromCoinStats() {
        try {
            this.logMessage('🔄 Tentando coletar Fear & Greed da CoinStats...');
            
            if (!process.env.COINSTATS_API_KEY) {
                throw new Error('COINSTATS_API_KEY não encontrada no ambiente');
            }
            
            // Endpoint oficial da CoinStats para Fear & Greed
            const response = await axios.get('https://openapiv1.coinstats.app/insights/fear-and-greed', {
                timeout: 15000,
                headers: {
                    'Accept': 'application/json',
                    'X-API-KEY"YOUR_COINSTATS_API_KEYYOUR_API_KEY_HERE: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            this.logMessage(`📊 Dados CoinStats coletados: ${JSON.stringify(response.data)}`);
            
            // Normalizar dados para o formato esperado
            if (response.data && response.data.fearGreedIndex) {
                return {
                    data: [{
                        value: response.data.fearGreedIndex.value,
                        value_classification: response.data.fearGreedIndex.classification || this.getClassificationForValue(response.data.fearGreedIndex.value),
                        timestamp: Date.now() / 1000,
                        time_until_update: response.data.fearGreedIndex.timeUntilUpdate || null
                    }]
                };
            } else if (response.data && response.data.value) {
                return {
                    data: [{
                        value: response.data.value,
                        value_classification: response.data.classification || this.getClassificationForValue(response.data.value),
                        timestamp: Date.now() / 1000,
                        time_until_update: response.data.time_until_update || null
                    }]
                };
            }
            
            throw new Error('Formato de dados inesperado da CoinStats');
            
            throw new Error('Nenhum endpoint da CoinStats funcionou');
            
        } catch (error) {
            this.logMessage(`❌ Erro ao coletar da CoinStats: ${error.message}`, 'ERROR');
            return null;
        }
    }

    async saveToDatabase(fearGreedData) {
        try {
            // Verificar se já existe registro recente (últimos 25 minutos)
            const recentQuery = await pool.query(`
                SELECT id, value, value_classification 
                FROM fear_greed_index 
                WHERE collected_at > NOW() - INTERVAL '25 minutes'
                ORDER BY collected_at DESC 
                LIMIT 1
            `);
            
            // Se valor é igual ao anterior, não inserir duplicata
            if (recentQuery.rows.length > 0) {
                const recent = recentQuery.rows[0];
                if (recent.value === fearGreedData.value && 
                    recent.value_classification === fearGreedData.value_classification) {
                    this.logMessage(`⏭️ Valor inalterado (${fearGreedData.value}), pulando inserção`);
                    return { inserted: false, reason: 'unchanged' };
                }
            }
            
            // Inserir novo registro
            await pool.query(`
                INSERT INTO fear_greed_index (
                    value, value_classification, timestamp_unix, time_until_update, source
                ) VALUES ($1, $2, $3, $4, $5)
            `, [
                fearGreedData.value,
                fearGreedData.value_classification,
                fearGreedData.timestamp_unix,
                fearGreedData.time_until_update,
                fearGreedData.source
            ]);
            
            this.logMessage(`✅ Novo registro salvo: ${fearGreedData.value} (${fearGreedData.value_classification})`);
            
            // Salvar também nos logs estruturados
            await pool.query(`
                INSERT INTO system_logs (component, level, message, timestamp, data)
                VALUES ($1, $2, $3, $4, $5)
            `, [
                'fear_greed_index',
                'INFO',
                `Fear & Greed Index: ${fearGreedData.value} (${fearGreedData.value_classification})`,
                new Date(),
                fearGreedData
            ]);
            
            this.lastValue = fearGreedData.value;
            return { inserted: true, value: fearGreedData.value };
            
        } catch (error) {
            this.logMessage(`❌ Erro ao salvar no banco: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async cleanOldData() {
        try {
            this.logMessage('🧹 Limpando dados antigos (>24h)...');
            
            const deleteQuery = await pool.query(`
                DELETE FROM fear_greed_index 
                WHERE collected_at < NOW() - INTERVAL '24 hours'
            `);
            
            this.logMessage(`🗑️ Removidos ${deleteQuery.rowCount} registros antigos`);
            
            // Manter apenas os últimos 48 registros (24h de dados a cada 30min)
            await pool.query(`
                DELETE FROM fear_greed_index 
                WHERE id NOT IN (
                    SELECT id FROM fear_greed_index 
                    ORDER BY collected_at DESC 
                    LIMIT 48
                )
            `);
            
            return deleteQuery.rowCount;
            
        } catch (error) {
            this.logMessage(`❌ Erro na limpeza: ${error.message}`, 'ERROR');
            return 0;
        }
    }

    async runCollection() {
        if (this.isRunning) {
            this.logMessage('⚠️ Coleta já em execução, aguardando...', 'WARN');
            return;
        }

        this.isRunning = true;
        
        try {
            this.logMessage('🚀 === INICIANDO COLETA FEAR & GREED ===');
            
            let fearGreedData = null;
            let marketCapData = null;
            
            // 1. Coletar dados de market cap em paralelo
            marketCapData = await this.collectMarketCapData();
            
            // 2. Tentar coletar Fear & Greed da Alternative.me primeiro (mais confiável)
            try {
                fearGreedData = await this.collectFearGreedFromAlternative();
            } catch (error) {
                this.logMessage('⚠️ Alternative.me falhou, tentando CoinStats...', 'WARN');
                
                // 3. Se falhar, tentar CoinStats
                fearGreedData = await this.collectFearGreedFromCoinStats();
            }
            
            if (!fearGreedData) {
                throw new Error('Não foi possível coletar dados de nenhuma fonte');
            }
            
            // 4. Combinar dados de Fear & Greed com market cap
            const combinedData = {
                ...fearGreedData,
                ...marketCapData
            };
            
            // 3. Salvar no banco
            const saveResult = await this.saveToDatabase(fearGreedData);
            
            // 4. Limpeza automática a cada 4 horas (8 coletas)
            const now = new Date();
            if (now.getHours() % 4 === 0 && now.getMinutes() < 30) {
                await this.cleanOldData();
            }
            
            this.logMessage(`✅ === COLETA CONCLUÍDA: ${saveResult.inserted ? 'NOVO' : 'DUPLICADO'} ===`);
            
            return saveResult;
            
        } catch (error) {
            this.logMessage(`❌ Erro na coleta: ${error.message}`, 'ERROR');
            return null;
        } finally {
            this.isRunning = false;
        }
    }

    async start() {
        if (this.intervalId) {
            this.logMessage('⚠️ Collector já está rodando', 'WARN');
            return;
        }

        this.logMessage('🚀 === INICIANDO FEAR & GREED COLLECTOR ===');
        this.logMessage('⏰ Coleta automática a cada 30 minutos');
        this.logMessage('🧹 Limpeza automática a cada 24 horas');
        
        try {
            // Criar tabela se não existir
            await this.createFearGreedTable();
            
            // Executar primeira coleta imediatamente
            await this.runCollection();
            
            // Configurar coletas automáticas
            this.intervalId = setInterval(() => {
                this.runCollection();
            }, this.updateInterval);
            
            this.logMessage(`✅ Collector ativo - próxima coleta em 30 minutos`);
            
        } catch (error) {
            this.logMessage(`❌ Erro ao iniciar: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.logMessage('🛑 === FEAR & GREED COLLECTOR PARADO ===');
        }
    }

    async getStatus() {
        try {
            const statsQuery = await pool.query(`
                SELECT 
                    COUNT(*) as total_records,
                    MAX(collected_at) as last_collection,
                    MIN(value) as min_value,
                    MAX(value) as max_value,
                    AVG(value) as avg_value
                FROM fear_greed_index
                WHERE collected_at > NOW() - INTERVAL '24 hours'
            `);
            
            const recentQuery = await pool.query(`
                SELECT value, value_classification, collected_at
                FROM fear_greed_index
                ORDER BY collected_at DESC
                LIMIT 1
            `);
            
            return {
                running: this.intervalId !== null,
                total_records_24h: parseInt(statsQuery.rows[0].total_records),
                last_collection: statsQuery.rows[0].last_collection,
                current_value: recentQuery.rows[0]?.value,
                current_classification: recentQuery.rows[0]?.value_classification,
                avg_value_24h: parseFloat(statsQuery.rows[0].avg_value),
                min_value_24h: parseInt(statsQuery.rows[0].min_value),
                max_value_24h: parseInt(statsQuery.rows[0].max_value)
            };
            
        } catch (error) {
            this.logMessage(`❌ Erro ao obter status: ${error.message}`, 'ERROR');
            return null;
        }
    }
}

// Função principal
async function main() {
    console.log('😨 FEAR & GREED INDEX COLLECTOR');
    console.log('================================');
    
    const collector = new FearGreedCollector();
    
    try {
        // Testar conexão com banco
        await pool.query('SELECT NOW()');
        console.log('✅ Conexão com banco estabelecida');
        
        // Executar coleta única ou contínua
        if (process.argv.includes('--once')) {
            console.log('🔄 Executando coleta única...');
            const result = await collector.runCollection();
            console.log('✅ Coleta única concluída');
            
            if (result) {
                const status = await collector.getStatus();
                if (status) {
                    console.log(`📊 Status: Valor atual: ${status.current_value} (${status.current_classification})`);
                }
            }
            
            process.exit(0);
        } else if (process.argv.includes('--status')) {
            console.log('📊 Verificando status...');
            const status = await collector.getStatus();
            if (status) {
                console.log('📈 Status Fear & Greed:');
                console.log(`   Rodando: ${status.running ? '✅ SIM' : '❌ NÃO'}`);
                console.log(`   Registros 24h: ${status.total_records_24h}`);
                console.log(`   Valor atual: ${status.current_value} (${status.current_classification})`);
                console.log(`   Média 24h: ${status.avg_value_24h?.toFixed(1)}`);
                console.log(`   Min/Max 24h: ${status.min_value_24h}/${status.max_value_24h}`);
                console.log(`   Última coleta: ${status.last_collection}`);
            }
            process.exit(0);
        } else {
            console.log('🔄 Iniciando coleta contínua...');
            await collector.start();
            
            // Manter processo ativo
            process.on('SIGINT', async () => {
                console.log('\n🛑 Parando collector...');
                await collector.stop();
                await pool.end();
                process.exit(0);
            });
            
            console.log('📍 Collector ativo. Pressione Ctrl+C para parar.');
        }
        
    } catch (error) {
        console.error('❌ Erro fatal:', error.message);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    main();
}

module.exports = { FearGreedCollector };
