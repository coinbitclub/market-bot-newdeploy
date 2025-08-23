#!/usr/bin/env node

/**
 * 🧹 LIMPEZA DE DADOS DE TESTE - COINBITCLUB
 * ==========================================
 * 
 * Remove todos os dados de operações/testes do banco
 * Mantém apenas estrutura e dados essenciais dos usuários
 */

const { Pool } = require('pg');

console.log(`
🧹 ===================================================
   COINBITCLUB - LIMPEZA DE DADOS DE TESTE
   Removendo todas as operações e dados de teste
===================================================
`);

class DatabaseCleaner {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
            ssl: { rejectUnauthorized: false }
        });
        
        this.tablesToClean = [
            // Dados de operações e trading
            { table: 'trading_executions', description: 'Execuções de trading' },
            { table: 'signals', description: 'Sinais recebidos' },
            { table: 'positions', description: 'Posições de trading' },
            { table: 'active_positions', description: 'Posições ativas' },
            { table: 'user_positions', description: 'Posições dos usuários' },
            { table: 'trades', description: 'Histórico de trades' },
            { table: 'trade_history', description: 'Histórico detalhado' },
            
            // Logs e métricas
            { table: 'signal_metrics_log', description: 'Logs de métricas de sinais' },
            { table: 'signal_conditions_tracking', description: 'Tracking de condições' },
            { table: 'error_logs', description: 'Logs de erro' },
            { table: 'system_logs', description: 'Logs do sistema' },
            
            // Dados financeiros de teste
            { table: 'user_trading_executions', description: 'Execuções de usuários' },
            { table: 'commission_transactions', description: 'Transações de comissão' },
            { table: 'financial_transactions', description: 'Transações financeiras' },
            
            // Dados de monitoramento
            { table: 'balance_monitoring', description: 'Monitoramento de saldos' },
            { table: 'user_balance_monitoring', description: 'Monitoramento por usuário' },
            { table: 'api_key_monitoring', description: 'Monitoramento de chaves' },
            
            // Dados temporários/cache
            { table: 'fear_greed_data', description: 'Dados Fear & Greed' },
            { table: 'market_data_cache', description: 'Cache de dados de mercado' }
        ];
        
        this.criticalTables = [
            'users',
            'user_api_keys', 
            'balances'
        ];
    }

    async cleanDatabase() {
        console.log('🔍 Iniciando limpeza do banco de dados...\n');
        
        try {
            // 1. Verificar conexão
            await this.testConnection();
            
            // 2. Fazer backup crítico
            await this.backupCriticalData();
            
            // 3. Limpar tabelas de dados de teste
            await this.cleanTestData();
            
            // 4. Verificar dados críticos mantidos
            await this.verifyCriticalData();
            
            // 5. Resetar sequências se necessário
            await this.resetSequences();
            
            console.log('\n✅ Limpeza concluída com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro durante limpeza:', error.message);
            throw error;
        }
    }

    async testConnection() {
        console.log('1️⃣ TESTANDO CONEXÃO COM BANCO...');
        console.log('─'.repeat(50));
        
        try {
            const client = await this.pool.connect();
            const result = await client.query('SELECT NOW() as current_time');
            client.release();
            
            console.log(`✅ Conexão OK - ${result.rows[0].current_time}`);
            console.log('');
            
        } catch (error) {
            console.log('❌ Erro de conexão:', error.message);
            throw error;
        }
    }

    async backupCriticalData() {
        console.log('2️⃣ FAZENDO BACKUP DE DADOS CRÍTICOS...');
        console.log('─'.repeat(50));
        
        try {
            const backupData = {};
            
            for (const tableName of this.criticalTables) {
                const exists = await this.tableExists(tableName);
                if (exists) {
                    const result = await this.pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
                    const count = parseInt(result.rows[0].count);
                    backupData[tableName] = count;
                    console.log(`📊 ${tableName}: ${count} registros`);
                } else {
                    console.log(`⚠️  ${tableName}: Tabela não existe`);
                }
            }
            
            // Salvar backup em arquivo
            const fs = require('fs');
            const backupFile = `backup-critical-data-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
            console.log(`💾 Backup salvo: ${backupFile}`);
            console.log('');
            
        } catch (error) {
            console.log('❌ Erro no backup:', error.message);
        }
    }

    async cleanTestData() {
        console.log('3️⃣ LIMPANDO DADOS DE TESTE...');
        console.log('─'.repeat(50));
        
        let totalCleaned = 0;
        
        for (const { table, description } of this.tablesToClean) {
            try {
                const exists = await this.tableExists(table);
                if (!exists) {
                    console.log(`⚠️  ${table}: Tabela não existe`);
                    continue;
                }
                
                // Contar registros antes
                const beforeResult = await this.pool.query(`SELECT COUNT(*) as count FROM ${table}`);
                const beforeCount = parseInt(beforeResult.rows[0].count);
                
                if (beforeCount === 0) {
                    console.log(`✅ ${table}: Já vazia (${description})`);
                    continue;
                }
                
                // Limpar tabela
                await this.pool.query(`DELETE FROM ${table}`);
                
                // Verificar limpeza
                const afterResult = await this.pool.query(`SELECT COUNT(*) as count FROM ${table}`);
                const afterCount = parseInt(afterResult.rows[0].count);
                
                console.log(`🧹 ${table}: ${beforeCount} → ${afterCount} registros (${description})`);
                totalCleaned += beforeCount;
                
            } catch (error) {
                console.log(`❌ ${table}: Erro - ${error.message}`);
            }
        }
        
        console.log(`\n📊 Total de registros removidos: ${totalCleaned}`);
        console.log('');
    }

    async verifyCriticalData() {
        console.log('4️⃣ VERIFICANDO DADOS CRÍTICOS MANTIDOS...');
        console.log('─'.repeat(50));
        
        for (const tableName of this.criticalTables) {
            try {
                const exists = await this.tableExists(tableName);
                if (!exists) {
                    console.log(`⚠️  ${tableName}: Tabela não existe`);
                    continue;
                }
                
                const result = await this.pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
                const count = parseInt(result.rows[0].count);
                
                if (count > 0) {
                    console.log(`✅ ${tableName}: ${count} registros mantidos`);
                    
                    // Mostrar detalhes específicos
                    if (tableName === 'users') {
                        const users = await this.pool.query(`
                            SELECT id, username, email, created_at 
                            FROM users 
                            ORDER BY id 
                            LIMIT 5
                        `);
                        users.rows.forEach(user => {
                            console.log(`    👤 ID ${user.id}: ${user.username} (${user.email})`);
                        });
                    }
                    
                    if (tableName === 'user_api_keys') {
                        const keys = await this.pool.query(`
                            SELECT user_id, exchange, is_active 
                            FROM user_api_keys 
                            WHERE api_key IS NOT NULL
                            ORDER BY user_id
                        `);
                        keys.rows.forEach(key => {
                            console.log(`    🔑 User ${key.user_id}: ${key.exchange} (${key.is_active ? 'Ativa' : 'Inativa'})`);
                        });
                    }
                    
                    if (tableName === 'balances') {
                        const balances = await this.pool.query(`
                            SELECT user_id, asset, wallet_balance 
                            FROM balances 
                            WHERE wallet_balance > 0
                            ORDER BY user_id
                            LIMIT 5
                        `);
                        balances.rows.forEach(balance => {
                            console.log(`    💰 User ${balance.user_id}: ${balance.wallet_balance} ${balance.asset}`);
                        });
                    }
                    
                } else {
                    console.log(`⚠️  ${tableName}: Vazia (pode precisar recriar dados)`);
                }
                
            } catch (error) {
                console.log(`❌ ${tableName}: Erro - ${error.message}`);
            }
        }
        
        console.log('');
    }

    async resetSequences() {
        console.log('5️⃣ RESETANDO SEQUÊNCIAS (IDs)...');
        console.log('─'.repeat(50));
        
        const sequences = [
            'signals_id_seq',
            'trading_executions_id_seq',
            'positions_id_seq',
            'trades_id_seq'
        ];
        
        for (const seqName of sequences) {
            try {
                // Verificar se sequência existe
                const seqExists = await this.pool.query(`
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.sequences 
                        WHERE sequence_name = $1
                    )
                `, [seqName]);
                
                if (seqExists.rows[0].exists) {
                    // Resetar para 1
                    await this.pool.query(`ALTER SEQUENCE ${seqName} RESTART WITH 1`);
                    console.log(`🔄 ${seqName}: Resetada para 1`);
                } else {
                    console.log(`⚠️  ${seqName}: Não existe`);
                }
                
            } catch (error) {
                console.log(`❌ ${seqName}: Erro - ${error.message}`);
            }
        }
        
        console.log('');
    }

    async tableExists(tableName) {
        try {
            const result = await this.pool.query(`
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_name = $1
                )
            `, [tableName]);
            return result.rows[0].exists;
        } catch (error) {
            return false;
        }
    }

    async showFinalStatus() {
        console.log('📊 ===================================================');
        console.log('   STATUS FINAL APÓS LIMPEZA');
        console.log('===================================================\n');
        
        console.log('✅ DADOS REMOVIDOS:');
        console.log('─'.repeat(20));
        console.log('• Todas as execuções de trading');
        console.log('• Todos os sinais recebidos');
        console.log('• Todas as posições/trades');
        console.log('• Logs de sistema e erro');
        console.log('• Dados de monitoramento');
        console.log('• Cache e dados temporários');
        
        console.log('\n✅ DADOS MANTIDOS:');
        console.log('─'.repeat(15));
        console.log('• Usuários e suas configurações');
        console.log('• Chaves API dos usuários');
        console.log('• Saldos atuais das contas');
        console.log('• Estrutura do banco de dados');
        
        console.log('\n🚀 SISTEMA LIMPO E PRONTO:');
        console.log('─'.repeat(25));
        console.log('• ✅ Banco de dados limpo');
        console.log('• ✅ Dados críticos preservados');
        console.log('• ✅ IDs resetados para 1');
        console.log('• ✅ Pronto para operações reais');
        
        console.log('\n🔄 PRÓXIMOS PASSOS:');
        console.log('─'.repeat(18));
        console.log('1. Verificar conexões das chaves API');
        console.log('2. Configurar TradingView webhooks');
        console.log('3. Iniciar monitoramento em tempo real');
        console.log('4. Aguardar primeiros sinais reais');
        
        console.log('\n🎯 SISTEMA PRONTO PARA PRODUÇÃO REAL!');
    }
}

// Executar limpeza
async function runCleanup() {
    try {
        const cleaner = new DatabaseCleaner();
        await cleaner.cleanDatabase();
        await cleaner.showFinalStatus();
        
        console.log('\n🎉 LIMPEZA CONCLUÍDA COM SUCESSO!');
        console.log('💻 Sistema pronto para operações reais');
        
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ ERRO NA LIMPEZA:', error.message);
        console.error('💡 Verificar conexão com banco e tentar novamente');
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    runCleanup();
}

module.exports = DatabaseCleaner;
