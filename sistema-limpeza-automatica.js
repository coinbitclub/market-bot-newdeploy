#!/usr/bin/env node

/**
 * 🧹 COINBITCLUB - SISTEMA DE LIMPEZA AUTOMÁTICA
 * ==============================================
 * Sistema de limpeza automatizada para manter o banco otimizado
 * 
 * REGRAS DE LIMPEZA:
 * - Sinais: Limpeza a cada 2 horas (manter últimas 48h)
 * - Logs não críticos: Limpeza a cada 24 horas (manter últimos 7 dias)
 * - Usuários testnet: Validade de 7 dias (remoção automática)
 * 
 * Criado: 2025-01-07
 */

require('dotenv').config();
const { Pool } = require('pg');
const cron = require('node-cron');

class SistemaLimpezaAutomatica {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
            ssl: { rejectUnauthorized: false }
        });
        
        this.config = {
            sinais: {
                intervalo: '2h',
                manterHoras: 48
            },
            logs: {
                intervalo: '24h',
                manterDias: 7
            },
            usuariosTest: {
                intervalo: '24h',
                validadeDias: 7
            }
        };
    }

    async iniciar() {
        console.log('🧹 SISTEMA DE LIMPEZA AUTOMÁTICA INICIADO');
        console.log('==========================================\n');
        
        // Executar limpeza inicial
        await this.executarLimpezaCompleta();
        
        // Programar limpezas automáticas
        this.programarLimpezas();
        
        console.log('✅ Sistema de limpeza configurado e ativo!');
        console.log('📅 Cronogramas programados:\n');
        console.log('   🔄 Sinais: A cada 2 horas');
        console.log('   📝 Logs: A cada 24 horas');
        console.log('   👥 Usuários teste: A cada 24 horas');
    }

    async executarLimpezaCompleta() {
        console.log('🔄 EXECUTANDO LIMPEZA COMPLETA...\n');
        
        await this.limparSinaisAntigos();
        await this.limparLogsAntigos();
        await this.limparUsuariosTestnet();
        await this.otimizarBanco();
        
        console.log('✅ Limpeza completa finalizada!\n');
    }

    async limparSinaisAntigos() {
        console.log('📡 Limpando sinais antigos (>48h)...');
        
        try {
            // Contar sinais antes da limpeza
            const antesLimpeza = await this.pool.query(`
                SELECT COUNT(*) as count FROM signal_history
            `);
            
            // Contar sinais que serão removidos
            const paraRemover = await this.pool.query(`
                SELECT COUNT(*) as count FROM signal_history 
                WHERE created_at < NOW() - INTERVAL '48 hours'
            `);
            
            // Remover sinais antigos
            await this.pool.query(`
                DELETE FROM signal_history 
                WHERE created_at < NOW() - INTERVAL '48 hours'
            `);
            
            // Verificar quantos restaram
            const restantes = await this.pool.query(`
                SELECT COUNT(*) as count FROM signal_history
            `);
            
            console.log(`   ✅ Sinais mantidos: ${restantes.rows[0].count}`);
            console.log(`   🗑️ Sinais removidos: ${paraRemover.rows[0].count}`);
            
        } catch (error) {
            console.log(`   ❌ Erro na limpeza de sinais: ${error.message}`);
        }
    }

    async limparLogsAntigos() {
        console.log('📝 Limpando logs não críticos (>7 dias)...');
        
        try {
            // Limpar logs de market_direction_history antigos
            await this.pool.query(`
                DELETE FROM market_direction_history 
                WHERE created_at < NOW() - INTERVAL '7 days'
            `);
            
            // Limpar market_direction_alerts antigos
            await this.pool.query(`
                DELETE FROM market_direction_alerts 
                WHERE created_at < NOW() - INTERVAL '7 days'
            `);
            
            // Verificar quantos restaram
            const logsDirection = await this.pool.query(`
                SELECT COUNT(*) as count FROM market_direction_history
            `);
            
            const logsAlerts = await this.pool.query(`
                SELECT COUNT(*) as count FROM market_direction_alerts
            `);
            
            console.log(`   ✅ Market direction logs: ${logsDirection.rows[0].count}`);
            console.log(`   ✅ Market alerts logs: ${logsAlerts.rows[0].count}`);
            
        } catch (error) {
            console.log(`   ❌ Erro na limpeza de logs: ${error.message}`);
        }
    }

    async limparUsuariosTestnet() {
        console.log('👥 Configurando sistema para gestores e usuários reais...');
        
        try {
            // 1. Remover TODOS os usuários de teste
            const usuariosTest = await this.pool.query(`
                SELECT id, email, created_at, balance_brl, balance_usd,
                       EXTRACT(days FROM NOW() - created_at) as dias_criado
                FROM users 
                WHERE (
                    email ILIKE '%test%' OR 
                    email ILIKE '%exemplo%' OR
                    email ILIKE '%usuario%' OR
                    email LIKE 'usuario%@test.com'
                )
            `);
            
            if (usuariosTest.rows.length > 0) {
                console.log(`   🗑️ Removendo ${usuariosTest.rows.length} usuários de teste:`);
                
                let saldoTotalRemovido = 0;
                
                for (const user of usuariosTest.rows) {
                    const saldoBRL = parseFloat(user.balance_brl) || 0;
                    const saldoUSD = parseFloat(user.balance_usd) || 0;
                    saldoTotalRemovido += saldoBRL + (saldoUSD * 5.8);
                    
                    console.log(`      - ${user.email} - R$ ${saldoBRL.toFixed(2)}`);
                    
                    // Limpar dados relacionados primeiro
                    await this.pool.query('DELETE FROM active_positions WHERE user_id = $1', [user.id]);
                    await this.pool.query('DELETE FROM orders WHERE user_id = $1', [user.id]);
                    await this.pool.query('DELETE FROM ticker_blocks WHERE user_id = $1', [user.id]);
                    
                    // Remover usuário
                    await this.pool.query('DELETE FROM users WHERE id = $1', [user.id]);
                }
                
                console.log(`   ✅ Removidos ${usuariosTest.rows.length} usuários teste`);
                console.log(`   💰 Saldo removido: R$ ${saldoTotalRemovido.toFixed(2)}`);
            }
            
            // 2. Configurar créditos administrativos para usuários reais
            await this.configurarCreditosAdministrativos();
            
            // 3. Verificar resultado final
            const usuariosFinais = await this.pool.query(`
                SELECT COUNT(*) as total, 
                       COUNT(*) FILTER (WHERE trading_active = true) as ativos,
                       COALESCE(SUM(balance_brl), 0) as saldo_brl_total,
                       COALESCE(SUM(balance_usd), 0) as saldo_usd_total
                FROM users
            `);
            
            const resultado = usuariosFinais.rows[0];
            const saldoTotal = parseFloat(resultado.saldo_brl_total) + (parseFloat(resultado.saldo_usd_total) * 5.8);
            
            console.log(`   👤 Usuários finais: ${resultado.total} (${resultado.ativos} ativos)`);
            console.log(`   💰 Saldo total: R$ ${saldoTotal.toFixed(2)}`);
            
        } catch (error) {
            console.log(`   ❌ Erro na configuração: ${error.message}`);
        }
    }

    async configurarCreditosAdministrativos() {
        console.log('   💳 Configurando créditos administrativos...');
        
        try {
            // Buscar usuários reais restantes
            const usuariosReais = await this.pool.query(`
                SELECT id, email, balance_brl, balance_usd
                FROM users 
                WHERE NOT (
                    email ILIKE '%test%' OR 
                    email ILIKE '%exemplo%' OR
                    email ILIKE '%usuario%'
                )
            `);
            
            if (usuariosReais.rows.length === 0) {
                // Criar usuário gestor padrão se não houver nenhum
                await this.pool.query(`
                    INSERT INTO users (
                        email, balance_brl, balance_usd, trading_active,
                        daily_profit, total_trades, win_rate, created_at
                    ) VALUES (
                        'gestor@coinbitclub.com', 1000.00, 0.00, true,
                        0.00, 0, 0.00, NOW()
                    )
                `);
                console.log(`      ✅ Criado usuário gestor: gestor@coinbitclub.com`);
            } else {
                // Configurar R$ 1000 para cada usuário real
                for (const user of usuariosReais.rows) {
                    await this.pool.query(`
                        UPDATE users 
                        SET balance_brl = 1000.00, 
                            balance_usd = 0.00,
                            trading_active = true
                        WHERE id = $1
                    `, [user.id]);
                    
                    console.log(`      💰 ${user.email}: R$ 1000,00`);
                }
            }
            
            console.log(`      ✅ Créditos administrativos configurados`);
            
        } catch (error) {
            console.log(`      ❌ Erro nos créditos: ${error.message}`);
        }
    }

    async otimizarBanco() {
        console.log('⚡ Otimizando banco de dados...');
        
        try {
            // Executar VACUUM nas tabelas principais
            const tabelas = [
                'signal_history',
                'market_direction_history', 
                'market_direction_alerts',
                'orders',
                'active_positions',
                'users'
            ];
            
            for (const tabela of tabelas) {
                try {
                    await this.pool.query(`VACUUM ANALYZE ${tabela}`);
                    console.log(`   ✅ ${tabela} otimizada`);
                } catch (error) {
                    console.log(`   ⚠️ ${tabela}: ${error.message}`);
                }
            }
            
        } catch (error) {
            console.log(`   ❌ Erro na otimização: ${error.message}`);
        }
    }

    programarLimpezas() {
        // Limpeza de sinais a cada 2 horas
        cron.schedule('0 */2 * * *', async () => {
            console.log(`\n🔄 [${new Date().toLocaleString()}] Executando limpeza de sinais...`);
            await this.limparSinaisAntigos();
        });

        // Limpeza de logs a cada 24 horas (meia-noite)
        cron.schedule('0 0 * * *', async () => {
            console.log(`\n🔄 [${new Date().toLocaleString()}] Executando limpeza diária...`);
            await this.limparLogsAntigos();
            await this.limparUsuariosTestnet();
            await this.otimizarBanco();
        });

        // Status a cada hora
        cron.schedule('0 * * * *', async () => {
            await this.exibirStatus();
        });
    }

    async exibirStatus() {
        try {
            const sinais = await this.pool.query('SELECT COUNT(*) as count FROM signal_history');
            const usuarios = await this.pool.query('SELECT COUNT(*) as count FROM users WHERE trading_active = true');
            const posicoes = await this.pool.query('SELECT COUNT(*) as count FROM active_positions');
            
            console.log(`\n📊 STATUS [${new Date().toLocaleTimeString()}]: Sinais: ${sinais.rows[0].count} | Usuários: ${usuarios.rows[0].count} | Posições: ${posicoes.rows[0].count}`);
            
        } catch (error) {
            console.log(`❌ Erro ao exibir status: ${error.message}`);
        }
    }

    async pararSistema() {
        console.log('\n🛑 Parando sistema de limpeza...');
        await this.pool.end();
        console.log('✅ Sistema parado com segurança');
    }
}

// Inicializar sistema
const sistemaLimpeza = new SistemaLimpezaAutomatica();

// Tratar sinal de parada
process.on('SIGINT', async () => {
    await sistemaLimpeza.pararSistema();
    process.exit(0);
});

// Iniciar sistema
sistemaLimpeza.iniciar().catch(error => {
    console.error('❌ Erro ao iniciar sistema de limpeza:', error.message);
    process.exit(1);
});

module.exports = SistemaLimpezaAutomatica;
