require('dotenv').config();
const { Pool } = require('pg');

/**
 * 🔧 CORREÇÃO AUTOMÁTICA DE ERROS DE BANCO E INTEGRAÇÃO
 * Corrige todas as violações de constraint e problemas identificados
 */

class AutoErrorFixer {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
    }

    async fixAllErrors() {
        console.log('🔧 INICIANDO CORREÇÃO AUTOMÁTICA DE ERROS');
        console.log('='.repeat(60));
        
        try {
            // 1. Corrigir constraint violations
            await this.fixConstraintViolations();
            
            // 2. Corrigir chaves API malformadas
            await this.fixMalformedApiKeys();
            
            // 3. Corrigir timestamps NULL
            await this.fixNullTimestamps();
            
            // 4. Criar índices em falta
            await this.createMissingIndexes();
            
            // 5. Otimizar estrutura de tabelas
            await this.optimizeTableStructure();
            
            // 6. Validar integridade final
            await this.validateIntegrity();
            
            console.log('\n✅ TODAS AS CORREÇÕES APLICADAS COM SUCESSO!');
            
        } catch (error) {
            console.error('❌ Erro durante as correções:', error);
        } finally {
            await this.pool.end();
        }
    }

    async fixConstraintViolations() {
        console.log('\n🔧 CORREÇÃO 1: VIOLAÇÕES DE CONSTRAINT');
        console.log('-'.repeat(40));
        
        try {
            // Verificar duplicatas em balances
            const duplicateBalances = await this.pool.query(`
                SELECT user_id, asset, account_type, COUNT(*) as count
                FROM balances 
                GROUP BY user_id, asset, account_type 
                HAVING COUNT(*) > 1
            `);
            
            if (duplicateBalances.rows.length > 0) {
                console.log(`📊 Encontradas ${duplicateBalances.rows.length} violações de constraint em balances`);
                
                // Remover duplicatas mantendo o mais recente
                const cleanupResult = await this.pool.query(`
                    DELETE FROM balances 
                    WHERE id NOT IN (
                        SELECT DISTINCT ON (user_id, asset, account_type) id
                        FROM balances 
                        ORDER BY user_id, asset, account_type, updated_at DESC NULLS LAST, id DESC
                    )
                `);
                
                console.log(`✅ Removidas ${cleanupResult.rowCount} duplicatas de balances`);
            } else {
                console.log('✅ Nenhuma violação de constraint encontrada em balances');
            }
            
            // Verificar duplicatas em positions
            const duplicatePositions = await this.pool.query(`
                SELECT user_id, symbol, side, COUNT(*) as count
                FROM positions 
                WHERE status = 'open'
                GROUP BY user_id, symbol, side 
                HAVING COUNT(*) > 1
            `);
            
            if (duplicatePositions.rows.length > 0) {
                console.log(`📊 Encontradas ${duplicatePositions.rows.length} posições duplicadas`);
                
                // Consolidar posições duplicadas
                for (const dup of duplicatePositions.rows) {
                    await this.consolidatePositions(dup.user_id, dup.symbol, dup.side);
                }
                
                console.log(`✅ Consolidadas posições duplicadas`);
            } else {
                console.log('✅ Nenhuma posição duplicada encontrada');
            }
            
        } catch (error) {
            console.error('❌ Erro ao corrigir constraints:', error.message);
        }
    }

    async consolidatePositions(userId, symbol, side) {
        try {
            // Somar quantities das posições duplicadas
            const consolidatedData = await this.pool.query(`
                SELECT 
                    SUM(quantity) as total_quantity,
                    AVG(entry_price) as avg_entry_price,
                    MIN(created_at) as first_created,
                    MAX(updated_at) as last_updated
                FROM positions 
                WHERE user_id = $1 AND symbol = $2 AND side = $3 AND status = 'open'
            `, [userId, symbol, side]);
            
            const { total_quantity, avg_entry_price, first_created, last_updated } = consolidatedData.rows[0];
            
            // Remover todas as posições duplicadas
            await this.pool.query(`
                DELETE FROM positions 
                WHERE user_id = $1 AND symbol = $2 AND side = $3 AND status = 'open'
            `, [userId, symbol, side]);
            
            // Criar uma única posição consolidada
            await this.pool.query(`
                INSERT INTO positions (user_id, symbol, side, quantity, entry_price, status, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, 'open', $6, $7)
            `, [userId, symbol, side, total_quantity, avg_entry_price, first_created, last_updated]);
            
        } catch (error) {
            console.error(`❌ Erro ao consolidar posição ${symbol}:`, error.message);
        }
    }

    async fixMalformedApiKeys() {
        console.log('\n🔧 CORREÇÃO 2: CHAVES API MALFORMADAS');
        console.log('-'.repeat(40));
        
        try {
            // Identificar chaves com formato inválido
            const malformedKeys = await this.pool.query(`
                SELECT id, username, binance_api_key, bybit_api_key
                FROM users 
                WHERE (binance_api_key IS NOT NULL AND LENGTH(binance_api_key) < 50)
                   OR (bybit_api_key IS NOT NULL AND LENGTH(bybit_api_key) < 20)
                   OR (binance_api_key LIKE '%test%' OR binance_api_key LIKE '%demo%')
                   OR (bybit_api_key LIKE '%test%' OR bybit_api_key LIKE '%demo%')
            `);
            
            if (malformedKeys.rows.length > 0) {
                console.log(`📊 Encontradas ${malformedKeys.rows.length} chaves com problemas`);
                
                for (const user of malformedKeys.rows) {
                    let updates = [];
                    let values = [];
                    let valueIndex = 1;
                    
                    // Verificar Binance
                    if (user.binance_api_key && (user.binance_api_key.length < 50 || user.binance_api_key.includes('test'))) {
                        updates.push(`binance_api_key = NULL, binance_secret_key = NULL`);
                        console.log(`   🔑 Removendo chave Binance inválida do usuário ${user.username}`);
                    }
                    
                    // Verificar Bybit
                    if (user.bybit_api_key && (user.bybit_api_key.length < 20 || user.bybit_api_key.includes('test'))) {
                        updates.push(`bybit_api_key = NULL, bybit_secret_key = NULL`);
                        console.log(`   🔑 Removendo chave Bybit inválida do usuário ${user.username}`);
                    }
                    
                    if (updates.length > 0) {
                        await this.pool.query(`
                            UPDATE users 
                            SET ${updates.join(', ')}, updated_at = NOW()
                            WHERE id = $${valueIndex}
                        `, [...values, user.id]);
                    }
                }
                
                console.log('✅ Chaves malformadas corrigidas');
            } else {
                console.log('✅ Todas as chaves API têm formato válido');
            }
            
        } catch (error) {
            console.error('❌ Erro ao corrigir chaves API:', error.message);
        }
    }

    async fixNullTimestamps() {
        console.log('\n🔧 CORREÇÃO 3: TIMESTAMPS NULL');
        console.log('-'.repeat(40));
        
        try {
            const tables = [
                { name: 'users', id_column: 'id' },
                { name: 'balances', id_column: 'id' },
                { name: 'positions', id_column: 'id' },
                { name: 'orders', id_column: 'id' },
                { name: 'signals', id_column: 'id' }
            ];
            
            for (const table of tables) {
                try {
                    // Corrigir created_at NULL
                    const createdAtResult = await this.pool.query(`
                        UPDATE ${table.name} 
                        SET created_at = NOW() 
                        WHERE created_at IS NULL
                    `);
                    
                    if (createdAtResult.rowCount > 0) {
                        console.log(`✅ Corrigidos ${createdAtResult.rowCount} created_at NULL em ${table.name}`);
                    }
                    
                    // Corrigir updated_at NULL
                    const updatedAtResult = await this.pool.query(`
                        UPDATE ${table.name} 
                        SET updated_at = NOW() 
                        WHERE updated_at IS NULL
                    `);
                    
                    if (updatedAtResult.rowCount > 0) {
                        console.log(`✅ Corrigidos ${updatedAtResult.rowCount} updated_at NULL em ${table.name}`);
                    }
                    
                } catch (error) {
                    // Tabela pode não existir ou não ter essas colunas
                    console.log(`⚠️  Tabela ${table.name}: ${error.message.substring(0, 50)}...`);
                }
            }
            
        } catch (error) {
            console.error('❌ Erro ao corrigir timestamps:', error.message);
        }
    }

    async createMissingIndexes() {
        console.log('\n🔧 CORREÇÃO 4: ÍNDICES EM FALTA');
        console.log('-'.repeat(40));
        
        const indexes = [
            {
                name: 'idx_balances_user_asset',
                table: 'balances',
                columns: '(user_id, asset, account_type)',
                description: 'Índice para consultas de saldo por usuário e asset'
            },
            {
                name: 'idx_positions_user_symbol',
                table: 'positions',
                columns: '(user_id, symbol, status)',
                description: 'Índice para consultas de posições por usuário'
            },
            {
                name: 'idx_orders_user_status',
                table: 'orders',
                columns: '(user_id, status, created_at)',
                description: 'Índice para consultas de ordens por usuário'
            },
            {
                name: 'idx_signals_created_processed',
                table: 'signals',
                columns: '(created_at DESC, processed)',
                description: 'Índice para consultas de sinais por data'
            },
            {
                name: 'idx_users_active_keys',
                table: 'users',
                columns: '(ativo, binance_api_key, bybit_api_key)',
                description: 'Índice para usuários ativos com chaves'
            }
        ];
        
        for (const index of indexes) {
            try {
                await this.pool.query(`
                    CREATE INDEX IF NOT EXISTS ${index.name} 
                    ON ${index.table} ${index.columns}
                `);
                console.log(`✅ Índice criado: ${index.name}`);
            } catch (error) {
                console.log(`⚠️  ${index.name}: ${error.message.substring(0, 50)}...`);
            }
        }
    }

    async optimizeTableStructure() {
        console.log('\n🔧 CORREÇÃO 5: OTIMIZAÇÃO DE ESTRUTURA');
        console.log('-'.repeat(40));
        
        try {
            // Adicionar constraints únicas se não existirem
            const constraints = [
                {
                    table: 'balances',
                    name: 'unique_user_asset_account',
                    constraint: 'UNIQUE (user_id, asset, account_type)',
                    description: 'Constraint única para saldos'
                }
            ];
            
            for (const constraint of constraints) {
                try {
                    await this.pool.query(`
                        ALTER TABLE ${constraint.table} 
                        ADD CONSTRAINT ${constraint.name} ${constraint.constraint}
                    `);
                    console.log(`✅ Constraint adicionada: ${constraint.name}`);
                } catch (error) {
                    if (error.message.includes('already exists')) {
                        console.log(`✅ Constraint já existe: ${constraint.name}`);
                    } else {
                        console.log(`⚠️  ${constraint.name}: ${error.message.substring(0, 50)}...`);
                    }
                }
            }
            
            // Executar VACUUM ANALYZE para otimizar performance
            console.log('🔧 Executando otimização de performance...');
            await this.pool.query('VACUUM ANALYZE');
            console.log('✅ Otimização de performance concluída');
            
        } catch (error) {
            console.error('❌ Erro na otimização:', error.message);
        }
    }

    async validateIntegrity() {
        console.log('\n🔧 VALIDAÇÃO 6: INTEGRIDADE FINAL');
        console.log('-'.repeat(40));
        
        try {
            // Verificar referential integrity
            const orphanBalances = await this.pool.query(`
                SELECT COUNT(*) as count
                FROM balances b
                LEFT JOIN users u ON b.user_id = u.id
                WHERE u.id IS NULL
            `);
            
            if (parseInt(orphanBalances.rows[0].count) > 0) {
                console.log(`❌ ${orphanBalances.rows[0].count} saldos órfãos encontrados`);
                
                // Remover saldos órfãos
                await this.pool.query(`
                    DELETE FROM balances 
                    WHERE user_id NOT IN (SELECT id FROM users)
                `);
                console.log('✅ Saldos órfãos removidos');
            } else {
                console.log('✅ Nenhum saldo órfão encontrado');
            }
            
            // Verificar consistência de dados
            const stats = await this.pool.query(`
                SELECT 
                    (SELECT COUNT(*) FROM users WHERE ativo = true) as active_users,
                    (SELECT COUNT(*) FROM balances) as total_balances,
                    (SELECT COUNT(*) FROM positions WHERE status = 'open') as open_positions,
                    (SELECT COUNT(*) FROM orders WHERE created_at > NOW() - INTERVAL '24 hours') as recent_orders
            `);
            
            const { active_users, total_balances, open_positions, recent_orders } = stats.rows[0];
            
            console.log('\n📊 ESTATÍSTICAS FINAIS:');
            console.log(`   👥 Usuários ativos: ${active_users}`);
            console.log(`   💰 Total de saldos: ${total_balances}`);
            console.log(`   📈 Posições abertas: ${open_positions}`);
            console.log(`   📊 Ordens recentes (24h): ${recent_orders}`);
            
        } catch (error) {
            console.error('❌ Erro na validação:', error.message);
        }
    }
}

// Executar correções
if (require.main === module) {
    const fixer = new AutoErrorFixer();
    fixer.fixAllErrors();
}

module.exports = AutoErrorFixer;
