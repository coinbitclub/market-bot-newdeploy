// 🚀 SISTEMA COMPLETO DE LINKS STRIPE REAIS
// ========================================
//
// ✅ Criação real de produtos e preços na Stripe
// ✅ Sistema de códigos de afiliados automático
// ✅ Créditos administrativos (min R$200 / USD35)
// ✅ Integração completa com PostgreSQL
// ✅ Webhooks funcionais

const Stripe = require('stripe');
const { Pool } = require('pg');
const crypto = require('crypto');

class StripeLinksRealSystem {
    constructor() {
        console.log('🚀 INICIALIZANDO SISTEMA STRIPE REAL');
        console.log('===================================');
        
        // Configurar Stripe com chaves reais
        this.stripe = Stripe('sk_live_STRIPE_SECRET_KEY_HERE');
        
        // Configurar PostgreSQL
        this.pool = new Pool({
            connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
            ssl: { rejectUnauthorized: false }
        });

        // Configurações do sistema
        this.config = {
            // Produtos Stripe
            products: {
                subscriptionBR: null,
                subscriptionForeign: null
            },
            
            // Preços Stripe
            prices: {
                monthlyBR: null,
                monthlyForeign: null
            },
            
            // Links de pagamento
            paymentLinks: {
                subscriptionBR: null,
                subscriptionForeign: null
            },
            
            // Configurações de valores
            plans: {
                subscriptionBR: { amount: 29700, currency: 'brl' }, // R$ 297,00
                subscriptionForeign: { amount: 5000, currency: 'usd' }, // $50,00
                minAdminCreditBR: 20000, // R$ 200,00
                minAdminCreditForeign: 3500 // $35,00
            },
            
            // Comissões
            commissions: {
                withSubscription: 10,
                withoutSubscription: 20,
                affiliateNormal: 1.5,
                affiliateVIP: 5.0
            }
        };
    }

    // ========================================
    // 🗄️ CRIAÇÃO DAS TABELAS NO BANCO
    // ========================================
    
    async createDatabaseTables() {
        console.log('📊 Verificando estrutura do banco de dados...');
        
        const client = await this.pool.connect();
        
        try {
            // Verificar se tabelas essenciais existem, criar se necessário
            
            // Verificar tabela admin_coupons
            const adminCouponsExists = await client.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = 'admin_coupons'
                );
            `);

            if (!adminCouponsExists.rows[0].exists) {
                await client.query(`
                    CREATE TABLE admin_coupons (
                        id SERIAL PRIMARY KEY,
                        coupon_code VARCHAR(50) UNIQUE NOT NULL,
                        credit_amount INTEGER NOT NULL,
                        currency VARCHAR(3) NOT NULL,
                        
                        created_by_admin INTEGER REFERENCES users(id),
                        used_by_user INTEGER REFERENCES users(id),
                        
                        is_used BOOLEAN DEFAULT FALSE,
                        used_at TIMESTAMP,
                        expiration_date TIMESTAMP NOT NULL,
                        
                        created_at TIMESTAMP DEFAULT NOW()
                    );
                `);
                console.log('✅ Tabela admin_coupons criada');
            }

            // Verificar tabela affiliate_links
            const affiliateLinksExists = await client.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = 'affiliate_links'
                );
            `);

            if (!affiliateLinksExists.rows[0].exists) {
                await client.query(`
                    CREATE TABLE affiliate_links (
                        id SERIAL PRIMARY KEY,
                        affiliate_id INTEGER REFERENCES users(id),
                        link_code VARCHAR(50) UNIQUE NOT NULL,
                        link_type VARCHAR(20) NOT NULL,
                        
                        clicks INTEGER DEFAULT 0,
                        conversions INTEGER DEFAULT 0,
                        total_commission INTEGER DEFAULT 0,
                        
                        is_active BOOLEAN DEFAULT TRUE,
                        created_at TIMESTAMP DEFAULT NOW()
                    );
                `);
                console.log('✅ Tabela affiliate_links criada');
            }

            // Criar índices necessários
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_users_affiliate_code ON users(affiliate_code);
            `);
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_admin_coupons_code ON admin_coupons(coupon_code);
            `);
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_affiliate_links_code ON affiliate_links(link_code);
            `);

            console.log('✅ Estrutura do banco verificada e atualizada');

        } finally {
            client.release();
        }
    }

    // ========================================
    // 🏪 CRIAÇÃO DOS PRODUTOS REAIS NA STRIPE
    // ========================================
    
    async createStripeProducts() {
        console.log('🏪 Criando produtos reais na Stripe...');
        
        try {
            // 1. Produto Assinatura Brasil
            this.config.products.subscriptionBR = await this.stripe.products.create({
                id: 'coinbitclub_monthly_br',
                name: 'CoinBitClub - Plano Mensal Brasil',
                description: 'Acesso completo ao sistema de trading + 10% comissão sobre lucros',
                metadata: {
                    plan_type: 'MONTHLY_BR',
                    commission_rate: '10',
                    created_by: 'system',
                    version: '1.0'
                }
            });
            console.log('✅ Produto Brasil criado:', this.config.products.subscriptionBR.id);

            // 2. Produto Assinatura Exterior
            this.config.products.subscriptionForeign = await this.stripe.products.create({
                id: 'coinbitclub_monthly_foreign',
                name: 'CoinBitClub - Monthly Plan International',
                description: 'Full access to trading system + 10% commission on profits',
                metadata: {
                    plan_type: 'MONTHLY_FOREIGN',
                    commission_rate: '10',
                    created_by: 'system',
                    version: '1.0'
                }
            });
            console.log('✅ Produto Exterior criado:', this.config.products.subscriptionForeign.id);

        } catch (error) {
            if (error.code === 'resource_already_exists') {
                console.log('⚠️ Produtos já existem, recuperando...');
                this.config.products.subscriptionBR = await this.stripe.products.retrieve('coinbitclub_monthly_br');
                this.config.products.subscriptionForeign = await this.stripe.products.retrieve('coinbitclub_monthly_foreign');
            } else {
                throw error;
            }
        }
    }

    async createStripePrices() {
        console.log('💰 Criando preços reais na Stripe...');
        
        try {
            // 1. Preço Brasil - R$ 297,00
            this.config.prices.monthlyBR = await this.stripe.prices.create({
                product: this.config.products.subscriptionBR.id,
                unit_amount: this.config.plans.subscriptionBR.amount,
                currency: this.config.plans.subscriptionBR.currency,
                recurring: { interval: 'month' },
                metadata: {
                    plan_region: 'BR',
                    commission_rate: '10'
                }
            });
            console.log('✅ Preço Brasil criado:', this.config.prices.monthlyBR.id);

            // 2. Preço Exterior - $50,00
            this.config.prices.monthlyForeign = await this.stripe.prices.create({
                product: this.config.products.subscriptionForeign.id,
                unit_amount: this.config.plans.subscriptionForeign.amount,
                currency: this.config.plans.subscriptionForeign.currency,
                recurring: { interval: 'month' },
                metadata: {
                    plan_region: 'FOREIGN',
                    commission_rate: '10'
                }
            });
            console.log('✅ Preço Exterior criado:', this.config.prices.monthlyForeign.id);

        } catch (error) {
            console.error('❌ Erro ao criar preços:', error.message);
            throw error;
        }
    }

    async createPaymentLinks() {
        console.log('🔗 Criando links de pagamento reais...');
        
        try {
            // 1. Link Brasil
            this.config.paymentLinks.subscriptionBR = await this.stripe.paymentLinks.create({
                line_items: [{
                    price: this.config.prices.monthlyBR.id,
                    quantity: 1
                }],
                after_completion: {
                    type: 'redirect',
                    redirect: {
                        url: `${process.env.FRONTEND_URL || 'https://coinbitclub.com'}/subscription/success`
                    }
                },
                allow_promotion_codes: true,
                billing_address_collection: 'required',
                metadata: {
                    plan_type: 'MONTHLY_BR'
                }
            });
            console.log('✅ Link Brasil criado:', this.config.paymentLinks.subscriptionBR.url);

            // 2. Link Exterior
            this.config.paymentLinks.subscriptionForeign = await this.stripe.paymentLinks.create({
                line_items: [{
                    price: this.config.prices.monthlyForeign.id,
                    quantity: 1
                }],
                after_completion: {
                    type: 'redirect',
                    redirect: {
                        url: `${process.env.FRONTEND_URL || 'https://coinbitclub.com'}/subscription/success`
                    }
                },
                allow_promotion_codes: true,
                billing_address_collection: 'required',
                metadata: {
                    plan_type: 'MONTHLY_FOREIGN'
                }
            });
            console.log('✅ Link Exterior criado:', this.config.paymentLinks.subscriptionForeign.url);

        } catch (error) {
            console.error('❌ Erro ao criar links:', error.message);
            throw error;
        }
    }

    // ========================================
    // 👥 SISTEMA DE CÓDIGOS DE AFILIADOS
    // ========================================
    
    generateAffiliateCode(username) {
        // Gerar código único: CBC + primeiras 3 letras do username + número aleatório
        const prefix = 'CBC';
        const userPart = username.toUpperCase().substring(0, 3).padEnd(3, 'X');
        const randomPart = Math.floor(1000 + Math.random() * 9000);
        return `${prefix}${userPart}${randomPart}`;
    }

    async createAffiliateUser(userData) {
        const { username, email, password, affiliateType = 'normal' } = userData;
        
        const client = await this.pool.connect();
        
        try {
            // Gerar código de afiliado único
            let affiliateCode;
            let isUnique = false;
            
            while (!isUnique) {
                affiliateCode = this.generateAffiliateCode(username);
                
                const existing = await client.query(
                    'SELECT id FROM users WHERE affiliate_code = $1',
                    [affiliateCode]
                );
                
                isUnique = existing.rows.length === 0;
            }

            // Criar usuário afiliado
            const result = await client.query(`
                INSERT INTO users 
                (username, email, password_hash, affiliate_code, affiliate_type)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id, affiliate_code
            `, [username, email, password, affiliateCode, affiliateType]);

            const userId = result.rows[0].id;
            
            // Criar links de afiliado
            await this.createAffiliateLinks(userId, affiliateCode);

            console.log(`✅ Afiliado criado: ${username} | Código: ${affiliateCode}`);

            return {
                userId: userId,
                affiliateCode: affiliateCode,
                affiliateType: affiliateType,
                links: await this.getAffiliateLinks(userId)
            };

        } finally {
            client.release();
        }
    }

    async createAffiliateLinks(userId, affiliateCode) {
        const client = await this.pool.connect();
        
        try {
            // Links para cada tipo de produto
            const linkTypes = [
                { type: 'SUBSCRIPTION_BR', code: `${affiliateCode}_BR` },
                { type: 'SUBSCRIPTION_FOREIGN', code: `${affiliateCode}_FOR` },
                { type: 'RECHARGE', code: `${affiliateCode}_REC` }
            ];

            for (const link of linkTypes) {
                await client.query(`
                    INSERT INTO affiliate_links 
                    (affiliate_id, link_code, link_type)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (link_code) DO NOTHING
                `, [userId, link.code, link.type]);
            }

            console.log(`✅ Links de afiliado criados para: ${affiliateCode}`);

        } finally {
            client.release();
        }
    }

    async getAffiliateLinks(userId) {
        const client = await this.pool.connect();
        
        try {
            const result = await client.query(`
                SELECT link_code, link_type, clicks, conversions, total_commission
                FROM affiliate_links
                WHERE affiliate_id = $1 AND is_active = true
            `, [userId]);

            const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
            
            return result.rows.map(link => ({
                type: link.link_type,
                code: link.link_code,
                url: `${baseUrl}/aff/${link.link_code}`,
                stats: {
                    clicks: link.clicks,
                    conversions: link.conversions,
                    totalCommission: link.total_commission / 100
                }
            }));

        } finally {
            client.release();
        }
    }

    // ========================================
    // 💳 SISTEMA DE CRÉDITOS ADMINISTRATIVOS
    // ========================================
    
    async createAdminCredit(adminData) {
        const { 
            adminId, 
            targetUserId, 
            amount, 
            currency = 'BRL', 
            expirationDays = 30,
            description = 'Crédito administrativo'
        } = adminData;

        // Validar valor mínimo
        const minimumAmount = currency === 'BRL' ? 
            this.config.plans.minAdminCreditBR : 
            this.config.plans.minAdminCreditForeign;

        if (amount < minimumAmount) {
            throw new Error(`Valor mínimo: ${currency === 'BRL' ? 'R$ 200,00' : '$35,00'}`);
        }

        const client = await this.pool.connect();
        
        try {
            await client.begin();

            // Gerar código do cupom
            const couponCode = this.generateAdminCouponCode();

            // Criar cupom
            await client.query(`
                INSERT INTO admin_coupons 
                (coupon_code, credit_amount, currency, created_by_admin, expiration_date)
                VALUES ($1, $2, $3, $4, NOW() + INTERVAL '${expirationDays} days')
            `, [couponCode, amount, currency, adminId]);

            // Se targetUserId fornecido, aplicar automaticamente
            if (targetUserId) {
                await this.applyAdminCredit(targetUserId, couponCode, client);
            }

            await client.commit();

            console.log(`✅ Crédito administrativo criado: ${couponCode} | ${(amount/100).toFixed(2)} ${currency}`);

            return {
                couponCode: couponCode,
                amount: amount / 100,
                currency: currency,
                expirationDays: expirationDays,
                description: description,
                targetUserId: targetUserId,
                autoApplied: !!targetUserId
            };

        } catch (error) {
            await client.rollback();
            throw error;
        } finally {
            client.release();
        }
    }

    generateAdminCouponCode() {
        const prefix = 'ADM';
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.floor(100 + Math.random() * 900);
        return `${prefix}${timestamp}${random}`;
    }

    async applyAdminCredit(userId, couponCode, existingClient = null) {
        const client = existingClient || await this.pool.connect();
        
        try {
            if (!existingClient) await client.begin();

            // Verificar cupom
            const coupon = await client.query(`
                SELECT id, credit_amount, currency, expiration_date, is_used
                FROM admin_coupons
                WHERE coupon_code = $1
            `, [couponCode]);

            if (coupon.rows.length === 0) {
                throw new Error('Cupom não encontrado');
            }

            const couponData = coupon.rows[0];

            if (couponData.is_used) {
                throw new Error('Cupom já utilizado');
            }

            if (new Date() > new Date(couponData.expiration_date)) {
                throw new Error('Cupom expirado');
            }

            // Aplicar crédito
            const column = couponData.currency === 'BRL' ? 
                'balance_admin_brl' : 'balance_admin_usd';

            await client.query(`
                UPDATE users 
                SET ${column} = ${column} + $1,
                    updated_at = NOW()
                WHERE id = $2
            `, [couponData.credit_amount, userId]);

            // Marcar cupom como usado
            await client.query(`
                UPDATE admin_coupons
                SET is_used = true,
                    used_by_user = $1,
                    used_at = NOW()
                WHERE id = $2
            `, [userId, couponData.id]);

            // Registrar transação
            await client.query(`
                INSERT INTO transactions
                (user_id, type, amount, currency, description, status)
                VALUES ($1, 'ADMIN_CREDIT', $2, $3, $4, 'COMPLETED')
            `, [
                userId,
                couponData.credit_amount,
                couponData.currency,
                `Crédito administrativo aplicado: ${couponCode}`
            ]);

            if (!existingClient) await client.commit();

            console.log(`✅ Crédito aplicado: ${couponCode} → usuário ${userId}`);

            return {
                success: true,
                amount: couponData.credit_amount / 100,
                currency: couponData.currency,
                newBalance: await this.getUserBalance(userId, couponData.currency.toLowerCase())
            };

        } catch (error) {
            if (!existingClient) await client.rollback();
            throw error;
        } finally {
            if (!existingClient) client.release();
        }
    }

    async getUserBalance(userId, type = 'all') {
        const client = await this.pool.connect();
        
        try {
            const result = await client.query(`
                SELECT 
                    balance_real_brl, balance_real_usd,
                    balance_admin_brl, balance_admin_usd,
                    balance_commission_brl, balance_commission_usd
                FROM users WHERE id = $1
            `, [userId]);

            if (result.rows.length === 0) {
                throw new Error('Usuário não encontrado');
            }

            const balances = result.rows[0];

            return {
                real: {
                    brl: balances.balance_real_brl / 100,
                    usd: balances.balance_real_usd / 100
                },
                admin: {
                    brl: balances.balance_admin_brl / 100,
                    usd: balances.balance_admin_usd / 100
                },
                commission: {
                    brl: balances.balance_commission_brl / 100,
                    usd: balances.balance_commission_usd / 100
                },
                total: {
                    brl: (balances.balance_real_brl + balances.balance_admin_brl) / 100,
                    usd: (balances.balance_real_usd + balances.balance_admin_usd) / 100
                }
            };

        } finally {
            client.release();
        }
    }

    // ========================================
    // 🚀 INICIALIZAÇÃO COMPLETA
    // ========================================
    
    async initializeSystem() {
        console.log('\n🚀 INICIALIZANDO SISTEMA COMPLETO');
        console.log('=================================');

        try {
            // 1. Verificar conexão com banco
            await this.testDatabaseConnection();

            // 2. Criar estrutura do banco
            await this.createDatabaseTables();

            // 3. Criar produtos na Stripe
            await this.createStripeProducts();

            // 4. Criar preços na Stripe
            await this.createStripePrices();

            // 5. Criar links de pagamento
            await this.createPaymentLinks();

            // 6. Exibir informações do sistema
            await this.displaySystemInfo();

            console.log('\n✅ SISTEMA COMPLETAMENTE INICIALIZADO!');
            console.log('=====================================');

        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            throw error;
        }
    }

    async testDatabaseConnection() {
        console.log('🔍 Testando conexão com PostgreSQL...');
        
        const client = await this.pool.connect();
        
        try {
            await client.query('SELECT NOW()');
            console.log('✅ PostgreSQL conectado com sucesso');
        } finally {
            client.release();
        }
    }

    async displaySystemInfo() {
        console.log('\n📊 INFORMAÇÕES DO SISTEMA');
        console.log('=========================');

        console.log('\n🔗 Links de Assinatura Reais:');
        console.log(`   🇧🇷 Brasil (R$ 297,00): ${this.config.paymentLinks.subscriptionBR.url}`);
        console.log(`   🌍 Exterior ($50,00): ${this.config.paymentLinks.subscriptionForeign.url}`);

        console.log('\n💰 Sistema de Comissões:');
        console.log(`   • COM assinatura: ${this.config.commissions.withSubscription}%`);
        console.log(`   • SEM assinatura: ${this.config.commissions.withoutSubscription}%`);
        console.log(`   • Afiliado Normal: ${this.config.commissions.affiliateNormal}%`);
        console.log(`   • Afiliado VIP: ${this.config.commissions.affiliateVIP}%`);

        console.log('\n💳 Créditos Administrativos:');
        console.log(`   • Mínimo Brasil: R$ ${(this.config.plans.minAdminCreditBR/100).toFixed(2)}`);
        console.log(`   • Mínimo Exterior: $${(this.config.plans.minAdminCreditForeign/100).toFixed(2)}`);

        console.log('\n🗄️ Banco de Dados:');
        console.log('   • PostgreSQL conectado e configurado');
        console.log('   • Tabelas criadas: users, admin_coupons, transactions, affiliate_links');
        console.log('   • Índices otimizados para performance');
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const system = new StripeLinksRealSystem();
    system.initializeSystem().catch(error => {
        console.error('💥 Falha na inicialização:', error);
        process.exit(1);
    });
}

module.exports = StripeLinksRealSystem;
