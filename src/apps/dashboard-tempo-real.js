// SECURITY_VALIDATED: 2025-08-08T23:27:20.624Z
// Este arquivo foi verificado e tem credenciais protegidas

#!/usr/bin/env node

/**
 * 📊 COINBITCLUB - DASHBOARD TEMPO REAL
 * ====================================
 * Dashboard de monitoramento em tempo real
 * Criado: 2025-01-07
 */

const express = require('express');
const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config();

class DashboardTempoReal {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
            ssl: { rejectUnauthorized: false }
        });
        
        this.metrics = {
            activeUsers: 0,
            openPositions: 0,
            todayVolume: 0,
            todayProfit: 0,
            fearGreedIndex: 50,
            topCoinsDirection: 'NEUTRAL',
            lastUpdate: new Date()
        };

        console.log('📊 Dashboard Tempo Real Iniciado');
        this.startMetricsCollection();
    }

    async startMetricsCollection() {
        // Coleta inicial
        await this.updateMetrics();
        
        // Atualização a cada 30 segundos
        setInterval(async () => {
            try {
                await this.updateMetrics();
            } catch (error) {
                console.error('❌ Erro ao atualizar métricas:', error.message);
            }
        }, 30000);
    }

    async updateMetrics() {
        try {
            // Usuários ativos (com API keys configuradas)
            const activeUsersResult = await this.pool.query(`
                SELECT COUNT(*) as count 
                FROM users 
                WHERE (binance_api_key IS NOT NULL AND binance_api_key != '') 
                   OR (bybit_api_key IS NOT NULL AND bybit_api_key != '')
            `);
            this.metrics.activeUsers = parseInt(activeUsersResult.rows[0].count);

            // Posições abertas
            const openPositionsResult = await this.pool.query(`
                SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as volume
                FROM trading_positions 
                WHERE status = 'OPEN'
            `);
            this.metrics.openPositions = parseInt(openPositionsResult.rows[0].count);
            this.metrics.todayVolume = parseFloat(openPositionsResult.rows[0].volume) || 0;

            // Lucro do dia
            const todayProfitResult = await this.pool.query(`
                SELECT COALESCE(SUM(profit), 0) as profit
                FROM trading_positions 
                WHERE status = 'CLOSED' 
                  AND closed_at >= CURRENT_DATE
                  AND profit > 0
            `);
            this.metrics.todayProfit = parseFloat(todayProfitResult.rows[0].profit) || 0;

            // Fear & Greed Index
            await this.updateFearGreedIndex();

            // Direção das TOP 100
            await this.updateTopCoinsDirection();

            this.metrics.lastUpdate = new Date();

            console.log(`📊 Métricas atualizadas: ${this.metrics.activeUsers} usuários, ${this.metrics.openPositions} posições, F&G: ${this.metrics.fearGreedIndex}`);

        } catch (error) {
            console.error('❌ Erro ao coletar métricas:', error.message);
        }
    }

    async updateFearGreedIndex() {
        try {
            const response = await axios.get('https://openapiv1.coinstats.app/insights/fear-and-greed', {
                headers: {
                    'X-API-KEY"YOUR_COINSTATS_API_KEYYOUR_API_KEY_HERE, error.message);
            this.metrics.fearGreedIndex = 50; // Fallback
        }
    }

    async updateTopCoinsDirection() {
        try {
            const response = await axios.get('https://openapiv1.coinstats.app/coins?page=1&limit=100', {
                headers: {
                    'X-API-KEY"YOUR_COINSTATS_API_KEYYOUR_API_KEY_HERE;
                } else if (percentage <= 30) {
                    this.metrics.topCoinsDirection = 'BEARISH';
                } else {
                    this.metrics.topCoinsDirection = 'NEUTRAL';
                }
            }
        } catch (error) {
            console.error('⚠️ Erro ao obter direção TOP 100:', error.message);
            this.metrics.topCoinsDirection = 'NEUTRAL';
        }
    }

    getMarketDirection() {
        const fg = this.metrics.fearGreedIndex;
        const topDirection = this.metrics.topCoinsDirection;

        if (fg < 30) {
            return 'SOMENTE_LONG';
        } else if (fg > 80) {
            return 'SOMENTE_SHORT';
        } else {
            // Entre 30-80, considerar também TOP 100
            if (topDirection === 'BULLISH') {
                return 'LONG_PREFERENCIAL';
            } else if (topDirection === 'BEARISH') {
                return 'SHORT_PREFERENCIAL';
            } else {
                return 'LONG_E_SHORT';
            }
        }
    }

    async getUsersStatus() {
        try {
            const result = await this.pool.query(`
                SELECT 
                    username,
                    country,
                    subscription_type,
                    prepaid_balance_usd,
                    admin_credit_usd,
                    CASE 
                        WHEN binance_api_key IS NOT NULL AND binance_api_key != '' THEN 'Binance'
                        WHEN bybit_api_key IS NOT NULL AND bybit_api_key != '' THEN 'ByBit'
                        ELSE 'Sem Exchange'
                    END as exchange_configured,
                    created_at
                FROM users 
                ORDER BY created_at DESC
                LIMIT 20
            `);

            return result.rows;
        } catch (error) {
            console.error('❌ Erro ao obter status dos usuários:', error.message);
            return [];
        }
    }

    async getActivePositions() {
        try {
            const result = await this.pool.query(`
                SELECT 
                    tp.username,
                    tp.ticker,
                    tp.position_type,
                    tp.amount,
                    tp.leverage,
                    tp.entry_price,
                    tp.stop_loss,
                    tp.take_profit,
                    tp.created_at,
                    EXTRACT(EPOCH FROM (NOW() - tp.created_at))/60 as minutes_open
                FROM trading_positions tp
                WHERE tp.status = 'OPEN'
                ORDER BY tp.created_at DESC
            `);

            return result.rows;
        } catch (error) {
            console.error('❌ Erro ao obter posições ativas:', error.message);
            return [];
        }
    }

    getDashboardData() {
        return {
            ...this.metrics,
            marketDirection: this.getMarketDirection(),
            timestamp: new Date().toISOString()
        };
    }

    // Método para API
    async getFullDashboardData() {
        const basicData = this.getDashboardData();
        const users = await this.getUsersStatus();
        const positions = await this.getActivePositions();

        return {
            ...basicData,
            users: users,
            positions: positions
        };
    }
}

// Inicializar dashboard apenas se executado diretamente
if (require.main === module) {
    const dashboard = new DashboardTempoReal();
    
    // Manter processo ativo
    process.on('SIGINT', () => {
        console.log('\n📊 Dashboard encerrado');
        process.exit(0);
    });
}

module.exports = DashboardTempoReal;
