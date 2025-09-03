#!/usr/bin/env node

/**
 * 🔄 RAILWAY VARIABLES UPDATER
 * ============================
 * 
 * Atualiza variáveis internas do Railway para sincronizar com o código atual
 * IMPORTANTE: NÃO mexe nas chaves externas (APIs, credenciais)
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class RailwayVariablesUpdater {
    constructor() {
        this.internalVariables = {
            // Sistema
            'NODE_ENV': 'production',
            'PORT': '3000',
            
            // Trading Configuration
            'ENABLE_REAL_TRADING': 'true',
            'POSITION_SAFETY_ENABLED': 'true', 
            'MANDATORY_STOP_LOSS': 'true',
            'MANDATORY_TAKE_PROFIT': 'true',
            'MAX_LEVERAGE': '10',
            'DEFAULT_LEVERAGE': '5',
            
            // URLs (atualizadas)
            'BACKEND_URL': 'https://coinbitclub-market-bot.up.railway.app',
            'FRONTEND_URL': 'https://coinbitclub-frontend.railway.app',
            'WEBHOOK_URL': 'https://coinbitclub-market-bot.up.railway.app/webhook',
            
            // Business Rules
            'MIN_BALANCE_BRAZIL_BRL': '100',
            'MIN_BALANCE_FOREIGN_USD': '20',
            'COMMISSION_MONTHLY_BRAZIL': '10',
            'COMMISSION_MONTHLY_FOREIGN': '10', 
            'COMMISSION_PREPAID_BRAZIL': '20',
            'COMMISSION_PREPAID_FOREIGN': '20',
            'AFFILIATE_NORMAL_RATE': '1.5',
            'AFFILIATE_VIP_RATE': '5.0',
            
            // Security & Performance
            'RATE_LIMIT_WINDOW_MS': '900000',
            'RATE_LIMIT_MAX_REQUESTS': '100',
            'LOG_LEVEL': 'info',
            'ENABLE_DETAILED_LOGS': 'true',
            'ANALYTICS_ENABLED': 'true',
            
            // Trading Parameters
            'DEFAULT_SL_MULTIPLIER': '2',
            'DEFAULT_TP_MULTIPLIER': '3',
            'MAX_SL_MULTIPLIER': '5',
            'MAX_TP_MULTIPLIER': '6',
            'DEFAULT_POSITION_SIZE_PERCENT': '30',
            'MAX_POSITION_SIZE_PERCENT': '50',
            'MAX_POSITIONS_PER_USER': '2',
            'TICKER_BLOCK_HOURS': '2',
            'BTC_DOMINANCE_THRESHOLD': '0.3',
            
            // Features
            'ENABLE_EMAIL_NOTIFICATIONS': 'true',
            'ENABLE_SMS_NOTIFICATIONS': 'true',
            'ENABLE_ADVANCED_ANALYTICS': 'true'
        };
        
        this.externalVariables = [
            // NÃO MEXER - Chaves externas
            'DATABASE_URL"process.env.DATABASE_URL"DATABASE_PUBLIC_URL', 
            'OPENAI_API_KEYYOUR_API_KEY_HERECOINSTATS_API_KEYYOUR_API_KEY_HEREBINANCE_API_KEYYOUR_API_KEY_HEREBINANCE_API_SECRET',
            'BYBIT_API_KEYYOUR_API_KEY_HEREBYBIT_API_SECRET',
            'BINANCE_TESTNET_API_KEYYOUR_API_KEY_HEREBINANCE_TESTNET_API_SECRET',
            'BYBIT_TESTNET_API_KEYYOUR_API_KEY_HEREBYBIT_TESTNET_API_SECRET',
            'STRIPE_SECRET_KEY',
            'STRIPE_PUBLISHABLE_KEY',
            'JWT_SECRET',
            'JWT_REFRESH_SECRET',
            'ENCRYPTION_KEY',
            'TWILIO_ACCOUNT_SID',
            'TWILIO_AUTH_TOKEN',
            'TWILIO_PHONE_NUMBER',
            'WEBHOOK_SECRET',
            'NEXTAUTH_SECRET'
        ];
        
        this.updatedCount = 0;
        this.errors = [];
    }

    async updateVariables() {
        console.log('🔄 INICIANDO ATUALIZAÇÃO DE VARIÁVEIS RAILWAY...\n');
        
        console.log('⚠️  IMPORTANTE: Apenas variáveis internas serão atualizadas');
        console.log('🔒 Chaves externas (APIs, credenciais) serão preservadas\n');
        
        for (const [key, value] of Object.entries(this.internalVariables)) {
            try {
                await this.updateVariable(key, value);
                this.updatedCount++;
                console.log(`✅ ${key} = ${value}`);
            } catch (error) {
                this.errors.push({ key, error: error.message });
                console.log(`❌ Erro em ${key}: ${error.message}`);
            }
        }
        
        this.generateReport();
    }

    async updateVariable(key, value) {
        return new Promise((resolve, reject) => {
            const command = `railway variables --set "${key}=${value}"`;
            
            exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(stdout);
            });
        });
    }

    generateReport() {
        console.log('\n' + '='.repeat(60));
        console.log('📋 RELATÓRIO DE ATUALIZAÇÃO RAILWAY');
        console.log('='.repeat(60));
        
        console.log(`\n📊 VARIÁVEIS INTERNAS: ${Object.keys(this.internalVariables).length}`);
        console.log(`✅ ATUALIZADAS: ${this.updatedCount}`);
        console.log(`❌ ERROS: ${this.errors.length}`);
        console.log(`🔒 PRESERVADAS: ${this.externalVariables.length} chaves externas`);

        if (this.errors.length > 0) {
            console.log('\n❌ ERROS ENCONTRADOS:');
            this.errors.forEach(error => {
                console.log(`  • ${error.key}: ${error.error}`);
            });
        }

        console.log('\n🔒 CHAVES EXTERNAS PRESERVADAS:');
        console.log('  (não foram alteradas)');
        this.externalVariables.forEach(key => {
            console.log(`  • ${key}`);
        });

        console.log('\n✅ PRÓXIMOS PASSOS:');
        console.log('  1. Verificar se todas as variáveis foram atualizadas');
        console.log('  2. Fazer deploy: railway up');
        console.log('  3. Monitorar logs: railway logs');

        const success = this.errors.length === 0;
        console.log(`\n🎯 STATUS: ${success ? '✅ SUCESSO' : '⚠️  COM ERROS'}`);
        
        return success;
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const updater = new RailwayVariablesUpdater();
    updater.updateVariables().catch(error => {
        console.error('❌ ERRO FATAL:', error);
        process.exit(1);
    });
}

module.exports = RailwayVariablesUpdater;
