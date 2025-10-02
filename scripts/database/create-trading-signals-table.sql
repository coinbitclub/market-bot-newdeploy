-- Trading Signals Table for TradingView Webhook Signals
-- This stores raw signals from TradingView alerts (not executed trades)

CREATE TABLE IF NOT EXISTS trading_signals (
    id SERIAL PRIMARY KEY,
    signal_id VARCHAR(100) UNIQUE NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    action VARCHAR(10) NOT NULL,  -- BUY, SELL
    price DECIMAL(20, 8),
    quantity DECIMAL(20, 8),
    strategy VARCHAR(255),
    source VARCHAR(50) DEFAULT 'TRADINGVIEW',
    received_at TIMESTAMP DEFAULT NOW(),

    -- Additional TradingView fields
    interval VARCHAR(20),
    stop_loss DECIMAL(20, 8),
    take_profit DECIMAL(20, 8),

    -- Metadata
    metadata JSONB,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trading_signals_symbol ON trading_signals(symbol);
CREATE INDEX IF NOT EXISTS idx_trading_signals_received_at ON trading_signals(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_trading_signals_source ON trading_signals(source);

-- Comments
COMMENT ON TABLE trading_signals IS 'Stores raw trading signals from TradingView webhooks (not executed trades)';
COMMENT ON COLUMN trading_signals.signal_id IS 'Unique identifier for the signal (e.g., SIGNAL_1234567890)';
COMMENT ON COLUMN trading_signals.metadata IS 'Additional data from TradingView webhook (alert_name, exchange, etc.)';
