const { Pool } = require('pg');

const connectionString = 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway';

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function setupAguiaNewsDatabase() {
    const client = await pool.connect();
    
    try {
        console.log('🦅 === CONFIGURANDO BANCO AGUIA NEWS ===\n');
        
        // 1. Verificar se as tabelas já existem
        console.log('📋 Verificando tabelas existentes...');
        const existingTables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND (table_name LIKE '%aguia%' OR table_name LIKE '%radar%')
        `);
        
        if (existingTables.rows.length > 0) {
            console.log('⚠️ Tabelas já existem:');
            existingTables.rows.forEach(row => console.log(`  - ${row.table_name}`));
            console.log('\n🔄 Dropando tabelas para recriar...');
            
            await client.query('DROP TABLE IF EXISTS user_radar_access CASCADE');
            await client.query('DROP TABLE IF EXISTS aguia_news_radars CASCADE');
            await client.query('DROP TABLE IF EXISTS user_notifications CASCADE');
        }
        
        // 2. Criar tabelas do Aguia News
        console.log('🏗️ Criando estrutura do banco...\n');
        
        // Tabela de notificações do usuário (GRATUITA)
        console.log('📝 Criando tabela user_notifications...');
        await client.query(`
            CREATE TABLE user_notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                notification_type VARCHAR(50) DEFAULT 'GENERAL',
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'America/Sao_Paulo'),
                radar_id INTEGER,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        
        // Tabela de radars do Aguia News (GRATUITA)
        console.log('📊 Criando tabela aguia_news_radars...');
        await client.query(`
            CREATE TABLE aguia_news_radars (
                id SERIAL PRIMARY KEY,
                content TEXT NOT NULL,
                market_data JSONB,
                ai_analysis JSONB,
                generated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'America/Sao_Paulo'),
                is_premium BOOLEAN DEFAULT FALSE,
                plan_required VARCHAR(50) DEFAULT 'FREE'
            )
        `);
        
        // Tabela de acesso ao radar (GRATUITA)
        console.log('🔐 Criando tabela user_radar_access...');
        await client.query(`
            CREATE TABLE user_radar_access (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                radar_id INTEGER NOT NULL,
                accessed_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'America/Sao_Paulo'),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (radar_id) REFERENCES aguia_news_radars(id) ON DELETE CASCADE,
                UNIQUE(user_id, radar_id)
            )
        `);
        
        // 3. Criar índices para performance
        console.log('⚡ Criando índices...');
        await client.query('CREATE INDEX idx_user_notifications_user_id ON user_notifications(user_id)');
        await client.query('CREATE INDEX idx_user_notifications_created_at ON user_notifications(created_at)');
        await client.query('CREATE INDEX idx_aguia_news_radars_generated_at ON aguia_news_radars(generated_at)');
        await client.query('CREATE INDEX idx_user_radar_access_user_id ON user_radar_access(user_id)');
        
        // 4. Inserir dados de exemplo
        console.log('📦 Inserindo dados de exemplo...');
        
        const sampleRadar = await client.query(`
            INSERT INTO aguia_news_radars (content, market_data, ai_analysis, is_premium, plan_required)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `, [
            `RADAR DA ÁGUIA NEWS – ${new Date().toLocaleDateString('pt-BR')} – ACESSO GRATUITO

📊 Breve contexto Macroeconômico:
• Mercados globais em movimento misto com perspectivas cautelosas
• S&P 500 apresenta consolidação em níveis históricos
• Setor tecnológico mantém liderança com volatilidade controlada

📉 Breve contexto do mercado de cripto:
• Capitalização total: $2.3T (+1.2% em 24h)
• Fear & Greed Index: 65/100 (Greed)
• Bitcoin: $63,250 (+2.1% em 24h)
• Dominância BTC: 52.3%

📈 Tendência:
Mercado apresenta tendência construtiva com força moderada, suportada por indicadores técnicos positivos e volume crescente.

✅ Recomendações:
• Manter exposição moderada sem alavancagem excessiva
• Aguardar confirmação de rompimento da resistência para posições maiores
• Operar apenas com sinais técnicos de alta qualidade
• Considerar posições em altcoins durante este período

🎯 Interpretação Estratégica do Mercado:
Cenário construtivo com sentiment positivo. Oportunidades em movimentos de continuação da tendência, mas atenção aos níveis de resistência importantes.

---
🤖 Gerado automaticamente pelo sistema Aguia News
📅 ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (Brasília)
🆓 ACESSO GRATUITO - Disponível para todos os usuários`,
            JSON.stringify({
                btc_price: 63250,
                market_cap: '2.3T',
                fear_greed: 65,
                volume_24h: '45.2B'
            }),
            JSON.stringify({
                sentiment: 'POSITIVE',
                confidence: 0.78,
                recommendation: 'MODERATE_BUY'
            }),
            false,
            'FREE'
        ]);
        
        console.log(`✅ Radar de exemplo criado (ID: ${sampleRadar.rows[0].id})`);
        
        // 5. Verificar estrutura final
        console.log('\n📋 Verificando estrutura criada...');
        const finalTables = await client.query(`
            SELECT table_name, 
                   (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
            FROM information_schema.tables t
            WHERE table_schema = 'public' 
            AND (table_name LIKE '%aguia%' OR table_name LIKE '%radar%' OR table_name = 'user_notifications')
            ORDER BY table_name
        `);
        
        finalTables.rows.forEach(row => {
            console.log(`  ✅ ${row.table_name} (${row.column_count} colunas)`);
        });
        
        console.log('\n🎉 === BANCO AGUIA NEWS CONFIGURADO COM SUCESSO ===');
        console.log('🆓 Modo: GRATUITO PARA TODOS OS USUÁRIOS');
        console.log('📊 Relatórios: Disponíveis para qualquer usuário');
        console.log('🔔 Notificações: Integradas ao sistema principal');
        
    } catch (error) {
        console.error('❌ Erro ao configurar banco:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

setupAguiaNewsDatabase().catch(console.error);
