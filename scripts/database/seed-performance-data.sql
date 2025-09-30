-- ========================================
-- 🌱 SEED PERFORMANCE DATA
-- CoinBitClub Enterprise v6.0.0
-- Mock performance data for testing
-- ========================================

-- Insert mock performance data if tables exist
DO $$
BEGIN
    -- Check if performance tables exist and insert mock data
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'performance_metrics') THEN
        
        -- Insert mock performance metrics
        INSERT INTO performance_metrics (user_id, metric_name, metric_value, recorded_at)
        VALUES 
            (1, 'total_return', 15.5, NOW() - INTERVAL '1 day'),
            (1, 'success_rate', 73.2, NOW() - INTERVAL '1 day'),
            (1, 'total_trades', 45, NOW() - INTERVAL '1 day'),
            (1, 'winning_trades', 33, NOW() - INTERVAL '1 day'),
            (1, 'losing_trades', 12, NOW() - INTERVAL '1 day')
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Performance metrics seeded successfully';
    ELSE
        RAISE NOTICE 'Performance metrics table does not exist, skipping seed';
    END IF;
    
    -- Check if trading_operations table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'trading_operations') THEN
        
        -- Insert mock trading operations
        INSERT INTO trading_operations (user_id, pair, direction, entry_price, exit_price, quantity, pnl, status, created_at)
        VALUES 
            (1, 'BTC/USDT', 'LONG', 45000.00, 46500.00, 0.01, 15.00, 'CLOSED', NOW() - INTERVAL '2 hours'),
            (1, 'ETH/USDT', 'SHORT', 3200.00, 3100.00, 0.1, 10.00, 'CLOSED', NOW() - INTERVAL '4 hours'),
            (1, 'ADA/USDT', 'LONG', 0.45, 0.48, 100, 3.00, 'CLOSED', NOW() - INTERVAL '6 hours')
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Trading operations seeded successfully';
    ELSE
        RAISE NOTICE 'Trading operations table does not exist, skipping seed';
    END IF;
    
    -- Check if fear_greed_index table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'fear_greed_index') THEN
        
        -- Insert mock fear & greed data
        INSERT INTO fear_greed_index (value, classification, timestamp, source)
        VALUES 
            (45, 'FEAR', NOW() - INTERVAL '1 hour', 'alternative.me'),
            (52, 'NEUTRAL', NOW() - INTERVAL '2 hours', 'alternative.me'),
            (38, 'FEAR', NOW() - INTERVAL '3 hours', 'alternative.me')
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Fear & Greed index seeded successfully';
    ELSE
        RAISE NOTICE 'Fear & Greed index table does not exist, skipping seed';
    END IF;
    
END $$;
