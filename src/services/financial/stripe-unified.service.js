// 💳 STRIPE UNIFIED SERVICE - ENTERPRISE MARKETBOT
// Consolidação das 4 implementações Stripe existentes

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class StripeUnifiedService {
    constructor() {
        this.plans = {
            BR: { monthly: 29700, recharge_min: 15000, currency: 'brl' },
            US: { monthly: 5000, recharge_min: 3000, currency: 'usd' }
        };
        this.commissionRates = {
            MONTHLY: 0.10,   // 10% sobre lucro
            PREPAID: 0.20    // 20% sobre lucro
        };
    }

    async createCheckoutSession(userId, planType, country, amount = null) {
        const plan = this.plans[country];
        const finalAmount = amount || plan.monthly;
        
        return await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: plan.currency,
                    product_data: { name: 'MarketBot Subscription' },
                    unit_amount: finalAmount,
                },
                quantity: 1,
            }],
            mode: planType === 'monthly' ? 'subscription' : 'payment',
            success_url: `${process.env.FRONTEND_URL}/success`,
            cancel_url: `${process.env.FRONTEND_URL}/cancel`,
            metadata: { userId, planType, country }
        });
    }

    async processWebhook(event) {
        switch (event.type) {
            case 'checkout.session.completed':
                return await this.handlePaymentSuccess(event.data.object);
            case 'invoice.payment_succeeded':
                return await this.handleSubscriptionRenewal(event.data.object);
            default:
                console.log(`Unhandled event: ${event.type}`);
        }
    }

    async handlePaymentSuccess(session) {
        console.log(`Payment successful: ${session.metadata.userId}`);
        // Integrar com banco de dados Railway PostgreSQL
        return { success: true };
    }
}

module.exports = StripeUnifiedService;