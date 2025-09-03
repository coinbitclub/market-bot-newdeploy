#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function setupSystemConfig() {
    try {
        console.log('🔧 Configurando tabela system_config...');
        
        // Tentar dropar e recriar a tabela
        await pool.query('DROP TABLE IF EXISTS system_config');
        
        await pool.query(`
            CREATE TABLE system_config (
                id SERIAL PRIMARY KEY,
                config_key VARCHAR(100) UNIQUE NOT NULL,
                config_value TEXT NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        
        console.log('✅ Tabela system_config criada');
        
        // Inserir configurações
        await pool.query(`
            INSERT INTO system_config (config_key, config_value, description)
            VALUES 
                ('USE_NEW_4_CONDITIONS_SYSTEM', 'true', 'Usar sistema de 4 condições para decisões'),
                ('OPENAI_INTEGRATION_MODE', 'enhanced', 'Modo de integração com OpenAI'),
                ('MIN_CONDITIONS_FOR_EXECUTION', '2', 'Mínimo de condições para executar (de 4)'),
                ('SIGNAL_ANALYSIS_VERSION', '2.0', 'Versão do sistema de análise de sinais')
        `);
        
        console.log('✅ Configurações inseridas');
        
        // Verificar
        const configs = await pool.query('SELECT * FROM system_config');
        console.log('📋 Configurações criadas:');
        configs.rows.forEach(config => {
            console.log(`   ${config.config_key}: ${config.config_value}`);
        });
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

setupSystemConfig().catch(console.error);
