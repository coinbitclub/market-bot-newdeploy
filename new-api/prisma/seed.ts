// =============================================
// 🌱 PRISMA SEED - MARKET BOT
// Popula o banco com dados consistentes de teste
// =============================================

import { PrismaClient } from '../generated/prisma/index.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // =============================================
  // 👥 SEED: Users
  // =============================================
  console.log('👥 Criando usuários...');
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@marketbot.com' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@marketbot.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      fullName: 'Administrador do Sistema',
      country: 'BR',
      accountType: 'live',
      planType: 'ENTERPRISE',
      affiliateType: 'none',
      isActive: true,
      isAdmin: true,
      tradingEnabled: true,
      riskLevel: 'low',
      balanceRealBrl: 10000.00,
      balanceRealUsd: 2000.00,
    },
  });

  const traderUser = await prisma.user.upsert({
    where: { email: 'trader@test.com' },
    update: {},
    create: {
      username: 'trader_demo',
      email: 'trader@test.com',
      passwordHash: await bcrypt.hash('trader123', 10),
      fullName: 'Trader Demonstração',
      country: 'BR',
      accountType: 'testnet',
      planType: 'PREMIUM',
      affiliateType: 'AFFILIATE_NORMAL',
      isActive: true,
      isAdmin: false,
      tradingEnabled: true,
      riskLevel: 'medium',
      balanceRealBrl: 5000.00,
      balanceRealUsd: 1000.00,
      balanceAdminBrl: 1000.00,
      balanceCommissionBrl: 250.00,
    },
  });

  const affiliateUser = await prisma.user.upsert({
    where: { email: 'affiliate@test.com' },
    update: {},
    create: {
      username: 'affiliate_vip',
      email: 'affiliate@test.com',
      passwordHash: await bcrypt.hash('affiliate123', 10),
      fullName: 'Afiliado VIP',
      country: 'BR',
      accountType: 'live',
      planType: 'BASIC',
      affiliateType: 'AFFILIATE_VIP',
      isActive: true,
      isAdmin: false,
      tradingEnabled: false,
      riskLevel: 'high',
      balanceCommissionBrl: 1500.00,
      balanceCommissionUsd: 300.00,
    },
  });

  console.log(`✅ Usuários criados: Admin (${adminUser.id}), Trader (${traderUser.id}), Affiliate (${affiliateUser.id})`);

  // =============================================
  // 🔑 SEED: ApiKeys
  // =============================================
  console.log('🔑 Criando chaves API...');
  
  await prisma.apiKey.createMany({
    data: [
      {
        userId: traderUser.id,
        exchange: 'binance',
        apiKey: 'demo_binance_api_key_12345',
        apiSecret: 'demo_binance_secret_67890',
        isActive: true,
        isValid: true,
        tradingEnabled: true,
        testnet: true,
        permissions: {
          spot: true,
          futures: true,
          margin: false,
        },
      },
      {
        userId: traderUser.id,
        exchange: 'bybit',
        apiKey: 'demo_bybit_api_key_54321',
        apiSecret: 'demo_bybit_secret_09876',
        isActive: true,
        isValid: true,
        tradingEnabled: true,
        testnet: true,
        permissions: {
          spot: true,
          derivatives: true,
          copy_trading: false,
        },
      },
      {
        userId: adminUser.id,
        exchange: 'binance',
        apiKey: 'admin_binance_api_key_99999',
        apiSecret: 'admin_binance_secret_88888',
        isActive: true,
        isValid: true,
        tradingEnabled: true,
        testnet: false,
        permissions: {
          spot: true,
          futures: true,
          margin: true,
          wallet: true,
        },
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Chaves API criadas');

  // =============================================
  // 📡 SEED: Signals
  // =============================================
  console.log('📡 Criando sinais de trading...');
  
  const signals = await prisma.signal.createMany({
    data: [
      {
        symbol: 'BTCUSDT',
        side: 'buy',
        action: 'open',
        price: 95000.50,
        quantity: 0.001,
        stopLoss: 93000.00,
        takeProfit: 98000.00,
        leverage: 5,
        tradingviewAlertName: 'BTC Long Signal',
        timeframe: '1h',
        exchange: 'bybit',
        processed: true,
        aiAnalysis: 'Sinal de alta com base em rompimento de resistência. RSI em 65, MACD positivo.',
        aiConfidence: 85.50,
        aiRiskScore: 3.2,
        source: 'tradingview',
        status: 'active',
      },
      {
        symbol: 'ETHUSDT',
        side: 'sell',
        action: 'open',
        price: 3200.75,
        quantity: 0.1,
        stopLoss: 3300.00,
        takeProfit: 3100.00,
        leverage: 3,
        tradingviewAlertName: 'ETH Short Signal',
        timeframe: '4h',
        exchange: 'binance',
        processed: true,
        aiAnalysis: 'Sinal de baixa devido a divergência bearish no RSI. Volume decrescente.',
        aiConfidence: 72.30,
        aiRiskScore: 4.1,
        source: 'tradingview',
        status: 'pending',
      },
      {
        symbol: 'BNBUSDT',
        side: 'buy',
        action: 'open',
        price: 580.25,
        quantity: 0.5,
        stopLoss: 570.00,
        takeProfit: 600.00,
        leverage: 2,
        tradingviewAlertName: 'BNB Breakout',
        timeframe: '15m',
        exchange: 'binance',
        processed: false,
        aiAnalysis: null,
        aiConfidence: null,
        aiRiskScore: null,
        source: 'manual',
        status: 'pending',
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Sinais de trading criados');

  // =============================================
  // 📈 SEED: Orders
  // =============================================
  console.log('📈 Criando ordens...');
  
  const firstSignal = await prisma.signal.findFirst({ where: { symbol: 'BTCUSDT' } });
  const secondSignal = await prisma.signal.findFirst({ where: { symbol: 'ETHUSDT' } });

  if (firstSignal && secondSignal) {
    await prisma.order.createMany({
      data: [
        {
          userId: traderUser.id,
          signalId: firstSignal.id,
          exchange: 'bybit',
          symbol: 'BTCUSDT',
          side: 'buy',
          type: 'market',
          quantity: 0.001,
          price: 95000.50,
          filledQuantity: 0.001,
          avgFillPrice: 95001.25,
          status: 'filled',
          exchangeOrderId: 'bybit_12345678',
          clientOrderId: 'client_btc_001',
          filledAt: new Date(),
        },
        {
          userId: traderUser.id,
          signalId: secondSignal.id,
          exchange: 'binance',
          symbol: 'ETHUSDT',
          side: 'sell',
          type: 'limit',
          quantity: 0.1,
          price: 3200.75,
          filledQuantity: 0,
          status: 'pending',
          exchangeOrderId: null,
          clientOrderId: 'client_eth_002',
        },
        {
          userId: adminUser.id,
          signalId: null,
          exchange: 'binance',
          symbol: 'ADAUSDT',
          side: 'buy',
          type: 'market',
          quantity: 100,
          price: 0.85,
          filledQuantity: 100,
          avgFillPrice: 0.8505,
          status: 'filled',
          exchangeOrderId: 'binance_87654321',
          clientOrderId: 'admin_ada_001',
          filledAt: new Date(Date.now() - 3600000), // 1 hora atrás
        },
      ],
      skipDuplicates: true,
    });
  }

  console.log('✅ Ordens criadas');

  // =============================================
  // 💰 SEED: Transactions
  // =============================================
  console.log('💰 Criando transações...');
  
  const transactions = await prisma.transaction.createMany({
    data: [
      {
        userId: traderUser.id,
        type: 'STRIPE_RECHARGE',
        amount: 5000.00,
        currency: 'BRL',
        status: 'COMPLETED',
        commissionAmount: 0,
        netAmount: 5000.00,
        planType: 'PREMIUM',
        description: 'Recarga via Stripe - Plano Premium',
        externalId: 'stripe_pi_1234567890',
        metadata: {
          stripe_payment_intent: 'pi_1234567890',
          payment_method: 'card',
        },
      },
      {
        userId: affiliateUser.id,
        type: 'AFFILIATE_COMMISSION',
        amount: 250.00,
        currency: 'BRL',
        status: 'COMPLETED',
        commissionAmount: 250.00,
        netAmount: 250.00,
        planType: null,
        description: 'Comissão de afiliado - Referência trader_demo',
        externalId: null,
        metadata: {
          referral_user_id: traderUser.id,
          commission_rate: 5.0,
        },
      },
      {
        userId: adminUser.id,
        type: 'ADMIN_CREDIT',
        amount: 1000.00,
        currency: 'BRL',
        status: 'COMPLETED',
        commissionAmount: 0,
        netAmount: 1000.00,
        planType: null,
        description: 'Crédito administrativo - Bônus de boas-vindas',
        externalId: 'admin_bonus_001',
        metadata: {
          admin_action: 'welcome_bonus',
          approved_by: 'system',
        },
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Transações criadas');

  // =============================================
  // 💼 SEED: CommissionRecords
  // =============================================
  console.log('💼 Criando registros de comissão...');
  
  const firstTransaction = await prisma.transaction.findFirst({ 
    where: { type: 'STRIPE_RECHARGE' } 
  });

  if (firstTransaction) {
    await prisma.commissionRecord.createMany({
      data: [
        {
          userId: affiliateUser.id,
          amount: 250.00,
          currency: 'BRL',
          type: 'AFFILIATE_COMMISSION',
          planType: 'PREMIUM',
          commissionRate: 5.0,
          sourceTransactionId: firstTransaction.id,
          description: 'Comissão de 5% sobre recarga Premium',
          metadata: {
            referral_user: 'trader_demo',
            commission_tier: 'normal',
          },
        },
        {
          userId: adminUser.id,
          amount: 500.00,
          currency: 'BRL',
          type: 'COMPANY_COMMISSION',
          planType: 'PREMIUM',
          commissionRate: 10.0,
          sourceTransactionId: firstTransaction.id,
          description: 'Comissão da empresa sobre recarga Premium',
          metadata: {
            commission_type: 'platform_fee',
          },
        },
      ],
      skipDuplicates: true,
    });
  }

  console.log('✅ Registros de comissão criados');

  // =============================================
  // 🤝 SEED: AffiliateRequests
  // =============================================
  console.log('🤝 Criando solicitações de afiliação...');
  
  await prisma.affiliateRequest.createMany({
    data: [
      {
        userId: affiliateUser.id,
        fullName: 'Afiliado VIP Demonstração',
        document: '12345678901',
        tradingExperience: 'Mais de 3 anos de experiência em trading de criptomoedas. Especialista em análise técnica.',
        termsAccepted: true,
        requestedLevel: 'AFFILIATE_VIP',
        status: 'APPROVED',
        reason: 'Solicitação para upgrade VIP devido ao volume de referências',
        adminNotes: 'Aprovado devido ao excelente histórico de referências e conhecimento técnico.',
        affiliateCodeGenerated: 'VIP2024001',
        processedByAdminId: adminUser.id,
        approvedAt: new Date(Date.now() - 86400000), // 1 dia atrás
        approvedBy: 'admin',
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Solicitações de afiliação criadas');

  // =============================================
  // 😱 SEED: FearGreedIndex
  // =============================================
  console.log('😱 Criando dados Fear & Greed Index...');
  
  const fearGreedData = [
    { value: 75, classification: 'Greed', timestamp: Date.now() - 86400000 * 7 },
    { value: 68, classification: 'Greed', timestamp: Date.now() - 86400000 * 6 },
    { value: 72, classification: 'Greed', timestamp: Date.now() - 86400000 * 5 },
    { value: 65, classification: 'Greed', timestamp: Date.now() - 86400000 * 4 },
    { value: 58, classification: 'Greed', timestamp: Date.now() - 86400000 * 3 },
    { value: 52, classification: 'Neutral', timestamp: Date.now() - 86400000 * 2 },
    { value: 48, classification: 'Fear', timestamp: Date.now() - 86400000 * 1 },
    { value: 55, classification: 'Neutral', timestamp: Date.now() },
  ];

  for (const data of fearGreedData) {
    await prisma.fearGreedIndex.create({
      data: {
        value: data.value,
        valueClassification: data.classification,
        timestampUnix: BigInt(data.timestamp),
        timeUntilUpdate: '23h 45m',
        source: 'alternative.me',
        marketCapTotal: 2500000000000.00,
        volume24h: 85000000000.00,
        btcDominance: 56.8,
        collectedAt: new Date(data.timestamp),
      },
    });
  }

  console.log('✅ Dados Fear & Greed Index criados');

  // =============================================
  // 🏆 SEED: Top100Coins
  // =============================================
  console.log('🏆 Criando dados Top 100 Coins...');
  
  const top100Data = [
    {
      coinId: 'bitcoin',
      symbol: 'BTC',
      name: 'Bitcoin',
      currentPrice: 95000.50,
      marketCap: BigInt('1850000000000'),
      marketCapRank: 1,
      totalVolume: BigInt('45000000000'),
      priceChange24h: 2500.75,
      priceChangePercentage24h: 2.7,
      priceChangePercentage7d: 8.5,
      circulatingSupply: 19500000.00,
      totalSupply: 21000000.00,
      maxSupply: 21000000.00,
      ath: 108000.00,
      atl: 67.81,
    },
    {
      coinId: 'ethereum',
      symbol: 'ETH',
      name: 'Ethereum',
      currentPrice: 3200.75,
      marketCap: BigInt('385000000000'),
      marketCapRank: 2,
      totalVolume: BigInt('18000000000'),
      priceChange24h: -85.25,
      priceChangePercentage24h: -2.6,
      priceChangePercentage7d: 5.2,
      circulatingSupply: 120280000.00,
      totalSupply: 120280000.00,
      maxSupply: null,
      ath: 4878.26,
      atl: 0.43,
    },
    {
      coinId: 'binancecoin',
      symbol: 'BNB',
      name: 'BNB',
      currentPrice: 580.25,
      marketCap: BigInt('85000000000'),
      marketCapRank: 3,
      totalVolume: BigInt('2500000000'),
      priceChange24h: 15.80,
      priceChangePercentage24h: 2.8,
      priceChangePercentage7d: 12.3,
      circulatingSupply: 147220000.00,
      totalSupply: 147220000.00,
      maxSupply: 200000000.00,
      ath: 686.31,
      atl: 0.096,
    },
    {
      coinId: 'solana',
      symbol: 'SOL',
      name: 'Solana',
      currentPrice: 180.45,
      marketCap: BigInt('82000000000'),
      marketCapRank: 4,
      totalVolume: BigInt('3200000000'),
      priceChange24h: 8.75,
      priceChangePercentage24h: 5.1,
      priceChangePercentage7d: 18.7,
      circulatingSupply: 456000000.00,
      totalSupply: 580000000.00,
      maxSupply: null,
      ath: 259.96,
      atl: 0.50,
    },
    {
      coinId: 'cardano',
      symbol: 'ADA',
      name: 'Cardano',
      currentPrice: 0.85,
      marketCap: BigInt('30000000000'),
      marketCapRank: 5,
      totalVolume: BigInt('1200000000'),
      priceChange24h: 0.05,
      priceChangePercentage24h: 6.2,
      priceChangePercentage7d: 15.8,
      circulatingSupply: 35000000000.00,
      totalSupply: 45000000000.00,
      maxSupply: 45000000000.00,
      ath: 3.09,
      atl: 0.017,
    },
  ];

  for (const coin of top100Data) {
    await prisma.top100Coin.create({
      data: {
        ...coin,
        imageUrl: `https://assets.coingecko.com/coins/images/${coin.coinId}.png`,
        athDate: new Date('2021-11-10'),
        atlDate: new Date('2017-10-01'),
        lastUpdated: new Date(),
      },
    });
  }

  console.log('✅ Dados Top 100 Coins criados');

  console.log('\n🎉 Seed concluído com sucesso!');
  console.log('📊 Resumo dos dados criados:');
  console.log('   👥 3 usuários (admin, trader, affiliate)');
  console.log('   🔑 3 chaves API');
  console.log('   📡 3 sinais de trading');
  console.log('   📈 3 ordens');
  console.log('   💰 3 transações');
  console.log('   💼 2 registros de comissão');
  console.log('   🤝 1 solicitação de afiliação');
  console.log('   😱 8 registros Fear & Greed');
  console.log('   🏆 5 moedas Top 100');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });