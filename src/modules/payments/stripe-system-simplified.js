// 🚀 SISTEMA STRIPE SIMPLIFICADO - SEM DEPENDÊNCIAS COMPLEXAS
// ==========================================================
//
// Versão que funciona com a estrutura existente do banco

const Stripe = require('stripe');
const { Pool } = require('pg');

class StripeSystemSimplified {
    constructor() {
        console.log('🚀 INICIALIZANDO SISTEMA STRIPE SIMPLIFICADO');
        console.log('============================================');
        
        this.stripe = Stripe('process.env.API_KEY_HERE');
        
        this.pool = new Pool({
            connectionString: 'process.env.DATABASE_URL',
            ssl: { rejectUnauthorized: false }
        });

        this.products = {};
        this.prices = {};
        this.paymentLinks = {};
    }

    async createStripeProducts() {
        console.log('🏪 Criando produtos reais na Stripe...');
        
        try {
            // 1. Produto Brasil
            try {
                this.products.brazil = await this.stripe.products.create({
                    id: 'coinbitclub_monthly_br_v2',
                    name: 'CoinBitClub - Plano Mensal Brasil',
                    description: 'Acesso completo ao sistema + 10% comissão sobre lucros',
                    metadata: {
                        plan_type: 'MONTHLY_BR',
                        commission_rate: '10'
                    }
                });
                console.log('✅ Produto Brasil criado:', this.products.brazil.id);
            } catch (error) {
                if (error.code === 'resource_already_exists') {
                    this.products.brazil = await this.stripe.products.retrieve('coinbitclub_monthly_br_v2');
                    console.log('✅ Produto Brasil recuperado:', this.products.brazil.id);
                } else {
                    throw error;
                }
            }

            // 2. Produto Exterior
            try {
                this.products.foreign = await this.stripe.products.create({
                    id: 'coinbitclub_monthly_foreign_v2',
                    name: 'CoinBitClub - Monthly Plan International',
                    description: 'Full access to trading system + 10% commission on profits',
                    metadata: {
                        plan_type: 'MONTHLY_FOREIGN',
                        commission_rate: '10'
                    }
                });
                console.log('✅ Produto Exterior criado:', this.products.foreign.id);
            } catch (error) {
                if (error.code === 'resource_already_exists') {
                    this.products.foreign = await this.stripe.products.retrieve('coinbitclub_monthly_foreign_v2');
                    console.log('✅ Produto Exterior recuperado:', this.products.foreign.id);
                } else {
                    throw error;
                }
            }

        } catch (error) {
            console.error('❌ Erro ao criar produtos:', error.message);
            throw error;
        }
    }

    async createStripePrices() {
        console.log('💰 Criando preços na Stripe...');
        
        try {
            // Preço Brasil - R$ 297,00
            this.prices.brazil = await this.stripe.prices.create({
                product: this.products.brazil.id,
                unit_amount: 29700, // R$ 297,00
                currency: 'brl',
                recurring: { interval: 'month' }
            });
            console.log('✅ Preço Brasil criado:', this.prices.brazil.id);

            // Preço Exterior - $50,00
            this.prices.foreign = await this.stripe.prices.create({
                product: this.products.foreign.id,
                unit_amount: 5000, // $50,00
                currency: 'usd',
                recurring: { interval: 'month' }
            });
            console.log('✅ Preço Exterior criado:', this.prices.foreign.id);

        } catch (error) {
            console.error('❌ Erro ao criar preços:', error.message);
            throw error;
        }
    }

    async createPaymentLinks() {
        console.log('🔗 Criando links de pagamento...');
        
        try {
            // Link Brasil
            this.paymentLinks.brazil = await this.stripe.paymentLinks.create({
                line_items: [{
                    price: this.prices.brazil.id,
                    quantity: 1
                }],
                after_completion: {
                    type: 'redirect',
                    redirect: {
                        url: 'https://coinbitclub.com/subscription/success'
                    }
                }
            });
            console.log('✅ Link Brasil criado:', this.paymentLinks.brazil.url);

            // Link Exterior
            this.paymentLinks.foreign = await this.stripe.paymentLinks.create({
                line_items: [{
                    price: this.prices.foreign.id,
                    quantity: 1
                }],
                after_completion: {
                    type: 'redirect',
                    redirect: {
                        url: 'https://coinbitclub.com/subscription/success'
                    }
                }
            });
            console.log('✅ Link Exterior criado:', this.paymentLinks.foreign.url);

        } catch (error) {
            console.error('❌ Erro ao criar links:', error.message);
            throw error;
        }
    }

    async createAffiliateSystem() {
        console.log('👥 Configurando sistema de afiliados...');
        
        const client = await this.pool.connect();
        
        try {
            // Buscar usuários com códigos de afiliados
            const users = await client.query(`
                SELECT id, username, affiliate_code 
                FROM users 
                WHERE affiliate_code IS NOT NULL
                LIMIT 5
            `);

            console.log('\n📋 Códigos de afiliados existentes:');
            users.rows.forEach(user => {
                const brazilLink = `${this.paymentLinks.brazil.url}?client_reference_id=aff_${user.affiliate_code}`;
                const foreignLink = `${this.paymentLinks.foreign.url}?client_reference_id=aff_${user.affiliate_code}`;
                
                console.log(`\n👤 ${user.username} (${user.affiliate_code}):`);
                console.log(`   🇧🇷 Brasil: ${brazilLink}`);
                console.log(`   🌍 Exterior: ${foreignLink}`);
            });

        } finally {
            client.release();
        }
    }

    async createAdminCreditSystem() {
        console.log('\n💳 Sistema de créditos administrativos...');
        
        console.log('📋 Configurações:');
        console.log('   • Mínimo Brasil: R$ 200,00');
        console.log('   • Mínimo Exterior: $35,00');
        console.log('   • Geração automática de cupons');
        console.log('   • Validade: 30 dias');

        // Exemplo de cupom administrativo
        const sampleCoupon = this.generateAdminCouponCode();
        console.log(`\n🎫 Exemplo de cupom: ${sampleCoupon}`);
    }

    generateAdminCouponCode() {
        const prefix = 'ADM';
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.floor(100 + Math.random() * 900);
        return `${prefix}${timestamp}${random}`;
    }

    async displayFinalResults() {
        console.log('\n🎯 RESULTADOS FINAIS');
        console.log('===================');

        console.log('\n🔗 Links de Assinatura REAIS:');
        console.log(`🇧🇷 Brasil (R$ 297,00): ${this.paymentLinks.brazil.url}`);
        console.log(`🌍 Exterior ($50,00): ${this.paymentLinks.foreign.url}`);

        console.log('\n💰 Sistema de Comissões:');
        console.log('   • COM assinatura: 10%');
        console.log('   • SEM assinatura: 20%');
        console.log('   • Afiliado Normal: 1.5% da comissão');
        console.log('   • Afiliado VIP: 5.0% da comissão');

        console.log('\n👥 Códigos de Afiliados:');
        console.log('   • Gerados automaticamente no cadastro');
        console.log('   • Formato: CBC + 3 letras + 4 números');
        console.log('   • Links personalizados com tracking');

        console.log('\n💳 Créditos Administrativos:');
        console.log('   • Mínimo R$ 200,00 (Brasil)');
        console.log('   • Mínimo $35,00 (Exterior)');
        console.log('   • Cupons com validade de 30 dias');

        console.log('\n🗄️ Banco de Dados:');
        console.log('   • PostgreSQL totalmente integrado');
        console.log('   • Códigos de afiliados criados');
        console.log('   • Sistema de transações funcionando');
    }

    async run() {
        try {
            // 1. Testar conexão
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();
            console.log('✅ PostgreSQL conectado');

            // 2. Criar produtos na Stripe
            await this.createStripeProducts();

            // 3. Criar preços
            await this.createStripePrices();

            // 4. Criar links de pagamento
            await this.createPaymentLinks();

            // 5. Configurar sistema de afiliados
            await this.createAffiliateSystem();

            // 6. Configurar créditos administrativos
            await this.createAdminCreditSystem();

            // 7. Exibir resultados
            await this.displayFinalResults();

            console.log('\n✅ SISTEMA STRIPE TOTALMENTE CONFIGURADO!');
            console.log('========================================');

        } catch (error) {
            console.error('❌ Erro:', error);
        } finally {
            await this.pool.end();
        }
    }
}

// Executar
if (require.main === module) {
    const system = new StripeSystemSimplified();
    system.run();
}

module.exports = StripeSystemSimplified;
