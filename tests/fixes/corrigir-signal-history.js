// 🔧 VERIFICAÇÃO E CORREÇÃO DA TABELA SIGNAL_HISTORY
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function verificarSignalHistory() {
    console.log('🔍 VERIFICANDO TABELA SIGNAL_HISTORY');
    console.log('===================================');
    
    try {
        // 1. Verificar se a tabela existe
        console.log('📋 Verificando existência da tabela...');
        const tabelaExiste = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'signal_history'
            )
        `);
        
        if (!tabelaExiste.rows[0].exists) {
            console.log('❌ Tabela signal_history não existe');
            console.log('🔧 Criando tabela signal_history...');
            
            await pool.query(`
                CREATE TABLE signal_history (
                    id SERIAL PRIMARY KEY,
                    ticker VARCHAR(20) NOT NULL,
                    signal_type VARCHAR(50) DEFAULT 'BUY',
                    signal TEXT,
                    source VARCHAR(100) DEFAULT 'UNKNOWN',
                    result VARCHAR(20) DEFAULT 'PENDING',
                    ai_decision VARCHAR(20) DEFAULT 'PENDING',
                    confidence DECIMAL(5,4) DEFAULT 0.5000,
                    is_strong_signal BOOLEAN DEFAULT false,
                    timestamp TIMESTAMP DEFAULT NOW(),
                    processed_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);
            
            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_signal_history_ticker_timestamp 
                ON signal_history(ticker, timestamp DESC)
            `);
            
            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_signal_history_processed_at 
                ON signal_history(processed_at DESC)
            `);
            
            console.log('✅ Tabela signal_history criada com sucesso');
        } else {
            console.log('✅ Tabela signal_history existe');
        }
        
        // 2. Verificar estrutura da tabela
        console.log('\n📊 Verificando estrutura da tabela...');
        const colunas = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'signal_history' 
            ORDER BY ordinal_position
        `);
        
        console.log('📋 Colunas existentes:');
        colunas.rows.forEach(col => {
            console.log(`   ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });
        
        // 3. Verificar se tem a coluna "signal"
        const temColunaSignal = colunas.rows.find(col => col.column_name === 'signal');
        
        if (!temColunaSignal) {
            console.log('\n🔧 Adicionando coluna "signal"...');
            await pool.query(`
                ALTER TABLE signal_history 
                ADD COLUMN signal TEXT DEFAULT ''
            `);
            console.log('✅ Coluna "signal" adicionada');
        } else {
            console.log('\n✅ Coluna "signal" já existe');
        }
        
        // 4. Adicionar outras colunas necessárias se não existirem
        const colunasNecessarias = [
            { nome: 'signal_type', tipo: 'VARCHAR(50)', default: "'BUY'" },
            { nome: 'source', tipo: 'VARCHAR(100)', default: "'UNKNOWN'" },
            { nome: 'result', tipo: 'VARCHAR(20)', default: "'PENDING'" },
            { nome: 'ai_decision', tipo: 'VARCHAR(20)', default: "'PENDING'" },
            { nome: 'confidence', tipo: 'DECIMAL(5,4)', default: '0.5000' },
            { nome: 'is_strong_signal', tipo: 'BOOLEAN', default: 'false' }
        ];
        
        console.log('\n🔧 Verificando colunas necessárias...');
        for (const coluna of colunasNecessarias) {
            const existe = colunas.rows.find(col => col.column_name === coluna.nome);
            if (!existe) {
                console.log(`   ➕ Adicionando ${coluna.nome}...`);
                await pool.query(`
                    ALTER TABLE signal_history 
                    ADD COLUMN ${coluna.nome} ${coluna.tipo} DEFAULT ${coluna.default}
                `);
                console.log(`   ✅ ${coluna.nome} adicionada`);
            } else {
                console.log(`   ✅ ${coluna.nome} já existe`);
            }
        }
        
        // 5. Verificar estrutura final
        console.log('\n📊 ESTRUTURA FINAL:');
        const estruturaFinal = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'signal_history' 
            ORDER BY ordinal_position
        `);
        
        estruturaFinal.rows.forEach(col => {
            console.log(`   ✅ ${col.column_name} (${col.data_type})`);
        });
        
        // 6. Testar query de histórico
        console.log('\n🧪 TESTANDO QUERY DE HISTÓRICO:');
        try {
            const teste = await pool.query(`
                SELECT 
                    ticker,
                    signal,
                    signal_type,
                    result,
                    ai_decision,
                    confidence,
                    is_strong_signal,
                    COUNT(*) as total_signals,
                    COUNT(CASE WHEN result = 'APPROVED' THEN 1 END) as approved_count
                FROM signal_history 
                WHERE ticker = 'BTCUSDT' 
                  AND timestamp >= NOW() - INTERVAL '24 hours'
                GROUP BY ticker, signal, signal_type, result, ai_decision, confidence, is_strong_signal
                ORDER BY approved_count DESC
                LIMIT 5
            `);
            console.log(`   ✅ Query funcionou! ${teste.rows.length} resultados`);
            
            if (teste.rows.length > 0) {
                console.log('   📊 Dados encontrados:');
                teste.rows.forEach(row => {
                    console.log(`      ${row.ticker}: ${row.total_signals} sinais, ${row.approved_count} aprovados`);
                });
            } else {
                console.log('   📊 Tabela vazia - isso é normal se não processou sinais recentemente');
            }
        } catch (error) {
            console.log(`   ❌ Erro na query de teste: ${error.message}`);
        }
        
        console.log('\n✅ VERIFICAÇÃO CONCLUÍDA!');
        
    } catch (error) {
        console.error('❌ Erro geral:', error);
    } finally {
        await pool.end();
    }
}

// Executar verificação
verificarSignalHistory();
