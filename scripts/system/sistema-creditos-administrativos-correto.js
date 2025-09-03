// 🎫 SISTEMA DE CRÉDITOS ADMINISTRATIVOS - CUPONS INTERNOS
// ======================================================
//
// CORREÇÃO: Créditos administrativos são CUPONS INTERNOS, não pagamentos
// ✅ Gerar códigos de cupom internos
// ✅ Sistema de validação de cupons
// ✅ Créditos aplicados diretamente no sistema
// ✅ SEM envolvimento do Stripe

const { Pool } = require('pg');
const crypto = require('crypto');

class SistemaCreditosAdministrativos {
    constructor() {
        console.log('🎫 INICIANDO SISTEMA DE CRÉDITOS ADMINISTRATIVOS');
        console.log('===============================================');
        
        this.pool = new Pool({
            connectionString: 'process.env.DATABASE_URL',
            ssl: { rejectUnauthorized: false }
        });

        this.config = {
            // Tipos de créditos administrativos
            creditTypes: {
                BASIC: { amount: 20000, currency: 'BRL', name: 'Básico R$ 200' },      // R$ 200
                PREMIUM: { amount: 50000, currency: 'BRL', name: 'Premium R$ 500' },   // R$ 500
                VIP: { amount: 100000, currency: 'BRL', name: 'VIP R$ 1000' },         // R$ 1000
                BASIC_USD: { amount: 3500, currency: 'USD', name: 'Basic $35' },       // $35
                PREMIUM_USD: { amount: 10000, currency: 'USD', name: 'Premium $100' }, // $100
                VIP_USD: { amount: 20000, currency: 'USD', name: 'VIP $200' }          // $200
            },
            
            // Configurações de cupons
            couponSettings: {
                expirationDays: 30,     // Cupons expiram em 30 dias
                maxUses: 1,             // Cada cupom pode ser usado apenas 1 vez
                prefixes: {
                    BRL: 'CBCBR',
                    USD: 'CBCUS'
                }
            }
        };
    }

    // =======================================
    // 🗄️ CRIAR TABELA DE CUPONS INTERNOS
    // =======================================
    
    async criarTabelaCupons() {
        console.log('🗄️ Criando tabela de cupons administrativos...');
        
        const client = await this.pool.connect();
        
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS admin_coupons (
                    id SERIAL PRIMARY KEY,
                    coupon_code VARCHAR(30) UNIQUE NOT NULL,
                    credit_type VARCHAR(20) NOT NULL,
                    amount DECIMAL(15,2) NOT NULL,
                    currency VARCHAR(3) NOT NULL,
                    created_by_admin INTEGER NOT NULL,
                    used_by_user INTEGER,
                    is_used BOOLEAN DEFAULT false,
                    created_at TIMESTAMP DEFAULT NOW(),
                    used_at TIMESTAMP,
                    expires_at TIMESTAMP NOT NULL,
                    description TEXT,
                    metadata JSONB
                )
            `);
            
            // Tabela de logs de uso
            await client.query(`
                CREATE TABLE IF NOT EXISTS coupon_usage_logs (
                    id SERIAL PRIMARY KEY,
                    coupon_code VARCHAR(30) NOT NULL,
                    user_id INTEGER NOT NULL,
                    action VARCHAR(20) NOT NULL, -- 'GENERATED', 'USED', 'EXPIRED'
                    amount DECIMAL(15,2),
                    currency VARCHAR(3),
                    ip_address VARCHAR(45),
                    user_agent TEXT,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);
            
            console.log('✅ Tabelas de cupons criadas');
            
        } finally {
            client.release();
        }
    }

    // =======================================
    // 🎫 GERAR CUPOM ADMINISTRATIVO
    // =======================================
    
    async gerarCupomAdministrativo(adminId, creditType, description = '') {
        console.log(`🎫 Gerando cupom administrativo: ${creditType}...`);
        
        if (!this.config.creditTypes[creditType]) {
            throw new Error(`Tipo de crédito inválido: ${creditType}`);
        }
        
        const creditInfo = this.config.creditTypes[creditType];
        const prefix = this.config.couponSettings.prefixes[creditInfo.currency];
        
        const client = await this.pool.connect();
        
        try {
            // Gerar código único
            let couponCode;
            let exists = true;
            
            while (exists) {
                const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
                couponCode = `${prefix}${randomPart}`;
                
                const check = await client.query(
                    'SELECT id FROM admin_coupons WHERE coupon_code = $1', 
                    [couponCode]
                );
                exists = check.rows.length > 0;
            }

            // Data de expiração
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + this.config.couponSettings.expirationDays);

            // Inserir cupom
            const result = await client.query(`
                INSERT INTO admin_coupons 
                (coupon_code, credit_type, amount, currency, created_by_admin, expires_at, description, metadata)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `, [
                couponCode,
                creditType,
                creditInfo.amount,
                creditInfo.currency,
                adminId,
                expiresAt,
                description || `Cupom ${creditInfo.name}`,
                JSON.stringify({ creditType, generatedBy: adminId })
            ]);

            // Log da geração
            await client.query(`
                INSERT INTO coupon_usage_logs (coupon_code, user_id, action, amount, currency)
                VALUES ($1, $2, 'GENERATED', $3, $4)
            `, [couponCode, adminId, creditInfo.amount, creditInfo.currency]);

            console.log(`✅ Cupom gerado: ${couponCode} (${(creditInfo.amount/100).toFixed(2)} ${creditInfo.currency})`);
            
            return result.rows[0];

        } finally {
            client.release();
        }
    }

    // =======================================
    // 🎯 VALIDAR E USAR CUPOM
    // =======================================
    
    async usarCupom(userId, couponCode, userIp = '', userAgent = '') {
        console.log(`🎯 Validando cupom: ${couponCode} para usuário ${userId}...`);
        
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');

            // Buscar cupom
            const couponResult = await client.query(`
                SELECT * FROM admin_coupons 
                WHERE coupon_code = $1
            `, [couponCode.toUpperCase()]);

            if (couponResult.rows.length === 0) {
                throw new Error('Cupom não encontrado');
            }

            const coupon = couponResult.rows[0];

            // Validações
            if (coupon.is_used) {
                throw new Error('Cupom já foi utilizado');
            }

            if (new Date() > new Date(coupon.expires_at)) {
                throw new Error('Cupom expirado');
            }

            // Aplicar crédito no usuário
            const creditColumn = coupon.currency === 'BRL' ? 'balance_admin_brl' : 'balance_admin_usd';
            
            await client.query(`
                UPDATE users 
                SET ${creditColumn} = COALESCE(${creditColumn}, 0) + $1,
                    updated_at = NOW()
                WHERE id = $2
            `, [coupon.amount, userId]);

            // Marcar cupom como usado
            await client.query(`
                UPDATE admin_coupons 
                SET is_used = true,
                    used_by_user = $1,
                    used_at = NOW()
                WHERE coupon_code = $2
            `, [userId, couponCode.toUpperCase()]);

            // Log do uso
            await client.query(`
                INSERT INTO coupon_usage_logs (coupon_code, user_id, action, amount, currency, ip_address, user_agent)
                VALUES ($1, $2, 'USED', $3, $4, $5, $6)
            `, [couponCode.toUpperCase(), userId, coupon.amount, coupon.currency, userIp, userAgent]);

            await client.query('COMMIT');

            console.log(`✅ Cupom usado: ${(coupon.amount/100).toFixed(2)} ${coupon.currency} creditado`);
            
            return {
                success: true,
                coupon_code: coupon.coupon_code,
                amount: coupon.amount,
                currency: coupon.currency,
                credit_applied: (coupon.amount/100).toFixed(2),
                message: `Crédito de ${(coupon.amount/100).toFixed(2)} ${coupon.currency} aplicado com sucesso`
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // =======================================
    // 📊 LISTAR CUPONS
    // =======================================
    
    async listarCupons(adminId = null, status = 'all') {
        console.log('📊 Listando cupons...');
        
        const client = await this.pool.connect();
        
        try {
            let query = `
                SELECT ac.*, 
                       CASE WHEN ac.is_used THEN 'USADO'
                            WHEN NOW() > ac.expires_at THEN 'EXPIRADO'
                            ELSE 'ATIVO' END as status,
                       cul.created_at as used_date
                FROM admin_coupons ac
                LEFT JOIN coupon_usage_logs cul ON ac.coupon_code = cul.coupon_code AND cul.action = 'USED'
            `;
            
            const params = [];
            const conditions = [];
            
            if (adminId) {
                conditions.push(`ac.created_by_admin = $${params.length + 1}`);
                params.push(adminId);
            }
            
            if (status !== 'all') {
                if (status === 'active') {
                    conditions.push(`ac.is_used = false AND NOW() <= ac.expires_at`);
                } else if (status === 'used') {
                    conditions.push(`ac.is_used = true`);
                } else if (status === 'expired') {
                    conditions.push(`ac.is_used = false AND NOW() > ac.expires_at`);
                }
            }
            
            if (conditions.length > 0) {
                query += ` WHERE ${conditions.join(' AND ')}`;
            }
            
            query += ' ORDER BY ac.created_at DESC';
            
            const result = await client.query(query, params);
            
            return result.rows.map(row => ({
                ...row,
                amount_formatted: `${(row.amount/100).toFixed(2)} ${row.currency}`
            }));
            
        } finally {
            client.release();
        }
    }

    // =======================================
    // 🚀 TESTE COMPLETO DO SISTEMA
    // =======================================
    
    async testarSistemaCompleto() {
        console.log('\n🧪 TESTANDO SISTEMA DE CUPONS ADMINISTRATIVOS');
        console.log('=============================================');
        
        try {
            // Criar estrutura
            await this.criarTabelaCupons();
            
            console.log('\n1. 🎫 Gerando cupons de teste...');
            
            // Gerar cupons de diferentes tipos
            const cupomBRL = await this.gerarCupomAdministrativo(1, 'BASIC', 'Cupom de teste BRL');
            const cupomUSD = await this.gerarCupomAdministrativo(1, 'BASIC_USD', 'Cupom de teste USD');
            const cupomVIP = await this.gerarCupomAdministrativo(1, 'VIP', 'Cupom VIP de teste');
            
            console.log('\n2. 📊 Listando cupons gerados...');
            const cupons = await this.listarCupons(1, 'active');
            console.log(`   ✅ ${cupons.length} cupons ativos encontrados`);
            
            cupons.slice(0, 3).forEach(cupom => {
                console.log(`   🎫 ${cupom.coupon_code}: ${cupom.amount_formatted} (${cupom.status})`);
            });
            
            console.log('\n3. 🎯 Testando uso de cupom...');
            const usoResult = await this.usarCupom(2, cupomBRL.coupon_code, '192.168.1.1', 'Test Browser');
            console.log(`   ✅ ${usoResult.message}`);
            
            console.log('\n4. 📋 Tipos de cupons disponíveis:');
            Object.entries(this.config.creditTypes).forEach(([key, value]) => {
                console.log(`   ${key}: ${(value.amount/100).toFixed(2)} ${value.currency} (${value.name})`);
            });
            
            console.log('\n✅ SISTEMA DE CUPONS 100% FUNCIONAL!');
            console.log('===================================');
            console.log('🎯 Funcionalidades implementadas:');
            console.log('  • Geração automática de códigos únicos');
            console.log('  • Validação de expiração e uso');
            console.log('  • Aplicação automática de créditos');
            console.log('  • Log completo de ações');
            console.log('  • Suporte a BRL e USD');
            console.log('  • Sistema interno SEM Stripe');
            
        } catch (error) {
            console.error('❌ Erro no teste:', error);
            throw error;
        }
    }
}

// =======================================
// 🌐 APIs PARA INTEGRAÇÃO
// =======================================

const express = require('express');

function criarAPIsCreditos(app, sistema) {
    console.log('🌐 Configurando APIs de créditos...');
    
    // Gerar cupom administrativo
    app.post('/api/admin/coupon/generate', async (req, res) => {
        try {
            const { adminId, creditType, description } = req.body;
            
            if (!adminId || !creditType) {
                return res.status(400).json({
                    error: 'adminId e creditType são obrigatórios'
                });
            }
            
            const cupom = await sistema.gerarCupomAdministrativo(adminId, creditType, description);
            
            res.json({
                success: true,
                coupon: {
                    code: cupom.coupon_code,
                    amount: (cupom.amount/100).toFixed(2),
                    currency: cupom.currency,
                    expires_at: cupom.expires_at,
                    description: cupom.description
                }
            });
            
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    // Usar cupom
    app.post('/api/user/coupon/use', async (req, res) => {
        try {
            const { userId, couponCode } = req.body;
            const userIp = req.ip || req.connection.remoteAddress;
            const userAgent = req.get('User-Agent');
            
            if (!userId || !couponCode) {
                return res.status(400).json({
                    error: 'userId e couponCode são obrigatórios'
                });
            }
            
            const result = await sistema.usarCupom(userId, couponCode, userIp, userAgent);
            
            res.json(result);
            
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    // Listar cupons
    app.get('/api/admin/coupons', async (req, res) => {
        try {
            const { adminId, status = 'all' } = req.query;
            
            const cupons = await sistema.listarCupons(adminId, status);
            
            res.json({
                success: true,
                coupons: cupons
            });
            
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    // Tipos de crédito disponíveis
    app.get('/api/admin/credit-types', (req, res) => {
        const types = Object.entries(sistema.config.creditTypes).map(([key, value]) => ({
            code: key,
            name: value.name,
            amount: (value.amount/100).toFixed(2),
            currency: value.currency
        }));
        
        res.json({
            success: true,
            credit_types: types
        });
    });
    
    console.log('✅ APIs de créditos configuradas');
}

// Executar se chamado diretamente
if (require.main === module) {
    const sistema = new SistemaCreditosAdministrativos();
    sistema.testarSistemaCompleto().catch(console.error);
}

module.exports = { SistemaCreditosAdministrativos, criarAPIsCreditos };
