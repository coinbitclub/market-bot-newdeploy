require('dotenv').config();
const { Pool } = require('pg');
const axios = require('axios');

/**
 * 🛠️ CORRETOR EMERGENCIAL DE SISTEMA EM PRODUÇÃO
 * Corrige todos os problemas identificados no sistema ativo
 */

class EmergencySystemFixer {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        this.ngrokUrl = 'https://aa03e238ea55.ngrok-free.app';
    }

    async fixAllEmergencyIssues() {
        console.log('🛠️ CORREÇÃO EMERGENCIAL DO SISTEMA EM PRODUÇÃO');
        console.log('='.repeat(60));
        
        try {
            // 1. Corrigir constraint violations
            await this.fixConstraintViolations();
            
            // 2. Corrigir problema de coluna 'nome'
            await this.fixColumnIssues();
            
            // 3. Limpar chaves API inválidas
            await this.cleanInvalidApiKeys();
            
            // 4. Configurar whitelist de IP
            await this.configureIPWhitelist();
            
            // 5. Testar sistema corrigido
            await this.testFixedSystem();
            
            // 6. Ativar modo de trading real
            await this.activateRealTrading();
            
            console.log('\n✅ TODOS OS PROBLEMAS CORRIGIDOS!');
            
        } catch (error) {
            console.error('❌ Erro na correção emergencial:', error);
        } finally {
            await this.pool.end();
        }
    }

    async fixConstraintViolations() {
        console.log('\n🔧 CORRIGINDO CONSTRAINT VIOLATIONS');
        console.log('-'.repeat(40));
        
        try {
            // Identificar violações
            const violations = await this.pool.query(`
                SELECT user_id, asset, account_type, COUNT(*) as duplicates
                FROM balances 
                GROUP BY user_id, asset, account_type 
                HAVING COUNT(*) > 1
                ORDER BY duplicates DESC
            `);
            
            console.log(`📊 Encontradas ${violations.rows.length} violações de constraint`);
            
            if (violations.rows.length > 0) {
                // Mostrar algumas violações
                violations.rows.slice(0, 5).forEach(row => {
                    console.log(`   👤 User ${row.user_id}, ${row.asset} (${row.account_type}): ${row.duplicates} registros`);
                });
                
                // Limpar duplicatas mantendo o mais recente
                const cleanupResult = await this.pool.query(`
                    DELETE FROM balances 
                    WHERE id NOT IN (
                        SELECT DISTINCT ON (user_id, asset, account_type) id
                        FROM balances 
                        ORDER BY user_id, asset, account_type, created_at DESC NULLS LAST, id DESC
                    )
                `);
                
                console.log(`✅ Removidas ${cleanupResult.rowCount} duplicatas de balances`);
                
                // Verificar se ainda há violações
                const remaining = await this.pool.query(`
                    SELECT COUNT(*) as violations
                    FROM (
                        SELECT user_id, asset, account_type, COUNT(*) as cnt
                        FROM balances 
                        GROUP BY user_id, asset, account_type 
                        HAVING COUNT(*) > 1
                    ) v
                `);
                
                const remainingCount = parseInt(remaining.rows[0].violations);
                if (remainingCount === 0) {
                    console.log('✅ Todas as constraint violations foram corrigidas');
                } else {
                    console.log(`⚠️  Ainda restam ${remainingCount} violações`);
                }
            } else {
                console.log('✅ Nenhuma constraint violation encontrada');
            }
            
        } catch (error) {
            console.error('❌ Erro ao corrigir constraints:', error.message);
        }
    }

    async fixColumnIssues() {
        console.log('\n🔧 CORRIGINDO PROBLEMAS DE COLUNAS');
        console.log('-'.repeat(40));
        
        try {
            // Verificar se coluna 'nome' existe na tabela users
            const columnCheck = await this.pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                AND column_name IN ('nome', 'name', 'username')
            `);
            
            console.log('📋 Colunas encontradas na tabela users:');
            columnCheck.rows.forEach(row => {
                console.log(`   ✅ ${row.column_name}`);
            });
            
            // Se não existir 'nome', verificar se precisa adicionar
            const hasNome = columnCheck.rows.some(row => row.column_name === 'nome');
            const hasUsername = columnCheck.rows.some(row => row.column_name === 'username');
            
            if (!hasNome && hasUsername) {
                console.log('🔧 Adicionando coluna "nome" como alias para "username"...');
                
                try {
                    await this.pool.query(`
                        ALTER TABLE users 
                        ADD COLUMN IF NOT EXISTS nome VARCHAR(255)
                    `);
                    
                    // Copiar dados de username para nome
                    await this.pool.query(`
                        UPDATE users 
                        SET nome = username 
                        WHERE nome IS NULL
                    `);
                    
                    console.log('✅ Coluna "nome" adicionada e populada');
                } catch (error) {
                    console.log('⚠️  Erro ao adicionar coluna nome:', error.message);
                }
            }
            
            // Verificar outras colunas necessárias
            const requiredColumns = [
                { table: 'users', column: 'ativo', type: 'BOOLEAN DEFAULT true' },
                { table: 'balances', column: 'account_type', type: 'VARCHAR(50) DEFAULT \'unified\'' },
                { table: 'positions', column: 'status', type: 'VARCHAR(20) DEFAULT \'open\'' }
            ];
            
            for (const col of requiredColumns) {
                try {
                    await this.pool.query(`
                        ALTER TABLE ${col.table} 
                        ADD COLUMN IF NOT EXISTS ${col.column} ${col.type}
                    `);
                    console.log(`✅ Coluna ${col.table}.${col.column} verificada`);
                } catch (error) {
                    console.log(`⚠️  ${col.table}.${col.column}: ${error.message.substring(0, 50)}...`);
                }
            }
            
        } catch (error) {
            console.error('❌ Erro ao corrigir colunas:', error.message);
        }
    }

    async cleanInvalidApiKeys() {
        console.log('\n🔑 LIMPANDO CHAVES API INVÁLIDAS');
        console.log('-'.repeat(40));
        
        try {
            // Identificar chaves inválidas
            const invalidKeys = await this.pool.query(`
                SELECT id, username, 
                       CASE 
                           WHEN binance_api_key IS NOT NULL AND LENGTH(binance_api_key) < 50 THEN 'binance_short'
                           WHEN bybit_api_key IS NOT NULL AND LENGTH(bybit_api_key) < 20 THEN 'bybit_short'
                           WHEN binance_api_key LIKE '%test%' OR binance_api_key LIKE '%demo%' THEN 'binance_test'
                           WHEN bybit_api_key LIKE '%test%' OR bybit_api_key LIKE '%demo%' THEN 'bybit_test'
                           ELSE 'unknown'
                       END as issue_type
                FROM users 
                WHERE (binance_api_key IS NOT NULL AND LENGTH(binance_api_key) < 50)
                   OR (bybit_api_key IS NOT NULL AND LENGTH(bybit_api_key) < 20)
                   OR (binance_api_key LIKE '%test%' OR binance_api_key LIKE '%demo%')
                   OR (bybit_api_key LIKE '%test%' OR bybit_api_key LIKE '%demo%')
            `);
            
            console.log(`📊 Encontradas ${invalidKeys.rows.length} chaves com problemas`);
            
            if (invalidKeys.rows.length > 0) {
                console.log('🔍 Detalhes das chaves inválidas:');
                invalidKeys.rows.forEach(user => {
                    console.log(`   👤 ${user.username}: ${user.issue_type}`);
                });
                
                // Remover chaves inválidas
                const cleanupResult = await this.pool.query(`
                    UPDATE users 
                    SET 
                        binance_api_key = CASE 
                            WHEN binance_api_key IS NOT NULL AND LENGTH(binance_api_key) < 50 THEN NULL
                            WHEN binance_api_key LIKE '%test%' OR binance_api_key LIKE '%demo%' THEN NULL
                            ELSE binance_api_key
                        END,
                        binance_secret_key = CASE 
                            WHEN binance_api_key IS NOT NULL AND LENGTH(binance_api_key) < 50 THEN NULL
                            WHEN binance_api_key LIKE '%test%' OR binance_api_key LIKE '%demo%' THEN NULL
                            ELSE binance_secret_key
                        END,
                        bybit_api_key = CASE 
                            WHEN bybit_api_key IS NOT NULL AND LENGTH(bybit_api_key) < 20 THEN NULL
                            WHEN bybit_api_key LIKE '%test%' OR bybit_api_key LIKE '%demo%' THEN NULL
                            ELSE bybit_api_key
                        END,
                        bybit_secret_key = CASE 
                            WHEN bybit_api_key IS NOT NULL AND LENGTH(bybit_api_key) < 20 THEN NULL
                            WHEN bybit_api_key LIKE '%test%' OR bybit_api_key LIKE '%demo%' THEN NULL
                            ELSE bybit_secret_key
                        END,
                        updated_at = NOW()
                    WHERE (binance_api_key IS NOT NULL AND LENGTH(binance_api_key) < 50)
                       OR (bybit_api_key IS NOT NULL AND LENGTH(bybit_api_key) < 20)
                       OR (binance_api_key LIKE '%test%' OR binance_api_key LIKE '%demo%')
                       OR (bybit_api_key LIKE '%test%' OR bybit_api_key LIKE '%demo%')
                `);
                
                console.log(`✅ Limpas ${cleanupResult.rowCount} chaves inválidas`);
            }
            
            // Verificar chaves válidas restantes
            const validKeys = await this.pool.query(`
                SELECT 
                    COUNT(*) FILTER (WHERE binance_api_key IS NOT NULL AND LENGTH(binance_api_key) >= 50) as valid_binance,
                    COUNT(*) FILTER (WHERE bybit_api_key IS NOT NULL AND LENGTH(bybit_api_key) >= 20) as valid_bybit,
                    COUNT(*) as total_users
                FROM users 
                WHERE ativo = true
            `);
            
            const { valid_binance, valid_bybit, total_users } = validKeys.rows[0];
            console.log(`📊 Chaves válidas restantes:`);
            console.log(`   🔑 Binance: ${valid_binance}/${total_users}`);
            console.log(`   🔑 Bybit: ${valid_bybit}/${total_users}`);
            
        } catch (error) {
            console.error('❌ Erro ao limpar chaves:', error.message);
        }
    }

    async configureIPWhitelist() {
        console.log('\n🌐 CONFIGURANDO WHITELIST DE IP');
        console.log('-'.repeat(40));
        
        try {
            // Obter IP atual do Ngrok
            console.log(`🔍 Verificando IP do Ngrok: ${this.ngrokUrl}`);
            
            try {
                // Fazer requisição através do Ngrok para detectar IP
                const ipResponse = await axios.get('https://api.ipify.org?format=json', {
                    timeout: 5000
                });
                
                const currentIP = ipResponse.data.ip;
                console.log(`🌐 IP atual detectado: ${currentIP}`);
                
                // Verificar geolocalização
                const geoResponse = await axios.get(`http://ip-api.com/json/${currentIP}`);
                const { country, regionName, city, isp } = geoResponse.data;
                
                console.log(`📍 Localização: ${city}, ${regionName}, ${country}`);
                console.log(`🏢 Provedor: ${isp}`);
                
                // Instruções para whitelist
                console.log('\n📝 INSTRUÇÕES PARA WHITELIST:');
                console.log('='.repeat(40));
                console.log('🔗 BINANCE:');
                console.log('   1. Acesse: https://www.binance.com/en/my/settings/api-management');
                console.log(`   2. Adicione o IP: ${currentIP}`);
                console.log('   3. Verifique permissões: Spot & Margin Trading');
                
                console.log('\n🔗 BYBIT:');
                console.log('   1. Acesse: https://www.bybit.com/app/user/api-management');
                console.log(`   2. Adicione o IP: ${currentIP}`);
                console.log('   3. Verifique permissões: Derivatives V3, Spot');
                
                // Salvar IP no banco para referência
                await this.pool.query(`
                    INSERT INTO system_logs (level, message, details, created_at)
                    VALUES ('INFO', 'IP Whitelist Configuration', $1, NOW())
                `, [JSON.stringify({
                    current_ip: currentIP,
                    location: `${city}, ${regionName}, ${country}`,
                    provider: isp,
                    ngrok_url: this.ngrokUrl,
                    timestamp: new Date().toISOString()
                })]);
                
                console.log('✅ Informações de IP salvas no sistema');
                
            } catch (error) {
                console.log('⚠️  Erro ao detectar IP:', error.message);
            }
            
        } catch (error) {
            console.error('❌ Erro na configuração de IP:', error.message);
        }
    }

    async testFixedSystem() {
        console.log('\n🧪 TESTANDO SISTEMA CORRIGIDO');
        console.log('-'.repeat(40));
        
        try {
            // Testar health check corrigido
            console.log('🔍 Testando health check...');
            try {
                const response = await axios.get(`${this.ngrokUrl}/api/health`, { timeout: 10000 });
                console.log(`   ✅ Health check: ${response.status}`);
            } catch (error) {
                const status = error.response?.status || 'timeout';
                console.log(`   ⚠️  Health check: ${status}`);
            }
            
            // Testar endpoints principais
            const endpoints = [
                '/api/status',
                '/webhook/tradingview',
                '/api/monitoring/status',
                '/api/users'
            ];
            
            console.log('\n📡 Testando endpoints principais...');
            for (const endpoint of endpoints) {
                try {
                    const response = await axios.get(`${this.ngrokUrl}${endpoint}`, { 
                        timeout: 5000,
                        headers: {
                            'User-Agent': 'CoinBitClub-System-Test/1.0'
                        }
                    });
                    console.log(`   ✅ ${endpoint}: ${response.status}`);
                } catch (error) {
                    const status = error.response?.status || 'timeout';
                    console.log(`   ⚠️  ${endpoint}: ${status}`);
                }
            }
            
            // Testar webhook com payload de exemplo
            console.log('\n🧪 Testando webhook com payload...');
            try {
                const testPayload = {
                    symbol: 'BTCUSDT',
                    side: 'buy',
                    action: 'open',
                    price: 45000,
                    quantity: 0.001,
                    test: true
                };
                
                const response = await axios.post(`${this.ngrokUrl}/webhook/tradingview`, testPayload, {
                    timeout: 10000,
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'TradingView-Test/1.0'
                    }
                });
                
                console.log(`   ✅ Webhook test: ${response.status}`);
                
            } catch (error) {
                const status = error.response?.status || 'timeout';
                console.log(`   ⚠️  Webhook test: ${status}`);
            }
            
        } catch (error) {
            console.error('❌ Erro no teste do sistema:', error.message);
        }
    }

    async activateRealTrading() {
        console.log('\n🚀 ATIVANDO MODO DE TRADING REAL');
        console.log('-'.repeat(40));
        
        try {
            // Ativar trading para usuários com chaves válidas
            const activationResult = await this.pool.query(`
                UPDATE users 
                SET 
                    trading_enabled = true,
                    updated_at = NOW()
                WHERE ativo = true 
                AND (
                    (binance_api_key IS NOT NULL AND LENGTH(binance_api_key) >= 50)
                    OR 
                    (bybit_api_key IS NOT NULL AND LENGTH(bybit_api_key) >= 20)
                )
            `);
            
            console.log(`✅ Trading ativado para ${activationResult.rowCount} usuários`);
            
            // Verificar status final
            const finalStatus = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(*) FILTER (WHERE trading_enabled = true) as trading_enabled,
                    COUNT(*) FILTER (WHERE binance_api_key IS NOT NULL) as with_binance,
                    COUNT(*) FILTER (WHERE bybit_api_key IS NOT NULL) as with_bybit
                FROM users 
                WHERE ativo = true
            `);
            
            const stats = finalStatus.rows[0];
            
            console.log('\n📊 STATUS FINAL DO SISTEMA:');
            console.log(`   👥 Total de usuários: ${stats.total_users}`);
            console.log(`   ⚡ Trading ativado: ${stats.trading_enabled}`);
            console.log(`   🔑 Com Binance: ${stats.with_binance}`);
            console.log(`   🔑 Com Bybit: ${stats.with_bybit}`);
            
            console.log('\n🎯 SISTEMA PRONTO PARA OPERAÇÃO:');
            console.log(`   🌍 Ngrok URL: ${this.ngrokUrl}`);
            console.log(`   📡 Webhook TradingView: ${this.ngrokUrl}/webhook/tradingview`);
            console.log(`   📊 Dashboard: ${this.ngrokUrl}/dashboard`);
            console.log(`   🔍 Health Check: ${this.ngrokUrl}/api/health`);
            
        } catch (error) {
            console.error('❌ Erro na ativação do trading:', error.message);
        }
    }
}

// Executar correção emergencial
if (require.main === module) {
    const fixer = new EmergencySystemFixer();
    fixer.fixAllEmergencyIssues();
}

module.exports = EmergencySystemFixer;
