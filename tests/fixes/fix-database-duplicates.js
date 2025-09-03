require('dotenv').config();
const { Pool } = require('pg');

class DatabaseDuplicatesFixer {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
    }

    async fixBalancesDuplicates() {
        console.log('🔍 Verificando registros duplicados na tabela balances...');
        
        try {
            // 1. Encontrar duplicatas
            const duplicatesQuery = `
                SELECT user_id, asset, account_type, COUNT(*) as count
                FROM balances 
                GROUP BY user_id, asset, account_type 
                HAVING COUNT(*) > 1
                ORDER BY count DESC
            `;
            
            const duplicates = await this.pool.query(duplicatesQuery);
            
            if (duplicates.rows.length === 0) {
                console.log('✅ Nenhum registro duplicado encontrado na tabela balances');
                return;
            }

            console.log(`❌ Encontrados ${duplicates.rows.length} grupos de registros duplicados:`);
            duplicates.rows.forEach(row => {
                console.log(`   User ${row.user_id}: ${row.asset} (${row.account_type}) - ${row.count} registros`);
            });

            // 2. Para cada grupo de duplicatas, manter apenas o mais recente
            for (const duplicate of duplicates.rows) {
                console.log(`\n🔧 Corrigindo duplicatas para User ${duplicate.user_id} - ${duplicate.asset} (${duplicate.account_type})...`);
                
                // Buscar todos os registros deste grupo
                const allRecordsQuery = `
                    SELECT id, balance, updated_at 
                    FROM balances 
                    WHERE user_id = $1 AND asset = $2 AND account_type = $3
                    ORDER BY updated_at DESC, id DESC
                `;
                
                const allRecords = await this.pool.query(allRecordsQuery, [
                    duplicate.user_id, 
                    duplicate.asset, 
                    duplicate.account_type
                ]);

                if (allRecords.rows.length > 1) {
                    // Manter o primeiro (mais recente) e deletar os outros
                    const keepRecord = allRecords.rows[0];
                    const deleteIds = allRecords.rows.slice(1).map(r => r.id);
                    
                    console.log(`   Mantendo registro ID ${keepRecord.id} (balance: ${keepRecord.balance})`);
                    console.log(`   Deletando ${deleteIds.length} registros duplicados: ${deleteIds.join(', ')}`);
                    
                    // Deletar duplicatas
                    const deleteQuery = `DELETE FROM balances WHERE id = ANY($1)`;
                    await this.pool.query(deleteQuery, [deleteIds]);
                    
                    console.log(`   ✅ Duplicatas removidas`);
                }
            }

            console.log('\n✅ Correção de duplicatas concluída!');

        } catch (error) {
            console.error('❌ Erro ao corrigir duplicatas:', error);
            throw error;
        }
    }

    async addUniqueConstraints() {
        console.log('\n🔧 Adicionando constraints únicas para prevenir duplicatas futuras...');
        
        try {
            // Verificar se já existe a constraint
            const checkConstraintQuery = `
                SELECT constraint_name 
                FROM information_schema.table_constraints 
                WHERE table_name = 'balances' 
                AND constraint_type = 'UNIQUE'
                AND constraint_name = 'balances_user_asset_account_unique'
            `;
            
            const existingConstraint = await this.pool.query(checkConstraintQuery);
            
            if (existingConstraint.rows.length > 0) {
                console.log('✅ Constraint única já existe');
                return;
            }

            // Adicionar constraint única
            const addConstraintQuery = `
                ALTER TABLE balances 
                ADD CONSTRAINT balances_user_asset_account_unique 
                UNIQUE (user_id, asset, account_type)
            `;
            
            await this.pool.query(addConstraintQuery);
            console.log('✅ Constraint única adicionada com sucesso');

        } catch (error) {
            if (error.message.includes('already exists')) {
                console.log('✅ Constraint única já existe');
            } else {
                console.error('❌ Erro ao adicionar constraint:', error);
                throw error;
            }
        }
    }

    async fixOtherTables() {
        console.log('\n🔍 Verificando outras tabelas por duplicatas...');
        
        try {
            // Verificar positions duplicadas
            const positionsDuplicates = await this.pool.query(`
                SELECT user_id, symbol, COUNT(*) as count
                FROM positions 
                WHERE status = 'active'
                GROUP BY user_id, symbol 
                HAVING COUNT(*) > 1
            `);

            if (positionsDuplicates.rows.length > 0) {
                console.log(`❌ Encontradas ${positionsDuplicates.rows.length} posições duplicadas ativas`);
                
                for (const dup of positionsDuplicates.rows) {
                    console.log(`🔧 Corrigindo posições duplicadas para User ${dup.user_id} - ${dup.symbol}`);
                    
                    // Manter apenas a posição mais recente
                    const updateQuery = `
                        UPDATE positions 
                        SET status = 'closed', closed_at = NOW()
                        WHERE id NOT IN (
                            SELECT id FROM positions 
                            WHERE user_id = $1 AND symbol = $2 AND status = 'active'
                            ORDER BY created_at DESC 
                            LIMIT 1
                        )
                        AND user_id = $1 AND symbol = $2 AND status = 'active'
                    `;
                    
                    await this.pool.query(updateQuery, [dup.user_id, dup.symbol]);
                    console.log(`   ✅ Posições duplicadas fechadas`);
                }
            } else {
                console.log('✅ Nenhuma posição duplicada encontrada');
            }

        } catch (error) {
            console.error('❌ Erro ao verificar outras tabelas:', error);
        }
    }

    async generateReport() {
        console.log('\n📊 Gerando relatório final...');
        
        try {
            const report = {
                timestamp: new Date().toISOString(),
                tables_checked: {},
                recommendations: []
            };

            // Verificar balances
            const balancesCount = await this.pool.query('SELECT COUNT(*) FROM balances');
            const balancesDuplicates = await this.pool.query(`
                SELECT COUNT(DISTINCT CONCAT(user_id, '-', asset, '-', account_type)) as unique_count
                FROM balances
            `);
            
            report.tables_checked.balances = {
                total_records: parseInt(balancesCount.rows[0].count),
                unique_combinations: parseInt(balancesDuplicates.rows[0].unique_count),
                has_duplicates: balancesCount.rows[0].count !== balancesDuplicates.rows[0].unique_count
            };

            // Verificar positions
            const positionsActive = await this.pool.query(`
                SELECT COUNT(*) FROM positions WHERE status = 'active'
            `);
            const positionsUnique = await this.pool.query(`
                SELECT COUNT(DISTINCT CONCAT(user_id, '-', symbol)) as unique_count
                FROM positions WHERE status = 'active'
            `);

            report.tables_checked.positions = {
                active_positions: parseInt(positionsActive.rows[0].count),
                unique_combinations: parseInt(positionsUnique.rows[0].unique_count),
                has_duplicates: positionsActive.rows[0].count !== positionsUnique.rows[0].unique_count
            };

            // Verificar constraints
            const constraints = await this.pool.query(`
                SELECT constraint_name, table_name 
                FROM information_schema.table_constraints 
                WHERE table_name IN ('balances', 'positions') 
                AND constraint_type = 'UNIQUE'
            `);

            report.constraints = constraints.rows;

            // Recomendações
            if (report.tables_checked.balances.has_duplicates) {
                report.recommendations.push('Execute novamente a correção de balances duplicados');
            }
            if (report.tables_checked.positions.has_duplicates) {
                report.recommendations.push('Revisar posições ativas duplicadas');
            }
            if (constraints.rows.length === 0) {
                report.recommendations.push('Adicionar constraints únicas para prevenir duplicatas');
            }

            console.log('\n📋 RELATÓRIO FINAL:');
            console.log(JSON.stringify(report, null, 2));

            return report;

        } catch (error) {
            console.error('❌ Erro ao gerar relatório:', error);
        }
    }

    async run() {
        console.log('🚀 Iniciando correção de duplicatas no banco de dados...\n');
        
        try {
            await this.fixBalancesDuplicates();
            await this.addUniqueConstraints();
            await this.fixOtherTables();
            await this.generateReport();
            
            console.log('\n🎉 Correção de duplicatas concluída com sucesso!');
            
        } catch (error) {
            console.error('💥 Erro durante a correção:', error);
            process.exit(1);
        } finally {
            await this.pool.end();
        }
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const fixer = new DatabaseDuplicatesFixer();
    fixer.run();
}

module.exports = DatabaseDuplicatesFixer;
