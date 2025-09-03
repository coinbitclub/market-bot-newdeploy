const { Pool } = require('pg');

class VerificarEstruturaSinais {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
    }

    async verificarEstrutura() {
        console.log('🔍 VERIFICANDO ESTRUTURA REAL DAS TABELAS');
        console.log('=========================================\n');

        try {
            // 1. Verificar se trading_signals existe e sua estrutura
            await this.verificarTabelaTradinglSignals();
            
            // 2. Verificar outras tabelas relacionadas
            await this.verificarTabelasRelacionadas();
            
            // 3. Buscar sinais em qualquer tabela que possa ter
            await this.buscarSinaisEmTodasTabelas();

        } catch (error) {
            console.error('❌ Erro:', error.message);
        }
    }

    async verificarTabelaTradinglSignals() {
        console.log('📊 VERIFICANDO TRADING_SIGNALS');
        console.log('─'.repeat(40));

        try {
            // Verificar se a tabela existe
            const tabelaExiste = await this.pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'trading_signals'
                );
            `);

            if (tabelaExiste.rows[0].exists) {
                console.log('✅ Tabela trading_signals EXISTE');
                
                // Verificar estrutura
                const estrutura = await this.pool.query(`
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = 'trading_signals' 
                    ORDER BY ordinal_position
                `);

                console.log('\n📋 Estrutura da tabela:');
                estrutura.rows.forEach(col => {
                    console.log(`   - ${col.column_name}: ${col.data_type}`);
                });

                // Contar registros
                const count = await this.pool.query('SELECT COUNT(*) as total FROM trading_signals');
                console.log(`\n📈 Total de registros: ${count.rows[0].total}`);

                // Se há registros, mostrar alguns
                if (parseInt(count.rows[0].total) > 0) {
                    const sample = await this.pool.query(`
                        SELECT * FROM trading_signals 
                        ORDER BY 
                            CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trading_signals' AND column_name = 'created_at') 
                                 THEN created_at 
                                 ELSE NULL 
                            END DESC NULLS LAST
                        LIMIT 3
                    `);

                    console.log('\n📋 Últimos registros:');
                    sample.rows.forEach((row, index) => {
                        console.log(`${index + 1}.`, JSON.stringify(row, null, 2));
                    });
                }

            } else {
                console.log('❌ Tabela trading_signals NÃO EXISTE!');
            }

        } catch (error) {
            console.log('❌ Erro ao verificar trading_signals:', error.message);
        }
        console.log('');
    }

    async verificarTabelasRelacionadas() {
        console.log('🔍 VERIFICANDO TABELAS RELACIONADAS A SINAIS');
        console.log('─'.repeat(50));

        const tabelasParaVerificar = [
            'user_signals',
            'signals',
            'trading_webhooks',
            'webhook_logs',
            'signal_processing',
            'tradingview_signals'
        ];

        for (const tabela of tabelasParaVerificar) {
            try {
                const existe = await this.pool.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = $1
                    );
                `, [tabela]);

                if (existe.rows[0].exists) {
                    console.log(`✅ ${tabela} EXISTE`);
                    
                    const count = await this.pool.query(`SELECT COUNT(*) as total FROM ${tabela}`);
                    console.log(`   📈 Registros: ${count.rows[0].total}`);
                    
                    if (parseInt(count.rows[0].total) > 0) {
                        // Verificar se tem dados recentes (hoje)
                        try {
                            const hoje = await this.pool.query(`
                                SELECT COUNT(*) as hoje 
                                FROM ${tabela} 
                                WHERE 
                                    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = 'created_at') 
                                         THEN created_at >= CURRENT_DATE 
                                         ELSE false 
                                    END
                            `, [tabela]);
                            console.log(`   📅 Hoje: ${hoje.rows[0].hoje}`);
                        } catch (e) {
                            // Ignorar erro de coluna não existir
                        }
                    }
                } else {
                    console.log(`❌ ${tabela} não existe`);
                }
            } catch (error) {
                console.log(`❌ Erro ao verificar ${tabela}:`, error.message);
            }
        }
        console.log('');
    }

    async buscarSinaisEmTodasTabelas() {
        console.log('🔎 BUSCANDO SINAIS EM TODAS AS TABELAS');
        console.log('─'.repeat(40));

        try {
            // Buscar todas as tabelas que podem ter dados de sinais
            const tabelas = await this.pool.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
                ORDER BY table_name
            `);

            for (const tabela of tabelas.rows) {
                const nomeTabela = tabela.table_name;
                
                try {
                    // Verificar se tem colunas relacionadas a sinais
                    const colunas = await this.pool.query(`
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name = $1 
                        AND (
                            column_name ILIKE '%signal%' 
                            OR column_name ILIKE '%webhook%'
                            OR column_name ILIKE '%trading%'
                            OR column_name ILIKE '%ticker%'
                            OR column_name ILIKE '%symbol%'
                        )
                    `, [nomeTabela]);

                    if (colunas.rows.length > 0) {
                        console.log(`📊 ${nomeTabela} tem colunas relacionadas:`);
                        colunas.rows.forEach(col => {
                            console.log(`   - ${col.column_name}`);
                        });

                        // Verificar se tem dados recentes
                        const count = await this.pool.query(`SELECT COUNT(*) as total FROM ${nomeTabela}`);
                        if (parseInt(count.rows[0].total) > 0) {
                            console.log(`   📈 Total de registros: ${count.rows[0].total}`);
                            
                            // Tentar mostrar alguns dados
                            try {
                                const sample = await this.pool.query(`SELECT * FROM ${nomeTabela} LIMIT 1`);
                                if (sample.rows.length > 0) {
                                    console.log(`   📋 Amostra:`, JSON.stringify(sample.rows[0], null, 2));
                                }
                            } catch (e) {
                                // Ignorar erros de query
                            }
                        }
                        console.log('');
                    }

                } catch (error) {
                    // Ignorar erros de permissão
                }
            }

        } catch (error) {
            console.log('❌ Erro ao buscar sinais:', error.message);
        }
    }

    async executar() {
        await this.verificarEstrutura();
        await this.pool.end();
    }
}

// Executar
const verificador = new VerificarEstruturaSinais();
verificador.executar().catch(console.error);
