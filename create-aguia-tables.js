const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function createMissingTables() {
    try {
        const client = await pool.connect();
        
        console.log('🦅 Criando tabelas faltantes do Aguia News...\n');
        
        // Criar tabela aguia_news_radars
        console.log('📊 Criando aguia_news_radars...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS aguia_news_radars (
                id SERIAL PRIMARY KEY,
                content TEXT NOT NULL,
                market_data JSONB,
                ai_analysis JSONB,
                generated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'America/Sao_Paulo'),
                is_premium BOOLEAN DEFAULT FALSE,
                plan_required VARCHAR(50) DEFAULT 'FREE'
            )
        `);
        
        // Criar tabela user_radar_access
        console.log('🔐 Criando user_radar_access...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_radar_access (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                radar_id INTEGER NOT NULL,
                accessed_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'America/Sao_Paulo'),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (radar_id) REFERENCES aguia_news_radars(id) ON DELETE CASCADE,
                UNIQUE(user_id, radar_id)
            )
        `);
        
        // Criar índices
        console.log('⚡ Criando índices...');
        await client.query('CREATE INDEX IF NOT EXISTS idx_aguia_news_radars_generated_at ON aguia_news_radars(generated_at)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_user_radar_access_user_id ON user_radar_access(user_id)');
        
        // Inserir radar de exemplo GRATUITO
        console.log('📦 Inserindo radar de exemplo...');
        const result = await client.query(`
            INSERT INTO aguia_news_radars (content, market_data, ai_analysis, is_premium, plan_required)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `, [
            `RADAR DA ÁGUIA NEWS – ${new Date().toLocaleDateString('pt-BR')} – ACESSO GRATUITO

📊 Breve contexto Macroeconômico:
• Mercados globais apresentam consolidação com perspectivas mistas
• Índices americanos em níveis de resistência importantes
• Setor tecnológico mantém liderança com cautela institucional

📉 Breve contexto do mercado de cripto:
• Capitalização total: $2.4T (+0.8% em 24h)
• Fear & Greed Index: 58/100 (Neutral-Greed)
• Bitcoin: $64,120 (+1.4% em 24h)
• Dominância BTC: 53.1%

📈 Tendência:
Mercado em fase de consolidação técnica, com volume moderado e sentiment neutro-positivo. Aguardando catalisadores para definição direcional.

✅ Recomendações:
• Manter posições defensivas com gestão de risco rigorosa
• Aguardar rompimento de níveis técnicos para novas entradas
• Evitar alavancagem excessiva no momento atual
• Focar em criptomoedas com fundamentos sólidos

🎯 Interpretação Estratégica do Mercado:
Momento de cautela e paciência. Mercado aguarda definições macroeconômicas e técnicas para próximos movimentos. Oportunidades pontuais em correções.

---
🤖 Gerado automaticamente pelo sistema Aguia News
📅 ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (Brasília)
🆓 DISPONÍVEL GRATUITAMENTE PARA TODOS OS USUÁRIOS`,
            JSON.stringify({
                btc_price: 64120,
                market_cap: '2.4T',
                fear_greed: 58,
                volume_24h: '42.8B',
                btc_dominance: 53.1
            }),
            JSON.stringify({
                sentiment: 'NEUTRAL_POSITIVE',
                confidence: 0.72,
                recommendation: 'HOLD_DEFENSIVE',
                technical_strength: 'MODERATE'
            }),
            false,
            'FREE'
        ]);
        
        console.log(`✅ Radar gratuito criado (ID: ${result.rows[0].id})`);
        
        // Verificar criação
        const count = await client.query('SELECT COUNT(*) as count FROM aguia_news_radars');
        console.log(`📊 Total de radars no banco: ${count.rows[0].count}`);
        
        client.release();
        await pool.end();
        
        console.log('\n🎉 === TABELAS AGUIA NEWS CRIADAS COM SUCESSO ===');
        console.log('🆓 Modo: GRATUITO para todos os usuários');
        console.log('📊 Status: Pronto para integração');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        await pool.end();
    }
}

createMissingTables();
