const { Pool } = require('pg');

class AnaliseSistemaCompleta {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
    }

    async analisarTodasTabelas() {
        console.log('🔍 ANÁLISE COMPLETA DO BANCO DE DADOS');
        console.log('=====================================\n');

        try {
            // 1. Listar todas as tabelas
            const tabelasQuery = await this.pool.query(`
                SELECT table_name, table_type 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name
            `);

            console.log('📋 TABELAS ENCONTRADAS:');
            console.log('----------------------');
            tabelasQuery.rows.forEach((row, index) => {
                console.log(`${index + 1}. ${row.table_name} (${row.table_type})`);
            });

            console.log('\n🔍 ANÁLISE DETALHADA DE CADA TABELA:\n');

            // 2. Analisar estrutura e dados de cada tabela
            for (const tabela of tabelasQuery.rows) {
                await this.analisarTabela(tabela.table_name);
                console.log('─'.repeat(80));
            }

        } catch (error) {
            console.error('❌ Erro na análise:', error.message);
        }
    }

    async analisarTabela(nomeTabela) {
        try {
            console.log(`📊 TABELA: ${nomeTabela.toUpperCase()}`);
            
            // Estrutura da tabela
            const estruturaQuery = await this.pool.query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = $1 
                ORDER BY ordinal_position
            `, [nomeTabela]);

            console.log('🏗️  Estrutura:');
            estruturaQuery.rows.forEach(col => {
                console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
            });

            // Contagem de registros
            const countQuery = await this.pool.query(`SELECT COUNT(*) as total FROM ${nomeTabela}`);
            const total = countQuery.rows[0].total;
            console.log(`📈 Total de registros: ${total}`);

            if (parseInt(total) > 0) {
                // Últimos registros para entender os dados
                const sampleQuery = await this.pool.query(`
                    SELECT * FROM ${nomeTabela} 
                    ORDER BY 
                        CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = 'created_at') 
                             THEN created_at 
                             ELSE NULL 
                        END DESC 
                    LIMIT 3
                `, [nomeTabela]);

                console.log('🔍 Amostra de dados (últimos registros):');
                if (sampleQuery.rows.length > 0) {
                    console.log(JSON.stringify(sampleQuery.rows[0], null, 2));
                    if (sampleQuery.rows.length > 1) {
                        console.log('   ... e mais', sampleQuery.rows.length - 1, 'registros similares');
                    }
                }

                // Análise específica por tipo de tabela
                await this.analisarTabelaEspecifica(nomeTabela, estruturaQuery.rows);
            }

            console.log('');

        } catch (error) {
            console.log(`❌ Erro ao analisar ${nomeTabela}: ${error.message}`);
        }
    }

    async analisarTabelaEspecifica(nomeTabela, colunas) {
        try {
            const temCreatedAt = colunas.some(col => col.column_name === 'created_at');
            const temUserId = colunas.some(col => col.column_name === 'user_id');

            if (nomeTabela === 'trading_signals' && temCreatedAt) {
                const statsQuery = await this.pool.query(`
                    SELECT 
                        COUNT(*) as total,
                        COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as hoje,
                        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as semana,
                        COUNT(DISTINCT CASE WHEN signal_type IS NOT NULL THEN signal_type END) as tipos_sinal
                    FROM trading_signals
                `);
                console.log('📊 Estatísticas de Sinais:');
                console.log(`   - Hoje: ${statsQuery.rows[0].hoje}`);
                console.log(`   - Esta semana: ${statsQuery.rows[0].semana}`);
                console.log(`   - Tipos diferentes: ${statsQuery.rows[0].tipos_sinal}`);
            }

            if (nomeTabela === 'active_positions' && temCreatedAt) {
                const positionsQuery = await this.pool.query(`
                    SELECT 
                        COUNT(*) as total,
                        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as ativas,
                        COUNT(CASE WHEN position_type = 'LONG' THEN 1 END) as long_positions,
                        COUNT(CASE WHEN position_type = 'SHORT' THEN 1 END) as short_positions
                    FROM active_positions
                `);
                console.log('📊 Estatísticas de Posições:');
                console.log(`   - Ativas: ${positionsQuery.rows[0].ativas}`);
                console.log(`   - LONG: ${positionsQuery.rows[0].long_positions}`);
                console.log(`   - SHORT: ${positionsQuery.rows[0].short_positions}`);
            }

            if (nomeTabela === 'users' && temCreatedAt) {
                const usersQuery = await this.pool.query(`
                    SELECT 
                        COUNT(*) as total,
                        COUNT(CASE WHEN is_active = true THEN 1 END) as ativos,
                        COUNT(CASE WHEN binance_api_key_encrypted IS NOT NULL THEN 1 END) as com_binance,
                        COUNT(CASE WHEN bybit_api_key_encrypted IS NOT NULL THEN 1 END) as com_bybit
                    FROM users
                    WHERE deleted_at IS NULL
                `);
                console.log('📊 Estatísticas de Usuários:');
                console.log(`   - Ativos: ${usersQuery.rows[0].ativos}`);
                console.log(`   - Com Binance: ${usersQuery.rows[0].com_binance}`);
                console.log(`   - Com Bybit: ${usersQuery.rows[0].com_bybit}`);
            }

            if (nomeTabela === 'ai_market_analysis' && temCreatedAt) {
                const aiQuery = await this.pool.query(`
                    SELECT 
                        COUNT(*) as total,
                        COUNT(CASE WHEN market_direction = 'BULLISH' THEN 1 END) as bullish,
                        COUNT(CASE WHEN market_direction = 'BEARISH' THEN 1 END) as bearish,
                        AVG(confidence_score) as avg_confidence
                    FROM ai_market_analysis
                    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
                `);
                console.log('📊 Estatísticas de IA (7 dias):');
                console.log(`   - Análises BULLISH: ${aiQuery.rows[0].bullish}`);
                console.log(`   - Análises BEARISH: ${aiQuery.rows[0].bearish}`);
                console.log(`   - Confiança média: ${parseFloat(aiQuery.rows[0].avg_confidence || 0).toFixed(2)}%`);
            }

        } catch (error) {
            console.log(`   ⚠️  Erro na análise específica: ${error.message}`);
        }
    }

    async gerarRelatorioCompleto() {
        console.log('\n🎯 RELATÓRIO EXECUTIVO DO SISTEMA');
        console.log('=================================\n');

        try {
            // Status geral do sistema
            const statusSistema = await this.pool.query(`
                SELECT 
                    (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) as total_usuarios,
                    (SELECT COUNT(*) FROM trading_signals WHERE created_at >= CURRENT_DATE) as sinais_hoje,
                    (SELECT COUNT(*) FROM active_positions WHERE status = 'ACTIVE') as posicoes_ativas,
                    (SELECT COUNT(*) FROM admin_logs WHERE created_at >= CURRENT_DATE) as logs_hoje
            `);

            const status = statusSistema.rows[0];
            console.log('📊 STATUS ATUAL DO SISTEMA:');
            console.log(`   - Usuários ativos: ${status.total_usuarios}`);
            console.log(`   - Sinais processados hoje: ${status.sinais_hoje}`);
            console.log(`   - Posições ativas: ${status.posicoes_ativas}`);
            console.log(`   - Logs administrativos hoje: ${status.logs_hoje}`);

            console.log('\n✅ Análise completa finalizada!');
            console.log('💡 Próximo passo: Analisar o documento SISTEMA-AUTOMATICO-100-COMPLETO.md');

        } catch (error) {
            console.error('❌ Erro no relatório:', error.message);
        }
    }

    async executar() {
        await this.analisarTodasTabelas();
        await this.gerarRelatorioCompleto();
        await this.pool.end();
    }
}

// Executar análise
const analise = new AnaliseSistemaCompleta();
analise.executar().catch(console.error);
