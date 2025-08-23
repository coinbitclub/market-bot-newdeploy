#!/usr/bin/env node

/**
 * 🚨 CORREÇÃO CRÍTICA DE ERROS - PRODUÇÃO
 * ======================================
 * 
 * Corrige todos os erros identificados:
 * 1. Colunas faltando no banco de dados
 * 2. Estruturas de tabelas incompletas
 * 3. Rate limiting de APIs externas
 */

const { Pool } = require('pg');
const { exec } = require('child_process');

class CriticalErrorFixer {
    constructor() {
        // Usar Railway para conectar
        this.useRailway = !process.env.DATABASE_URL;
        
        if (!this.useRailway) {
            this.pool = new Pool({
                connectionString: process.env.DATABASE_URL
            });
        }
        this.fixedIssues = [];
        this.errors = [];
    }

    async fixAllIssues() {
        console.log('🚨 INICIANDO CORREÇÃO CRÍTICA DE ERROS...\n');
        
        try {
            await this.fixDatabaseColumns();
            await this.fixTableStructures();
            await this.validateFixes();
            this.generateReport();
        } catch (error) {
            console.error('❌ ERRO FATAL:', error);
            throw error;
        } finally {
            if (!this.useRailway && this.pool) {
                await this.pool.end();
            }
        }
    }

    async executeSQL(sql, description) {
        if (this.useRailway) {
            return new Promise((resolve, reject) => {
                const command = `railway run -- node -e "
                    const { Pool } = require('pg');
                    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
                    pool.query(\`${sql.replace(/`/g, '\\`')}\`).then(result => {
                        console.log('SUCCESS');
                        pool.end();
                    }).catch(err => {
                        console.error('ERROR:', err.message);
                        pool.end();
                        process.exit(1);
                    });
                "`;
                
                exec(command, (error, stdout, stderr) => {
                    if (error || stderr.includes('ERROR:')) {
                        reject(new Error(stderr || error.message));
                    } else {
                        resolve();
                    }
                });
            });
        } else {
            return this.pool.query(sql);
        }
    }

    async fixDatabaseColumns() {
        console.log('🔧 Corrigindo colunas faltando...\n');

        const fixes = [
            {
                name: 'btc_dominance_analysis.correlation_value',
                sql: `ALTER TABLE btc_dominance_analysis 
                      ADD COLUMN IF NOT EXISTS correlation_value DECIMAL(10,6) DEFAULT 0.0;`
            },
            {
                name: 'rsi_overheated_log.conditions',
                sql: `ALTER TABLE rsi_overheated_log 
                      ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '{}';`
            },
            {
                name: 'trading_signals.received_at',
                sql: `ALTER TABLE trading_signals 
                      ADD COLUMN IF NOT EXISTS received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`
            },
            {
                name: 'users.prepaid_balance_usd',
                sql: `ALTER TABLE users 
                      ADD COLUMN IF NOT EXISTS prepaid_balance_usd DECIMAL(15,2) DEFAULT 0.00;`
            },
            {
                name: 'btc_dominance_analysis.market_direction',
                sql: `ALTER TABLE btc_dominance_analysis 
                      ADD COLUMN IF NOT EXISTS market_direction VARCHAR(50) DEFAULT 'NEUTRAL';`
            },
            {
                name: 'btc_dominance_analysis.confidence_score',
                sql: `ALTER TABLE btc_dominance_analysis 
                      ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(5,2) DEFAULT 50.0;`
            },
            {
                name: 'rsi_overheated_log.analysis_type',
                sql: `ALTER TABLE rsi_overheated_log 
                      ADD COLUMN IF NOT EXISTS analysis_type VARCHAR(50) DEFAULT 'RSI_ANALYSIS';`
            },
            {
                name: 'trading_signals.ai_decision',
                sql: `ALTER TABLE trading_signals 
                      ADD COLUMN IF NOT EXISTS ai_decision BOOLEAN DEFAULT false;`
            },
            {
                name: 'trading_signals.ai_reason',
                sql: `ALTER TABLE trading_signals 
                      ADD COLUMN IF NOT EXISTS ai_reason TEXT;`
            }
        ];

        for (const fix of fixes) {
            try {
                await this.executeSQL(fix.sql, fix.name);
                this.fixedIssues.push(`✅ ${fix.name}`);
                console.log(`✅ ${fix.name}`);
            } catch (error) {
                this.errors.push(`❌ ${fix.name}: ${error.message}`);
                console.log(`❌ ${fix.name}: ${error.message}`);
            }
        }
    }

    async fixTableStructures() {
        console.log('\n🔧 Verificando estruturas de tabelas...\n');

        const structures = [
            {
                name: 'fear_greed_index',
                sql: `CREATE TABLE IF NOT EXISTS fear_greed_index (
                    id SERIAL PRIMARY KEY,
                    value INTEGER NOT NULL,
                    classification VARCHAR(50) NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    source VARCHAR(100) DEFAULT 'coinstats'
                );`
            },
            {
                name: 'market_metrics',
                sql: `CREATE TABLE IF NOT EXISTS market_metrics (
                    id SERIAL PRIMARY KEY,
                    btc_dominance DECIMAL(10,6),
                    top100_direction VARCHAR(50),
                    market_trend VARCHAR(50),
                    confidence_score DECIMAL(5,2),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );`
            },
            {
                name: 'api_rate_limits',
                sql: `CREATE TABLE IF NOT EXISTS api_rate_limits (
                    id SERIAL PRIMARY KEY,
                    api_name VARCHAR(100) NOT NULL,
                    requests_count INTEGER DEFAULT 0,
                    reset_time TIMESTAMP,
                    status VARCHAR(50) DEFAULT 'ACTIVE',
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );`
            }
        ];

        for (const structure of structures) {
            try {
                await this.executeSQL(structure.sql, structure.name);
                this.fixedIssues.push(`✅ Tabela ${structure.name}`);
                console.log(`✅ Tabela ${structure.name} verificada`);
            } catch (error) {
                this.errors.push(`❌ Tabela ${structure.name}: ${error.message}`);
                console.log(`❌ Tabela ${structure.name}: ${error.message}`);
            }
        }
    }

    async validateFixes() {
        console.log('\n🔍 Validando correções...\n');

        const validations = [
            {
                name: 'btc_dominance_analysis columns',
                sql: `SELECT column_name FROM information_schema.columns 
                      WHERE table_name = 'btc_dominance_analysis' 
                      AND column_name IN ('correlation_value', 'market_direction', 'confidence_score');`
            },
            {
                name: 'rsi_overheated_log columns',
                sql: `SELECT column_name FROM information_schema.columns 
                      WHERE table_name = 'rsi_overheated_log' 
                      AND column_name IN ('conditions', 'analysis_type');`
            },
            {
                name: 'trading_signals columns',
                sql: `SELECT column_name FROM information_schema.columns 
                      WHERE table_name = 'trading_signals' 
                      AND column_name IN ('received_at', 'ai_decision', 'ai_reason');`
            }
        ];

        for (const validation of validations) {
            try {
                const result = await this.pool.query(validation.sql);
                console.log(`✅ ${validation.name}: ${result.rows.length} colunas encontradas`);
                result.rows.forEach(row => {
                    console.log(`   - ${row.column_name}`);
                });
            } catch (error) {
                console.log(`❌ ${validation.name}: ${error.message}`);
            }
        }
    }

    generateReport() {
        console.log('\n' + '='.repeat(60));
        console.log('📋 RELATÓRIO DE CORREÇÃO CRÍTICA');
        console.log('='.repeat(60));
        
        console.log(`\n✅ CORREÇÕES APLICADAS: ${this.fixedIssues.length}`);
        this.fixedIssues.forEach(fix => console.log(`  ${fix}`));
        
        if (this.errors.length > 0) {
            console.log(`\n❌ ERROS ENCONTRADOS: ${this.errors.length}`);
            this.errors.forEach(error => console.log(`  ${error}`));
        }

        console.log('\n🔧 PRÓXIMOS PASSOS:');
        console.log('  1. Verificar logs de erro após correção');
        console.log('  2. Testar dashboard: /dashboard');
        console.log('  3. Monitorar webhooks do TradingView');
        console.log('  4. Verificar APIs externas (rate limits)');

        const success = this.errors.length === 0;
        console.log(`\n🎯 STATUS: ${success ? '✅ SUCESSO TOTAL' : '⚠️  PARCIALMENTE CORRIGIDO'}`);
        
        return success;
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const fixer = new CriticalErrorFixer();
    fixer.fixAllIssues().catch(error => {
        console.error('❌ ERRO FATAL:', error);
        process.exit(1);
    });
}

module.exports = CriticalErrorFixer;
