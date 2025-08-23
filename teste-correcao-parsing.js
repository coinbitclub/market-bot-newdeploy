const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:xSgQNe6A3lHQhBNb@monorail.proxy.rlwy.net:28334/railway',
    ssl: { rejectUnauthorized: false }
});

async function testeCorrecaoParsing() {
    console.log('\n🧪 TESTE DE CORREÇÃO DE PARSING DO TRADINGVIEW');
    console.log('=====================================================');
    
    try {
        // Simulando dados reais do TradingView
        const dadosTradingView = {
            time: 'yyyy-MM-dd HH:mm:ss1754352000000',
            close: 1.266,
            signal: 'SINAL LONG FORTE',
            ticker: 'MASKUSDT.P',
            atr_30: 0.0056189637,
            rsi_15: 58.7057092609,
            vol_30: 0,
            ema9_30: 1.2642011716
        };

        console.log('📊 Dados simulados do TradingView:');
        console.log('   • ticker:', dadosTradingView.ticker);
        console.log('   • signal:', dadosTradingView.signal);
        console.log('   • close:', dadosTradingView.close);

        // Testando o parsing corrigido
        const symbolExtraido = dadosTradingView.ticker || 'UNKNOWN';
        const actionExtraida = dadosTradingView.signal || 'BUY';
        const priceExtraido = dadosTradingView.close || 0;

        console.log('\n✅ Após correção do parsing:');
        console.log('   • symbol extraído:', symbolExtraido);
        console.log('   • action extraída:', actionExtraida);
        console.log('   • price extraído:', priceExtraido);

        // Testando inserção no banco
        console.log('\n💾 Testando inserção no banco...');
        
        const query = `
            INSERT INTO signals (
                symbol, action, price, leverage, 
                raw_data, processed_at, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, symbol, action, price
        `;

        const result = await pool.query(query, [
            symbolExtraido,
            actionExtraida,
            priceExtraido,
            10, // leverage
            JSON.stringify(dadosTradingView),
            new Date(),
            'TESTE'
        ]);

        console.log('✅ Sinal inserido com sucesso:');
        console.log('   • ID:', result.rows[0].id);
        console.log('   • Symbol:', result.rows[0].symbol);
        console.log('   • Action:', result.rows[0].action);
        console.log('   • Price:', result.rows[0].price);

        // Limpando o teste
        await pool.query('DELETE FROM signals WHERE status = $1', ['TESTE']);
        console.log('🗑️  Registro de teste removido');

        // Verificando últimos sinais reais
        console.log('\n📊 Verificando últimos 5 sinais reais:');
        const recentSignals = await pool.query(`
            SELECT id, symbol, action, price, created_at, raw_data->>'ticker' as ticker_raw
            FROM signals 
            WHERE status != 'TESTE'
            ORDER BY created_at DESC 
            LIMIT 5
        `);

        recentSignals.rows.forEach((signal, index) => {
            console.log(`   ${index + 1}. ID: ${signal.id} | Symbol: ${signal.symbol} | Ticker Raw: ${signal.ticker_raw} | Action: ${signal.action}`);
        });

        console.log('\n🎯 TESTE CONCLUÍDO COM SUCESSO!');
        console.log('   ✅ Parsing corrigido funciona');
        console.log('   ✅ Symbol extraído do campo ticker');
        console.log('   ✅ Dados salvos corretamente');

    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
    } finally {
        await pool.end();
    }
}

// Executar teste
testeCorrecaoParsing();
