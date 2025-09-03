#!/usr/bin/env node

/**
 * 🔍 VERIFICADOR DE ESTRUTURA DO BANCO POSTGRESQL
 * ==============================================
 * 
 * Conecta no Railway PostgreSQL e verifica estrutura real das tabelas
 * URL: process.env.DATABASE_URL
 */

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000
});

class DatabaseStructureChecker {
    async checkConnection() {
        console.log('🔗 Testando conexão PostgreSQL Railway...');
        try {
            const result = await pool.query('SELECT NOW() as current_time, version() as postgres_version');
            console.log('✅ Conexão estabelecida com sucesso!');
            console.log(`⏰ Hora do servidor: ${result.rows[0].current_time}`);
            console.log(`🗄️ PostgreSQL: ${result.rows[0].postgres_version.split(' ')[0]} ${result.rows[0].postgres_version.split(' ')[1]}`);
            return true;
        } catch (error) {
            console.error('❌ Erro de conexão:', error.message);
            return false;
        }
    }

    async listAllTables() {
        console.log('\n📋 TABELAS EXISTENTES NO BANCO:');
        console.log('==============================');
        
        try {
            const result = await pool.query(`
                SELECT 
                    table_name,
                    table_type
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            `);

            if (result.rows.length === 0) {
                console.log('❌ Nenhuma tabela encontrada no schema public');
                return [];
            }

            result.rows.forEach((table, index) => {
                console.log(`${index + 1}. 🗃️  ${table.table_name} (${table.table_type})`);
            });

            return result.rows.map(row => row.table_name);

        } catch (error) {
            console.error('❌ Erro ao listar tabelas:', error.message);
            return [];
        }
    }

    async checkTableStructure(tableName) {
        console.log(`\n🔍 ESTRUTURA DA TABELA: ${tableName}`);
        console.log('='.repeat(30 + tableName.length));

        try {
            const result = await pool.query(`
                SELECT 
                    column_name,
                    data_type,
                    is_nullable,
                    column_default,
                    character_maximum_length,
                    numeric_precision,
                    numeric_scale
                FROM information_schema.columns 
                WHERE table_name = $1 AND table_schema = 'public'
                ORDER BY ordinal_position
            `, [tableName]);

            if (result.rows.length === 0) {
                console.log(`❌ Tabela '${tableName}' não encontrada ou sem colunas`);
                return [];
            }

            result.rows.forEach((col, index) => {
                const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
                const dataType = col.character_maximum_length 
                    ? `${col.data_type}(${col.character_maximum_length})`
                    : col.numeric_precision 
                    ? `${col.data_type}(${col.numeric_precision},${col.numeric_scale || 0})`
                    : col.data_type;
                
                const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
                
                console.log(`   ${index + 1}. 📄 ${col.column_name.padEnd(20)} ${dataType.padEnd(15)} ${nullable}${defaultVal}`);
            });

            return result.rows.map(row => row.column_name);

        } catch (error) {
            console.error(`❌ Erro ao verificar estrutura de ${tableName}:`, error.message);
            return [];
        }
    }

    async run() {
        console.log('🔍 VERIFICADOR DE ESTRUTURA DO BANCO POSTGRESQL RAILWAY');
        console.log('=====================================================\n');

        // 1. Testar conexão
        const connected = await this.checkConnection();
        if (!connected) {
            console.log('\n❌ Não foi possível conectar ao banco. Verifique:');
            console.log('   - URL de conexão');
            console.log('   - Credenciais');
            console.log('   - Firewall/rede');
            return;
        }

        // 2. Listar tabelas
        const tables = await this.listAllTables();
        
        // 3. Verificar estrutura de cada tabela
        for (const table of tables) {
            await this.checkTableStructure(table);
        }

        console.log('\n🚀 Verificação completa finalizada!');
        await pool.end();
    }
}

// Executar verificação
const checker = new DatabaseStructureChecker();
checker.run().catch(console.error);
