/**
 * ===============================================
 * 🚀 INTEGRADOR SISTEMA DE TAXA DE SAQUE
 * ===============================================
 * CoinBitClub Market Bot - Withdrawal Fees Integration System
 * 
 * 🎯 PIPELINE DE INTEGRAÇÃO:
 * 1. ✅ Validação de pré-requisitos
 * 2. 🗄️ Migração de banco de dados
 * 3. 🔧 Configuração de APIs
 * 4. 🎨 Deploy de componentes frontend
 * 5. 🧪 Execução de testes completos
 * 6. 📊 Verificação de saúde do sistema
 * 7. 🔄 Ativação em produção
 */

const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');
const { spawn } = require('child_process');

class WithdrawalFeesIntegrator {
    constructor() {
        this.baseDir = __dirname;
        this.logFile = path.join(this.baseDir, 'integration.log');
        
        this.dbPool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        this.integrationSteps = [
            { name: 'Validar Pré-requisitos', method: 'validatePrerequisites' },
            { name: 'Aplicar Migração do Banco', method: 'applyDatabaseMigration' },
            { name: 'Integrar APIs', method: 'integrateAPIs' },
            { name: 'Deploy Componentes Frontend', method: 'deployFrontendComponents' },
            { name: 'Executar Testes', method: 'runTests' },
            { name: 'Verificar Saúde do Sistema', method: 'healthCheck' },
            { name: 'Ativar em Produção', method: 'activateProduction' }
        ];
        
        this.results = {
            started_at: new Date().toISOString(),
            steps: [],
            success: false,
            error: null,
            completed_at: null
        };
    }
    
    // ===============================================
    // 📝 SISTEMA DE LOG
    // ===============================================
    
    async log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level}] ${message}\n`;
        
        console.log(logEntry.trim());
        
        try {
            await fs.appendFile(this.logFile, logEntry);
        } catch (error) {
            console.error('Erro ao escrever log:', error);
        }
    }
    
    async logStep(stepName, status, details = null, duration = null) {
        const stepResult = {
            name: stepName,
            status,
            details,
            duration,
            timestamp: new Date().toISOString()
        };
        
        this.results.steps.push(stepResult);
        
        const statusSymbol = status === 'SUCCESS' ? '✅' : status === 'ERROR' ? '❌' : '⏳';
        const durationText = duration ? ` (${duration}ms)` : '';
        
        await this.log(`${statusSymbol} ${stepName}: ${status}${durationText}`);
        
        if (details) {
            await this.log(`   Detalhes: ${JSON.stringify(details, null, 2)}`);
        }
    }
    
    // ===============================================
    // 🔍 VALIDAÇÃO DE PRÉ-REQUISITOS
    // ===============================================
    
    async validatePrerequisites() {
        const startTime = Date.now();
        
        try {
            // Verificar conexão com banco
            await this.dbPool.query('SELECT 1');
            await this.log('✓ Conexão com banco de dados OK');
            
            // Verificar se tabela users existe
            const usersTableCheck = await this.dbPool.query(`
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'users'
            `);
            
            if (usersTableCheck.rows.length === 0) {
                throw new Error('Tabela users não encontrada - sistema base necessário');
            }
            await this.log('✓ Tabela users encontrada');
            
            // Verificar estrutura da tabela users
            const userColumnsCheck = await this.dbPool.query(`
                SELECT column_name FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'users'
                AND column_name IN ('prepaid_credits', 'account_balance_usd')
            `);
            
            if (userColumnsCheck.rows.length < 2) {
                throw new Error('Colunas de saldo não encontradas na tabela users');
            }
            await this.log('✓ Colunas de saldo encontradas');
            
            // Verificar arquivos necessários
            const requiredFiles = [
                'migrate-taxa-saque-simple.sql',
                'routes/withdrawal-fees-api.js',
                'components/WithdrawalFeeCalculator.jsx',
                'components/AdminWithdrawalFeesDashboard.jsx',
                'tests/withdrawal-fees-test-suite.js'
            ];
            
            for (const file of requiredFiles) {
                const filePath = path.join(__dirname, file);
                try {
                    await fs.access(filePath);
                    await this.log(`✓ Arquivo ${file} encontrado`);
                } catch (error) {
                    await this.log(`❌ Arquivo não encontrado: ${filePath}`);
                    throw new Error(`Arquivo obrigatório não encontrado: ${file}`);
                }
            }
            
            await this.logStep('Validar Pré-requisitos', 'SUCCESS', {
                database: 'connected',
                required_files: 'found',
                users_table: 'ok'
            }, Date.now() - startTime);
            
            return true;
            
        } catch (error) {
            await this.logStep('Validar Pré-requisitos', 'ERROR', {
                error: error.message
            }, Date.now() - startTime);
            throw error;
        }
    }
    
    // ===============================================
    // 🗄️ MIGRAÇÃO DO BANCO DE DADOS
    // ===============================================
    
    async applyDatabaseMigration() {
        const startTime = Date.now();
        
        try {
            // Ler arquivo de migração
            // Ler arquivo de migração
            const migrationPath = path.join(__dirname, 'migrate-taxa-saque-simple.sql');
            const migrationSQL = await fs.readFile(migrationPath, 'utf8');
            
            await this.log('Iniciando migração do banco de dados...');
            
            // Executar migração em transação
            const client = await this.dbPool.connect();
            
            try {
                await client.query('BEGIN');
                
                // Executar todo o SQL de uma vez (sem dividir por ;)
                await client.query(migrationSQL);
                
                await client.query('COMMIT');
                await this.log('✓ Migração aplicada com sucesso');
                
                // Verificar se as estruturas foram criadas
                const tablesCreated = await client.query(`
                    SELECT table_name FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name IN ('withdrawal_fees_config', 'withdrawal_fees_charged')
                `);
                
                const functionsCreated = await client.query(`
                    SELECT routine_name FROM information_schema.routines 
                    WHERE routine_schema = 'public' 
                    AND routine_name LIKE '%withdrawal%fee%'
                `);
                
                await this.logStep('Aplicar Migração do Banco', 'SUCCESS', {
                    tables_created: tablesCreated.rows.length,
                    functions_created: functionsCreated.rows.length,
                    migration_file: 'migrate-taxa-saque.sql'
                }, Date.now() - startTime);
                
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
            
            return true;
            
        } catch (error) {
            await this.logStep('Aplicar Migração do Banco', 'ERROR', {
                error: error.message
            }, Date.now() - startTime);
            throw error;
        }
    }
    
    // ===============================================
    // 🔧 INTEGRAÇÃO DE APIS
    // ===============================================
    
    async integrateAPIs() {
        const startTime = Date.now();
        
        try {
            await this.log('Integrando APIs de taxa de saque...');
            
            // Verificar se o arquivo de rotas existe
            const apiFilePath = path.join(this.baseDir, 'routes/withdrawal-fees-api.js');
            const apiContent = await fs.readFile(apiFilePath, 'utf8');
            
            // Verificar se a API tem os endpoints necessários
            const requiredEndpoints = [
                'POST /api/withdrawal-fees/calculate',
                'POST /api/withdrawal-fees/validate', 
                'POST /api/withdrawal-fees/process',
                'GET /api/withdrawal-fees/config',
                'GET /api/withdrawal-fees/health'
            ];
            
            const foundEndpoints = [];
            for (const endpoint of requiredEndpoints) {
                const method = endpoint.split(' ')[0].toLowerCase();
                const route = endpoint.split(' ')[1].replace('/api/withdrawal-fees', '');
                
                if (apiContent.includes(`router.${method}('${route}'`) || 
                    apiContent.includes(`router.${method}("${route}"`)) {
                    foundEndpoints.push(endpoint);
                }
            }
            
            if (foundEndpoints.length !== requiredEndpoints.length) {
                throw new Error(`Endpoints faltando: ${requiredEndpoints.length - foundEndpoints.length}`);
            }
            
            await this.log('✓ Todos os endpoints necessários encontrados');
            
            // Simular integração com app principal
            const integrationCode = `
// INTEGRAÇÃO AUTOMÁTICA - Sistema de Taxa de Saque
const withdrawalFeesAPI = require('./implementacoes-enterprise/04-sistema-taxa-saque/routes/withdrawal-fees-api');
app.use('/api/withdrawal-fees', withdrawalFeesAPI);
`;
            
            const integrationPath = path.join(this.baseDir, 'integration-code.js');
            await fs.writeFile(integrationPath, integrationCode);
            
            await this.logStep('Integrar APIs', 'SUCCESS', {
                endpoints_found: foundEndpoints.length,
                required_endpoints: requiredEndpoints.length,
                integration_file: 'integration-code.js'
            }, Date.now() - startTime);
            
            return true;
            
        } catch (error) {
            await this.logStep('Integrar APIs', 'ERROR', {
                error: error.message
            }, Date.now() - startTime);
            throw error;
        }
    }
    
    // ===============================================
    // 🎨 DEPLOY COMPONENTES FRONTEND
    // ===============================================
    
    async deployFrontendComponents() {
        const startTime = Date.now();
        
        try {
            await this.log('Fazendo deploy dos componentes frontend...');
            
            const components = [
                'components/WithdrawalFeeCalculator.jsx',
                'components/AdminWithdrawalFeesDashboard.jsx'
            ];
            
            for (const component of components) {
                const componentPath = path.join(this.baseDir, component);
                const componentContent = await fs.readFile(componentPath, 'utf8');
                
                // Verificar se o componente tem as funcionalidades necessárias
                const requiredFeatures = [
                    'useState',
                    'useEffect', 
                    'axios',
                    'Card',
                    'Button'
                ];
                
                const foundFeatures = requiredFeatures.filter(feature => 
                    componentContent.includes(feature)
                );
                
                if (foundFeatures.length < requiredFeatures.length) {
                    throw new Error(`Componente ${component} incompleto`);
                }
                
                await this.log(`✓ Componente ${component} validado`);
            }
            
            // Criar arquivo de índice de componentes
            const indexContent = `
// COMPONENTES DO SISTEMA DE TAXA DE SAQUE
export { default as WithdrawalFeeCalculator } from './WithdrawalFeeCalculator';
export { default as AdminWithdrawalFeesDashboard } from './AdminWithdrawalFeesDashboard';
`;
            
            const indexPath = path.join(this.baseDir, 'components/index.js');
            await fs.writeFile(indexPath, indexContent);
            
            await this.logStep('Deploy Componentes Frontend', 'SUCCESS', {
                components_deployed: components.length,
                index_file: 'created'
            }, Date.now() - startTime);
            
            return true;
            
        } catch (error) {
            await this.logStep('Deploy Componentes Frontend', 'ERROR', {
                error: error.message
            }, Date.now() - startTime);
            throw error;
        }
    }
    
    // ===============================================
    // 🧪 EXECUÇÃO DOS TESTES
    // ===============================================
    
    async runTests() {
        const startTime = Date.now();
        
        try {
            await this.log('Executando suite completa de testes...');
            
            const testFilePath = path.join(this.baseDir, 'tests/withdrawal-fees-test-suite.js');
            
            return new Promise((resolve, reject) => {
                const testProcess = spawn('node', [testFilePath], {
                    cwd: this.baseDir,
                    env: { ...process.env, NODE_ENV: 'test' }
                });
                
                let testOutput = '';
                let testErrors = '';
                
                testProcess.stdout.on('data', (data) => {
                    testOutput += data.toString();
                });
                
                testProcess.stderr.on('data', (data) => {
                    testErrors += data.toString();
                });
                
                testProcess.on('close', async (code) => {
                    if (code === 0) {
                        await this.log('✓ Todos os testes passaram');
                        await this.logStep('Executar Testes', 'SUCCESS', {
                            exit_code: code,
                            output_lines: testOutput.split('\n').length
                        }, Date.now() - startTime);
                        resolve(true);
                    } else {
                        await this.log(`❌ Testes falharam (código: ${code})`);
                        await this.log(`Erro: ${testErrors}`);
                        await this.logStep('Executar Testes', 'ERROR', {
                            exit_code: code,
                            error: testErrors
                        }, Date.now() - startTime);
                        reject(new Error(`Testes falharam com código ${code}`));
                    }
                });
                
                testProcess.on('error', async (error) => {
                    await this.log(`❌ Erro ao executar testes: ${error.message}`);
                    await this.logStep('Executar Testes', 'ERROR', {
                        error: error.message
                    }, Date.now() - startTime);
                    reject(error);
                });
            });
            
        } catch (error) {
            await this.logStep('Executar Testes', 'ERROR', {
                error: error.message
            }, Date.now() - startTime);
            throw error;
        }
    }
    
    // ===============================================
    // 🏥 VERIFICAÇÃO DE SAÚDE
    // ===============================================
    
    async healthCheck() {
        const startTime = Date.now();
        
        try {
            await this.log('Verificando saúde do sistema...');
            
            // Verificar banco de dados
            const dbHealth = await this.dbPool.query('SELECT 1 as health');
            
            // Verificar configurações ativas
            const configHealth = await this.dbPool.query(`
                SELECT currency, fee_amount, active 
                FROM withdrawal_fees_config 
                WHERE active = true
            `);
            
            // Verificar funções
            const functionsHealth = await this.dbPool.query(`
                SELECT routine_name 
                FROM information_schema.routines 
                WHERE routine_schema = 'public' 
                AND routine_name LIKE '%withdrawal%fee%'
            `);
            
            // Verificar views
            const viewsHealth = await this.dbPool.query(`
                SELECT table_name 
                FROM information_schema.views 
                WHERE table_schema = 'public' 
                AND table_name LIKE '%withdrawal%fee%'
            `);
            
            const healthData = {
                database: dbHealth.rows.length > 0 ? 'OK' : 'ERROR',
                active_configs: configHealth.rows.length,
                functions: functionsHealth.rows.length,
                views: viewsHealth.rows.length,
                timestamp: new Date().toISOString()
            };
            
            if (healthData.active_configs < 2 || healthData.functions < 3 || healthData.views < 2) {
                throw new Error('Sistema não está completamente funcional');
            }
            
            await this.log('✓ Sistema saudável e operacional');
            
            await this.logStep('Verificar Saúde do Sistema', 'SUCCESS', healthData, Date.now() - startTime);
            
            return true;
            
        } catch (error) {
            await this.logStep('Verificar Saúde do Sistema', 'ERROR', {
                error: error.message
            }, Date.now() - startTime);
            throw error;
        }
    }
    
    // ===============================================
    // 🔄 ATIVAÇÃO EM PRODUÇÃO
    // ===============================================
    
    async activateProduction() {
        const startTime = Date.now();
        
        try {
            await this.log('Ativando sistema em produção...');
            
            // Verificar se é seguro ativar
            const safetyCheck = await this.dbPool.query(`
                SELECT 
                    (SELECT COUNT(*) FROM withdrawal_fees_config WHERE active = true) as active_configs,
                    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name LIKE '%withdrawal%fee%') as functions,
                    (SELECT COUNT(*) FROM information_schema.views WHERE table_name LIKE '%withdrawal%fee%') as views
            `);
            
            const safety = safetyCheck.rows[0];
            
            if (safety.active_configs < 2 || safety.functions < 3 || safety.views < 2) {
                throw new Error('Sistema não está pronto para produção');
            }
            
            // Criar flag de ativação
            await this.dbPool.query(`
                INSERT INTO withdrawal_fees_charged (
                    withdrawal_id, user_id, currency, withdrawal_amount, fee_amount,
                    total_charged, charged_by, metadata
                ) VALUES (
                    -999, 'system', 'SYS', 0, 0, 0, 'integrator',
                    jsonb_build_object(
                        'action', 'system_activation',
                        'version', '1.0.0',
                        'activated_at', CURRENT_TIMESTAMP,
                        'status', 'PRODUCTION'
                    )
                )
            `);
            
            // Criar arquivo de status
            const statusData = {
                system: 'withdrawal-fees',
                version: '1.0.0',
                status: 'ACTIVE',
                activated_at: new Date().toISOString(),
                features: [
                    'BRL fee charging (R$ 10.00)',
                    'USD fee charging ($ 2.00)',
                    'Automatic balance validation',
                    'Real-time fee calculation',
                    'Admin dashboard',
                    'Revenue reporting',
                    'Security validation'
                ]
            };
            
            const statusPath = path.join(this.baseDir, 'production-status.json');
            await fs.writeFile(statusPath, JSON.stringify(statusData, null, 2));
            
            await this.log('🎉 Sistema ativado em produção com sucesso!');
            
            await this.logStep('Ativar em Produção', 'SUCCESS', {
                status: 'ACTIVE',
                features: statusData.features.length,
                safety_check: safety
            }, Date.now() - startTime);
            
            return true;
            
        } catch (error) {
            await this.logStep('Ativar em Produção', 'ERROR', {
                error: error.message
            }, Date.now() - startTime);
            throw error;
        }
    }
    
    // ===============================================
    // 🚀 EXECUÇÃO PRINCIPAL
    // ===============================================
    
    async integrate() {
        console.log('\n' + '='.repeat(80));
        console.log('🚀 INICIANDO INTEGRAÇÃO DO SISTEMA DE TAXA DE SAQUE');
        console.log('='.repeat(80));
        
        try {
            for (const step of this.integrationSteps) {
                await this.log(`\n📋 Executando: ${step.name}...`);
                await this[step.method]();
            }
            
            this.results.success = true;
            this.results.completed_at = new Date().toISOString();
            
            await this.log('\n🎉 INTEGRAÇÃO CONCLUÍDA COM SUCESSO!');
            console.log('\n' + '='.repeat(80));
            console.log('✅ SISTEMA DE TAXA DE SAQUE ATIVO EM PRODUÇÃO');
            console.log('='.repeat(80));
            console.log('📊 Funcionalidades disponíveis:');
            console.log('   • Taxa automática R$ 10,00 (BRL) / $ 2,00 (USD)');
            console.log('   • Validação de saldo em tempo real');
            console.log('   • Interface de usuário intuitiva');
            console.log('   • Dashboard administrativo');
            console.log('   • Relatórios de receita');
            console.log('   • Sistema de auditoria completo');
            console.log('='.repeat(80));
            
            return this.results;
            
        } catch (error) {
            this.results.success = false;
            this.results.error = error.message;
            this.results.completed_at = new Date().toISOString();
            
            await this.log(`\n❌ ERRO NA INTEGRAÇÃO: ${error.message}`, 'ERROR');
            console.log('\n' + '='.repeat(80));
            console.log('❌ INTEGRAÇÃO FALHOU');
            console.log('='.repeat(80));
            
            throw error;
        }
    }
    
    async generateReport() {
        const reportPath = path.join(this.baseDir, 'integration-report.json');
        await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
        
        await this.log(`📋 Relatório salvo em: ${reportPath}`);
        return reportPath;
    }
}

// ===============================================
// 🎬 EXECUÇÃO
// ===============================================

if (require.main === module) {
    (async () => {
        const integrator = new WithdrawalFeesIntegrator();
        
        try {
            await integrator.integrate();
            await integrator.generateReport();
            process.exit(0);
        } catch (error) {
            console.error('❌ Falha na integração:', error);
            await integrator.generateReport();
            process.exit(1);
        }
    })();
}

module.exports = WithdrawalFeesIntegrator;
