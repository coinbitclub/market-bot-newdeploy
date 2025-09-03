// SECURITY_VALIDATED: 2025-08-08T23:27:20.641Z
// Este arquivo foi verificado e tem credenciais protegidas

const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

// Sistema de limpeza automática dos dados
class DataCleanupService {
    constructor() {
        this.isRunning = false;
        this.cleanupIntervalHours = 24;
        this.intervalId = null;
    }

    async logCleanup(message, type = 'INFO') {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [CLEANUP] [${type}] ${message}`);
        
        try {
            await pool.query(`
                INSERT INTO system_logs (component, level, message, timestamp, data)
                VALUES ($1, $2, $3, $4, $5)
            `, ['data_cleanup', type, message, new Date(), {}]);
        } catch (err) {
            console.error('Erro ao salvar log de limpeza:', err.message);
        }
    }

    async cleanOldMarketData() {
        try {
            this.logCleanup('🧹 Iniciando limpeza de dados antigos...');
            
            // 1. Limpar dados do top100_cryptocurrencies mais antigos que 24h
            const deleteTop100Query = await pool.query(`
                DELETE FROM top100_cryptocurrencies 
                WHERE updated_at < NOW() - INTERVAL '24 hours'
                RETURNING symbol
            `);
            
            this.logCleanup(`📊 Removidos ${deleteTop100Query.rowCount} registros antigos do top100_cryptocurrencies`);
            
            // 2. Limpar logs de sistema mais antigos que 7 dias
            const deleteLogsQuery = await pool.query(`
                DELETE FROM system_logs 
                WHERE timestamp < NOW() - INTERVAL '7 days'
            `);
            
            this.logCleanup(`📝 Removidos ${deleteLogsQuery.rowCount} logs antigos (>7 dias)`);
            
            // 3. Limpar dados de métricas antigas (manter só últimas 48h)
            const deleteMetricsQuery = await pool.query(`
                DELETE FROM signal_metrics_log 
                WHERE created_at < NOW() - INTERVAL '48 hours'
            `);
            
            this.logCleanup(`📈 Removidos ${deleteMetricsQuery.rowCount} registros de métricas antigas`);
            
            // 4. Limpar dados antigos do Fear & Greed (manter só últimas 24h)
            const deleteFearGreedQuery = await pool.query(`
                DELETE FROM fear_greed_index 
                WHERE collected_at < NOW() - INTERVAL '24 hours'
            `);
            
            this.logCleanup(`😨 Removidos ${deleteFearGreedQuery.rowCount} registros de Fear & Greed antigos`);
            
            // 5. Estatísticas após limpeza
            const statsQuery = await pool.query(`
                SELECT 
                    (SELECT COUNT(*) FROM top100_cryptocurrencies) as top100_records,
                    (SELECT COUNT(*) FROM system_logs) as system_logs,
                    (SELECT COUNT(*) FROM signal_metrics_log) as metrics_records,
                    (SELECT COUNT(*) FROM fear_greed_index) as fear_greed_records
            `);
            
            const stats = statsQuery.rows[0];
            this.logCleanup(`📊 Dados atuais: ${stats.top100_records} top100, ${stats.system_logs} logs, ${stats.metrics_records} métricas, ${stats.fear_greed_records} fear&greed`);
            
            return {
                top100_cleaned: deleteTop100Query.rowCount,
                logs_cleaned: deleteLogsQuery.rowCount,
                metrics_cleaned: deleteMetricsQuery.rowCount,
                fear_greed_cleaned: deleteFearGreedQuery.rowCount,
                current_stats: stats
            };
            
        } catch (error) {
            this.logCleanup(`❌ Erro na limpeza: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async collectBTCDominance() {
        try {
            this.logCleanup('📊 Coletando dominância do BTC...');
            
            // Coletar da CoinGecko Global
            const response = await axios.get('https://api.coingecko.com/api/v3/global', {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (response.data && response.data.data && response.data.data.market_cap_percentage) {
                const globalData = response.data.data;
                const btcDominance = globalData.market_cap_percentage.btc;
                
                // Verificar se os dados existem antes de processar
                const totalMarketCap = globalData.total_market_cap && globalData.total_market_cap.usd 
                    ? globalData.total_market_cap.usd 
                    : 0;
                const totalVolume24h = globalData.total_volume_24h && globalData.total_volume_24h.usd 
                    ? globalData.total_volume_24h.usd 
                    : 0;
                
                // Salvar no sistema de logs com dados estruturados
                await pool.query(`
                    INSERT INTO system_logs (component, level, message, timestamp, data)
                    VALUES ($1, $2, $3, $4, $5)
                `, [
                    'btc_dominance',
                    'INFO',
                    `BTC Dominance: ${btcDominance.toFixed(2)}%`,
                    new Date(),
                    {
                        btc_dominance: btcDominance,
                        total_market_cap_usd: totalMarketCap,
                        total_volume_24h_usd: totalVolume24h,
                        active_cryptocurrencies: globalData.active_cryptocurrencies,
                        markets: globalData.markets,
                        market_cap_change_percentage_24h: globalData.market_cap_change_percentage_24h_usd
                    }
                ]);
                
                this.logCleanup(`📈 BTC Dominance: ${btcDominance.toFixed(2)}% | Market Cap: $${(totalMarketCap/1e12).toFixed(2)}T`);
                
                return {
                    btc_dominance: btcDominance,
                    total_market_cap: totalMarketCap,
                    total_volume_24h: totalVolume24h,
                    market_cap_change_24h: globalData.market_cap_change_percentage_24h_usd
                };
            }
            
        } catch (error) {
            this.logCleanup(`❌ Erro ao coletar dominância BTC: ${error.message}`, 'ERROR');
            return null;
        }
    }

    async runDailyCleanup() {
        if (this.isRunning) {
            this.logCleanup('⚠️ Limpeza já em execução, pulando...', 'WARN');
            return;
        }

        this.isRunning = true;
        
        try {
            this.logCleanup('🚀 === INICIANDO LIMPEZA DIÁRIA ===');
            
            // 1. Executar limpeza de dados
            const cleanupResult = await this.cleanOldMarketData();
            
            // 2. Coletar dominância do BTC
            const btcData = await this.collectBTCDominance();
            
            // 3. Otimizar tabelas (VACUUM)
            await pool.query('VACUUM ANALYZE top100_cryptocurrencies');
            await pool.query('VACUUM ANALYZE system_logs');
            await pool.query('VACUUM ANALYZE signal_metrics_log');
            await pool.query('VACUUM ANALYZE fear_greed_index');
            
            this.logCleanup('🗄️ Otimização de tabelas concluída');
            
            // 4. Relatório final
            const summaryData = {
                cleanup_result: cleanupResult,
                btc_dominance: btcData,
                timestamp: new Date().toISOString()
            };
            
            await pool.query(`
                INSERT INTO system_logs (component, level, message, timestamp, data)
                VALUES ($1, $2, $3, $4, $5)
            `, [
                'daily_cleanup_report',
                'INFO',
                'Relatório de limpeza diária concluído',
                new Date(),
                summaryData
            ]);
            
            this.logCleanup('✅ === LIMPEZA DIÁRIA CONCLUÍDA ===');
            
            return summaryData;
            
        } catch (error) {
            this.logCleanup(`❌ Erro na limpeza diária: ${error.message}`, 'ERROR');
        } finally {
            this.isRunning = false;
        }
    }

    startScheduledCleanup() {
        this.logCleanup(`🕐 Iniciando limpeza agendada a cada ${this.cleanupIntervalHours}h`);
        
        // Executar limpeza imediatamente
        this.runDailyCleanup();
        
        // Agendar execuções futuras
        this.intervalId = setInterval(() => {
            this.runDailyCleanup();
        }, this.cleanupIntervalHours * 60 * 60 * 1000); // 24h em ms
        
        this.logCleanup('✅ Agendamento de limpeza ativo');
    }

    stopScheduledCleanup() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.logCleanup('🛑 Agendamento de limpeza parado');
        }
    }
}

// Função principal
async function main() {
    console.log('🧹 SISTEMA DE LIMPEZA AUTOMÁTICA DE DADOS');
    console.log('==========================================');
    
    const cleanupService = new DataCleanupService();
    
    try {
        // Testar conexão
        await pool.query('SELECT NOW()');
        console.log('✅ Conexão com banco estabelecida');
        
        // Verificar argumentos
        if (process.argv.includes('--once')) {
            console.log('🔄 Executando limpeza única...');
            const result = await cleanupService.runDailyCleanup();
            console.log('✅ Limpeza única concluída');
            console.log('📊 Resultado:', JSON.stringify(result, null, 2));
            process.exit(0);
        } else if (process.argv.includes('--btc-only')) {
            console.log('📊 Coletando apenas dominância BTC...');
            const btcData = await cleanupService.collectBTCDominance();
            console.log('✅ BTC Dominance coletada:', btcData);
            process.exit(0);
        } else {
            console.log('🔄 Iniciando serviço de limpeza contínua...');
            cleanupService.startScheduledCleanup();
            
            // Manter processo ativo
            process.on('SIGINT', async () => {
                console.log('\n🛑 Parando serviço de limpeza...');
                cleanupService.stopScheduledCleanup();
                await pool.end();
                process.exit(0);
            });
            
            console.log('📍 Serviço ativo. Pressione Ctrl+C para parar.');
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

module.exports = { DataCleanupService };
