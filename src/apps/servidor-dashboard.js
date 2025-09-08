/**
 * 🌐 SERVIDOR DASHBOARD - SISTEMA DE LEITURA DO MERCADO
 * 
 * Servidor Express para integrar o dashboard com dados reais do banco
 */

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const { CONFIG, validateConfig } = require('../../config/config');

// Validar configurações antes de iniciar
validateConfig();

const app = express();
const PORT = CONFIG.SERVER.PORT;

// Configuração do banco PostgreSQL usando configurações centralizadas
const pool = new Pool({
    connectionString: CONFIG.DATABASE.URL,
    ssl: CONFIG.DATABASE.SSL,
    max: CONFIG.DATABASE.POOL_SIZE,
    idleTimeoutMillis: CONFIG.DATABASE.TIMEOUT
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

/**
 * 📊 API - DADOS PRINCIPAIS DO SISTEMA
 */
app.get('/api/sistema-leitura-mercado', async (req, res) => {
    try {
        console.log('🔍 Buscando dados mais recentes...');
        
        // Buscar o registro mais recente
        const ultimoRegistro = await pool.query(`
            SELECT 
                id,
                cycle_number,
                fear_greed_value,
                fear_greed_classification,
                btc_dominance,
                btc_price,
                market_direction,
                confidence_level,
                reasoning,
                final_recommendation,
                created_at,
                metadata
            FROM sistema_leitura_mercado 
            ORDER BY created_at DESC 
            LIMIT 1
        `);
        
        if (ultimoRegistro.rows.length === 0) {
            return res.json({
                status: 'NO_DATA',
                message: 'Nenhum dado encontrado. Execute o sistema primeiro.',
                timestamp: new Date().toISOString()
            });
        }
        
        const dados = ultimoRegistro.rows[0];
        const metadata = dados.metadata ? JSON.parse(dados.metadata) : {};
        
        // Formatar resposta
        const resposta = {
            status: 'SUCCESS',
            timestamp: new Date().toISOString(),
            lastUpdate: dados.created_at,
            data: {
                // Fear & Greed
                fearGreed: {
                    value: dados.fear_greed_value,
                    classification: dados.fear_greed_classification,
                    source: metadata.fearGreedSource || 'Sistema'
                },
                
                // Bitcoin
                bitcoin: {
                    price: parseFloat(dados.btc_price),
                    dominance: parseFloat(dados.btc_dominance),
                    change24h: metadata.btcChange || 0
                },
                
                // Análise
                analysis: {
                    direction: dados.market_direction,
                    confidence: parseFloat(dados.confidence_level),
                    recommendation: dados.final_recommendation,
                    reasoning: dados.reasoning
                },
                
                // Metadados
                meta: {
                    cycleNumber: dados.cycle_number,
                    recordId: dados.id,
                    openaiTokens: metadata.openaiTokens || 0,
                    isTest: metadata.testeCompleto || false
                }
            }
        };
        
        console.log('✅ Dados enviados para dashboard');
        res.json(resposta);
        
    } catch (error) {
        console.error('❌ Erro na API:', error.message);
        res.status(500).json({
            status: 'ERROR',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * 📈 API - HISTÓRICO DOS ÚLTIMOS CICLOS
 */
app.get('/api/historico', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        const historico = await pool.query(`
            SELECT 
                cycle_number,
                fear_greed_value,
                btc_price,
                market_direction,
                confidence_level,
                created_at
            FROM sistema_leitura_mercado 
            ORDER BY created_at DESC 
            LIMIT $1
        `, [limit]);
        
        res.json({
            status: 'SUCCESS',
            count: historico.rows.length,
            data: historico.rows
        });
        
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            message: error.message
        });
    }
});

/**
 * 🔄 API - STATUS DO SISTEMA
 */
app.get('/api/status', async (req, res) => {
    try {
        // Verificar conexão com banco
        const dbTest = await pool.query('SELECT NOW() as timestamp');
        
        // Contar registros
        const count = await pool.query('SELECT COUNT(*) as total FROM sistema_leitura_mercado');
        
        // Último registro
        const ultimo = await pool.query(`
            SELECT created_at 
            FROM sistema_leitura_mercado 
            ORDER BY created_at DESC 
            LIMIT 1
        `);
        
        res.json({
            status: 'ONLINE',
            database: 'CONNECTED',
            timestamp: dbTest.rows[0].timestamp,
            totalRecords: parseInt(count.rows[0].total),
            lastRecord: ultimo.rows[0]?.created_at || null,
            version: '1.0.0'
        });
        
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            database: 'DISCONNECTED',
            message: error.message
        });
    }
});

/**
 * 🏠 SERVIR DASHBOARD
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard-sistema-leitura-mercado.html'));
});

/**
 * 🚀 INICIAR SERVIDOR
 */
app.listen(PORT, () => {
    console.log('🌐 SERVIDOR DASHBOARD - SISTEMA DE LEITURA DO MERCADO');
    console.log('='.repeat(60));
    console.log(`🔗 Dashboard: http://localhost:${PORT}`);
    console.log(`📊 API Dados: http://localhost:${PORT}/api/sistema-leitura-mercado`);
    console.log(`📈 API Histórico: http://localhost:${PORT}/api/historico`);
    console.log(`🔄 API Status: http://localhost:${PORT}/api/status`);
    console.log('='.repeat(60));
    console.log('✅ Servidor rodando! Acesse o dashboard no navegador.');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Encerrando servidor...');
    await pool.end();
    process.exit(0);
});
