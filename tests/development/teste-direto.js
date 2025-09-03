/**
 * 🔧 TESTE DIRETO - BUSCAR CHAVES NO BANCO
 * Última atualização: 2025-01-23 19:30:00
 */

const { Pool } = require('pg');
const fs = require('fs').promises;

class TesteDireto {
    constructor() {
        this.pool = new Pool({
            connectionString: 'process.env.DATABASE_URL',
            ssl: {
                rejectUnauthorized: false
            }
        });
        
        this.startTime = new Date();
    }

    /**
     * 🏃 EXECUTAR TESTE COMPLETO
     */
    async executar() {
        console.log('\n🔧 TESTE DIRETO - BUSCAR CHAVES NO BANCO');
        console.log('=====================================');
        console.log(`⏰ Iniciado em: ${this.startTime.toISOString()}`);
        
        try {
            // 1. Testar conectividade
            console.log('\n🔍 1. TESTANDO CONECTIVIDADE...');
            await this.pool.query('SELECT NOW() as current_time');
            console.log('✅ Conexão com PostgreSQL estabelecida');
            
            // 2. Verificar estrutura de tabelas
            console.log('\n🔍 2. VERIFICANDO ESTRUTURA DAS TABELAS...');
            
            const tables = await this.pool.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('users', 'user_api_keys')
                ORDER BY table_name
            `);
            
            console.log(`📋 Tabelas encontradas: ${tables.rows.map(t => t.table_name).join(', ')}`);
            
            // 3. Verificar colunas de users
            const userColumns = await this.pool.query(`
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                ORDER BY ordinal_position
            `);
            
            console.log('\n📋 Colunas da tabela users:');
            userColumns.rows.forEach(col => {
                console.log(`   - ${col.column_name} (${col.data_type})`);
            });
            
            // 4. Verificar colunas de user_api_keys
            const keyColumns = await this.pool.query(`
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'user_api_keys' 
                ORDER BY ordinal_position
            `);
            
            console.log('\n📋 Colunas da tabela user_api_keys:');
            keyColumns.rows.forEach(col => {
                console.log(`   - ${col.column_name} (${col.data_type})`);
            });
            
            // 5. Contar registros
            console.log('\n🔍 3. CONTANDO REGISTROS...');
            
            const userCount = await this.pool.query('SELECT COUNT(*) as count FROM users');
            const keyCount = await this.pool.query('SELECT COUNT(*) as count FROM user_api_keys');
            
            console.log(`👥 Total de usuários: ${userCount.rows[0].count}`);
            console.log(`🔑 Total de chaves: ${keyCount.rows[0].count}`);
            
            // 6. Verificar usuários
            console.log('\n🔍 4. VERIFICANDO USUÁRIOS...');
            
            const users = await this.pool.query(`
                SELECT id, username, email, is_active, created_at
                FROM users 
                ORDER BY id
            `);
            
            console.log(`👥 Lista de usuários (${users.rows.length}):`);
            users.rows.forEach(user => {
                const status = user.is_active ? '✅' : '❌';
                console.log(`   ${status} ID ${user.id}: ${user.username} (${user.email})`);
            });
            
            // 7. Verificar chaves
            console.log('\n🔍 5. VERIFICANDO CHAVES API...');
            
            const keys = await this.pool.query(`
                SELECT id, user_id, exchange, environment, is_active, 
                       api_key IS NOT NULL as has_api_key,
                       secret_key IS NOT NULL as has_secret_key,
                       validation_status, last_validated_at
                FROM user_api_keys 
                ORDER BY user_id, exchange, environment
            `);
            
            console.log(`🔑 Lista de chaves (${keys.rows.length}):`);
            keys.rows.forEach(key => {
                const status = key.is_active && key.has_api_key && key.has_secret_key ? '✅' : '❌';
                console.log(`   ${status} ID ${key.id}: User ${key.user_id} - ${key.exchange} ${key.environment}`);
                console.log(`      Ativa: ${key.is_active} | API: ${key.has_api_key} | Secret: ${key.has_secret_key}`);
                console.log(`      Status: ${key.validation_status || 'N/A'} | Validado: ${key.last_validated_at || 'Nunca'}`);
            });
            
            // 8. Query principal (mesma do sistema)
            console.log('\n🔍 6. EXECUTANDO QUERY PRINCIPAL...');
            
            const mainQuery = await this.pool.query(`
                SELECT 
                    u.id as user_id,
                    u.username,
                    u.email,
                    uak.id as key_id,
                    uak.exchange,
                    uak.environment,
                    uak.validation_status,
                    uak.last_validated_at,
                    uak.is_active
                FROM users u
                JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE u.is_active = true 
                AND uak.is_active = true
                AND uak.api_key IS NOT NULL
                AND uak.secret_key IS NOT NULL
                ORDER BY u.id, uak.exchange, uak.environment
            `);
            
            console.log(`🎯 Query principal retornou: ${mainQuery.rows.length} chaves`);
            
            if (mainQuery.rows.length > 0) {
                console.log('\n✅ CHAVES ENCONTRADAS PELA QUERY PRINCIPAL:');
                mainQuery.rows.forEach(row => {
                    console.log(`   🔑 ${row.username} - ${row.exchange} ${row.environment} (ID: ${row.key_id})`);
                });
            } else {
                console.log('\n❌ NENHUMA CHAVE ENCONTRADA PELA QUERY PRINCIPAL');
                
                // Diagnóstico detalhado
                console.log('\n🔍 DIAGNÓSTICO DETALHADO:');
                
                const activeUsers = await this.pool.query('SELECT COUNT(*) as count FROM users WHERE is_active = true');
                console.log(`   - Usuários ativos: ${activeUsers.rows[0].count}`);
                
                const activeKeys = await this.pool.query('SELECT COUNT(*) as count FROM user_api_keys WHERE is_active = true');
                console.log(`   - Chaves ativas: ${activeKeys.rows[0].count}`);
                
                const keysWithAPI = await this.pool.query('SELECT COUNT(*) as count FROM user_api_keys WHERE api_key IS NOT NULL');
                console.log(`   - Chaves com API: ${keysWithAPI.rows[0].count}`);
                
                const keysWithSecret = await this.pool.query('SELECT COUNT(*) as count FROM user_api_keys WHERE secret_key IS NOT NULL');
                console.log(`   - Chaves com Secret: ${keysWithSecret.rows[0].count}`);
                
                const completeKeys = await this.pool.query(`
                    SELECT COUNT(*) as count 
                    FROM user_api_keys 
                    WHERE api_key IS NOT NULL AND secret_key IS NOT NULL
                `);
                console.log(`   - Chaves completas: ${completeKeys.rows[0].count}`);
            }
            
            // 9. Relatório final
            console.log('\n📊 RELATÓRIO FINAL');
            console.log('==================');
            console.log(`⏰ Duração: ${Date.now() - this.startTime.getTime()}ms`);
            console.log(`🏆 Status: ${mainQuery.rows.length > 0 ? 'SUCESSO' : 'PROBLEMA IDENTIFICADO'}`);
            
            if (mainQuery.rows.length === 0) {
                console.log('\n🚨 AÇÃO NECESSÁRIA:');
                console.log('   1. Verificar se usuários estão ativos (is_active = true)');
                console.log('   2. Verificar se chaves estão ativas (is_active = true)');
                console.log('   3. Verificar se api_key e secret_key não estão NULL');
                console.log('   4. Considerar execução de correções automáticas');
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Erro no teste:', error.message);
            console.error('Stack:', error.stack);
            return false;
        } finally {
            await this.pool.end();
        }
    }
}

// Executar teste
async function main() {
    const teste = new TesteDireto();
    await teste.executar();
    process.exit(0);
}

main().catch(console.error);
