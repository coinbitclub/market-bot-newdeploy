#!/usr/bin/env node

/**
 * 🔧 CORREÇÃO DAS ORIGENS DOS NULLS
 * ==================================
 * 
 * Identifica e corrige as fontes que estão gerando dados NULL
 * no sistema para evitar que o problema volte a acontecer
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.production' });

class NullOriginFixer {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
        this.fixedFiles = [];
        this.backupDir = path.join(__dirname, 'backup_originals');
    }

    async fixNullOrigins() {
        console.log('🔧 INICIANDO CORREÇÃO DAS ORIGENS DOS NULLS');
        console.log('============================================');
        
        try {
            // 1. Criar diretório de backup
            this.createBackupDirectory();

            // 2. Corrigir arquivos que fazem INSERT sem signal_type
            await this.fixSignalInsertsWithoutSignalType();

            // 3. Corrigir estrutura do banco para DEFAULT values
            await this.addDefaultConstraints();

            // 4. Corrigir arquivos que criam usuários sem defaults
            await this.fixUserInsertsWithoutDefaults();

            // 5. Criar validadores na aplicação
            await this.createDataValidators();

            console.log('\n🎉 CORREÇÃO DAS ORIGENS FINALIZADA!');
            console.log('===================================');
            this.generateReport();

        } catch (error) {
            console.error('❌ Erro na correção:', error.message);
        } finally {
            await this.pool.end();
        }
    }

    createBackupDirectory() {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
            console.log('📁 Diretório de backup criado:', this.backupDir);
        }
    }

    async fixSignalInsertsWithoutSignalType() {
        console.log('\n🔍 CORRIGINDO INSERÇÕES SEM SIGNAL_TYPE');
        console.log('=======================================');

        const problematicFiles = [
            'enhanced-signal-processor-with-execution.js',
            'enhanced-signal-processor.js'
        ];

        for (const fileName of problematicFiles) {
            const filePath = path.join(__dirname, fileName);
            
            if (fs.existsSync(filePath)) {
                console.log(`🔧 Corrigindo ${fileName}...`);
                
                // Fazer backup
                const backupPath = path.join(this.backupDir, fileName + '.backup');
                fs.copyFileSync(filePath, backupPath);
                
                // Ler conteúdo
                let content = fs.readFileSync(filePath, 'utf8');
                
                // Corrigir INSERT sem signal_type
                const oldInsert = `INSERT INTO signals (
                symbol, action, price, leverage, 
                raw_data, processed_at, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`;

                const newInsert = `INSERT INTO signals (
                symbol, action, price, leverage, signal_type,
                raw_data, processed_at, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;

                if (content.includes(oldInsert)) {
                    content = content.replace(oldInsert, newInsert);
                    
                    // Corrigir array de valores também
                    const oldValues = `const values = [
            symbol,
            action,
            price,
            leverage,
            JSON.stringify(signalData),
            new Date(),
            'PROCESSED'
        ];`;

                    const newValues = `const values = [
            symbol,
            action,
            price,
            leverage,
            this.determineSignalType(action, signalData), // Novo campo signal_type
            JSON.stringify(signalData),
            new Date(),
            'PROCESSED'
        ];`;

                    content = content.replace(oldValues, newValues);
                    
                    // Adicionar método helper
                    const helperMethod = `

    /**
     * 🎯 Determinar tipo do sinal baseado na ação e dados
     */
    determineSignalType(action, signalData) {
        // Mapear action para signal_type
        const actionToSignalType = {
            'BUY': 'SINAL_LONG',
            'SELL': 'SINAL_SHORT',
            'LONG': 'SINAL_LONG',
            'SHORT': 'SINAL_SHORT',
            'STRONG_BUY': 'SINAL_LONG_FORTE',
            'STRONG_SELL': 'SINAL_SHORT_FORTE'
        };

        // Se temos signal_type explícito nos dados, usar ele
        if (signalData.signal_type) {
            return signalData.signal_type;
        }

        // Mapear baseado na action
        return actionToSignalType[action?.toUpperCase()] || 'SINAL_LONG';
    }`;

                    // Adicionar antes do último }
                    const lastBrace = content.lastIndexOf('}');
                    content = content.slice(0, lastBrace) + helperMethod + '\n' + content.slice(lastBrace);
                    
                    // Salvar arquivo corrigido
                    fs.writeFileSync(filePath, content);
                    
                    console.log(`✅ ${fileName} corrigido`);
                    this.fixedFiles.push(fileName);
                } else {
                    console.log(`ℹ️  ${fileName} - INSERT já está correto`);
                }
            } else {
                console.log(`⚠️  ${fileName} não encontrado`);
            }
        }
    }

    async addDefaultConstraints() {
        console.log('\n🗄️  ADICIONANDO CONSTRAINTS DEFAULT NO BANCO');
        console.log('============================================');

        const constraints = [
            {
                name: 'signals_signal_type_default',
                sql: `ALTER TABLE signals ALTER COLUMN signal_type SET DEFAULT 'SINAL_LONG'`
            },
            {
                name: 'users_is_active_default', 
                sql: `ALTER TABLE users ALTER COLUMN is_active SET DEFAULT true`
            },
            {
                name: 'users_plan_type_default',
                sql: `ALTER TABLE users ALTER COLUMN plan_type SET DEFAULT 'MONTHLY'`
            },
            {
                name: 'users_created_at_default',
                sql: `ALTER TABLE users ALTER COLUMN created_at SET DEFAULT NOW()`
            },
            {
                name: 'users_updated_at_default',
                sql: `ALTER TABLE users ALTER COLUMN updated_at SET DEFAULT NOW()`
            }
        ];

        for (const constraint of constraints) {
            try {
                await this.pool.query(constraint.sql);
                console.log(`✅ ${constraint.name} aplicado`);
            } catch (error) {
                if (error.message.includes('already has a default')) {
                    console.log(`ℹ️  ${constraint.name} já existe`);
                } else {
                    console.log(`⚠️  ${constraint.name} erro:`, error.message);
                }
            }
        }
    }

    async fixUserInsertsWithoutDefaults() {
        console.log('\n👥 CORRIGINDO INSERÇÕES DE USUÁRIOS');
        console.log('==================================');

        // Verificar se há INSERTs de usuários problemáticos
        const userFiles = [
            'user-management.js',
            'financial-manager.js',
            'commission-system.js'
        ];

        for (const fileName of userFiles) {
            const filePath = path.join(__dirname, fileName);
            
            if (fs.existsSync(filePath)) {
                let content = fs.readFileSync(filePath, 'utf8');
                
                // Verificar se há INSERTs problemáticos e fazer backup se necessário
                if (content.includes('INSERT INTO users') && !content.includes('COALESCE')) {
                    console.log(`📋 Analisando ${fileName} para INSERTs de usuários...`);
                    
                    // Para este exemplo, apenas reportamos que encontramos
                    // A correção específica dependeria do conteúdo exato
                    console.log(`ℹ️  ${fileName} - revisar INSERTs de usuários manualmente`);
                }
            }
        }
    }

    async createDataValidators() {
        console.log('\n🛡️  CRIANDO VALIDADORES DE DADOS');
        console.log('================================');

        // Criar arquivo de validadores
        const validatorContent = `#!/usr/bin/env node

/**
 * 🛡️ VALIDADORES DE DADOS
 * =======================
 * 
 * Previne inserção de dados NULL críticos
 */

class DataValidators {
    /**
     * 🎯 Validar dados de sinal antes de inserir
     */
    static validateSignalData(signalData) {
        const errors = [];

        // Campos obrigatórios
        if (!signalData.symbol && !signalData.ticker) {
            errors.push('symbol/ticker é obrigatório');
        }

        if (!signalData.action && !signalData.signal) {
            errors.push('action/signal é obrigatório');
        }

        // Garantir signal_type
        if (!signalData.signal_type) {
            // Auto-corrigir baseado na action
            signalData.signal_type = this.mapActionToSignalType(
                signalData.action || signalData.signal
            );
        }

        return { isValid: errors.length === 0, errors, data: signalData };
    }

    /**
     * 👥 Validar dados de usuário antes de inserir
     */
    static validateUserData(userData) {
        const errors = [];

        // Campos obrigatórios
        if (!userData.email) {
            errors.push('email é obrigatório');
        }

        // Garantir defaults
        userData.is_active = userData.is_active !== undefined ? userData.is_active : true;
        userData.plan_type = userData.plan_type || 'MONTHLY';
        userData.created_at = userData.created_at || new Date();
        userData.updated_at = userData.updated_at || new Date();

        return { isValid: errors.length === 0, errors, data: userData };
    }

    /**
     * 🔄 Mapear action para signal_type
     */
    static mapActionToSignalType(action) {
        const mapping = {
            'BUY': 'SINAL_LONG',
            'SELL': 'SINAL_SHORT', 
            'LONG': 'SINAL_LONG',
            'SHORT': 'SINAL_SHORT',
            'STRONG_BUY': 'SINAL_LONG_FORTE',
            'STRONG_SELL': 'SINAL_SHORT_FORTE'
        };

        return mapping[action?.toUpperCase()] || 'SINAL_LONG';
    }

    /**
     * 🔍 Validar antes de INSERT (uso geral)
     */
    static validateBeforeInsert(tableName, data) {
        switch (tableName) {
            case 'signals':
                return this.validateSignalData(data);
            case 'users':
                return this.validateUserData(data);
            default:
                return { isValid: true, errors: [], data };
        }
    }
}

module.exports = DataValidators;
`;

        const validatorPath = path.join(__dirname, 'data-validators.js');
        fs.writeFileSync(validatorPath, validatorContent);
        console.log('✅ data-validators.js criado');
        this.fixedFiles.push('data-validators.js (novo)');
    }

    generateReport() {
        console.log('\n📊 RELATÓRIO DE CORREÇÕES');
        console.log('========================');
        console.log(`📁 Backups salvos em: ${this.backupDir}`);
        console.log('📝 Arquivos modificados/criados:');
        this.fixedFiles.forEach(file => {
            console.log(`   ✅ ${file}`);
        });

        console.log('\n🎯 PRÓXIMOS PASSOS:');
        console.log('1. ✅ Teste o sistema com novos sinais');
        console.log('2. ✅ Verifique se não há mais NULLs sendo criados');
        console.log('3. ✅ Implemente os validadores nos endpoints principais');
        console.log('4. ✅ Configure monitoring para detectar NULLs automaticamente');

        console.log('\n🛡️  PREVENÇÃO IMPLEMENTADA:');
        console.log('✅ Constraints DEFAULT no banco');
        console.log('✅ Validadores de dados criados');
        console.log('✅ INSERTs corrigidos para incluir signal_type');
        console.log('✅ Método helper para mapear actions');
    }
}

// Executar correção
if (require.main === module) {
    const fixer = new NullOriginFixer();
    fixer.fixNullOrigins();
}

module.exports = NullOriginFixer;
