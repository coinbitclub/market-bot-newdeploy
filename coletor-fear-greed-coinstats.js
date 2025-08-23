console.log('😱 COLETOR FEAR & GREED INDEX - COINSTATS API');
console.log('============================================');

require('dotenv').config();
const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

class FearGreedCollector {
    constructor() {
        this.apiUrl = process.env.FEAR_GREED_URL || 'https://openapiv1.coinstats.app/insights/fear-and-greed';
        this.apiKey = process.env.COINSTATS_API_KEY;
        
        if (!this.apiKey) {
            throw new Error('COINSTATS_API_KEY não encontrada no .env');
        }
    }

    async collectFearGreedData() {
        try {
            console.log('🌐 Conectando com CoinStats API...');
            console.log(`📡 URL: ${this.apiUrl}`);
            console.log(`🔑 API Key: ${this.apiKey.substring(0, 10)}...`);

            const response = await axios.get(this.apiUrl, {
                headers: {
                    'X-API-KEY"YOUR_COINSTATS_API_KEYYOUR_API_KEY_HERE: 'application/json',
                    'User-Agent': 'CoinBitClub-Bot/1.0'
                },
                timeout: 10000
            });

            console.log('✅ Resposta recebida da CoinStats!');
            console.log('📊 Dados brutos:', JSON.stringify(response.data, null, 2));

            // Processar dados da CoinStats
            const data = response.data;
            let fearGreedValue, category;

            // Verificar diferentes formatos possíveis de resposta
            if (data.now && data.now.value !== undefined) {
                // Formato CoinStats com objeto "now"
                fearGreedValue = parseInt(data.now.value);
                category = data.now.value_classification || this.getCategory(fearGreedValue);
            } else if (data.value !== undefined) {
                fearGreedValue = parseInt(data.value);
                category = this.getCategory(fearGreedValue);
            } else if (data.fear_greed_value !== undefined) {
                fearGreedValue = parseInt(data.fear_greed_value);
                category = data.category || this.getCategory(fearGreedValue);
            } else if (data.data && data.data.value !== undefined) {
                fearGreedValue = parseInt(data.data.value);
                category = data.data.category || this.getCategory(fearGreedValue);
            } else {
                throw new Error('Formato de resposta não reconhecido da CoinStats API');
            }

            console.log(`📈 Fear & Greed Index: ${fearGreedValue}`);
            console.log(`🏷️  Categoria: ${category}`);

            // Salvar no banco de dados
            await this.saveFearGreedData(fearGreedValue, category);

            return { value: fearGreedValue, category };

        } catch (error) {
            console.error('❌ Erro ao coletar Fear & Greed:', error.message);
            
            if (error.response) {
                console.error('📡 Status:', error.response.status);
                console.error('📡 Headers:', error.response.headers);
                console.error('📡 Data:', error.response.data);
            }

            // Em caso de erro, usar valor padrão ou último valor conhecido
            return await this.getLastKnownValue();
        }
    }

    getCategory(value) {
        if (value >= 75) return 'Extreme Greed';
        if (value >= 55) return 'Greed';
        if (value >= 45) return 'Neutral';
        if (value >= 25) return 'Fear';
        return 'Extreme Fear';
    }

    async saveFearGreedData(value, category) {
        try {
            // Inserção simples na tabela fear_greed_index
            const result = await pool.query(`
                INSERT INTO fear_greed_index (
                    value, 
                    value_classification, 
                    fear_greed_value, 
                    category, 
                    collected_at,
                    data_source
                )
                VALUES ($1, $2, $3, $4, NOW(), 'CoinStats API')
                RETURNING *
            `, [value, category, value, category]);

            console.log('💾 Dados salvos no banco de dados');
            console.log('📊 Registro:', result.rows[0]);

        } catch (error) {
            console.error('❌ Erro ao salvar no banco:', error.message);
            
            // Tentar uma inserção mínima se a primeira falhar
            try {
                await pool.query(`
                    INSERT INTO fear_greed_index (value, value_classification, collected_at)
                    VALUES ($1, $2, NOW())
                `, [value, category]);
                console.log('💾 Dados salvos com inserção mínima');
            } catch (simpleError) {
                console.error('❌ Erro na inserção mínima:', simpleError.message);
            }
        }
    }

    async getLastKnownValue() {
        try {
            const result = await pool.query(`
                SELECT value, fear_greed_value, category, collected_at
                FROM fear_greed_index 
                ORDER BY collected_at DESC 
                LIMIT 1
            `);

            if (result.rows.length > 0) {
                const lastValue = result.rows[0];
                console.log('📚 Usando último valor conhecido:', lastValue);
                return {
                    value: lastValue.value || lastValue.fear_greed_value,
                    category: lastValue.category
                };
            }

            // Se não houver dados, retornar neutro
            console.log('⚠️ Nenhum valor conhecido, usando neutro');
            return { value: 50, category: 'Neutral' };

        } catch (error) {
            console.error('❌ Erro ao buscar último valor:', error.message);
            return { value: 50, category: 'Neutral' };
        }
    }

    async testConnection() {
        console.log('\n🔧 TESTE DE CONEXÃO COM COINSTATS');
        console.log('=================================');
        
        try {
            // Teste simples de conectividade
            const response = await axios.get(this.apiUrl, {
                headers: {
                    'X-API-KEY"YOUR_COINSTATS_API_KEYYOUR_API_KEY_HERE: 'application/json'
                },
                timeout: 5000
            });

            console.log('✅ Conexão bem-sucedida!');
            console.log('📊 Status:', response.status);
            console.log('📊 Headers:', response.headers['content-type']);
            
            return true;

        } catch (error) {
            console.log('❌ Falha na conexão:', error.message);
            return false;
        }
    }
}

async function main() {
    try {
        const collector = new FearGreedCollector();
        
        // Testar conexão primeiro
        const connected = await collector.testConnection();
        
        if (connected) {
            console.log('\n📈 COLETANDO DADOS ATUAIS...');
            console.log('============================');
            
            const data = await collector.collectFearGreedData();
            
            console.log('\n🎯 RESULTADO FINAL:');
            console.log('==================');
            console.log(`Fear & Greed Index: ${data.value} (${data.category})`);
        }

    } catch (error) {
        console.error('❌ Erro geral:', error.message);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = FearGreedCollector;
