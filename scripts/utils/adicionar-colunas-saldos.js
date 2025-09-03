/**
 * 🔧 ADICIONAR COLUNAS DE SALDOS REAIS
 * Script para corrigir a estrutura da tabela user_api_keys
 * 
 * @author CoinBitClub
 * @version 1.0
 * @date 2025-01-08
 */

const { Pool } = require('pg');

// Configuração do banco
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function adicionarColunasSaldos() {
    try {
        console.log('🔧 Verificando e adicionando colunas de saldos...');

        // Verificar se a tabela user_api_keys existe
        const checkTable = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'user_api_keys'
            );
        `);

        if (!checkTable.rows[0].exists) {
            console.log('📝 Criando tabela user_api_keys...');
            await pool.query(`
                CREATE TABLE user_api_keys (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    exchange VARCHAR(50) NOT NULL,
                    api_key TEXT NOT NULL,
                    api_secret TEXT NOT NULL,
                    environment VARCHAR(20) DEFAULT 'mainnet',
                    is_valid BOOLEAN DEFAULT false,
                    real_balance_usdt NUMERIC(20,8) DEFAULT 0,
                    validation_error TEXT,
                    last_balance_check TIMESTAMP DEFAULT NOW(),
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
            `);
            console.log('✅ Tabela user_api_keys criada');
        } else {
            console.log('✅ Tabela user_api_keys já existe');
        }

        // Verificar e adicionar colunas que não existem
        const columns = [
            {
                name: 'real_balance_usdt',
                type: 'NUMERIC(20,8)',
                default: '0'
            },
            {
                name: 'is_valid',
                type: 'BOOLEAN',
                default: 'false'
            },
            {
                name: 'validation_error',
                type: 'TEXT',
                default: null
            },
            {
                name: 'last_balance_check',
                type: 'TIMESTAMP',
                default: 'NOW()'
            },
            {
                name: 'environment',
                type: 'VARCHAR(20)',
                default: "'mainnet'"
            }
        ];

        for (const column of columns) {
            try {
                // Verificar se a coluna existe
                const checkColumn = await pool.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.columns 
                        WHERE table_name = 'user_api_keys' 
                        AND column_name = $1
                    );
                `, [column.name]);

                if (!checkColumn.rows[0].exists) {
                    const defaultClause = column.default ? `DEFAULT ${column.default}` : '';
                    await pool.query(`
                        ALTER TABLE user_api_keys 
                        ADD COLUMN ${column.name} ${column.type} ${defaultClause};
                    `);
                    console.log(`✅ Coluna ${column.name} adicionada`);
                } else {
                    console.log(`✅ Coluna ${column.name} já existe`);
                }
            } catch (error) {
                console.log(`⚠️ Erro ao adicionar coluna ${column.name}:`, error.message);
            }
        }

        // Verificar estrutura final
        const finalStructure = await pool.query(`
            SELECT column_name, data_type, column_default, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'user_api_keys'
            ORDER BY ordinal_position;
        `);

        console.log('\n📊 ESTRUTURA FINAL DA TABELA user_api_keys:');
        finalStructure.rows.forEach(col => {
            console.log(`   📋 ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
        });

        // Verificar dados existentes
        const existingData = await pool.query(`
            SELECT COUNT(*) as total FROM user_api_keys;
        `);

        console.log(`\n📊 Total de registros: ${existingData.rows[0].total}`);

        // Se não há dados, inserir dados de exemplo das chaves existentes
        if (existingData.rows[0].total === '0') {
            console.log('📝 Migrando chaves existentes dos usuários...');
            
            await pool.query(`
                INSERT INTO user_api_keys (user_id, exchange, api_key, api_secret, environment, is_valid)
                SELECT 
                    id as user_id,
                    'bybit' as exchange,
                    bybit_api_key as api_key,
                    bybit_api_secret as api_secret,
                    CASE WHEN exchange_testnet_mode = true THEN 'testnet' ELSE 'mainnet' END as environment,
                    CASE WHEN api_validation_status = 'valid' THEN true ELSE false END as is_valid
                FROM users 
                WHERE bybit_api_key IS NOT NULL AND bybit_api_secret IS NOT NULL
                  AND bybit_api_key != '' AND bybit_api_secret != '';
            `);

            const migrated = await pool.query(`SELECT COUNT(*) as total FROM user_api_keys;`);
            console.log(`✅ ${migrated.rows[0].total} chaves migradas`);
        }

        console.log('\n✅ CONFIGURAÇÃO DE SALDOS CONCLUÍDA COM SUCESSO!');
        return true;

    } catch (error) {
        console.error('❌ Erro ao configurar colunas de saldos:', error);
        return false;
    } finally {
        await pool.end();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    adicionarColunasSaldos()
        .then(sucesso => {
            process.exit(sucesso ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ ERRO FATAL:', error);
            process.exit(1);
        });
}

module.exports = { adicionarColunasSaldos };
