# CoinBitClub Enterprise - Database Structure Documentation

**Generated:** October 19, 2025  
**Database:** coinbitclub_enterprise_6zw9  
**Host:** dpg-d3inu56r433s73c7ncug-a.oregon-postgres.render.com (Render.com)  
**Version:** PostgreSQL (Enterprise v6.0.0)

---

## Table of Contents

1. [Overview](#overview)
2. [Core Tables](#core-tables)
3. [Financial System](#financial-system)
4. [Trading System](#trading-system)
5. [Affiliate System](#affiliate-system)
6. [Monitoring & Analytics](#monitoring--analytics)
7. [Notifications & Communications](#notifications--communications)
8. [Audit & Logging](#audit--logging)
9. [Database Relationships](#database-relationships)
10. [Indexes & Performance](#indexes--performance)
11. [Functions & Triggers](#functions--triggers)

---

## Overview

The CoinBitClub Enterprise database is a comprehensive PostgreSQL database designed for a sophisticated cryptocurrency trading platform with multi-exchange support, affiliate marketing, and advanced financial management.

### Key Features:
- **Multi-Currency Support:** BRL and USD
- **6 Balance Types:** Real, Admin Credits, Commissions (BRL/USD)
- **4 Exchange Integrations:** Binance, Bybit, OKX, Bitget
- **Advanced Affiliate System:** Normal and VIP tiers
- **AI-Powered Trading Signals:** TradingView integration with AI analysis
- **Comprehensive Audit Trail:** Activity logs and error tracking

---

## Core Tables

### 1. `users` - Main User Table

**Purpose:** Central table storing all user information, authentication, financial balances, and trading configuration.

**Key Columns:**
```sql
id                         SERIAL PRIMARY KEY
uuid                       UUID (unique identifier)
username                   VARCHAR(50) UNIQUE
email                      VARCHAR(255) UNIQUE
password_hash              VARCHAR(255)

-- Personal Information
full_name                  VARCHAR(255)
phone                      VARCHAR(20)
country                    VARCHAR(3) DEFAULT 'LT'
language                   VARCHAR(5) DEFAULT 'pt-BR'

-- Authentication & Security
email_verified             BOOLEAN DEFAULT false
phone_verified             BOOLEAN DEFAULT false
two_factor_enabled         BOOLEAN DEFAULT false
two_factor_secret          VARCHAR(32)

-- User Type & Permissions
user_type                  VARCHAR(20) DEFAULT 'USER'
                          -- Values: ADMIN, GESTOR, OPERADOR, AFFILIATE_VIP, AFFILIATE, USER
is_admin                   BOOLEAN DEFAULT false
is_active                  BOOLEAN DEFAULT true

-- Financial Balances (6 types)
balance_real_brl           DECIMAL(15,2) DEFAULT 0.00  -- Withdrawable BRL
balance_real_usd           DECIMAL(15,2) DEFAULT 0.00  -- Withdrawable USD
balance_admin_brl          DECIMAL(15,2) DEFAULT 0.00  -- Admin credit BRL (30 days)
balance_admin_usd          DECIMAL(15,2) DEFAULT 0.00  -- Admin credit USD (30 days)
balance_commission_brl     DECIMAL(15,2) DEFAULT 0.00  -- Commission BRL (convertible)
balance_commission_usd     DECIMAL(15,2) DEFAULT 0.00  -- Commission USD (convertible)

-- Subscription & Plans
plan_type                  VARCHAR(20) DEFAULT 'MONTHLY'
                          -- Values: MONTHLY, PREPAID, NONE
subscription_status        VARCHAR(20) DEFAULT 'inactive'
                          -- Values: active, inactive, expired, cancelled
subscription_start_date    TIMESTAMP
subscription_end_date      TIMESTAMP

-- Affiliate System
affiliate_type             VARCHAR(20) DEFAULT 'none'
                          -- Values: none, normal, vip
affiliate_code             VARCHAR(20) UNIQUE
affiliate_id               INTEGER REFERENCES users(id)

-- Stripe Integration
stripe_customer_id         VARCHAR(100)
stripe_subscription_id     VARCHAR(100)

-- Trading Configuration
trading_enabled            BOOLEAN DEFAULT false
max_open_positions         INTEGER DEFAULT 2
max_position_size          DECIMAL(5,2) DEFAULT 0.30  -- 30% of balance
default_leverage           INTEGER DEFAULT 5
default_stop_loss_multiplier   DECIMAL(3,1) DEFAULT 2.0
default_take_profit_multiplier DECIMAL(3,1) DEFAULT 3.0
risk_level                 VARCHAR(10) DEFAULT 'MEDIUM'
                          -- Values: LOW, MEDIUM, HIGH

-- Exchange API Keys (Legacy - moved to user_api_keys)
binance_api_key            TEXT
binance_secret_key         TEXT
binance_testnet            BOOLEAN DEFAULT true
bybit_api_key              TEXT
bybit_secret_key           TEXT
bybit_testnet              BOOLEAN DEFAULT true
okx_api_key                TEXT
okx_secret_key             TEXT
okx_passphrase             TEXT
bitget_api_key             TEXT
bitget_secret_key          TEXT
bitget_passphrase          TEXT

-- Banking Information
bank_name                  VARCHAR(100)
bank_account               VARCHAR(50)
bank_agency                VARCHAR(20)
bank_document              VARCHAR(20)  -- CPF/CNPJ
pix_key                    VARCHAR(100)

-- Security & Session
last_login_at              TIMESTAMP
last_activity_at           TIMESTAMP
login_attempts             INTEGER DEFAULT 0
locked_until               TIMESTAMP
password_reset_token       VARCHAR(100)
password_reset_expires     TIMESTAMP

-- Metadata
ip_address                 INET
user_agent                 TEXT
registration_source        VARCHAR(50) DEFAULT 'website'

-- Timestamps
created_at                 TIMESTAMP DEFAULT NOW()
updated_at                 TIMESTAMP DEFAULT NOW()
```

**Constraints:**
- Email and username must be unique
- Balances must be positive (>= 0)
- Leverage must be between 1 and 20
- Position size must be between 10% and 50%
- Risk level must be LOW, MEDIUM, or HIGH

---

### 2. `user_api_keys` - Exchange API Keys Management

**Purpose:** Secure storage and management of user API keys for multiple exchanges.

**Key Columns:**
```sql
id                         SERIAL PRIMARY KEY
user_id                    INTEGER REFERENCES users(id) ON DELETE CASCADE
exchange                   VARCHAR(20) NOT NULL
                          -- Values: BINANCE, BYBIT, OKX, BITGET
api_key                    TEXT NOT NULL
api_secret                 TEXT NOT NULL
api_passphrase             TEXT  -- For OKX and Bitget
environment                VARCHAR(10) DEFAULT 'testnet'
                          -- Values: testnet, mainnet
is_active                  BOOLEAN DEFAULT true
is_valid                   BOOLEAN DEFAULT false

-- Verified Permissions
can_read                   BOOLEAN DEFAULT false
can_trade                  BOOLEAN DEFAULT false
can_withdraw               BOOLEAN DEFAULT false

-- Validation Data
last_validated_at          TIMESTAMP
validation_error           TEXT
balance_last_check         JSONB

created_at                 TIMESTAMP DEFAULT NOW()
updated_at                 TIMESTAMP DEFAULT NOW()
```

**Unique Constraint:** One key per user, per exchange, per environment

---

## Financial System

### 3. `transactions` - Financial Transactions

**Purpose:** Record all financial transactions including deposits, withdrawals, and trading profits/losses.

**Key Columns:**
```sql
id                         SERIAL PRIMARY KEY
uuid                       UUID
user_id                    INTEGER REFERENCES users(id)
type                       VARCHAR(50) NOT NULL
                          -- Values: STRIPE_RECHARGE, ADMIN_CREDIT, 
                          --         COMMISSION_TO_CREDIT, WITHDRAWAL,
                          --         TRADE_PROFIT, TRADE_LOSS
amount                     DECIMAL(15,2) NOT NULL
currency                   VARCHAR(3) DEFAULT 'BRL'
                          -- Values: BRL, USD
status                     VARCHAR(20) DEFAULT 'PENDING'
                          -- Values: PENDING, COMPLETED, FAILED, CANCELLED

-- Commission Details
commission_amount          DECIMAL(15,2) DEFAULT 0.00
commission_rate            DECIMAL(5,2) DEFAULT 0.00
net_amount                 DECIMAL(15,2)

-- Context
plan_type                  VARCHAR(20)
source_balance_type        VARCHAR(20)
target_balance_type        VARCHAR(20)

-- External Integration
stripe_payment_intent_id   VARCHAR(100)
stripe_session_id          VARCHAR(100)
external_transaction_id    VARCHAR(100)

-- Additional Data
description                TEXT
metadata                   JSONB

-- Timestamps
created_at                 TIMESTAMP DEFAULT NOW()
updated_at                 TIMESTAMP DEFAULT NOW()
processed_at               TIMESTAMP
```

---

### 4. `commission_records` - Commission Tracking

**Purpose:** Track all commissions generated from trading and affiliate activities.

**Key Columns:**
```sql
id                         SERIAL PRIMARY KEY
uuid                       UUID
user_id                    INTEGER REFERENCES users(id)
amount                     DECIMAL(15,2) NOT NULL
currency                   VARCHAR(3) DEFAULT 'BRL'
type                       VARCHAR(50) NOT NULL
                          -- Values: COMPANY_COMMISSION, AFFILIATE_COMMISSION
commission_rate            DECIMAL(5,2) NOT NULL

-- Context
related_user_id            INTEGER REFERENCES users(id)
related_trade_id           INTEGER
plan_type                  VARCHAR(20)
original_profit            DECIMAL(15,2)

description                TEXT
metadata                   JSONB
created_at                 TIMESTAMP DEFAULT NOW()
```

---

### 5. `coupons` - Promotional Coupons

**Purpose:** Manage promotional coupons for credits and discounts.

**Key Columns:**
```sql
id                         SERIAL PRIMARY KEY
code                       VARCHAR(50) UNIQUE NOT NULL
type                       VARCHAR(20) DEFAULT 'CREDIT'
                          -- Values: CREDIT, DISCOUNT
credit_amount              DECIMAL(15,2)
discount_percentage        DECIMAL(5,2)
currency                   VARCHAR(3) DEFAULT 'BRL'

max_uses                   INTEGER DEFAULT 1
current_uses               INTEGER DEFAULT 0
is_active                  BOOLEAN DEFAULT true

created_at                 TIMESTAMP DEFAULT NOW()
expires_at                 TIMESTAMP NOT NULL

created_by_admin_id        INTEGER REFERENCES users(id)
description                TEXT
metadata                   JSONB
```

---

### 6. `coupon_usage` - Coupon Redemption History

**Purpose:** Track coupon usage by users.

**Key Columns:**
```sql
id                         SERIAL PRIMARY KEY
user_id                    INTEGER REFERENCES users(id)
coupon_id                  INTEGER REFERENCES coupons(id)
credit_amount              DECIMAL(15,2) NOT NULL
currency                   VARCHAR(3) NOT NULL

ip_address                 INET
user_agent                 TEXT
used_at                    TIMESTAMP DEFAULT NOW()

UNIQUE(user_id, coupon_id)  -- Prevent duplicate usage
```

---

### 7. `withdrawal_requests` - Withdrawal Management

**Purpose:** Manage user withdrawal requests and their approval process.

**Key Columns:**
```sql
id                         SERIAL PRIMARY KEY
uuid                       UUID
user_id                    INTEGER REFERENCES users(id)
amount                     DECIMAL(15,2) NOT NULL
currency                   VARCHAR(3) DEFAULT 'BRL'
status                     VARCHAR(20) DEFAULT 'PENDING'
                          -- Values: PENDING, APPROVED, REJECTED, 
                          --         COMPLETED, CANCELLED

bank_details               JSONB NOT NULL

-- Admin Processing
processed_by_admin_id      INTEGER REFERENCES users(id)
admin_notes                TEXT
transaction_id             VARCHAR(100)

-- Timestamps
requested_at               TIMESTAMP DEFAULT NOW()
processed_at               TIMESTAMP
completed_at               TIMESTAMP
```

---

## Trading System

### 8. `trading_signals` - Trading Signals

**Purpose:** Store incoming trading signals from TradingView and other sources.

**Key Columns:**
```sql
id                         SERIAL PRIMARY KEY
uuid                       UUID
symbol                     VARCHAR(20) NOT NULL  -- BTCUSDT, ETHUSDT, etc
action                     VARCHAR(20) NOT NULL
                          -- Values: BUY, SELL, STRONG_BUY, STRONG_SELL,
                          --         CLOSE_LONG, CLOSE_SHORT
price                      DECIMAL(15,8)
strength                   INTEGER  -- 1-100
confidence                 INTEGER  -- 1-100

-- Signal Origin
source                     VARCHAR(50) DEFAULT 'TRADINGVIEW'
                          -- Values: TRADINGVIEW, MANUAL, AI
strategy                   VARCHAR(100)
timeframe                  VARCHAR(10)

-- Processamento
status                     VARCHAR(20) DEFAULT 'PENDING'
                          -- Values: PENDING, PROCESSING, PROCESSED, 
                          --         EXPIRED, REJECTED
processed_users            INTEGER DEFAULT 0

-- AI Analysis
ai_analysis                JSONB
market_conditions          JSONB

-- Timestamps
received_at                TIMESTAMP DEFAULT NOW()
processed_at               TIMESTAMP
expires_at                 TIMESTAMP DEFAULT NOW() + INTERVAL '2 minutes'

-- Raw Data
raw_data                   JSONB
metadata                   JSONB
```

---

### 9. `trading_positions` - Trading Positions

**Purpose:** Track all trading positions (open and closed).

**Key Columns:**
```sql
id                         SERIAL PRIMARY KEY
uuid                       UUID
user_id                    INTEGER REFERENCES users(id)

-- Position Details
symbol                     VARCHAR(20) NOT NULL
side                       VARCHAR(10) NOT NULL
                          -- Values: LONG, SHORT
size                       DECIMAL(15,8) NOT NULL
leverage                   INTEGER NOT NULL

-- Prices
entry_price                DECIMAL(15,8)
stop_loss                  DECIMAL(15,8)
take_profit                DECIMAL(15,8)
exit_price                 DECIMAL(15,8)

-- Status
status                     VARCHAR(20) DEFAULT 'OPEN'
                          -- Values: OPEN, CLOSED, LIQUIDATED

-- Exchange Info
exchange                   VARCHAR(20) NOT NULL
                          -- Values: BINANCE, BYBIT, OKX, BITGET
exchange_order_id          VARCHAR(100)
testnet                    BOOLEAN DEFAULT true

-- Financial Results
pnl                        DECIMAL(15,8) DEFAULT 0
fees                       DECIMAL(15,8) DEFAULT 0
commission_paid            DECIMAL(15,8) DEFAULT 0

-- Timestamps
opened_at                  TIMESTAMP DEFAULT NOW()
closed_at                  TIMESTAMP

-- References
signal_id                  INTEGER REFERENCES trading_signals(id)
metadata                   JSONB
```

---

### 10. `trade_executions` - Trade Execution Records

**Purpose:** Detailed record of every trade execution on exchanges.

**Key Columns:**
```sql
id                         SERIAL PRIMARY KEY
uuid                       UUID
user_id                    INTEGER REFERENCES users(id)
position_id                INTEGER REFERENCES trading_positions(id)
signal_id                  INTEGER REFERENCES trading_signals(id)

-- Execution Details
exchange                   VARCHAR(20) NOT NULL
symbol                     VARCHAR(20) NOT NULL
side                       VARCHAR(10) NOT NULL
                          -- Values: BUY, SELL
order_type                 VARCHAR(20) NOT NULL
                          -- Values: MARKET, LIMIT, STOP_MARKET
quantity                   DECIMAL(15,8) NOT NULL
price                      DECIMAL(15,8)

-- Status & Results
status                     VARCHAR(20) DEFAULT 'PENDING'
                          -- Values: PENDING, FILLED, PARTIALLY_FILLED,
                          --         CANCELLED, REJECTED
filled_quantity            DECIMAL(15,8) DEFAULT 0
avg_fill_price             DECIMAL(15,8)

-- Exchange Data
exchange_order_id          VARCHAR(100)
exchange_client_order_id   VARCHAR(100)

-- Fees
commission_amount          DECIMAL(15,8) DEFAULT 0
commission_asset           VARCHAR(10)

-- Timestamps
created_at                 TIMESTAMP DEFAULT NOW()
updated_at                 TIMESTAMP DEFAULT NOW()
filled_at                  TIMESTAMP

metadata                   JSONB
```

---

## Affiliate System

### 12. `affiliate_requests` - Affiliate Application Requests

**Purpose:** Manage requests from users to become affiliates.

**Key Columns:**
```sql
id                         SERIAL PRIMARY KEY
user_id                    INTEGER REFERENCES users(id)
requested_level            VARCHAR(20) DEFAULT 'normal'
                          -- Values: normal, vip
status                     VARCHAR(20) DEFAULT 'pending'
                          -- Values: pending, approved, rejected
reason                     TEXT

-- Admin Processing
admin_notes                TEXT
processed_by_admin_id      INTEGER REFERENCES users(id)

requested_at               TIMESTAMP DEFAULT NOW()
processed_at               TIMESTAMP
```

---

### 13. `commission_conversions` - Commission to Credit Conversions

**Purpose:** Track conversions of affiliate commissions to trading credits.

**Key Columns:**
```sql
id                         SERIAL PRIMARY KEY
user_id                    INTEGER REFERENCES users(id)

-- Conversion Amounts
commission_amount          DECIMAL(15,2) NOT NULL
bonus_amount               DECIMAL(15,2) NOT NULL  -- 10% bonus
total_credit               DECIMAL(15,2) NOT NULL
currency                   VARCHAR(3) DEFAULT 'BRL'

-- Balance Types
source_balance_type        VARCHAR(20) NOT NULL
target_balance_type        VARCHAR(20) NOT NULL
conversion_rate            DECIMAL(8,4) DEFAULT 1.0

converted_at               TIMESTAMP DEFAULT NOW()
```

---

### 14. `affiliate_preferences` - Affiliate Settings

**Purpose:** Store affiliate-specific preferences and settings.

**Key Columns:**
```sql
id                         SERIAL PRIMARY KEY
user_id                    INTEGER REFERENCES users(id) UNIQUE

-- Configuration
auto_convert_commissions   BOOLEAN DEFAULT false
conversion_threshold       DECIMAL(15,2) DEFAULT 0.00
preferred_currency         VARCHAR(3) DEFAULT 'BRL'

-- Notifications
notification_email         BOOLEAN DEFAULT true
notification_whatsapp      BOOLEAN DEFAULT false
marketing_materials_consent BOOLEAN DEFAULT false

created_at                 TIMESTAMP DEFAULT NOW()
updated_at                 TIMESTAMP DEFAULT NOW()
```

---

### 15. `affiliate_stats` - Affiliate Statistics

**Purpose:** Aggregate statistics for affiliate performance tracking.

**Key Columns:**
```sql
id                         SERIAL PRIMARY KEY
user_id                    INTEGER REFERENCES users(id) UNIQUE

-- Overall Statistics
total_referrals            INTEGER DEFAULT 0
active_referrals           INTEGER DEFAULT 0
total_commissions_brl      DECIMAL(15,2) DEFAULT 0.00
total_commissions_usd      DECIMAL(15,2) DEFAULT 0.00
total_conversions          INTEGER DEFAULT 0
conversion_rate            DECIMAL(5,2) DEFAULT 0.00

-- Monthly Metrics
monthly_referrals          INTEGER DEFAULT 0
monthly_commissions_brl    DECIMAL(15,2) DEFAULT 0.00
monthly_commissions_usd    DECIMAL(15,2) DEFAULT 0.00
monthly_period             DATE DEFAULT DATE_TRUNC('month', NOW())

-- Activity Timestamps
last_referral_at           TIMESTAMP
last_commission_at         TIMESTAMP
last_updated               TIMESTAMP DEFAULT NOW()
```

---

## Monitoring & Analytics

### 16. `market_direction_history` - Market Direction Tracking

**Purpose:** Historical record of market direction analysis.

**Key Columns:**
```sql
id                         SERIAL PRIMARY KEY
allowed_direction          VARCHAR(50) NOT NULL
fear_greed_value           INTEGER NOT NULL
fear_greed_classification  VARCHAR(50)
top100_percentage_up       DECIMAL(5,2) NOT NULL
top100_trend               VARCHAR(20) NOT NULL
confidence                 DECIMAL(3,2)
raw_data                   JSONB
created_at                 TIMESTAMP DEFAULT NOW()
```

---

### 17. `market_direction_alerts` - Market Change Alerts

**Purpose:** Alerts for significant market direction changes.

**Key Columns:**
```sql
id                         SERIAL PRIMARY KEY
change_type                VARCHAR(50) NOT NULL
severity                   VARCHAR(20) NOT NULL
should_close_positions     BOOLEAN DEFAULT FALSE
details                    JSONB
processed                  BOOLEAN DEFAULT FALSE
created_at                 TIMESTAMP DEFAULT NOW()
```

---

### 18. `signal_metrics_log` - Signal Performance Metrics

**Purpose:** Log and analyze signal performance.

**Key Columns:**
```sql
id                         SERIAL PRIMARY KEY
signal_type                VARCHAR(50) NOT NULL
ticker                     VARCHAR(20) NOT NULL
source                     VARCHAR(50)
received_at                TIMESTAMP NOT NULL
market_direction           VARCHAR(50)
fear_greed_value           INTEGER
top100_percentage_up       DECIMAL(5,2)
ai_approved                BOOLEAN NOT NULL
ai_reason                  TEXT
processed_at               TIMESTAMP DEFAULT NOW()
execution_result           JSONB
```

---

### 19. `position_close_recommendations` - Position Close Suggestions

**Purpose:** AI-generated recommendations to close positions based on market conditions.

**Key Columns:**
```sql
id                         SERIAL PRIMARY KEY
user_id                    INTEGER REFERENCES users(id)
ticker                     VARCHAR(20) NOT NULL
side                       VARCHAR(10) NOT NULL
reason                     TEXT NOT NULL
market_change_data         JSONB
executed                   BOOLEAN DEFAULT FALSE
executed_at                TIMESTAMP
created_at                 TIMESTAMP DEFAULT NOW()
```

---

### 20. `user_balance_monitoring` - Balance Monitoring

**Purpose:** Monitor and track user balances across exchanges.

**Key Columns:**
```sql
id                         SERIAL PRIMARY KEY
user_id                    INTEGER REFERENCES users(id)
exchange                   VARCHAR(20) NOT NULL
environment                VARCHAR(10) NOT NULL
total_balance_usd          DECIMAL(15,2) DEFAULT 0
total_balance_btc          DECIMAL(15,8) DEFAULT 0
balances_snapshot          JSONB
last_updated               TIMESTAMP DEFAULT NOW()

UNIQUE(user_id, exchange, environment)
```

---

## Notifications & Communications

### 21. `notifications` - System Notifications

**Purpose:** Manage all system notifications to users.

**Key Columns:**
```sql
id                         SERIAL PRIMARY KEY
uuid                       UUID
user_id                    INTEGER REFERENCES users(id)

-- Content
type                       VARCHAR(50) NOT NULL
                          -- Values: trading, financial, system, affiliate
title                      VARCHAR(255) NOT NULL
message                    TEXT NOT NULL
priority                   VARCHAR(10) DEFAULT 'normal'
                          -- Values: low, normal, high, urgent

-- Status
read                       BOOLEAN DEFAULT false
read_at                    TIMESTAMP

-- Delivery Channels
email_sent                 BOOLEAN DEFAULT false
sms_sent                   BOOLEAN DEFAULT false
push_sent                  BOOLEAN DEFAULT false

metadata                   JSONB
created_at                 TIMESTAMP DEFAULT NOW()
```

---

### 22. Aguia News System

**Aguia News** is a news monitoring and alerting system.

#### `aguia_news_radars` - News Monitoring Radars
```sql
id                         SERIAL PRIMARY KEY
user_id                    INTEGER REFERENCES users(id)
name                       VARCHAR(100) NOT NULL
keywords                   TEXT[] NOT NULL  -- Array of keywords
exchanges                  TEXT[]
coins                      TEXT[]
is_active                  BOOLEAN DEFAULT true
notification_enabled       BOOLEAN DEFAULT true
sentiment_filter           VARCHAR(20)
                          -- Values: positive, negative, neutral, all
created_at                 TIMESTAMP DEFAULT NOW()
updated_at                 TIMESTAMP DEFAULT NOW()
```

#### `aguia_news_articles` - Captured News Articles
```sql
id                         SERIAL PRIMARY KEY
title                      VARCHAR(500) NOT NULL
content                    TEXT
url                        VARCHAR(1000)
source                     VARCHAR(100)
sentiment                  VARCHAR(20)
sentiment_score            DECIMAL(3,2)  -- -1.0 to 1.0
keywords                   TEXT[]
coins_mentioned            TEXT[]
published_at               TIMESTAMP
discovered_at              TIMESTAMP DEFAULT NOW()
raw_data                   JSONB
```

#### `aguia_news_alerts` - News-Based Alerts
```sql
id                         SERIAL PRIMARY KEY
radar_id                   INTEGER REFERENCES aguia_news_radars(id)
article_id                 INTEGER REFERENCES aguia_news_articles(id)
user_id                    INTEGER REFERENCES users(id)
sent                       BOOLEAN DEFAULT false
sent_at                    TIMESTAMP
read                       BOOLEAN DEFAULT false
read_at                    TIMESTAMP
relevance_score            DECIMAL(3,2)  -- 0.0 to 1.0
created_at                 TIMESTAMP DEFAULT NOW()
```

---

### 23. Terms & Policies System

#### `terms_versions` - Terms of Service Versions
```sql
id                         SERIAL PRIMARY KEY
version                    VARCHAR(20) UNIQUE NOT NULL
title                      VARCHAR(255) NOT NULL
content                    TEXT NOT NULL
content_type               VARCHAR(20) DEFAULT 'markdown'
                          -- Values: markdown, html, text
is_active                  BOOLEAN DEFAULT false
is_required                BOOLEAN DEFAULT true
created_by_admin_id        INTEGER REFERENCES users(id)
created_at                 TIMESTAMP DEFAULT NOW()
activated_at               TIMESTAMP
summary                    TEXT
changes_from_previous      TEXT
metadata                   JSONB
```

#### `terms_acceptances` - User Terms Acceptances
```sql
id                         SERIAL PRIMARY KEY
user_id                    INTEGER REFERENCES users(id)
terms_version_id           INTEGER REFERENCES terms_versions(id)
accepted_at                TIMESTAMP DEFAULT NOW()
ip_address                 INET
user_agent                 TEXT
digital_signature          TEXT

UNIQUE(user_id, terms_version_id)
```

---

## Audit & Logging

### 24. `activity_logs` - Activity Audit Trail

**Purpose:** Comprehensive audit trail of all user and system activities.

**Key Columns:**
```sql
id                         SERIAL PRIMARY KEY
user_id                    INTEGER REFERENCES users(id) ON DELETE SET NULL
action                     VARCHAR(100) NOT NULL
entity_type                VARCHAR(50)
entity_id                  INTEGER
ip_address                 INET
user_agent                 TEXT
metadata                   JSONB
created_at                 TIMESTAMP DEFAULT NOW()
```

---

### 25. `error_logs` - Error Logging

**Purpose:** Track system errors and exceptions.

**Key Columns:**
```sql
id                         SERIAL PRIMARY KEY
error_type                 VARCHAR(50) NOT NULL
error_message              TEXT NOT NULL
stack_trace                TEXT
user_id                    INTEGER REFERENCES users(id) ON DELETE SET NULL
request_path               VARCHAR(255)
request_method             VARCHAR(10)
metadata                   JSONB
created_at                 TIMESTAMP DEFAULT NOW()
```

---

## Database Relationships

### Primary Relationships

```
users (1) ←→ (N) user_api_keys
users (1) ←→ (N) transactions
users (1) ←→ (N) trading_positions
users (1) ←→ (N) trade_executions
users (1) ←→ (N) commission_records
users (1) ←→ (N) notifications
users (1) ←→ (N) withdrawal_requests
users (1) ←→ (N) affiliate_requests
users (1) ←→ (1) affiliate_stats
users (1) ←→ (1) affiliate_preferences
users (1) ←→ (N) aguia_news_radars
users (1) ←→ (N) activity_logs

trading_signals (1) ←→ (N) trading_positions
trading_signals (1) ←→ (N) trade_executions
trading_positions (1) ←→ (N) trade_executions

coupons (1) ←→ (N) coupon_usage
users (1) ←→ (N) coupon_usage

terms_versions (1) ←→ (N) terms_acceptances
users (1) ←→ (N) terms_acceptances
```

### Affiliate Relationships

```
users (affiliate_id) → users (id)  -- Self-referencing for affiliate hierarchy
```

---

## Indexes & Performance

### Key Indexes for Performance

```sql
-- User Indexes
idx_users_email
idx_users_username
idx_users_affiliate_code
idx_users_affiliate_id
idx_users_user_type
idx_users_is_active
idx_users_created_at

-- Transaction Indexes
idx_transactions_user_id
idx_transactions_type
idx_transactions_status
idx_transactions_created_at
idx_transactions_currency

-- Trading Indexes
idx_trading_positions_user_id
idx_trading_positions_symbol
idx_trading_positions_status
idx_trading_positions_opened_at
idx_trading_signals_symbol
idx_trading_signals_status
idx_trading_signals_received_at
idx_trade_executions_user_id
idx_trade_executions_position_id
idx_trade_executions_signal_id

-- API Keys Indexes
idx_user_api_keys_user_id
idx_user_api_keys_exchange
idx_user_api_keys_active
idx_user_api_keys_valid

-- Notification Indexes
idx_notifications_user_id
idx_notifications_type
idx_notifications_read
idx_notifications_created_at

-- Monitoring Indexes
idx_market_direction_created_at
idx_signal_metrics_ticker_time
idx_signal_metrics_ai_approved

-- Balance Indexes
idx_balances_user_id
idx_balances_asset
idx_user_balance_monitoring_user_exchange
```

---

## Functions & Triggers

### 1. `update_updated_at_column()` - Auto-Update Timestamp

**Purpose:** Automatically update the `updated_at` timestamp on row updates.

**Applied to Tables:**
- users
- user_api_keys
- transactions
- affiliate_preferences
- trading_positions
- trade_executions
- active_positions
- positions
- aguia_news_radars

**Function:**
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
```

---

### 2. `generate_affiliate_code()` - Auto-Generate Affiliate Code

**Purpose:** Automatically generate unique affiliate codes when a user becomes an affiliate.

**Applied to:** users table

**Function:**
```sql
CREATE OR REPLACE FUNCTION generate_affiliate_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.affiliate_type IN ('normal', 'vip') AND NEW.affiliate_code IS NULL THEN
        NEW.affiliate_code := 'CBC' || LPAD(NEW.id::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';
```

**Example Code:** CBC000001, CBC000042, etc.

---

### 3. `update_affiliate_stats_function()` - Update Affiliate Statistics

**Purpose:** Recalculate and update affiliate statistics (referrals, commissions, etc.).

**Parameters:** `affiliate_user_id INTEGER`

**Functionality:**
- Counts total referrals
- Counts active referrals (active in last 30 days)
- Calculates total commissions in BRL and USD
- Calculates monthly metrics
- Updates or inserts into `affiliate_stats` table

**Usage:**
```sql
SELECT update_affiliate_stats_function(123);  -- Update stats for user ID 123
```

---

## Database Views

### 1. `financial_summary` - User Financial Overview

**Purpose:** Quick financial summary for each active user.

**Columns:**
- id, username, email
- plan_type, affiliate_type
- total_withdrawable (real_brl + real_usd)
- total_admin_credits (admin_brl + admin_usd)
- total_commissions (commission_brl + commission_usd)
- total_operational (withdrawable + admin credits)
- created_at, updated_at

---

### 2. `affiliate_performance` - Affiliate Performance Dashboard

**Purpose:** Performance metrics for all affiliates.

**Columns:**
- id, username, affiliate_code, affiliate_type
- total_referrals, active_referrals
- total_commissions, pending_commissions
- created_at

**Ordered by:** total_commissions DESC

---

### 3. `affiliate_requests_pending` - Pending Affiliate Applications

**Purpose:** List of pending affiliate requests with urgency metrics.

**Columns:**
- id, user_id, username, email
- requested_level, reason
- requested_at, days_pending

**Ordered by:** requested_at ASC (oldest first)

---

### 4. `current_market_direction` - Latest Market Analysis

**Purpose:** Most recent market direction analysis.

**Columns:**
- allowed_direction
- fear_greed_value, fear_greed_classification
- top100_percentage_up, top100_trend
- confidence
- created_at

---

### 5. `signal_performance_summary` - Signal Analysis (30 days)

**Purpose:** Performance metrics for trading signals over the last 30 days.

**Columns:**
- ticker
- total_signals, approved_signals, approval_rate
- long_signals, short_signals
- avg_fear_greed, avg_top100
- first_signal, last_signal, active_days

**Ordered by:** total_signals DESC

---

## Key Constraints & Business Rules

### Financial Rules

1. **Balance Types:**
   - `balance_real_*`: Withdrawable (from Stripe payments)
   - `balance_admin_*`: Non-withdrawable credits (30-day expiry)
   - `balance_commission_*`: Convertible to admin credits with 10% bonus

2. **Withdrawal Rules:**
   - Only `balance_real_brl` and `balance_real_usd` can be withdrawn
   - Minimum withdrawal amounts apply (defined in application logic)
   - Withdrawal requests require admin approval

3. **Commission Conversion:**
   - Commission → Admin Credit conversion includes 10% bonus
   - Formula: `total_credit = commission_amount + (commission_amount * 0.10)`

### Trading Rules

1. **Position Limits:**
   - Maximum open positions per user (default: 2)
   - Maximum position size (default: 30% of balance)
   - Leverage limits: 1x to 20x (user-defined default: 5x)

2. **Risk Management:**
   - Stop Loss: Default 2x leverage
   - Take Profit: Default 3x leverage
   - Risk levels: LOW, MEDIUM, HIGH

3. **Signal Expiry:**
   - Trading signals expire after 2 minutes (configurable)
   - Expired signals are not processed

### Affiliate Rules

1. **Affiliate Tiers:**
   - **Normal Affiliates:** Standard commission rates
   - **VIP Affiliates:** Enhanced commission rates

2. **Commission Distribution:**
   - Company commission: Retained by platform
   - Affiliate commission: Paid to referrer
   - Rates depend on user's plan type and affiliate tier

3. **Affiliate Code Format:**
   - Prefix: "CBC"
   - Format: CBC + 6-digit zero-padded user ID
   - Example: User ID 42 → CBC000042

---

## Data Integrity & Constraints

### Check Constraints

- All amounts must be positive (> 0)
- Balances must be non-negative (>= 0)
- Percentages must be within valid ranges
- Enums must match predefined values

### Foreign Key Constraints

- All user-related tables have `ON DELETE CASCADE` or `ON DELETE SET NULL`
- Orphaned records are prevented through foreign key relationships

### Unique Constraints

- Email, username, affiliate_code must be unique per user
- One API key per user/exchange/environment combination
- One coupon usage per user/coupon combination

---

## Security Considerations

1. **Sensitive Data:**
   - API keys and secrets stored as TEXT (should be encrypted at application level)
   - Password hash stored (bcrypt)
   - Two-factor secrets stored securely

2. **Audit Trail:**
   - All significant actions logged in `activity_logs`
   - IP addresses and user agents captured
   - Error logs maintained for debugging

3. **Access Control:**
   - User types enforce role-based access
   - Admin flags separate system administrators
   - API key validation required before trading

---

## Backup & Maintenance Recommendations

1. **Regular Backups:**
   - Daily full backups
   - Hourly incremental backups for critical tables
   - Point-in-time recovery enabled

2. **Index Maintenance:**
   - Regular VACUUM and ANALYZE
   - Monitor index usage and fragmentation
   - Rebuild indexes periodically

3. **Monitoring:**
   - Query performance monitoring
   - Connection pool monitoring
   - Slow query logging

4. **Archival:**
   - Archive old closed positions (> 1 year)
   - Archive old transactions (> 2 years)
   - Maintain activity logs (> 6 months in hot storage)

---

## Version History

- **v6.0.0** (October 2025): Complete enterprise database schema
  - Multi-exchange support (4 exchanges)
  - Advanced affiliate system
  - AI-powered signal processing
  - Comprehensive monitoring and analytics
  - Aguia News integration
  - Terms and policies management

---

## Contact & Support

For database schema questions or modifications, contact:
- **Technical Team:** CoinBitClub Enterprise Team
- **Database:** PostgreSQL on Render.com
- **Environment:** Production

---

*This document was auto-generated from the CoinBitClub Enterprise database schema.  
Last updated: October 19, 2025*

