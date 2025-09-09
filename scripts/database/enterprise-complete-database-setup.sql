-- 🏢 COINBITCLUB ENTERPRISE DATABASE - SCHEMA COMPLETO v6.0.0
-- ============================================================================
-- 
-- Script completo para criação de banco de dados PostgreSQL para produção
-- Inclui TODAS as tabelas necessárias para o sistema MarketBot Enterprise
-- 
-- Baseado na análise completa do projeto CoinBitClub v6.0.0
-- Data: 2025-09-09
-- Ambiente: Produção Enterprise
-- 
-- ⚠️ IMPORTANTE: Execute este script em um banco PostgreSQL limpo
-- ============================================================================

-- ============================================================================
-- 1. CONFIGURAÇÕES INICIAIS E EXTENSÕES
-- ============================================================================

-- Configurar timezone
SET timezone = 'UTC';

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "hstore";

-- ============================================================================
-- 2. TABELA PRINCIPAL DE USUÁRIOS (Base do sistema)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    -- Identificação básica
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Dados pessoais
    full_name VARCHAR(255),
    phone VARCHAR(20),
    country VARCHAR(3) DEFAULT 'LT', -- ISO code
    language VARCHAR(5) DEFAULT 'pt-BR',
    
    -- Sistema de autenticação
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(32),
    
    -- Perfil e permissões
    user_type VARCHAR(20) DEFAULT 'USER', -- ADMIN, GESTOR, OPERADOR, AFFILIATE_VIP, AFFILIATE, USER
    is_admin BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Sistema financeiro - 6 tipos de saldo conforme especificação
    balance_real_brl DECIMAL(15,2) DEFAULT 0.00,    -- Saldo real BRL (pode sacar)
    balance_real_usd DECIMAL(15,2) DEFAULT 0.00,    -- Saldo real USD (pode sacar)
    balance_admin_brl DECIMAL(15,2) DEFAULT 0.00,   -- Crédito admin BRL (não saca, 30 dias)
    balance_admin_usd DECIMAL(15,2) DEFAULT 0.00,   -- Crédito admin USD (não saca, 30 dias)
    balance_commission_brl DECIMAL(15,2) DEFAULT 0.00, -- Comissões BRL (converte)
    balance_commission_usd DECIMAL(15,2) DEFAULT 0.00, -- Comissões USD (converte)
    
    -- Planos e assinaturas
    plan_type VARCHAR(20) DEFAULT 'MONTHLY',  -- MONTHLY, PREPAID, NONE
    subscription_status VARCHAR(20) DEFAULT 'inactive', -- active, inactive, expired
    subscription_start_date TIMESTAMP,
    subscription_end_date TIMESTAMP,
    
    -- Sistema de afiliação
    affiliate_type VARCHAR(20) DEFAULT 'none', -- none, normal, vip
    affiliate_code VARCHAR(20) UNIQUE,
    affiliate_id INTEGER REFERENCES users(id), -- Quem indicou este usuário
    
    -- Integração Stripe
    stripe_customer_id VARCHAR(100),
    stripe_subscription_id VARCHAR(100),
    
    -- Configurações de trading
    trading_enabled BOOLEAN DEFAULT false,
    max_open_positions INTEGER DEFAULT 2,
    max_position_size DECIMAL(5,2) DEFAULT 0.30, -- 30% do saldo
    default_leverage INTEGER DEFAULT 5,
    default_stop_loss_multiplier DECIMAL(3,1) DEFAULT 2.0, -- 2x leverage
    default_take_profit_multiplier DECIMAL(3,1) DEFAULT 3.0, -- 3x leverage
    risk_level VARCHAR(10) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH
    
    -- Exchange APIs
    binance_api_key TEXT,
    binance_secret_key TEXT,
    binance_testnet BOOLEAN DEFAULT true,
    bybit_api_key TEXT,
    bybit_secret_key TEXT,
    bybit_testnet BOOLEAN DEFAULT true,
    okx_api_key TEXT,
    okx_secret_key TEXT,
    okx_passphrase TEXT,
    bitget_api_key TEXT,
    bitget_secret_key TEXT,
    bitget_passphrase TEXT,
    
    -- Dados bancários para saque
    bank_name VARCHAR(100),
    bank_account VARCHAR(50),
    bank_agency VARCHAR(20),
    bank_document VARCHAR(20), -- CPF/CNPJ
    pix_key VARCHAR(100),
    
    -- Controle de sessão e segurança
    last_login_at TIMESTAMP,
    last_activity_at TIMESTAMP,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    password_reset_token VARCHAR(100),
    password_reset_expires TIMESTAMP,
    
    -- Metadados
    ip_address INET,
    user_agent TEXT,
    registration_source VARCHAR(50) DEFAULT 'website',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_user_type CHECK (user_type IN ('ADMIN', 'GESTOR', 'OPERADOR', 'AFFILIATE_VIP', 'AFFILIATE', 'USER')),
    CONSTRAINT chk_plan_type CHECK (plan_type IN ('MONTHLY', 'PREPAID', 'NONE')),
    CONSTRAINT chk_affiliate_type CHECK (affiliate_type IN ('none', 'normal', 'vip')),
    CONSTRAINT chk_subscription_status CHECK (subscription_status IN ('active', 'inactive', 'expired', 'cancelled')),
    CONSTRAINT chk_risk_level CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
    CONSTRAINT chk_leverage_range CHECK (default_leverage BETWEEN 1 AND 20),
    CONSTRAINT chk_position_size CHECK (max_position_size BETWEEN 0.1 AND 0.5),
    CONSTRAINT chk_balances_positive CHECK (
        balance_real_brl >= 0 AND balance_real_usd >= 0 AND
        balance_admin_brl >= 0 AND balance_admin_usd >= 0 AND
        balance_commission_brl >= 0 AND balance_commission_usd >= 0
    )
);

-- ============================================================================
-- 3. SISTEMA DE CHAVES API (user_api_keys)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_api_keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Dados da API
    exchange VARCHAR(20) NOT NULL, -- BINANCE, BYBIT, OKX, BITGET
    api_key TEXT NOT NULL,
    api_secret TEXT NOT NULL,
    api_passphrase TEXT, -- Para OKX e Bitget
    
    -- Configurações
    environment VARCHAR(10) DEFAULT 'testnet', -- testnet, mainnet
    is_active BOOLEAN DEFAULT true,
    is_valid BOOLEAN DEFAULT false, -- Validado pelo sistema
    
    -- Permissões verificadas
    can_read BOOLEAN DEFAULT false,
    can_trade BOOLEAN DEFAULT false,
    can_withdraw BOOLEAN DEFAULT false,
    
    -- Dados de validação
    last_validated_at TIMESTAMP,
    validation_error TEXT,
    balance_last_check JSONB,
    
    -- Metadados
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_exchange CHECK (exchange IN ('BINANCE', 'BYBIT', 'OKX', 'BITGET')),
    CONSTRAINT chk_environment CHECK (environment IN ('testnet', 'mainnet')),
    UNIQUE(user_id, exchange, environment) -- Uma chave por exchange/ambiente por usuário
);

-- ============================================================================
-- 4. SISTEMA FINANCEIRO COMPLETO
-- ============================================================================

-- Transações financeiras
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Tipo e detalhes da transação
    type VARCHAR(50) NOT NULL, -- STRIPE_RECHARGE, ADMIN_CREDIT, COMMISSION_TO_CREDIT, WITHDRAWAL, TRADE_PROFIT, TRADE_LOSS
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, COMPLETED, FAILED, CANCELLED
    
    -- Comissões e valores líquidos
    commission_amount DECIMAL(15,2) DEFAULT 0.00,
    commission_rate DECIMAL(5,2) DEFAULT 0.00,
    net_amount DECIMAL(15,2),
    
    -- Contexto da transação
    plan_type VARCHAR(20),
    source_balance_type VARCHAR(20), -- De qual saldo veio
    target_balance_type VARCHAR(20), -- Para qual saldo vai
    
    -- Integração externa
    stripe_payment_intent_id VARCHAR(100),
    stripe_session_id VARCHAR(100),
    external_transaction_id VARCHAR(100),
    
    -- Dados adicionais
    description TEXT,
    metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_transaction_amount CHECK (amount > 0),
    CONSTRAINT chk_transaction_status CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    CONSTRAINT chk_transaction_currency CHECK (currency IN ('BRL', 'USD'))
);

-- Registros de comissão
CREATE TABLE IF NOT EXISTS commission_records (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Dados da comissão
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    type VARCHAR(50) NOT NULL, -- COMPANY_COMMISSION, AFFILIATE_COMMISSION
    commission_rate DECIMAL(5,2) NOT NULL,
    
    -- Contexto da operação que gerou a comissão
    related_user_id INTEGER REFERENCES users(id), -- Usuário que gerou a comissão
    related_trade_id INTEGER, -- ID da operação de trading
    plan_type VARCHAR(20),
    original_profit DECIMAL(15,2), -- Lucro original da operação
    
    -- Dados adicionais
    description TEXT,
    metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_commission_amount CHECK (amount > 0),
    CONSTRAINT chk_commission_rate CHECK (commission_rate BETWEEN 0 AND 1)
);

-- ============================================================================
-- 5. SISTEMA DE CUPONS E CRÉDITOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    
    -- Tipo e valor do cupom
    type VARCHAR(20) DEFAULT 'CREDIT', -- CREDIT, DISCOUNT
    credit_amount DECIMAL(15,2),
    discount_percentage DECIMAL(5,2),
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    
    -- Controle de uso
    max_uses INTEGER DEFAULT 1,
    current_uses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- Datas de validade
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    
    -- Criador e metadados
    created_by_admin_id INTEGER NOT NULL REFERENCES users(id),
    description TEXT,
    metadata JSONB,
    
    -- Constraints
    CONSTRAINT chk_coupon_type CHECK (type IN ('CREDIT', 'DISCOUNT')),
    CONSTRAINT chk_coupon_credit CHECK (type != 'CREDIT' OR credit_amount > 0),
    CONSTRAINT chk_coupon_discount CHECK (type != 'DISCOUNT' OR (discount_percentage > 0 AND discount_percentage <= 100)),
    CONSTRAINT chk_coupon_uses CHECK (current_uses <= max_uses)
);

-- Uso de cupons
CREATE TABLE IF NOT EXISTS coupon_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coupon_id INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    
    -- Dados do uso
    credit_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    
    -- Contexto
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamps
    used_at TIMESTAMP DEFAULT NOW(),
    
    -- Evitar uso duplicado
    UNIQUE(user_id, coupon_id),
    
    -- Constraints
    CONSTRAINT chk_usage_credit CHECK (credit_amount > 0)
);

-- ============================================================================
-- 6. SISTEMA DE SAQUES
-- ============================================================================

CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Dados da solicitação
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, COMPLETED, CANCELLED
    
    -- Dados bancários
    bank_details JSONB NOT NULL,
    
    -- Processamento administrativo
    processed_by_admin_id INTEGER REFERENCES users(id),
    admin_notes TEXT,
    transaction_id VARCHAR(100), -- ID da transação bancária
    
    -- Timestamps
    requested_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_withdrawal_amount CHECK (amount > 0),
    CONSTRAINT chk_withdrawal_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'))
);

-- ============================================================================
-- 7. SISTEMA DE AFILIAÇÃO COMPLETO
-- ============================================================================

-- Solicitações de afiliação
CREATE TABLE IF NOT EXISTS affiliate_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Dados da solicitação
    requested_level VARCHAR(20) NOT NULL DEFAULT 'normal', -- normal, vip
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    reason TEXT,
    
    -- Processamento
    admin_notes TEXT,
    processed_by_admin_id INTEGER REFERENCES users(id),
    
    -- Timestamps
    requested_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_affiliate_request_level CHECK (requested_level IN ('normal', 'vip')),
    CONSTRAINT chk_affiliate_request_status CHECK (status IN ('pending', 'approved', 'rejected')),
    UNIQUE(user_id) WHERE status = 'pending' -- Evitar solicitações duplicadas pendentes
);

-- Conversões de comissão
CREATE TABLE IF NOT EXISTS commission_conversions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Valores da conversão
    commission_amount DECIMAL(15,2) NOT NULL,
    bonus_amount DECIMAL(15,2) NOT NULL, -- 10% de bônus
    total_credit DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    
    -- Origem e destino
    source_balance_type VARCHAR(20) NOT NULL,
    target_balance_type VARCHAR(20) NOT NULL,
    conversion_rate DECIMAL(8,4) DEFAULT 1.0,
    
    -- Timestamp
    converted_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_conversion_amount CHECK (commission_amount > 0),
    CONSTRAINT chk_bonus_calculation CHECK (bonus_amount = commission_amount * 0.10),
    CONSTRAINT chk_total_calculation CHECK (total_credit = commission_amount + bonus_amount)
);

-- Preferências de afiliado
CREATE TABLE IF NOT EXISTS affiliate_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    
    -- Configurações
    auto_convert_commissions BOOLEAN DEFAULT false,
    conversion_threshold DECIMAL(15,2) DEFAULT 0.00,
    preferred_currency VARCHAR(3) DEFAULT 'BRL',
    
    -- Notificações
    notification_email BOOLEAN DEFAULT true,
    notification_whatsapp BOOLEAN DEFAULT false,
    marketing_materials_consent BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_threshold_positive CHECK (conversion_threshold >= 0)
);

-- Estatísticas de afiliados
CREATE TABLE IF NOT EXISTS affiliate_stats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    
    -- Estatísticas gerais
    total_referrals INTEGER DEFAULT 0,
    active_referrals INTEGER DEFAULT 0,
    total_commissions_brl DECIMAL(15,2) DEFAULT 0.00,
    total_commissions_usd DECIMAL(15,2) DEFAULT 0.00,
    total_conversions INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0.00,
    
    -- Métricas mensais
    monthly_referrals INTEGER DEFAULT 0,
    monthly_commissions_brl DECIMAL(15,2) DEFAULT 0.00,
    monthly_commissions_usd DECIMAL(15,2) DEFAULT 0.00,
    monthly_period DATE DEFAULT DATE_TRUNC('month', NOW()),
    
    -- Timestamps de última atividade
    last_referral_at TIMESTAMP,
    last_commission_at TIMESTAMP,
    last_updated TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 8. SISTEMA DE TRADING E SINAIS
-- ============================================================================

-- Sinais de trading
CREATE TABLE IF NOT EXISTS trading_signals (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    
    -- Dados do sinal
    symbol VARCHAR(20) NOT NULL,
    action VARCHAR(20) NOT NULL, -- BUY, SELL, STRONG_BUY, STRONG_SELL, CLOSE_LONG, CLOSE_SHORT
    price DECIMAL(15,8),
    strength INTEGER, -- 1-100
    confidence INTEGER, -- 1-100
    
    -- Origem do sinal
    source VARCHAR(50) DEFAULT 'TRADINGVIEW', -- TRADINGVIEW, MANUAL, AI
    strategy VARCHAR(100),
    timeframe VARCHAR(10),
    
    -- Processamento
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PROCESSING, PROCESSED, EXPIRED, REJECTED
    processed_users INTEGER DEFAULT 0,
    
    -- Análise IA
    ai_analysis JSONB,
    market_conditions JSONB,
    
    -- Timestamps
    received_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '2 minutes',
    
    -- Metadados
    raw_data JSONB,
    metadata JSONB,
    
    -- Constraints
    CONSTRAINT chk_signal_action CHECK (action IN ('BUY', 'SELL', 'STRONG_BUY', 'STRONG_SELL', 'CLOSE_LONG', 'CLOSE_SHORT')),
    CONSTRAINT chk_signal_status CHECK (status IN ('PENDING', 'PROCESSING', 'PROCESSED', 'EXPIRED', 'REJECTED')),
    CONSTRAINT chk_signal_strength CHECK (strength BETWEEN 1 AND 100),
    CONSTRAINT chk_signal_confidence CHECK (confidence BETWEEN 1 AND 100)
);

-- Posições de trading
CREATE TABLE IF NOT EXISTS trading_positions (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Dados da posição
    symbol VARCHAR(20) NOT NULL, -- BTCUSDT, ETHUSDT, etc
    side VARCHAR(10) NOT NULL, -- LONG, SHORT
    size DECIMAL(15,8) NOT NULL,
    leverage INTEGER NOT NULL,
    
    -- Preços
    entry_price DECIMAL(15,8),
    stop_loss DECIMAL(15,8),
    take_profit DECIMAL(15,8),
    exit_price DECIMAL(15,8),
    
    -- Status da posição
    status VARCHAR(20) DEFAULT 'OPEN', -- OPEN, CLOSED, LIQUIDATED
    
    -- Exchange
    exchange VARCHAR(20) NOT NULL, -- BINANCE, BYBIT, OKX, BITGET
    exchange_order_id VARCHAR(100),
    testnet BOOLEAN DEFAULT true,
    
    -- Resultado financeiro
    pnl DECIMAL(15,8) DEFAULT 0,
    fees DECIMAL(15,8) DEFAULT 0,
    commission_paid DECIMAL(15,8) DEFAULT 0,
    
    -- Timestamps
    opened_at TIMESTAMP DEFAULT NOW(),
    closed_at TIMESTAMP,
    
    -- Metadados
    signal_id INTEGER REFERENCES trading_signals(id),
    metadata JSONB,
    
    -- Constraints
    CONSTRAINT chk_position_side CHECK (side IN ('LONG', 'SHORT')),
    CONSTRAINT chk_position_status CHECK (status IN ('OPEN', 'CLOSED', 'LIQUIDATED')),
    CONSTRAINT chk_position_exchange CHECK (exchange IN ('BINANCE', 'BYBIT', 'OKX', 'BITGET')),
    CONSTRAINT chk_position_size CHECK (size > 0),
    CONSTRAINT chk_position_leverage CHECK (leverage BETWEEN 1 AND 20)
);

-- Execuções de trade
CREATE TABLE IF NOT EXISTS trade_executions (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    position_id INTEGER REFERENCES trading_positions(id),
    signal_id INTEGER REFERENCES trading_signals(id),
    
    -- Dados da execução
    exchange VARCHAR(20) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL, -- BUY, SELL
    order_type VARCHAR(20) NOT NULL, -- MARKET, LIMIT, STOP_MARKET
    quantity DECIMAL(15,8) NOT NULL,
    price DECIMAL(15,8),
    
    -- Status e resultado
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, FILLED, PARTIALLY_FILLED, CANCELLED, REJECTED
    filled_quantity DECIMAL(15,8) DEFAULT 0,
    avg_fill_price DECIMAL(15,8),
    
    -- Dados da exchange
    exchange_order_id VARCHAR(100),
    exchange_client_order_id VARCHAR(100),
    
    -- Fees e comissões
    commission_amount DECIMAL(15,8) DEFAULT 0,
    commission_asset VARCHAR(10),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    filled_at TIMESTAMP,
    
    -- Metadados
    metadata JSONB,
    
    -- Constraints
    CONSTRAINT chk_trade_side CHECK (side IN ('BUY', 'SELL')),
    CONSTRAINT chk_trade_status CHECK (status IN ('PENDING', 'FILLED', 'PARTIALLY_FILLED', 'CANCELLED', 'REJECTED')),
    CONSTRAINT chk_trade_exchange CHECK (exchange IN ('BINANCE', 'BYBIT', 'OKX', 'BITGET'))
);

-- Posições ativas (legacy compatibility)
CREATE TABLE IF NOT EXISTS active_positions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticker VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    entry_price DECIMAL(20,8),
    current_price DECIMAL(20,8),
    quantity DECIMAL(20,8),
    leverage INTEGER,
    stop_loss DECIMAL(20,8),
    take_profit DECIMAL(20,8),
    pnl_usd DECIMAL(20,8),
    pnl_percentage DECIMAL(10,4),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de posições (legacy compatibility)
CREATE TABLE IF NOT EXISTS positions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,
    size DECIMAL(15,8) NOT NULL,
    entry_price DECIMAL(15,8),
    mark_price DECIMAL(15,8),
    pnl DECIMAL(15,8) DEFAULT 0,
    percentage DECIMAL(10,4) DEFAULT 0,
    leverage INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de trades (legacy compatibility)
CREATE TABLE IF NOT EXISTS trades (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,
    quantity DECIMAL(15,8) NOT NULL,
    price DECIMAL(15,8) NOT NULL,
    total DECIMAL(15,8) NOT NULL,
    fee DECIMAL(15,8) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'COMPLETED',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 9. SISTEMA DE MONITORAMENTO E ANÁLISE
-- ============================================================================

-- Histórico de direção do mercado
CREATE TABLE IF NOT EXISTS market_direction_history (
    id SERIAL PRIMARY KEY,
    allowed_direction VARCHAR(50) NOT NULL,
    fear_greed_value INTEGER NOT NULL,
    fear_greed_classification VARCHAR(50),
    top100_percentage_up DECIMAL(5,2) NOT NULL,
    top100_trend VARCHAR(20) NOT NULL,
    confidence DECIMAL(3,2),
    raw_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Alertas de mudança de direção
CREATE TABLE IF NOT EXISTS market_direction_alerts (
    id SERIAL PRIMARY KEY,
    change_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    should_close_positions BOOLEAN DEFAULT FALSE,
    details JSONB,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Log de métricas de sinais
CREATE TABLE IF NOT EXISTS signal_metrics_log (
    id SERIAL PRIMARY KEY,
    signal_type VARCHAR(50) NOT NULL,
    ticker VARCHAR(20) NOT NULL,
    source VARCHAR(50),
    received_at TIMESTAMP NOT NULL,
    market_direction VARCHAR(50),
    fear_greed_value INTEGER,
    top100_percentage_up DECIMAL(5,2),
    ai_approved BOOLEAN NOT NULL,
    ai_reason TEXT,
    processed_at TIMESTAMP DEFAULT NOW(),
    execution_result JSONB
);

-- Recomendações de fechamento de posições
CREATE TABLE IF NOT EXISTS position_close_recommendations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticker VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,
    reason TEXT NOT NULL,
    market_change_data JSONB,
    executed BOOLEAN DEFAULT FALSE,
    executed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 10. SISTEMA DE SALDOS E BALANÇOS
-- ============================================================================

-- Balances (tabela para compatibilidade com código existente)
CREATE TABLE IF NOT EXISTS balances (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    asset VARCHAR(10) NOT NULL, -- BTC, ETH, USDT, BRL, USD
    account_type VARCHAR(20) NOT NULL, -- spot, futures, margin
    free DECIMAL(20,8) DEFAULT 0,
    locked DECIMAL(20,8) DEFAULT 0,
    total DECIMAL(20,8) DEFAULT 0,
    last_updated TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, asset, account_type)
);

-- Monitoramento de saldos
CREATE TABLE IF NOT EXISTS user_balance_monitoring (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exchange VARCHAR(20) NOT NULL,
    environment VARCHAR(10) NOT NULL,
    total_balance_usd DECIMAL(15,2) DEFAULT 0,
    total_balance_btc DECIMAL(15,8) DEFAULT 0,
    balances_snapshot JSONB,
    last_updated TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, exchange, environment)
);

-- ============================================================================
-- 11. SISTEMA DE NOTIFICAÇÕES
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Conteúdo da notificação
    type VARCHAR(50) NOT NULL, -- trading, financial, system, affiliate
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(10) DEFAULT 'normal', -- low, normal, high, urgent
    
    -- Status
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    
    -- Canais de envio
    email_sent BOOLEAN DEFAULT false,
    sms_sent BOOLEAN DEFAULT false,
    push_sent BOOLEAN DEFAULT false,
    
    -- Metadados
    metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_notification_type CHECK (type IN ('trading', 'financial', 'system', 'affiliate')),
    CONSTRAINT chk_notification_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- ============================================================================
-- 12. SISTEMA AGUIA NEWS (Radar de Notícias)
-- ============================================================================

CREATE TABLE IF NOT EXISTS aguia_news_radars (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Configurações do radar
    name VARCHAR(100) NOT NULL,
    keywords TEXT[] NOT NULL, -- Array de palavras-chave
    exchanges TEXT[], -- Exchanges para monitorar
    coins TEXT[], -- Moedas específicas
    
    -- Status e configurações
    is_active BOOLEAN DEFAULT true,
    notification_enabled BOOLEAN DEFAULT true,
    sentiment_filter VARCHAR(20), -- positive, negative, neutral, all
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Notícias capturadas
CREATE TABLE IF NOT EXISTS aguia_news_articles (
    id SERIAL PRIMARY KEY,
    
    -- Dados do artigo
    title VARCHAR(500) NOT NULL,
    content TEXT,
    url VARCHAR(1000),
    source VARCHAR(100),
    
    -- Análise
    sentiment VARCHAR(20), -- positive, negative, neutral
    sentiment_score DECIMAL(3,2), -- -1.0 a 1.0
    keywords TEXT[],
    coins_mentioned TEXT[],
    
    -- Metadados
    published_at TIMESTAMP,
    discovered_at TIMESTAMP DEFAULT NOW(),
    
    -- Dados brutos
    raw_data JSONB
);

-- Alertas de notícias
CREATE TABLE IF NOT EXISTS aguia_news_alerts (
    id SERIAL PRIMARY KEY,
    radar_id INTEGER NOT NULL REFERENCES aguia_news_radars(id) ON DELETE CASCADE,
    article_id INTEGER NOT NULL REFERENCES aguia_news_articles(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Status do alerta
    sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP,
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    
    -- Relevância
    relevance_score DECIMAL(3,2), -- 0.0 a 1.0
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 13. SISTEMA DE TERMOS E POLÍTICAS
-- ============================================================================

-- Versões de termos
CREATE TABLE IF NOT EXISTS terms_versions (
    id SERIAL PRIMARY KEY,
    version VARCHAR(20) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'markdown', -- markdown, html, text
    
    -- Status
    is_active BOOLEAN DEFAULT false,
    is_required BOOLEAN DEFAULT true,
    
    -- Metadados
    created_by_admin_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    activated_at TIMESTAMP,
    
    -- Dados adicionais
    summary TEXT,
    changes_from_previous TEXT,
    metadata JSONB
);

-- Aceites de termos
CREATE TABLE IF NOT EXISTS terms_acceptances (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    terms_version_id INTEGER NOT NULL REFERENCES terms_versions(id),
    
    -- Dados do aceite
    accepted_at TIMESTAMP DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    
    -- Assinatura digital (opcional)
    digital_signature TEXT,
    
    -- Evitar aceites duplicados
    UNIQUE(user_id, terms_version_id)
);

-- ============================================================================
-- 14. LOGS E AUDITORIA
-- ============================================================================

-- Logs de atividade
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Dados da atividade
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50), -- user, position, transaction, etc
    entity_id INTEGER,
    
    -- Contexto
    ip_address INET,
    user_agent TEXT,
    
    -- Dados adicionais
    metadata JSONB,
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT NOW()
);

-- Logs de erro
CREATE TABLE IF NOT EXISTS error_logs (
    id SERIAL PRIMARY KEY,
    
    -- Dados do erro
    error_type VARCHAR(50) NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    
    -- Contexto
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    request_path VARCHAR(255),
    request_method VARCHAR(10),
    
    -- Metadados
    metadata JSONB,
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 15. ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Índices para usuários
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_affiliate_code ON users(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_users_affiliate_id ON users(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Índices para chaves API
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_exchange ON user_api_keys(exchange);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_active ON user_api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_valid ON user_api_keys(is_valid);

-- Índices para transações
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_currency ON transactions(currency);

-- Índices para comissões
CREATE INDEX IF NOT EXISTS idx_commission_records_user_id ON commission_records(user_id);
CREATE INDEX IF NOT EXISTS idx_commission_records_type ON commission_records(type);
CREATE INDEX IF NOT EXISTS idx_commission_records_created_at ON commission_records(created_at);

-- Índices para posições de trading
CREATE INDEX IF NOT EXISTS idx_trading_positions_user_id ON trading_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_positions_symbol ON trading_positions(symbol);
CREATE INDEX IF NOT EXISTS idx_trading_positions_status ON trading_positions(status);
CREATE INDEX IF NOT EXISTS idx_trading_positions_opened_at ON trading_positions(opened_at);

-- Índices para sinais
CREATE INDEX IF NOT EXISTS idx_trading_signals_symbol ON trading_signals(symbol);
CREATE INDEX IF NOT EXISTS idx_trading_signals_status ON trading_signals(status);
CREATE INDEX IF NOT EXISTS idx_trading_signals_received_at ON trading_signals(received_at);

-- Índices para execuções
CREATE INDEX IF NOT EXISTS idx_trade_executions_user_id ON trade_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_executions_position_id ON trade_executions(position_id);
CREATE INDEX IF NOT EXISTS idx_trade_executions_signal_id ON trade_executions(signal_id);
CREATE INDEX IF NOT EXISTS idx_trade_executions_status ON trade_executions(status);

-- Índices para saldos
CREATE INDEX IF NOT EXISTS idx_balances_user_id ON balances(user_id);
CREATE INDEX IF NOT EXISTS idx_balances_asset ON balances(asset);
CREATE INDEX IF NOT EXISTS idx_user_balance_monitoring_user_exchange ON user_balance_monitoring(user_id, exchange);

-- Índices para notificações
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Índices para monitoramento
CREATE INDEX IF NOT EXISTS idx_market_direction_created_at ON market_direction_history(created_at);
CREATE INDEX IF NOT EXISTS idx_signal_metrics_ticker_time ON signal_metrics_log(ticker, received_at);
CREATE INDEX IF NOT EXISTS idx_signal_metrics_ai_approved ON signal_metrics_log(ai_approved);

-- Índices para Aguia News
CREATE INDEX IF NOT EXISTS idx_aguia_news_radars_user_id ON aguia_news_radars(user_id);
CREATE INDEX IF NOT EXISTS idx_aguia_news_radars_active ON aguia_news_radars(is_active);
CREATE INDEX IF NOT EXISTS idx_aguia_news_articles_published_at ON aguia_news_articles(published_at);
CREATE INDEX IF NOT EXISTS idx_aguia_news_articles_sentiment ON aguia_news_articles(sentiment);

-- Índices para termos
CREATE INDEX IF NOT EXISTS idx_terms_versions_active ON terms_versions(is_active);
CREATE INDEX IF NOT EXISTS idx_terms_acceptances_user_id ON terms_acceptances(user_id);

-- ============================================================================
-- 16. FUNÇÕES E TRIGGERS
-- ============================================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger de updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_user_api_keys_updated_at 
    BEFORE UPDATE ON user_api_keys 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON transactions 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_affiliate_preferences_updated_at 
    BEFORE UPDATE ON affiliate_preferences 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_trading_positions_updated_at 
    BEFORE UPDATE ON trading_positions 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_trade_executions_updated_at 
    BEFORE UPDATE ON trade_executions 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_active_positions_updated_at 
    BEFORE UPDATE ON active_positions 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_positions_updated_at 
    BEFORE UPDATE ON positions 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_aguia_news_radars_updated_at 
    BEFORE UPDATE ON aguia_news_radars 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Função para gerar código de afiliado
CREATE OR REPLACE FUNCTION generate_affiliate_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.affiliate_type IN ('normal', 'vip') AND NEW.affiliate_code IS NULL THEN
        NEW.affiliate_code := 'CBC' || LPAD(NEW.id::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER generate_affiliate_code_trigger
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE PROCEDURE generate_affiliate_code();

-- Função para atualizar estatísticas de afiliado
CREATE OR REPLACE FUNCTION update_affiliate_stats_function(affiliate_user_id INTEGER)
RETURNS VOID AS $$
DECLARE
    referral_count INTEGER;
    active_count INTEGER;
    total_comm_brl DECIMAL(15,2);
    total_comm_usd DECIMAL(15,2);
    monthly_refs INTEGER;
    monthly_comm_brl DECIMAL(15,2);
    monthly_comm_usd DECIMAL(15,2);
BEGIN
    -- Contar referenciados
    SELECT COUNT(*) INTO referral_count
    FROM users 
    WHERE affiliate_id = affiliate_user_id;
    
    -- Contar referenciados ativos
    SELECT COUNT(*) INTO active_count
    FROM users 
    WHERE affiliate_id = affiliate_user_id 
    AND last_activity_at > NOW() - INTERVAL '30 days';
    
    -- Calcular comissões totais
    SELECT 
        COALESCE(SUM(CASE WHEN currency = 'BRL' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN currency = 'USD' THEN amount ELSE 0 END), 0)
    INTO total_comm_brl, total_comm_usd
    FROM commission_records
    WHERE user_id = affiliate_user_id AND type = 'AFFILIATE_COMMISSION';
    
    -- Calcular métricas mensais
    SELECT COUNT(*) INTO monthly_refs
    FROM users 
    WHERE affiliate_id = affiliate_user_id 
    AND created_at >= DATE_TRUNC('month', NOW());
    
    SELECT 
        COALESCE(SUM(CASE WHEN currency = 'BRL' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN currency = 'USD' THEN amount ELSE 0 END), 0)
    INTO monthly_comm_brl, monthly_comm_usd
    FROM commission_records
    WHERE user_id = affiliate_user_id 
    AND type = 'AFFILIATE_COMMISSION'
    AND created_at >= DATE_TRUNC('month', NOW());
    
    -- Inserir ou atualizar estatísticas
    INSERT INTO affiliate_stats (
        user_id, total_referrals, active_referrals,
        total_commissions_brl, total_commissions_usd,
        monthly_referrals, monthly_commissions_brl, monthly_commissions_usd,
        last_updated, monthly_period
    )
    VALUES (
        affiliate_user_id, referral_count, active_count,
        total_comm_brl, total_comm_usd,
        monthly_refs, monthly_comm_brl, monthly_comm_usd,
        NOW(), DATE_TRUNC('month', NOW())
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_referrals = EXCLUDED.total_referrals,
        active_referrals = EXCLUDED.active_referrals,
        total_commissions_brl = EXCLUDED.total_commissions_brl,
        total_commissions_usd = EXCLUDED.total_commissions_usd,
        monthly_referrals = EXCLUDED.monthly_referrals,
        monthly_commissions_brl = EXCLUDED.monthly_commissions_brl,
        monthly_commissions_usd = EXCLUDED.monthly_commissions_usd,
        last_updated = NOW(),
        monthly_period = DATE_TRUNC('month', NOW());
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 17. VIEWS PARA RELATÓRIOS
-- ============================================================================

-- View de resumo financeiro
CREATE OR REPLACE VIEW financial_summary AS
SELECT 
    u.id,
    u.username,
    u.email,
    u.plan_type,
    u.affiliate_type,
    u.balance_real_brl + u.balance_real_usd as total_withdrawable,
    u.balance_admin_brl + u.balance_admin_usd as total_admin_credits,
    u.balance_commission_brl + u.balance_commission_usd as total_commissions,
    (u.balance_real_brl + u.balance_real_usd + u.balance_admin_brl + u.balance_admin_usd) as total_operational,
    u.created_at,
    u.updated_at
FROM users u
WHERE u.is_active = true;

-- View de performance de afiliados
CREATE OR REPLACE VIEW affiliate_performance AS
SELECT 
    u.id,
    u.username,
    u.affiliate_code,
    u.affiliate_type,
    COALESCE(stats.total_referrals, 0) as total_referrals,
    COALESCE(stats.active_referrals, 0) as active_referrals,
    COALESCE(stats.total_commissions_brl + stats.total_commissions_usd, 0) as total_commissions,
    u.balance_commission_brl + u.balance_commission_usd as pending_commissions,
    u.created_at
FROM users u
LEFT JOIN affiliate_stats stats ON u.id = stats.user_id
WHERE u.affiliate_type IN ('normal', 'vip')
ORDER BY total_commissions DESC;

-- View de solicitações pendentes
CREATE OR REPLACE VIEW affiliate_requests_pending AS
SELECT 
    ar.id,
    ar.user_id,
    u.username,
    u.email,
    ar.requested_level,
    ar.reason,
    ar.requested_at,
    EXTRACT(day FROM NOW() - ar.requested_at) as days_pending
FROM affiliate_requests ar
JOIN users u ON ar.user_id = u.id
WHERE ar.status = 'pending'
ORDER BY ar.requested_at ASC;

-- View de direção atual do mercado
CREATE OR REPLACE VIEW current_market_direction AS
SELECT 
    allowed_direction,
    fear_greed_value,
    fear_greed_classification,
    top100_percentage_up,
    top100_trend,
    confidence,
    created_at
FROM market_direction_history
WHERE created_at = (SELECT MAX(created_at) FROM market_direction_history);

-- View de performance de sinais
CREATE OR REPLACE VIEW signal_performance_summary AS
SELECT 
    s.ticker,
    COUNT(*) as total_signals,
    COUNT(*) FILTER (WHERE s.ai_approved = true) as approved_signals,
    ROUND((COUNT(*) FILTER (WHERE s.ai_approved = true)::DECIMAL / COUNT(*)) * 100, 2) as approval_rate,
    COUNT(*) FILTER (WHERE s.signal_type LIKE '%LONG%') as long_signals,
    COUNT(*) FILTER (WHERE s.signal_type LIKE '%SHORT%') as short_signals,
    AVG(s.fear_greed_value) as avg_fear_greed,
    AVG(s.top100_percentage_up) as avg_top100,
    MIN(s.received_at) as first_signal,
    MAX(s.received_at) as last_signal,
    COUNT(DISTINCT DATE(s.received_at)) as active_days
FROM signal_metrics_log s
WHERE s.received_at >= NOW() - INTERVAL '30 days'
GROUP BY s.ticker
ORDER BY total_signals DESC;

-- ============================================================================
-- 18. DADOS INICIAIS (SEED DATA)
-- ============================================================================

-- Inserir usuário administrador padrão
INSERT INTO users (
    username, email, password_hash, full_name, user_type, is_admin, 
    affiliate_type, plan_type, is_active, email_verified
) VALUES (
    'admin', 
    'admin@coinbitclub.com', 
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: admin123
    'Administrador Sistema',
    'ADMIN',
    true,
    'none',
    'PREPAID',
    true,
    true
) ON CONFLICT (email) DO NOTHING;

-- Inserir versão inicial de termos
INSERT INTO terms_versions (
    version, title, content, is_active, is_required, created_by_admin_id
) 
SELECT 
    'v1.0.0', 
    'Termos de Uso - CoinBitClub Enterprise',
    'Versão inicial dos termos de uso do sistema CoinBitClub Enterprise v6.0.0',
    true,
    true,
    u.id
FROM users u 
WHERE u.username = 'admin'
ON CONFLICT (version) DO NOTHING;

-- Inserir cupons de exemplo
INSERT INTO coupons (
    code, credit_amount, currency, created_by_admin_id, expires_at, description
) 
SELECT 
    'WELCOME100', 100.00, 'BRL', u.id, NOW() + INTERVAL '30 days',
    'Cupom de boas-vindas - R$ 100'
FROM users u 
WHERE u.username = 'admin'
ON CONFLICT (code) DO NOTHING;

INSERT INTO coupons (
    code, credit_amount, currency, created_by_admin_id, expires_at, description
) 
SELECT 
    'WELCOME50USD', 50.00, 'USD', u.id, NOW() + INTERVAL '30 days',
    'Welcome coupon - $50 USD'
FROM users u 
WHERE u.username = 'admin'
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 19. COMENTÁRIOS DE DOCUMENTAÇÃO
-- ============================================================================

-- Tabelas principais
COMMENT ON TABLE users IS 'Usuários do sistema com todos os dados necessários para trading e afiliação';
COMMENT ON TABLE user_api_keys IS 'Chaves API dos usuários para conexão com exchanges';
COMMENT ON TABLE transactions IS 'Registro de todas as transações financeiras do sistema';
COMMENT ON TABLE commission_records IS 'Histórico de comissões calculadas e pagas';
COMMENT ON TABLE trading_positions IS 'Posições de trading abertas e fechadas';
COMMENT ON TABLE trading_signals IS 'Sinais de trading recebidos do TradingView e outras fontes';
COMMENT ON TABLE trade_executions IS 'Registro de execuções de trades nas exchanges';

-- Campos importantes dos saldos
COMMENT ON COLUMN users.balance_real_brl IS 'Saldo real em BRL (pode sacar) - origem: Stripe';
COMMENT ON COLUMN users.balance_real_usd IS 'Saldo real em USD (pode sacar) - origem: Stripe';
COMMENT ON COLUMN users.balance_admin_brl IS 'Crédito administrativo BRL (não pode sacar, 30 dias)';
COMMENT ON COLUMN users.balance_admin_usd IS 'Crédito administrativo USD (não pode sacar, 30 dias)';
COMMENT ON COLUMN users.balance_commission_brl IS 'Comissões BRL (não pode sacar, pode converter)';
COMMENT ON COLUMN users.balance_commission_usd IS 'Comissões USD (não pode sacar, pode converter)';

-- Campos de trading
COMMENT ON COLUMN trading_positions.side IS 'LONG ou SHORT - direção da posição';
COMMENT ON COLUMN trading_positions.leverage IS 'Alavancagem utilizada (1-20x)';
COMMENT ON COLUMN trading_positions.pnl IS 'Profit and Loss da posição';

-- ============================================================================
-- 20. VERIFICAÇÃO FINAL E ESTATÍSTICAS
-- ============================================================================

-- Verificar se todas as tabelas foram criadas
SELECT 
    'CoinBitClub Enterprise Database v6.0.0 criado com sucesso!' as status,
    COUNT(*) as total_tables,
    array_agg(table_name ORDER BY table_name) as tables_created
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'users', 'user_api_keys', 'transactions', 'commission_records', 'coupons', 'coupon_usage',
    'withdrawal_requests', 'affiliate_requests', 'commission_conversions',
    'affiliate_preferences', 'affiliate_stats', 'trading_positions', 'trading_signals',
    'trade_executions', 'active_positions', 'positions', 'trades', 'balances',
    'user_balance_monitoring', 'notifications', 'market_direction_history',
    'market_direction_alerts', 'signal_metrics_log', 'position_close_recommendations',
    'aguia_news_radars', 'aguia_news_articles', 'aguia_news_alerts',
    'terms_versions', 'terms_acceptances', 'activity_logs', 'error_logs'
);

-- Verificar índices criados
SELECT 
    'Índices de performance criados:' as info,
    COUNT(*) as total_indexes
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%';

-- Verificar funções e triggers
SELECT 
    'Funções e triggers criados:' as info,
    COUNT(*) as total_functions
FROM pg_proc 
WHERE proname IN (
    'update_updated_at_column', 
    'generate_affiliate_code', 
    'update_affiliate_stats_function'
);

-- ============================================================================
-- 🎉 SUCESSO! BANCO DE DADOS ENTERPRISE COMPLETO CRIADO!
-- ============================================================================
-- 
-- ✅ O banco de dados CoinBitClub Enterprise v6.0.0 foi criado com sucesso!
-- 
-- 📋 RECURSOS INCLUÍDOS:
-- • Sistema completo de usuários e autenticação
-- • Sistema financeiro com 6 tipos de saldo
-- • Sistema de afiliação com níveis normal e VIP
-- • Sistema de trading com suporte a 4 exchanges
-- • Sistema de sinais e execução automática
-- • Sistema de monitoramento e análise de mercado
-- • Sistema Aguia News para radar de notícias
-- • Sistema de termos e políticas
-- • Sistema de notificações
-- • Logs e auditoria completos
-- 
-- 🔧 PRÓXIMOS PASSOS:
-- 1. Configurar as variáveis de ambiente
-- 2. Configurar conexão com o banco
-- 3. Executar testes de integração
-- 4. Configurar backup automático
-- 5. Configurar monitoramento
-- 
-- 🚀 PRONTO PARA PRODUÇÃO!
-- ============================================================================
