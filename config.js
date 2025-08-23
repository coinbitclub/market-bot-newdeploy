/**
 * 🔧 CONFIGURAÇÃO CENTRALIZADA - SISTEMA DE LEITURA DO MERCADO
 * 
 * ⚠️ Este arquivo NÃO contém chaves reais - apenas configurações
 * As chaves reais devem estar no arquivo .env
 */

require('dotenv').config();

const CONFIG = {
    // 🗄️ BANCO DE DADOS
    DATABASE: {
        URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/trading',
        SSL: { rejectUnauthorized: false },
        POOL_SIZE: 10,
        TIMEOUT: 30000
    },

    // 🪙 APIs EXTERNAS
    APIS: {
        COINSTATS: {
            KEY: process.env.COINSTATS_API_KEY,
            URL: 'https://api.coinstats.app/public/v1/fear-greed',
            TIMEOUT: 10000
        },
        ALTERNATIVE_ME: {
            URL: 'https://api.alternative.me/fng/',
            TIMEOUT: 8000
        },
        BINANCE: {
            URL: 'https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT',
            TIMEOUT: 8000
        },
        OPENAI: {
            KEY: process.env.OPENAI_API_KEY,
            MODEL: 'gpt-4o-mini',
            MAX_TOKENS: 1000,
            TEMPERATURE: 0.3
        }
    },

    // 🌐 SERVIDOR
    SERVER: {
        PORT: parseInt(process.env.PORT) || 3000,
        NODE_ENV: process.env.NODE_ENV || 'development',
        CORS_ORIGIN: process.env.CORS_ORIGIN || '*'
    },

    // 🔄 SISTEMA
    SISTEMA: {
        AUTO_START: process.env.AUTO_START === 'true',
        CYCLE_INTERVAL: parseInt(process.env.CYCLE_INTERVAL) || 900000, // 15 min
        CLEANUP_HOURS: parseInt(process.env.CLEANUP_HOURS) || 24,
        MAX_RETRIES: 3,
        RETRY_DELAY: 5000
    },

    // 🛡️ SEGURANÇA
    SECURITY: {
        RATE_LIMIT: 100, // requests per hour
        API_TIMEOUT: parseInt(process.env.API_TIMEOUT) || 10000,
        MAX_PAYLOAD_SIZE: '1mb'
    },

    // 📊 TRADING
    TRADING: {
        RECOMMENDATIONS: ['SOMENTE_LONG', 'SOMENTE_SHORT', 'LONG_E_SHORT'],
        DIRECTIONS: ['LONG', 'SHORT', 'LONG_E_SHORT'],
        DEFAULT_CONFIDENCE: 75,
        MIN_CONFIDENCE: 60,
        MAX_CONFIDENCE: 95
    }
};

// 🔍 VALIDAÇÃO DE CONFIGURAÇÕES OBRIGATÓRIAS
function validateConfig() {
    const required = [
        'DATABASE_URL"postgresql://username:password@host:port/database"COINSTATS_API_KEYYOUR_API_KEY_HERE❌ CONFIGURAÇÕES OBRIGATÓRIAS AUSENTES:');
        missing.forEach(key => console.error(`   • ${key}`));
        console.error('\n💡 Crie o arquivo .env baseado no .env.example');
        throw new Error('Configurações obrigatórias ausentes');
    }

    console.log('✅ Configurações validadas com sucesso');
}

// 🌍 CONFIGURAÇÃO ESPECÍFICA POR AMBIENTE
function getEnvironmentConfig() {
    if (CONFIG.SERVER.NODE_ENV === 'production') {
        return {
            ...CONFIG,
            SISTEMA: {
                ...CONFIG.SISTEMA,
                AUTO_START: true,
                CLEANUP_HOURS: 24
            },
            SECURITY: {
                ...CONFIG.SECURITY,
                RATE_LIMIT: 50 // Mais restritivo em produção
            }
        };
    }
    
    return CONFIG;
}

module.exports = {
    CONFIG: getEnvironmentConfig(),
    validateConfig
};
