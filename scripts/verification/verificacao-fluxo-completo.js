// 🔍 VERIFICAÇÃO COMPLETA DO FLUXO DE TRADING
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

class FluxoTradingValidator {
    constructor() {
        this.problemas = [];
        this.sucessos = [];
    }

    log(msg, tipo = 'INFO') {
        console.log(`[${tipo}] ${msg}`);
        if (tipo === 'ERROR') this.problemas.push(msg);
        else this.sucessos.push(msg);
    }

    // 1. VERIFICAÇÃO DE DADOS DE MERCADO
    async verificarDadosMercado() {
        console.log('\n📊 1. VERIFICAÇÃO DOS DADOS DE MERCADO');
        console.log('=====================================');

        try {
            // Fear & Greed Index
            const fearGreed = await pool.query(`
                SELECT value, value_classification, source, collected_at 
                FROM fear_greed_index 
                WHERE collected_at > NOW() - INTERVAL '2 hours' 
                ORDER BY collected_at DESC LIMIT 1
            `);

            if (fearGreed.rows.length > 0) {
                const fg = fearGreed.rows[0];
                this.log(`✅ Fear & Greed: ${fg.value} (${fg.value_classification}) - ${fg.source}`);
                if (fg.value === null) this.log('❌ Fear & Greed value é NULL', 'ERROR');
            } else {
                this.log('❌ Nenhum Fear & Greed recente encontrado', 'ERROR');
            }

            // TOP 100 Cryptocurrencies
            const top100 = await pool.query(`
                SELECT COUNT(*) as total, 
                       COUNT(CASE WHEN price_change_24h > 0 THEN 1 END) as positive,
                       MAX(collected_at) as last_update
                FROM top100_cryptocurrencies 
                WHERE collected_at > NOW() - INTERVAL '2 hours'
            `);

            if (top100.rows.length > 0) {
                const t100 = top100.rows[0];
                const percentageUp = (parseInt(t100.positive) / parseInt(t100.total) * 100).toFixed(1);
                this.log(`✅ TOP 100: ${t100.total} moedas, ${percentageUp}% subindo`);
                if (parseInt(t100.total) < 50) this.log('❌ Poucos dados TOP 100', 'ERROR');
            } else {
                this.log('❌ Nenhum dado TOP 100 recente', 'ERROR');
            }

            // BTC Dominance
            const btcDom = await pool.query(`
                SELECT btc_dominance, market_cap_change_24h, total_market_cap, collected_at
                FROM btc_dominance 
                ORDER BY collected_at DESC LIMIT 1
            `);

            if (btcDom.rows.length > 0) {
                const btc = btcDom.rows[0];
                this.log(`✅ BTC Dominance: ${btc.btc_dominance}%, Market Cap 24h: ${btc.market_cap_change_24h}%`);
                if (btc.btc_dominance === null) this.log('❌ BTC Dominance é NULL', 'ERROR');
                if (btc.market_cap_change_24h === null) this.log('❌ Market Cap Change é NULL', 'ERROR');
            } else {
                this.log('❌ Nenhum dado BTC Dominance encontrado', 'ERROR');
            }

        } catch (error) {
            this.log(`❌ Erro na verificação de mercado: ${error.message}`, 'ERROR');
        }
    }

    // 2. VERIFICAÇÃO DA IA E TOMADA DE DECISÕES
    async verificarIA() {
        console.log('\n🤖 2. VERIFICAÇÃO DA IA E DECISÕES');
        console.log('==================================');

        try {
            // Verificar logs de IA recentes
            const aiLogs = await pool.query(`
                SELECT COUNT(*) as total, 
                       COUNT(CASE WHEN ai_approved = true THEN 1 END) as approved,
                       MAX(created_at) as last_decision
                FROM signal_metrics_log 
                WHERE created_at > NOW() - INTERVAL '24 hours'
                AND ai_decision IS NOT NULL
            `);

            if (aiLogs.rows.length > 0) {
                const ai = aiLogs.rows[0];
                this.log(`✅ IA: ${ai.total} decisões, ${ai.approved} aprovadas nas últimas 24h`);
                if (ai.last_decision) {
                    this.log(`✅ Última decisão IA: ${ai.last_decision}`);
                } else {
                    this.log('❌ Nenhuma decisão IA recente', 'ERROR');
                }
            } else {
                this.log('❌ Nenhum log de IA encontrado', 'ERROR');
            }

            // Verificar campos NULL nas métricas
            const nullFields = await pool.query(`
                SELECT 
                    COUNT(CASE WHEN fear_greed_value IS NULL THEN 1 END) as null_fear_greed,
                    COUNT(CASE WHEN btc_dominance IS NULL THEN 1 END) as null_btc_dominance,
                    COUNT(CASE WHEN market_rsi IS NULL THEN 1 END) as null_market_rsi,
                    COUNT(CASE WHEN confidence IS NULL THEN 1 END) as null_confidence
                FROM signal_metrics_log 
                WHERE created_at > NOW() - INTERVAL '24 hours'
            `);

            if (nullFields.rows.length > 0) {
                const nulls = nullFields.rows[0];
                if (parseInt(nulls.null_fear_greed) > 0) this.log(`❌ ${nulls.null_fear_greed} registros com Fear & Greed NULL`, 'ERROR');
                if (parseInt(nulls.null_btc_dominance) > 0) this.log(`❌ ${nulls.null_btc_dominance} registros com BTC Dominance NULL`, 'ERROR');
                if (parseInt(nulls.null_market_rsi) > 0) this.log(`❌ ${nulls.null_market_rsi} registros com Market RSI NULL`, 'ERROR');
                if (parseInt(nulls.null_confidence) > 0) this.log(`❌ ${nulls.null_confidence} registros com Confidence NULL`, 'ERROR');
                
                if (parseInt(nulls.null_fear_greed) === 0 && parseInt(nulls.null_btc_dominance) === 0) {
                    this.log('✅ Nenhum campo crítico NULL encontrado');
                }
            }

        } catch (error) {
            this.log(`❌ Erro na verificação da IA: ${error.message}`, 'ERROR');
        }
    }

    // 3. VERIFICAÇÃO DE USUÁRIOS E CONFIGURAÇÕES
    async verificarUsuarios() {
        console.log('\n👥 3. VERIFICAÇÃO DE USUÁRIOS E CONFIGS');
        console.log('=======================================');

        try {
            // Usuários ativos com trading habilitado
            const usuariosAtivos = await pool.query(`
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN auto_trading_enabled = true THEN 1 END) as auto_trading_enabled,
                    COUNT(CASE WHEN bybit_api_key IS NOT NULL AND bybit_api_secret IS NOT NULL THEN 1 END) as with_bybit_keys,
                    COUNT(CASE WHEN binance_api_key_encrypted IS NOT NULL THEN 1 END) as with_binance_keys,
                    COUNT(CASE WHEN api_validation_status = 'valid' THEN 1 END) as valid_apis
                FROM users 
                WHERE is_active = true
            `);

            if (usuariosAtivos.rows.length > 0) {
                const users = usuariosAtivos.rows[0];
                this.log(`✅ Usuários: ${users.total_users} ativos, ${users.auto_trading_enabled} com auto-trading`);
                this.log(`✅ APIs: ${users.with_bybit_keys} Bybit, ${users.with_binance_keys} Binance, ${users.valid_apis} validadas`);
                
                if (parseInt(users.auto_trading_enabled) === 0) {
                    this.log('⚠️ Nenhum usuário com auto-trading habilitado', 'ERROR');
                }
            }

            // Configurações de trading dos usuários
            const tradingConfigs = await pool.query(`
                SELECT 
                    COUNT(*) as total_configs,
                    COUNT(CASE WHEN risk_percentage IS NOT NULL THEN 1 END) as with_risk_config,
                    COUNT(CASE WHEN leverage_preference IS NOT NULL THEN 1 END) as with_leverage_config,
                    AVG(risk_percentage) as avg_risk
                FROM users 
                WHERE is_active = true AND auto_trading_enabled = true
            `);

            if (tradingConfigs.rows.length > 0) {
                const configs = tradingConfigs.rows[0];
                this.log(`✅ Configs: ${configs.with_risk_config} com risco, ${configs.with_leverage_config} com leverage`);
                this.log(`✅ Risco médio: ${configs.avg_risk ? parseFloat(configs.avg_risk).toFixed(2) : 'N/A'}%`);
            }

        } catch (error) {
            this.log(`❌ Erro na verificação de usuários: ${error.message}`, 'ERROR');
        }
    }

    // 4. VERIFICAÇÃO DE ORDENS AUTOMÁTICAS
    async verificarOrdens() {
        console.log('\n📋 4. VERIFICAÇÃO DE ORDENS AUTOMÁTICAS');
        console.log('=======================================');

        try {
            // Ordens recentes
            const ordensRecentes = await pool.query(`
                SELECT 
                    COUNT(*) as total_orders,
                    COUNT(CASE WHEN status = 'executed' THEN 1 END) as executed,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
                    MAX(created_at) as last_order
                FROM order_executions 
                WHERE created_at > NOW() - INTERVAL '24 hours'
            `);

            if (ordensRecentes.rows.length > 0) {
                const orders = ordensRecentes.rows[0];
                this.log(`✅ Ordens 24h: ${orders.total_orders} total, ${orders.executed} executadas, ${orders.pending} pendentes`);
                if (orders.last_order) {
                    this.log(`✅ Última ordem: ${orders.last_order}`);
                } else {
                    this.log('⚠️ Nenhuma ordem nas últimas 24h');
                }
            }

            // Trading signals processados
            const sinaisProcessados = await pool.query(`
                SELECT 
                    COUNT(*) as total_signals,
                    COUNT(CASE WHEN status = 'processed' THEN 1 END) as processed,
                    COUNT(CASE WHEN executed_at IS NOT NULL THEN 1 END) as executed,
                    MAX(created_at) as last_signal
                FROM trading_signals 
                WHERE created_at > NOW() - INTERVAL '24 hours'
            `);

            if (sinaisProcessados.rows.length > 0) {
                const signals = sinaisProcessados.rows[0];
                this.log(`✅ Sinais 24h: ${signals.total_signals} total, ${signals.processed} processados, ${signals.executed} executados`);
                if (parseInt(signals.total_signals) === 0) {
                    this.log('⚠️ Nenhum sinal nas últimas 24h - sistema pode estar parado');
                }
            }

        } catch (error) {
            this.log(`❌ Erro na verificação de ordens: ${error.message}`, 'ERROR');
        }
    }

    // 5. VERIFICAÇÃO DE MONITORAMENTO
    async verificarMonitoramento() {
        console.log('\n📈 5. VERIFICAÇÃO DE MONITORAMENTO');
        console.log('==================================');

        try {
            // System logs
            const systemLogs = await pool.query(`
                SELECT 
                    COUNT(*) as total_logs,
                    COUNT(CASE WHEN level = 'ERROR' THEN 1 END) as errors,
                    COUNT(CASE WHEN level = 'WARN' THEN 1 END) as warnings,
                    MAX(timestamp) as last_log
                FROM system_logs 
                WHERE timestamp > NOW() - INTERVAL '1 hour'
            `);

            if (systemLogs.rows.length > 0) {
                const logs = systemLogs.rows[0];
                this.log(`✅ System Logs: ${logs.total_logs} última hora, ${logs.errors} erros, ${logs.warnings} warnings`);
                if (parseInt(logs.errors) > 10) {
                    this.log(`⚠️ Muitos erros detectados: ${logs.errors}`, 'ERROR');
                }
            }

            // API validation logs
            const apiLogs = await pool.query(`
                SELECT 
                    COUNT(*) as total_validations,
                    COUNT(CASE WHEN status = 'valid' THEN 1 END) as valid,
                    COUNT(CASE WHEN status = 'invalid' THEN 1 END) as invalid,
                    MAX(created_at) as last_validation
                FROM api_validation_log 
                WHERE created_at > NOW() - INTERVAL '24 hours'
            `);

            if (apiLogs.rows.length > 0) {
                const api = apiLogs.rows[0];
                this.log(`✅ API Validations: ${api.total_validations} total, ${api.valid} válidas, ${api.invalid} inválidas`);
                if (parseInt(api.invalid) > parseInt(api.valid)) {
                    this.log('⚠️ Mais APIs inválidas que válidas', 'ERROR');
                }
            }

        } catch (error) {
            this.log(`❌ Erro na verificação de monitoramento: ${error.message}`, 'ERROR');
        }
    }

    // 6. CORRIGIR CAMPOS NULL CRÍTICOS
    async corrigirCamposNull() {
        console.log('\n🔧 6. CORREÇÃO DE CAMPOS NULL CRÍTICOS');
        console.log('======================================');

        try {
            // Corrigir Fear & Greed NULL na signal_metrics_log
            const updateFearGreed = await pool.query(`
                UPDATE signal_metrics_log 
                SET fear_greed_value = 50 
                WHERE fear_greed_value IS NULL 
                AND created_at > NOW() - INTERVAL '24 hours'
            `);
            if (updateFearGreed.rowCount > 0) {
                this.log(`✅ Corrigidos ${updateFearGreed.rowCount} registros Fear & Greed NULL`);
            }

            // Corrigir BTC Dominance NULL
            const updateBtcDom = await pool.query(`
                UPDATE signal_metrics_log 
                SET btc_dominance = 50.0 
                WHERE btc_dominance IS NULL 
                AND created_at > NOW() - INTERVAL '24 hours'
            `);
            if (updateBtcDom.rowCount > 0) {
                this.log(`✅ Corrigidos ${updateBtcDom.rowCount} registros BTC Dominance NULL`);
            }

            // Corrigir Confidence NULL
            const updateConfidence = await pool.query(`
                UPDATE signal_metrics_log 
                SET confidence = 0.5 
                WHERE confidence IS NULL 
                AND created_at > NOW() - INTERVAL '24 hours'
            `);
            if (updateConfidence.rowCount > 0) {
                this.log(`✅ Corrigidos ${updateConfidence.rowCount} registros Confidence NULL`);
            }

            // Corrigir usuários sem configurações de trading
            const updateUsers = await pool.query(`
                UPDATE users 
                SET 
                    risk_percentage = 2.0,
                    leverage_preference = 10,
                    auto_trading_enabled = false
                WHERE risk_percentage IS NULL 
                AND is_active = true
            `);
            if (updateUsers.rowCount > 0) {
                this.log(`✅ Corrigidos ${updateUsers.rowCount} usuários sem config de trading`);
            }

        } catch (error) {
            this.log(`❌ Erro na correção de campos NULL: ${error.message}`, 'ERROR');
        }
    }

    // 7. RELATÓRIO FINAL
    async relatorioFinal() {
        console.log('\n📊 7. RELATÓRIO FINAL DO SISTEMA');
        console.log('=================================');

        console.log(`\n✅ SUCESSOS (${this.sucessos.length}):`);
        this.sucessos.forEach(sucesso => console.log(`   ${sucesso}`));

        if (this.problemas.length > 0) {
            console.log(`\n❌ PROBLEMAS ENCONTRADOS (${this.problemas.length}):`);
            this.problemas.forEach(problema => console.log(`   ${problema}`));
        } else {
            console.log('\n🎉 NENHUM PROBLEMA CRÍTICO ENCONTRADO!');
        }

        const statusGeral = this.problemas.length === 0 ? '🚀 SISTEMA 100% OPERACIONAL' : 
                           this.problemas.length <= 3 ? '⚠️ SISTEMA COM PEQUENOS AJUSTES NECESSÁRIOS' :
                           '❌ SISTEMA NECESSITA CORREÇÕES CRÍTICAS';

        console.log(`\n${statusGeral}`);
        console.log(`Problemas: ${this.problemas.length} | Sucessos: ${this.sucessos.length}`);
    }

    async executarVerificacaoCompleta() {
        console.log('🔍 INICIANDO VERIFICAÇÃO COMPLETA DO FLUXO DE TRADING');
        console.log('=====================================================');

        await this.verificarDadosMercado();
        await this.verificarIA();
        await this.verificarUsuarios();
        await this.verificarOrdens();
        await this.verificarMonitoramento();
        await this.corrigirCamposNull();
        await this.relatorioFinal();
    }
}

// Executar verificação
if (require.main === module) {
    const validator = new FluxoTradingValidator();
    validator.executarVerificacaoCompleta()
        .then(() => {
            console.log('\n✅ Verificação completa finalizada');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Erro na verificação:', error);
            process.exit(1);
        })
        .finally(() => {
            pool.end();
        });
}

module.exports = FluxoTradingValidator;
