// FINANCIAL MANAGER
// Gestor financeiro enterprise para saldos, transações e relatórios

class FinancialManager {
    constructor(pool) {
        this.pool = pool;
        
        // Configurações de limites mínimos
        this.minimumBalances = {
            brazil_brl: parseFloat(process.env.MIN_BALANCE_BRAZIL_BRL) || 100,
            foreign_usd: parseFloat(process.env.MIN_BALANCE_FOREIGN_USD) || 20
        };
    }

    async createFinancialTables() {
        const client = await this.pool.connect();
        
        try {
            // Adicionar colunas de saldo na tabela users se não existirem
            await client.query(`
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS balance_real_brl DECIMAL(15,2) DEFAULT 0.00,
                ADD COLUMN IF NOT EXISTS balance_real_usd DECIMAL(15,2) DEFAULT 0.00,
                ADD COLUMN IF NOT EXISTS balance_admin_brl DECIMAL(15,2) DEFAULT 0.00,
                ADD COLUMN IF NOT EXISTS balance_admin_usd DECIMAL(15,2) DEFAULT 0.00,
                ADD COLUMN IF NOT EXISTS balance_commission_brl DECIMAL(15,2) DEFAULT 0.00,
                ADD COLUMN IF NOT EXISTS balance_commission_usd DECIMAL(15,2) DEFAULT 0.00,
                ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) DEFAULT 'MONTHLY',
                ADD COLUMN IF NOT EXISTS affiliate_type VARCHAR(20) DEFAULT 'none',
                ADD COLUMN IF NOT EXISTS affiliate_id INTEGER REFERENCES users(id)
            `);

            // Criar tabela de transações financeiras
            await client.query(`
                CREATE TABLE IF NOT EXISTS transactions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    type VARCHAR(50) NOT NULL,
                    amount DECIMAL(15,2) NOT NULL,
                    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
                    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                    commission_amount DECIMAL(15,2) DEFAULT 0.00,
                    net_amount DECIMAL(15,2),
                    plan_type VARCHAR(20),
                    description TEXT,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);

            // Criar tabela de registros de comissão
            await client.query(`
                CREATE TABLE IF NOT EXISTS commission_records (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    amount DECIMAL(15,2) NOT NULL,
                    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
                    type VARCHAR(50) NOT NULL,
                    plan_type VARCHAR(20),
                    commission_rate DECIMAL(5,2),
                    description TEXT,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);

            // Criar tabela de cupons administrativos
            await client.query(`
                CREATE TABLE IF NOT EXISTS coupons (
                    id SERIAL PRIMARY KEY,
                    code VARCHAR(50) UNIQUE NOT NULL,
                    credit_amount DECIMAL(15,2) NOT NULL,
                    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
                    created_by_admin_id INTEGER NOT NULL REFERENCES users(id),
                    expires_at TIMESTAMP NOT NULL,
                    is_active BOOLEAN DEFAULT true,
                    max_uses INTEGER DEFAULT 1,
                    current_uses INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);

            console.log('✅ Tabelas financeiras enterprise inicializadas');
            
        } catch (error) {
            console.error('❌ Erro ao criar tabelas financeiras:', error.message);
            throw error;
        } finally {
            client.release();
        }
    }

    async getUserBalances(userId) {
        const client = await this.pool.connect();
        
        try {
            const result = await client.query(`
                SELECT 
                    balance_real_brl,
                    balance_real_usd,
                    balance_admin_brl,
                    balance_admin_usd,
                    balance_commission_brl,
                    balance_commission_usd,
                    plan_type,
                    affiliate_type,
                    country
                FROM users 
                WHERE id = $1
            `, [userId]);

            if (result.rows.length === 0) {
                throw new Error('Usuário não encontrado');
            }

            const balances = result.rows[0];
            
            // Calcular totais
            const totalWithdrawable = balances.balance_real_brl + balances.balance_real_usd;
            const totalAdminCredits = balances.balance_admin_brl + balances.balance_admin_usd;
            const totalCommissions = balances.balance_commission_brl + balances.balance_commission_usd;
            
            // Determinar classificação da conta
            const accountClassification = this.classifyAccount(balances);

            return {
                real_balances: {
                    brl: balances.balance_real_brl,
                    usd: balances.balance_real_usd
                },
                admin_credits: {
                    brl: balances.balance_admin_brl,
                    usd: balances.balance_admin_usd
                },
                commissions: {
                    brl: balances.balance_commission_brl,
                    usd: balances.balance_commission_usd
                },
                totals: {
                    withdrawable: totalWithdrawable,
                    admin_credits: totalAdminCredits,
                    commissions: totalCommissions,
                    grand_total: totalWithdrawable + totalAdminCredits + totalCommissions
                },
                account_info: {
                    plan_type: balances.plan_type,
                    affiliate_type: balances.affiliate_type,
                    classification: accountClassification
                }
            };
            
        } catch (error) {
            throw new Error(`Erro ao buscar saldos: ${error.message}`);
        } finally {
            client.release();
        }
    }

    async updateBalance(userId, balanceType, amount, currency = 'BRL') {
        const client = await this.pool.connect();
        
        try {
            const columnMap = {
                'real': currency === 'BRL' ? 'real_balance_brl' : 'real_balance_usd',
                'admin': currency === 'BRL' ? 'admin_credit_brl' : 'admin_credit_usd',
                'commission': 'commission_balance'
            };

            const column = columnMap[balanceType];
            if (!column) {
                throw new Error('Tipo de saldo inválido');
            }

            await client.query(`
                UPDATE user_balances 
                SET ${column} = ${column} + $1, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $2
            `, [amount, userId]);

            // Registrar transação
            await this.recordTransaction(userId, balanceType + '_update', amount, currency, `Atualização de saldo ${balanceType}`);

            return await this.getUserBalance(userId);
            
        } catch (error) {
            console.error('❌ Erro ao atualizar saldo:', error.message);
            throw error;
        } finally {
            client.release();
        }
    }

    async recordTransaction(userId, type, amount, currency, description) {
        const client = await this.pool.connect();
        
        try {
            await client.query(`
                INSERT INTO financial_transactions (user_id, transaction_type, amount, currency, description)
                VALUES ($1, $2, $3, $4, $5)
            `, [userId, type, amount, currency, description]);
            
        } catch (error) {
            console.error('❌ Erro ao registrar transação:', error.message);
        } finally {
            client.release();
        }
    }

    async getFinancialSummary() {
        const client = await this.pool.connect();
        
        try {
            const balances = await client.query(`
                SELECT 
                    SUM(real_balance_brl) as total_real_brl,
                    SUM(real_balance_usd) as total_real_usd,
                    SUM(admin_credit_brl) as total_admin_brl,
                    SUM(admin_credit_usd) as total_admin_usd,
                    SUM(commission_balance) as total_commission,
                    COUNT(*) as total_users
                FROM user_balances
            `);

            const transactions = await client.query(`
                SELECT COUNT(*) as total_transactions
                FROM financial_transactions 
                WHERE created_at >= CURRENT_DATE
            `);

            return {
                balances: balances.rows[0],
                daily_transactions: transactions.rows[0].total_transactions,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Erro ao gerar relatório:', error.message);
            throw error;
        } finally {
            client.release();
        }
    }

    classifyAccount(balances) {
        const totalBRL = balances.balance_real_brl + balances.balance_admin_brl;
        const totalUSD = balances.balance_real_usd + balances.balance_admin_usd;
        const hasSubscription = balances.plan_type !== 'NONE';
        
        // Baseado nas especificações: >= R$100 OU >= $20 OU assinatura ativa = MANAGEMENT
        if (totalBRL >= this.minimumBalances.brazil_brl || 
            totalUSD >= this.minimumBalances.foreign_usd || 
            hasSubscription) {
            return 'MANAGEMENT';
        }
        
        return 'TESTNET';
    }

    async updateBalance(userId, balanceType, amount, currency = 'BRL') {
        const client = await this.pool.connect();
        
        try {
            const columnMap = {
                'real': currency === 'BRL' ? 'balance_real_brl' : 'balance_real_usd',
                'admin': currency === 'BRL' ? 'balance_admin_brl' : 'balance_admin_usd',
                'commission': currency === 'BRL' ? 'balance_commission_brl' : 'balance_commission_usd'
            };

            const column = columnMap[balanceType];
            if (!column) {
                throw new Error('Tipo de saldo inválido');
            }

            await client.query(`
                UPDATE users 
                SET ${column} = ${column} + $1, 
                    updated_at = NOW()
                WHERE id = $2
            `, [amount, userId]);

            console.log(`✅ Saldo ${balanceType} ${currency} atualizado: ${amount > 0 ? '+' : ''}${amount}`);
            
        } catch (error) {
            console.error('❌ Erro ao atualizar saldo:', error.message);
            throw error;
        } finally {
            client.release();
        }
    }

    async processStripeRecharge(userId, amount, currency, planType = 'PREPAID') {
        const client = await this.pool.connect();
        
        try {
            await client.begin();

            // Calcular comissão baseada no plano
            const CommissionSystem = require('./commission-system.js');
            const commissionSystem = new CommissionSystem();
            
            const commissionData = commissionSystem.calculateCommission({
                profit: amount,
                plan: planType,
                country: currency === 'BRL' ? 'BR' : 'US'
            });

            const netAmount = amount - commissionData.companyCommission;

            // Creditar saldo real (líquido após comissão)
            await this.updateBalance(userId, 'real', netAmount, currency);

            // Registrar transação
            await client.query(`
                INSERT INTO transactions (
                    user_id, type, amount, currency, commission_amount, 
                    net_amount, plan_type, description
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                userId, 'STRIPE_RECHARGE', amount, currency,
                commissionData.companyCommission, netAmount, planType,
                `Recarga Stripe ${planType} - Comissão ${commissionData.rates.company} descontada`
            ]);

            await client.commit();

            return {
                gross_amount: amount,
                commission_amount: commissionData.companyCommission,
                net_amount: netAmount,
                currency: currency,
                plan_type: planType
            };

        } catch (error) {
            await client.rollback();
            throw error;
        } finally {
            client.release();
        }
    }

    async recordTransaction(userId, type, amount, currency, description) {
        const client = await this.pool.connect();
        
        try {
            await client.query(`
                INSERT INTO transactions (user_id, type, amount, currency, description)
                VALUES ($1, $2, $3, $4, $5)
            `, [userId, type, amount, currency, description]);
            
        } catch (error) {
            console.error('❌ Erro ao registrar transação:', error.message);
            throw error;
        } finally {
            client.release();
        }
    }

    async getFinancialSummary() {
        const client = await this.pool.connect();
        
        try {
            const balances = await client.query(`
                SELECT 
                    SUM(balance_real_brl) as total_real_brl,
                    SUM(balance_real_usd) as total_real_usd,
                    SUM(balance_admin_brl) as total_admin_brl,
                    SUM(balance_admin_usd) as total_admin_usd,
                    SUM(balance_commission_brl) as total_commission_brl,
                    SUM(balance_commission_usd) as total_commission_usd,
                    COUNT(*) as total_users
                FROM users
                WHERE balance_real_brl > 0 OR balance_real_usd > 0 
                   OR balance_admin_brl > 0 OR balance_admin_usd > 0
            `);

            const transactions = await client.query(`
                SELECT 
                    COUNT(*) as total_transactions,
                    SUM(amount) as total_volume
                FROM transactions 
                WHERE created_at >= CURRENT_DATE
            `);

            return {
                balances: balances.rows[0],
                daily_stats: transactions.rows[0],
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Erro ao gerar relatório:', error.message);
            throw error;
        } finally {
            client.release();
        }
    }

    generateCouponCode(prefix = 'CBC') {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${prefix}-${timestamp}-${random}`;
    }

    async convertCommissionToAdminCredit(userId, amount, currency = 'BRL') {
        const client = await this.pool.connect();
        
        try {
            await client.begin();

            // Verificar saldo de comissão
            const balances = await this.getUserBalances(userId);
            const currentCommission = currency === 'BRL' ? 
                balances.commissions.brl : balances.commissions.usd;

            if (currentCommission < amount) {
                throw new Error('Saldo de comissão insuficiente');
            }

            // Debitar da comissão
            await this.updateBalance(userId, 'commission', -amount, currency);
            
            // Creditar como admin credit
            await this.updateBalance(userId, 'admin', amount, currency);

            // Registrar transação
            await this.recordTransaction(
                userId, 
                'COMMISSION_TO_CREDIT', 
                amount, 
                currency, 
                `Conversão de comissão para crédito administrativo`
            );

            await client.commit();

            return {
                converted_amount: amount,
                currency: currency,
                new_commission_balance: currentCommission - amount,
                new_admin_credit: currency === 'BRL' ? 
                    balances.admin_credits.brl + amount : 
                    balances.admin_credits.usd + amount
            };
            
        } catch (error) {
            await client.rollback();
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = FinancialManager;
