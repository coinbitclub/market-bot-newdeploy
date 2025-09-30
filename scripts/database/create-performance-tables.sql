-- 📊 PERFORMANCE TRACKING TABLES - COINBITCLUB ENTERPRISE
-- Database tables for real performance data tracking
-- =====================================================

-- Trading Operations Table
CREATE TABLE IF NOT EXISTS trading_operations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    operation_id VARCHAR(100) UNIQUE NOT NULL, -- Unique operation identifier
    
    -- Trading Details
    trading_pair VARCHAR(20) NOT NULL, -- BTCUSDT, ETHUSDT, etc.
    operation_type VARCHAR(10) NOT NULL, -- LONG, SHORT
    entry_price DECIMAL(20,8) NOT NULL,
    exit_price DECIMAL(20,8),
    quantity DECIMAL(20,8) NOT NULL,
    
    -- Financial Results
    profit_loss DECIMAL(15,2) DEFAULT 0.00,
    profit_loss_percentage DECIMAL(8,4) DEFAULT 0.0000,
    profit_loss_usd DECIMAL(15,2) DEFAULT 0.00,
    
    -- Risk Management
    stop_loss DECIMAL(20,8),
    take_profit DECIMAL(20,8),
    leverage INTEGER DEFAULT 1,
    position_size DECIMAL(8,4) DEFAULT 0.0000, -- % of balance
    
    -- Status and Timing
    status VARCHAR(20) DEFAULT 'OPEN', -- OPEN, CLOSED, CANCELLED
    entry_time TIMESTAMP NOT NULL,
    exit_time TIMESTAMP,
    duration_minutes INTEGER,
    
    -- Exchange Information
    exchange VARCHAR(20) NOT NULL, -- BINANCE, BYBIT, OKX, BITGET
    exchange_order_id VARCHAR(100),
    
    -- Metadata
    signal_source VARCHAR(50), -- AI, MANUAL, COPY_TRADING
    confidence_score DECIMAL(5,2), -- 0-100
    reasoning TEXT,
    metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_operation_type CHECK (operation_type IN ('LONG', 'SHORT')),
    CONSTRAINT chk_status CHECK (status IN ('OPEN', 'CLOSED', 'CANCELLED')),
    CONSTRAINT chk_exchange CHECK (exchange IN ('BINANCE', 'BYBIT', 'OKX', 'BITGET')),
    CONSTRAINT chk_leverage_range CHECK (leverage BETWEEN 1 AND 100)
);

-- Performance Metrics Table (Daily Aggregation)
CREATE TABLE IF NOT EXISTS user_performance_daily (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    performance_date DATE NOT NULL,
    
    -- Daily Trading Stats
    total_operations INTEGER DEFAULT 0,
    winning_operations INTEGER DEFAULT 0,
    losing_operations INTEGER DEFAULT 0,
    win_rate_percentage DECIMAL(5,2) DEFAULT 0.00,
    
    -- Financial Performance
    total_profit_loss DECIMAL(15,2) DEFAULT 0.00,
    total_profit_loss_percentage DECIMAL(8,4) DEFAULT 0.0000,
    total_profit_loss_usd DECIMAL(15,2) DEFAULT 0.00,
    
    -- Best/Worst Operations
    best_operation_profit DECIMAL(15,2),
    worst_operation_profit DECIMAL(15,2),
    best_operation_pair VARCHAR(20),
    worst_operation_pair VARCHAR(20),
    
    -- Risk Metrics
    max_drawdown DECIMAL(8,4) DEFAULT 0.0000,
    sharpe_ratio DECIMAL(8,4) DEFAULT 0.0000,
    volatility DECIMAL(8,4) DEFAULT 0.0000,
    
    -- Time Metrics
    average_hold_time_minutes INTEGER DEFAULT 0,
    total_trading_time_minutes INTEGER DEFAULT 0,
    
    -- Balance Tracking
    starting_balance DECIMAL(15,2),
    ending_balance DECIMAL(15,2),
    balance_change DECIMAL(15,2) DEFAULT 0.00,
    balance_change_percentage DECIMAL(8,4) DEFAULT 0.0000,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(user_id, performance_date)
);

-- Performance Metrics Table (Monthly Aggregation)
CREATE TABLE IF NOT EXISTS user_performance_monthly (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    performance_month DATE NOT NULL, -- First day of month
    
    -- Monthly Trading Stats
    total_operations INTEGER DEFAULT 0,
    winning_operations INTEGER DEFAULT 0,
    losing_operations INTEGER DEFAULT 0,
    win_rate_percentage DECIMAL(5,2) DEFAULT 0.00,
    
    -- Financial Performance
    total_profit_loss DECIMAL(15,2) DEFAULT 0.00,
    total_profit_loss_percentage DECIMAL(8,4) DEFAULT 0.0000,
    total_profit_loss_usd DECIMAL(15,2) DEFAULT 0.00,
    
    -- Monthly Rankings
    monthly_rank INTEGER,
    total_users INTEGER,
    percentile_rank DECIMAL(5,2),
    
    -- Risk Metrics
    max_drawdown DECIMAL(8,4) DEFAULT 0.0000,
    sharpe_ratio DECIMAL(8,4) DEFAULT 0.0000,
    volatility DECIMAL(8,4) DEFAULT 0.0000,
    
    -- Best/Worst Days
    best_day_profit DECIMAL(15,2),
    worst_day_profit DECIMAL(15,2),
    best_day_date DATE,
    worst_day_date DATE,
    
    -- Balance Tracking
    starting_balance DECIMAL(15,2),
    ending_balance DECIMAL(15,2),
    balance_change DECIMAL(15,2) DEFAULT 0.00,
    balance_change_percentage DECIMAL(8,4) DEFAULT 0.0000,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(user_id, performance_month)
);

-- Trading Pair Performance Table
CREATE TABLE IF NOT EXISTS trading_pair_performance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trading_pair VARCHAR(20) NOT NULL,
    
    -- Pair-specific Stats
    total_operations INTEGER DEFAULT 0,
    winning_operations INTEGER DEFAULT 0,
    losing_operations INTEGER DEFAULT 0,
    win_rate_percentage DECIMAL(5,2) DEFAULT 0.00,
    
    -- Financial Performance
    total_profit_loss DECIMAL(15,2) DEFAULT 0.00,
    total_profit_loss_percentage DECIMAL(8,4) DEFAULT 0.0000,
    total_profit_loss_usd DECIMAL(15,2) DEFAULT 0.00,
    
    -- Best/Worst Operations
    best_operation_profit DECIMAL(15,2),
    worst_operation_profit DECIMAL(15,2),
    best_operation_date TIMESTAMP,
    worst_operation_date TIMESTAMP,
    
    -- Average Metrics
    average_profit_loss DECIMAL(15,2) DEFAULT 0.00,
    average_hold_time_minutes INTEGER DEFAULT 0,
    average_leverage DECIMAL(5,2) DEFAULT 1.00,
    
    -- Last Updated
    last_operation_date TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(user_id, trading_pair)
);

-- Real-time Performance Cache Table
CREATE TABLE IF NOT EXISTS user_performance_cache (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Current Performance (Real-time)
    current_balance DECIMAL(15,2) DEFAULT 0.00,
    today_profit_loss DECIMAL(15,2) DEFAULT 0.00,
    today_profit_loss_percentage DECIMAL(8,4) DEFAULT 0.0000,
    today_operations INTEGER DEFAULT 0,
    today_win_rate DECIMAL(5,2) DEFAULT 0.00,
    
    -- Overall Performance
    total_operations INTEGER DEFAULT 0,
    total_winning_operations INTEGER DEFAULT 0,
    total_losing_operations INTEGER DEFAULT 0,
    overall_win_rate DECIMAL(5,2) DEFAULT 0.00,
    total_profit_loss DECIMAL(15,2) DEFAULT 0.00,
    total_profit_loss_percentage DECIMAL(8,4) DEFAULT 0.0000,
    
    -- Best Performance
    best_month VARCHAR(20),
    best_month_profit DECIMAL(15,2),
    biggest_profit_operation DECIMAL(15,2),
    biggest_profit_pair VARCHAR(20),
    
    -- Risk Metrics
    max_drawdown DECIMAL(8,4) DEFAULT 0.0000,
    sharpe_ratio DECIMAL(8,4) DEFAULT 0.0000,
    volatility DECIMAL(8,4) DEFAULT 0.0000,
    
    -- Time Metrics
    average_operation_time_minutes INTEGER DEFAULT 0,
    
    -- Cache Control
    last_calculated_at TIMESTAMP DEFAULT NOW(),
    cache_version INTEGER DEFAULT 1,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trading_operations_user_id ON trading_operations(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_operations_status ON trading_operations(status);
CREATE INDEX IF NOT EXISTS idx_trading_operations_entry_time ON trading_operations(entry_time);
CREATE INDEX IF NOT EXISTS idx_trading_operations_pair ON trading_operations(trading_pair);
CREATE INDEX IF NOT EXISTS idx_trading_operations_exchange ON trading_operations(exchange);

CREATE INDEX IF NOT EXISTS idx_user_performance_daily_user_date ON user_performance_daily(user_id, performance_date);
CREATE INDEX IF NOT EXISTS idx_user_performance_daily_date ON user_performance_daily(performance_date);

CREATE INDEX IF NOT EXISTS idx_user_performance_monthly_user_month ON user_performance_monthly(user_id, performance_month);
CREATE INDEX IF NOT EXISTS idx_user_performance_monthly_month ON user_performance_monthly(performance_month);

CREATE INDEX IF NOT EXISTS idx_trading_pair_performance_user_pair ON trading_pair_performance(user_id, trading_pair);
CREATE INDEX IF NOT EXISTS idx_trading_pair_performance_pair ON trading_pair_performance(trading_pair);

CREATE INDEX IF NOT EXISTS idx_user_performance_cache_user ON user_performance_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_user_performance_cache_calculated ON user_performance_cache(last_calculated_at);

-- Create triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_trading_operations_updated_at 
    BEFORE UPDATE ON trading_operations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_performance_daily_updated_at 
    BEFORE UPDATE ON user_performance_daily 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_performance_monthly_updated_at 
    BEFORE UPDATE ON user_performance_monthly 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trading_pair_performance_updated_at 
    BEFORE UPDATE ON trading_pair_performance 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_performance_cache_updated_at 
    BEFORE UPDATE ON user_performance_cache 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate and update performance metrics
CREATE OR REPLACE FUNCTION calculate_user_performance(user_id_param INTEGER)
RETURNS VOID AS $$
DECLARE
    today_date DATE := CURRENT_DATE;
    start_of_month DATE := DATE_TRUNC('month', CURRENT_DATE);
    total_ops INTEGER;
    winning_ops INTEGER;
    losing_ops INTEGER;
    win_rate DECIMAL(5,2);
    total_pnl DECIMAL(15,2);
    total_pnl_percent DECIMAL(8,4);
    best_profit DECIMAL(15,2);
    worst_profit DECIMAL(15,2);
    best_pair VARCHAR(20);
    worst_pair VARCHAR(20);
    avg_hold_time INTEGER;
    current_balance DECIMAL(15,2);
BEGIN
    -- Get current balance from users table
    SELECT COALESCE(balance_real_usd, 0) INTO current_balance
    FROM users WHERE id = user_id_param;
    
    -- Calculate today's performance
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN profit_loss > 0 THEN 1 END),
        COUNT(CASE WHEN profit_loss < 0 THEN 1 END),
        COALESCE(SUM(profit_loss), 0),
        COALESCE(SUM(profit_loss_percentage), 0),
        COALESCE(MAX(profit_loss), 0),
        COALESCE(MIN(profit_loss), 0),
        COALESCE(AVG(EXTRACT(EPOCH FROM (exit_time - entry_time))/60), 0)
    INTO 
        total_ops, winning_ops, losing_ops, total_pnl, total_pnl_percent,
        best_profit, worst_profit, avg_hold_time
    FROM trading_operations 
    WHERE user_id = user_id_param 
        AND DATE(entry_time) = today_date 
        AND status = 'CLOSED';
    
    -- Calculate win rate
    IF total_ops > 0 THEN
        win_rate := (winning_ops::DECIMAL / total_ops::DECIMAL) * 100;
    ELSE
        win_rate := 0;
    END IF;
    
    -- Get best/worst pairs
    SELECT trading_pair INTO best_pair
    FROM trading_operations 
    WHERE user_id = user_id_param 
        AND DATE(entry_time) = today_date 
        AND status = 'CLOSED'
        AND profit_loss = best_profit
    LIMIT 1;
    
    SELECT trading_pair INTO worst_pair
    FROM trading_operations 
    WHERE user_id = user_id_param 
        AND DATE(entry_time) = today_date 
        AND status = 'CLOSED'
        AND profit_loss = worst_profit
    LIMIT 1;
    
    -- Insert or update daily performance
    INSERT INTO user_performance_daily (
        user_id, performance_date, total_operations, winning_operations, losing_operations,
        win_rate_percentage, total_profit_loss, total_profit_loss_percentage,
        best_operation_profit, worst_operation_profit, best_operation_pair, worst_operation_pair,
        average_hold_time_minutes, starting_balance, ending_balance
    ) VALUES (
        user_id_param, today_date, total_ops, winning_ops, losing_ops,
        win_rate, total_pnl, total_pnl_percent,
        best_profit, worst_profit, best_pair, worst_pair,
        avg_hold_time::INTEGER, current_balance, current_balance
    )
    ON CONFLICT (user_id, performance_date) 
    DO UPDATE SET
        total_operations = EXCLUDED.total_operations,
        winning_operations = EXCLUDED.winning_operations,
        losing_operations = EXCLUDED.losing_operations,
        win_rate_percentage = EXCLUDED.win_rate_percentage,
        total_profit_loss = EXCLUDED.total_profit_loss,
        total_profit_loss_percentage = EXCLUDED.total_profit_loss_percentage,
        best_operation_profit = EXCLUDED.best_operation_profit,
        worst_operation_profit = EXCLUDED.worst_operation_profit,
        best_operation_pair = EXCLUDED.best_operation_pair,
        worst_operation_pair = EXCLUDED.worst_operation_pair,
        average_hold_time_minutes = EXCLUDED.average_hold_time_minutes,
        ending_balance = EXCLUDED.ending_balance,
        updated_at = NOW();
    
    -- Update performance cache
    INSERT INTO user_performance_cache (
        user_id, current_balance, today_profit_loss, today_profit_loss_percentage,
        today_operations, today_win_rate, total_operations, total_winning_operations,
        total_losing_operations, overall_win_rate, total_profit_loss, total_profit_loss_percentage,
        last_calculated_at
    ) VALUES (
        user_id_param, current_balance, total_pnl, total_pnl_percent,
        total_ops, win_rate, total_ops, winning_ops,
        losing_ops, win_rate, total_pnl, total_pnl_percent,
        NOW()
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        current_balance = EXCLUDED.current_balance,
        today_profit_loss = EXCLUDED.today_profit_loss,
        today_profit_loss_percentage = EXCLUDED.today_profit_loss_percentage,
        today_operations = EXCLUDED.today_operations,
        today_win_rate = EXCLUDED.today_win_rate,
        total_operations = EXCLUDED.total_operations,
        total_winning_operations = EXCLUDED.total_winning_operations,
        total_losing_operations = EXCLUDED.total_losing_operations,
        overall_win_rate = EXCLUDED.overall_win_rate,
        total_profit_loss = EXCLUDED.total_profit_loss,
        total_profit_loss_percentage = EXCLUDED.total_profit_loss_percentage,
        last_calculated_at = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

COMMIT;
