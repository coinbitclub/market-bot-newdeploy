-- =============================================
-- 🗄️ INICIALIZAÇÃO DO BANCO DE DADOS
-- Market Bot - Estrutura Completa de Produção
-- =============================================

-- Configurações iniciais
SET timezone = 'America/Sao_Paulo';
SET client_encoding = 'UTF8';

-- =============================================
-- 📊 EXTENSÕES NECESSÁRIAS
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- 👥 TABELA: users
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    country VARCHAR(3) DEFAULT 'BR',
    
    -- Configurações de conta
    account_type VARCHAR(20) DEFAULT 'testnet',
    plan_type VARCHAR(20) DEFAULT 'BASIC',
    affiliate_type VARCHAR(20) DEFAULT 'none',
    
    -- Saldos financeiros
    balance_real_brl DECIMAL(15,2) DEFAULT 0.00,
    balance_real_usd DECIMAL(15,2) DEFAULT 0.00,
    balance_admin_brl DECIMAL(15,2) DEFAULT 0.00,
    balance_admin_usd DECIMAL(15,2) DEFAULT 0.00,
    balance_commission_brl DECIMAL(15,2) DEFAULT 0.00,
    balance_commission_usd DECIMAL(15,2) DEFAULT 0.00,
    
    -- Chaves API
    binance_api_key VARCHAR(255),
    binance_secret_key VARCHAR(255),
    binance_testnet BOOLEAN DEFAULT true,
    bybit_api_key VARCHAR(255),
    bybit_secret_key VARCHAR(255),
    bybit_testnet BOOLEAN DEFAULT true,
    
    -- Status e configurações
    is_active BOOLEAN DEFAULT true,
    is_admin BOOLEAN DEFAULT false,
    trading_enabled BOOLEAN DEFAULT false,
    risk_level VARCHAR(20) DEFAULT 'medium',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);

-- =============================================
-- 📡 TABELA: signals
-- =============================================
CREATE TABLE IF NOT EXISTS signals (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL, -- 'buy' ou 'sell'
    action VARCHAR(20) NOT NULL, -- 'open', 'close', 'update'
    
    -- Dados do sinal
    price DECIMAL(15,8),
    quantity DECIMAL(15,8),
    stop_loss DECIMAL(15,8),
    take_profit DECIMAL(15,8),
    leverage INTEGER DEFAULT 1,
    
    -- Dados TradingView
    tradingview_alert_name VARCHAR(255),
    timeframe VARCHAR(10),
    exchange VARCHAR(20) DEFAULT 'bybit',
    
    -- Análise IA
    processed BOOLEAN DEFAULT false,
    ai_analysis TEXT,
    ai_confidence DECIMAL(5,2),
    ai_risk_score DECIMAL(5,2),
    
    -- Origem e status
    source VARCHAR(50) DEFAULT 'tradingview',
    status VARCHAR(20) DEFAULT 'pending',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);

-- =============================================
-- 📈 TABELA: orders
-- =============================================
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    signal_id INTEGER REFERENCES signals(id),
    
    -- Dados da ordem
    exchange VARCHAR(20) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL, -- 'buy' ou 'sell'
    type VARCHAR(20) NOT NULL, -- 'market', 'limit', 'stop'
    
    -- Quantidades e preços
    quantity DECIMAL(15,8) NOT NULL,
    price DECIMAL(15,8),
    filled_quantity DECIMAL(15,8) DEFAULT 0,
    avg_fill_price DECIMAL(15,8),
    
    -- Status e IDs
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'filled', 'cancelled', 'failed'
    exchange_order_id VARCHAR(100),
    client_order_id VARCHAR(100),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    filled_at TIMESTAMP
);

-- =============================================
-- 🔑 TABELA: api_keys
-- =============================================
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    exchange VARCHAR(20) NOT NULL,
    api_key VARCHAR(500) NOT NULL,
    api_secret VARCHAR(500) NOT NULL,
    passphrase VARCHAR(255), -- Para exchanges que requerem
    
    -- Status e validação
    is_active BOOLEAN DEFAULT true,
    is_valid BOOLEAN DEFAULT false,
    trading_enabled BOOLEAN DEFAULT false,
    testnet BOOLEAN DEFAULT true,
    
    -- Permissões
    permissions JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_validated TIMESTAMP,
    last_used TIMESTAMP
);

-- =============================================
-- 💰 TABELA: transactions
-- =============================================
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL, -- 'STRIPE_RECHARGE', 'ADMIN_CREDIT', 'COMMISSION_TO_CREDIT', 'WITHDRAWAL'
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    
    -- Detalhes financeiros
    commission_amount DECIMAL(15,2) DEFAULT 0.00,
    net_amount DECIMAL(15,2),
    plan_type VARCHAR(20),
    
    -- Metadados
    description TEXT,
    external_id VARCHAR(255), -- ID do Stripe, PIX, etc.
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- 💼 TABELA: commission_records
-- =============================================
CREATE TABLE IF NOT EXISTS commission_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    type VARCHAR(50) NOT NULL, -- 'COMPANY_COMMISSION', 'AFFILIATE_COMMISSION'
    
    -- Detalhes da comissão
    plan_type VARCHAR(20),
    commission_rate DECIMAL(5,2),
    source_transaction_id INTEGER REFERENCES transactions(id),
    
    -- Metadados
    description TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- 🤝 TABELA: affiliate_requests
-- =============================================
CREATE TABLE IF NOT EXISTS affiliate_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Dados da solicitação
    full_name VARCHAR(255) NOT NULL,
    document VARCHAR(50) NOT NULL,
    trading_experience TEXT,
    terms_accepted BOOLEAN NOT NULL DEFAULT false,
    
    -- Status da solicitação
    requested_level VARCHAR(20) DEFAULT 'AFFILIATE_NORMAL',
    status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
    reason TEXT,
    admin_notes TEXT,
    
    -- Código de afiliado
    affiliate_code_generated VARCHAR(20),
    
    -- Auditoria
    processed_by_admin_id INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    approved_by VARCHAR(50),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id),
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    CHECK (requested_level IN ('AFFILIATE_NORMAL', 'AFFILIATE_VIP'))
);

-- =============================================
-- 😱 TABELA: fear_greed_index
-- =============================================
CREATE TABLE IF NOT EXISTS fear_greed_index (
    id SERIAL PRIMARY KEY,
    value INTEGER NOT NULL,
    value_classification VARCHAR(50) NOT NULL,
    
    -- Dados adicionais
    timestamp_unix BIGINT,
    time_until_update VARCHAR(50),
    source VARCHAR(50) DEFAULT 'alternative.me',
    
    -- Dados de mercado complementares
    market_cap_total DECIMAL(20,2),
    volume_24h DECIMAL(20,2),
    btc_dominance DECIMAL(5,2),
    
    -- Timestamps
    collected_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- 🏆 TABELA: top100_coins
-- =============================================
CREATE TABLE IF NOT EXISTS top100_coins (
    id SERIAL PRIMARY KEY,
    coin_id VARCHAR(100) UNIQUE NOT NULL,
    symbol VARCHAR(20),
    name VARCHAR(255),
    
    -- Dados de preço
    current_price DECIMAL(20,8),
    market_cap BIGINT,
    market_cap_rank INTEGER,
    total_volume BIGINT,
    
    -- Variações de preço
    price_change_24h DECIMAL(20,8),
    price_change_percentage_24h DECIMAL(10,4),
    price_change_percentage_7d DECIMAL(10,4),
    
    -- Supply
    circulating_supply DECIMAL(30,2),
    total_supply DECIMAL(30,2),
    max_supply DECIMAL(30,2),
    
    -- ATH/ATL
    ath DECIMAL(20,8),
    ath_date TIMESTAMP,
    atl DECIMAL(20,8),
    atl_date TIMESTAMP,
    
    -- Metadados
    image_url TEXT,
    
    -- Timestamps
    last_updated TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- 📊 ÍNDICES PARA PERFORMANCE
-- =============================================

-- Índices para users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_affiliate_type ON users(affiliate_type);
CREATE INDEX IF NOT EXISTS idx_users_plan_type ON users(plan_type);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Índices para signals
CREATE INDEX IF NOT EXISTS idx_signals_symbol ON signals(symbol);
CREATE INDEX IF NOT EXISTS idx_signals_status ON signals(status);
CREATE INDEX IF NOT EXISTS idx_signals_created_at ON signals(created_at);
CREATE INDEX IF NOT EXISTS idx_signals_processed ON signals(processed);

-- Índices para orders
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_signal_id ON orders(signal_id);
CREATE INDEX IF NOT EXISTS idx_orders_symbol ON orders(symbol);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Índices para api_keys
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_exchange ON api_keys(exchange);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

-- Índices para transactions
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- Índices para commission_records
CREATE INDEX IF NOT EXISTS idx_commission_records_user_id ON commission_records(user_id);
CREATE INDEX IF NOT EXISTS idx_commission_records_type ON commission_records(type);
CREATE INDEX IF NOT EXISTS idx_commission_records_created_at ON commission_records(created_at);

-- Índices para affiliate_requests
CREATE INDEX IF NOT EXISTS idx_affiliate_requests_user_id ON affiliate_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_requests_status ON affiliate_requests(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_requests_created_at ON affiliate_requests(created_at);

-- Índices para fear_greed_index
CREATE INDEX IF NOT EXISTS idx_fear_greed_collected_at ON fear_greed_index(collected_at);
CREATE INDEX IF NOT EXISTS idx_fear_greed_value ON fear_greed_index(value);
CREATE INDEX IF NOT EXISTS idx_fear_greed_classification ON fear_greed_index(value_classification);

-- Índices para top100_coins
CREATE INDEX IF NOT EXISTS idx_top100_coin_id ON top100_coins(coin_id);
CREATE INDEX IF NOT EXISTS idx_top100_symbol ON top100_coins(symbol);
CREATE INDEX IF NOT EXISTS idx_top100_market_cap_rank ON top100_coins(market_cap_rank);
CREATE INDEX IF NOT EXISTS idx_top100_created_at ON top100_coins(created_at);

-- =============================================
-- ✅ VERIFICAÇÃO FINAL
-- =============================================
SELECT 
    'Banco de dados inicializado com sucesso!' as status,
    COUNT(*) as total_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'users', 'signals', 'orders', 'api_keys', 
    'transactions', 'commission_records', 
    'affiliate_requests', 'fear_greed_index', 'top100_coins'
);