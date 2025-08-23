// 🧪 TESTE SISTEMA STRIPE - VERSÃO SIMPLIFICADA
// =============================================

const Stripe = require('stripe');
const { Pool } = require('pg');
const crypto = require('crypto');

async function testarSistemaStripeFinal() {
    console.log('🧪 TESTE FINAL DO SISTEMA STRIPE REAL');
    console.log('====================================');
    
    // Configurar Stripe REAL
    const stripe = Stripe('sk_live_STRIPE_SECRET_KEY_HERE');
    
    // Configurar PostgreSQL
    const pool = new Pool({
        connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        // Teste 1: Verificar conexão Stripe
        console.log('\n1. 🔌 Testando conexão Stripe...');
        const account = await stripe.accounts.retrieve();
        console.log(`   ✅ Conectado: ${account.business_profile?.name || account.id}`);
        console.log(`   💳 País: ${account.country}`);
        console.log(`   🏢 Tipo: ${account.type}`);
        
        // Teste 2: Verificar PostgreSQL
        console.log('\n2. 🗄️ Testando PostgreSQL...');
        const client = await pool.connect();
        const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
        console.log(`   ✅ Conectado: ${result.rows[0].current_time}`);
        client.release();
        
        // Teste 3: Gerar códigos de afiliado
        console.log('\n3. 🤝 Gerando códigos de afiliado...');
        const clientAffiliate = await pool.connect();
        
        // Código normal
        let codeNormal = `CBC${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        await clientAffiliate.query(`
            INSERT INTO affiliate_codes (code, user_id, type, commission_rate)
            VALUES ($1, $2, $3, $4)
        `, [codeNormal, 1, 'normal', 1.5]);
        console.log(`   ✅ Normal: ${codeNormal} (1.5% comissão)`);
        
        // Código VIP
        let codeVip = `CBC${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        await clientAffiliate.query(`
            INSERT INTO affiliate_codes (code, user_id, type, commission_rate)
            VALUES ($1, $2, $3, $4)
        `, [codeVip, 2, 'vip', 5.0]);
        console.log(`   ✅ VIP: ${codeVip} (5.0% comissão)`);
        
        clientAffiliate.release();
        
        // Teste 4: Criar Payment Links para créditos administrativos
        console.log('\n4. 💳 Criando Payment Links administrativos...');
        
        // Payment Link BRL
        const paymentLinkBRL = await stripe.paymentLinks.create({
            line_items: [{
                price_data: {
                    currency: 'brl',
                    product_data: {
                        name: 'CoinBitClub - Crédito Administrativo',
                        description: 'Crédito de R$ 200,00'
                    },
                    unit_amount: 20000 // R$ 200,00
                },
                quantity: 1
            }],
            metadata: {
                type: 'admin_credit',
                amount: '20000',
                currency: 'BRL'
            }
        });
        console.log(`   ✅ Link BRL: ${paymentLinkBRL.url}`);
        
        // Payment Link USD
        const paymentLinkUSD = await stripe.paymentLinks.create({
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'CoinBitClub - Administrative Credit',
                        description: 'Credit $35.00'
                    },
                    unit_amount: 3500 // $35.00
                },
                quantity: 1
            }],
            metadata: {
                type: 'admin_credit',
                amount: '3500',
                currency: 'USD'
            }
        });
        console.log(`   ✅ Link USD: ${paymentLinkUSD.url}`);
        
        // Teste 5: Criar Checkout Sessions para assinaturas
        console.log('\n5. 📋 Criando Checkout Sessions para assinaturas...');
        
        // Assinatura Brasil
        const sessionBR = await stripe.checkout.sessions.create({
            payment_method_types: ['card', 'boleto'],
            mode: 'subscription',
            line_items: [{
                price_data: {
                    currency: 'brl',
                    product_data: {
                        name: 'CoinBitClub - Plano Mensal Brasil',
                        description: 'Acesso completo + 10% comissão sobre lucros'
                    },
                    unit_amount: 29700, // R$ 297,00
                    recurring: { interval: 'month' }
                },
                quantity: 1
            }],
            success_url: 'https://coinbitclub.com/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: 'https://coinbitclub.com/cancel',
            locale: 'pt-BR'
        });
        console.log(`   ✅ Brasil: ${sessionBR.url}`);
        
        // Assinatura Exterior
        const sessionUS = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'CoinBitClub - Monthly Plan International',
                        description: 'Full access + 10% commission on profits'
                    },
                    unit_amount: 5000, // $50.00
                    recurring: { interval: 'month' }
                },
                quantity: 1
            }],
            success_url: 'https://coinbitclub.com/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: 'https://coinbitclub.com/cancel',
            locale: 'en'
        });
        console.log(`   ✅ Exterior: ${sessionUS.url}`);
        
        // Teste 6: Criar Checkout Sessions para recargas
        console.log('\n6. 💳 Criando Checkout Sessions para recargas...');
        
        // Recarga Brasil (exemplo R$ 150)
        const rechargeBR = await stripe.checkout.sessions.create({
            payment_method_types: ['card', 'boleto'],
            mode: 'payment',
            line_items: [{
                price_data: {
                    currency: 'brl',
                    product_data: {
                        name: 'CoinBitClub - Recarga Brasil',
                        description: 'Recarga de R$ 150,00'
                    },
                    unit_amount: 15000
                },
                quantity: 1
            }],
            success_url: 'https://coinbitclub.com/recharge/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: 'https://coinbitclub.com/recharge/cancel',
            locale: 'pt-BR'
        });
        console.log(`   ✅ Recarga BRL: ${rechargeBR.url}`);
        
        // Recarga Exterior (exemplo $30)
        const rechargeUS = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'CoinBitClub - International Recharge',
                        description: 'Recharge $30.00'
                    },
                    unit_amount: 3000
                },
                quantity: 1
            }],
            success_url: 'https://coinbitclub.com/recharge/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: 'https://coinbitclub.com/recharge/cancel',
            locale: 'en'
        });
        console.log(`   ✅ Recarga USD: ${rechargeUS.url}`);
        
        // Salvar tudo no banco
        console.log('\n7. 💾 Salvando links no banco...');
        const clientSave = await pool.connect();
        
        await clientSave.query(`
            INSERT INTO stripe_links (type, stripe_url, stripe_session_id, amount, currency)
            VALUES 
                ('subscription_br', $1, $2, 29700, 'BRL'),
                ('subscription_usd', $3, $4, 5000, 'USD'),
                ('recharge_br', $5, $6, 15000, 'BRL'),
                ('recharge_usd', $7, $8, 3000, 'USD'),
                ('admin_credit_br', $9, NULL, 20000, 'BRL'),
                ('admin_credit_usd', $10, NULL, 3500, 'USD')
        `, [
            sessionBR.url, sessionBR.id,
            sessionUS.url, sessionUS.id,
            rechargeBR.url, rechargeBR.id,
            rechargeUS.url, rechargeUS.id,
            paymentLinkBRL.url,
            paymentLinkUSD.url
        ]);
        
        clientSave.release();
        console.log('   ✅ Links salvos no PostgreSQL');
        
        // Resumo final
        console.log('\n🎯 RESUMO FINAL - SISTEMA 100% OPERACIONAL');
        console.log('==========================================');
        
        console.log('\n📋 ASSINATURAS CRIADAS:');
        console.log(`   🇧🇷 Brasil R$ 297,00: ${sessionBR.url}`);
        console.log(`   🌍 Exterior $50,00: ${sessionUS.url}`);
        
        console.log('\n💳 RECARGAS CRIADAS:');
        console.log(`   🇧🇷 Brasil R$ 150,00: ${rechargeBR.url}`);
        console.log(`   🌍 Exterior $30,00: ${rechargeUS.url}`);
        
        console.log('\n👑 CRÉDITOS ADMINISTRATIVOS:');
        console.log(`   🇧🇷 Brasil R$ 200,00: ${paymentLinkBRL.url}`);
        console.log(`   🌍 Exterior $35,00: ${paymentLinkUSD.url}`);
        
        console.log('\n🤝 CÓDIGOS DE AFILIADO GERADOS:');
        console.log(`   Normal (1.5%): ${codeNormal}`);
        console.log(`   VIP (5.0%): ${codeVip}`);
        
        console.log('\n✅ TODOS OS LINKS REAIS CRIADOS COM SUCESSO!');
        console.log('===========================================');
        console.log('🎯 Sistema integrado:');
        console.log('  ✅ Stripe LIVE ativo');
        console.log('  ✅ PostgreSQL conectado');
        console.log('  ✅ 2 Links de assinatura (BRL/USD)');
        console.log('  ✅ 2 Links de recarga (BRL/USD)');
        console.log('  ✅ 2 Links de crédito admin (BRL/USD)');
        console.log('  ✅ Códigos de afiliado automáticos');
        console.log('  ✅ Tracking completo no banco');
        
    } catch (error) {
        console.error('❌ Erro no teste:', error);
    } finally {
        await pool.end();
    }
}

// Executar teste
testarSistemaStripeFinal();
