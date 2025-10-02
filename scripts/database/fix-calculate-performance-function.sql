-- Fix calculate_user_performance function to use correct column names
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_user_performance(user_id_param INTEGER)
RETURNS VOID AS $$
DECLARE
    today_date DATE := CURRENT_DATE;
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

    -- Overall performance vars
    overall_ops INTEGER;
    overall_winning INTEGER;
    overall_losing INTEGER;
    overall_pnl DECIMAL(15,2);
    overall_win_rate DECIMAL(5,2);
BEGIN
    -- Get current balance from users table
    SELECT COALESCE(balance_real_usd, 0) INTO current_balance
    FROM users WHERE id = user_id_param;

    -- Calculate today's performance using correct column names
    SELECT
        COUNT(*),
        COUNT(CASE WHEN profit_loss_usd > 0 THEN 1 END),
        COUNT(CASE WHEN profit_loss_usd < 0 THEN 1 END),
        COALESCE(SUM(profit_loss_usd), 0),
        COALESCE(SUM(profit_loss_percentage), 0),
        COALESCE(MAX(profit_loss_usd), 0),
        COALESCE(MIN(profit_loss_usd), 0),
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

    -- Get best/worst pairs for today
    SELECT trading_pair INTO best_pair
    FROM trading_operations
    WHERE user_id = user_id_param
        AND DATE(entry_time) = today_date
        AND status = 'CLOSED'
        AND profit_loss_usd = best_profit
    LIMIT 1;

    SELECT trading_pair INTO worst_pair
    FROM trading_operations
    WHERE user_id = user_id_param
        AND DATE(entry_time) = today_date
        AND status = 'CLOSED'
        AND profit_loss_usd = worst_profit
    LIMIT 1;

    -- Calculate overall performance (all time)
    SELECT
        COUNT(*),
        COUNT(CASE WHEN profit_loss_usd > 0 THEN 1 END),
        COUNT(CASE WHEN profit_loss_usd < 0 THEN 1 END),
        COALESCE(SUM(profit_loss_usd), 0)
    INTO
        overall_ops, overall_winning, overall_losing, overall_pnl
    FROM trading_operations
    WHERE user_id = user_id_param
        AND status = 'CLOSED';

    -- Calculate overall win rate
    IF overall_ops > 0 THEN
        overall_win_rate := (overall_winning::DECIMAL / overall_ops::DECIMAL) * 100;
    ELSE
        overall_win_rate := 0;
    END IF;

    -- Insert or update daily performance
    INSERT INTO user_performance_daily (
        user_id, performance_date, total_operations, winning_operations, losing_operations,
        win_rate_percentage, total_profit_loss_usd, total_profit_loss_percentage,
        avg_profit_per_operation, starting_balance, ending_balance
    ) VALUES (
        user_id_param, today_date, total_ops, winning_ops, losing_ops,
        win_rate, total_pnl, total_pnl_percent,
        CASE WHEN total_ops > 0 THEN total_pnl / total_ops ELSE 0 END,
        current_balance, current_balance
    )
    ON CONFLICT (user_id, performance_date)
    DO UPDATE SET
        total_operations = EXCLUDED.total_operations,
        winning_operations = EXCLUDED.winning_operations,
        losing_operations = EXCLUDED.losing_operations,
        win_rate_percentage = EXCLUDED.win_rate_percentage,
        total_profit_loss_usd = EXCLUDED.total_profit_loss_usd,
        total_profit_loss_percentage = EXCLUDED.total_profit_loss_percentage,
        avg_profit_per_operation = EXCLUDED.avg_profit_per_operation,
        ending_balance = EXCLUDED.ending_balance;

    -- Update performance cache with both today's and overall stats
    INSERT INTO user_performance_cache (
        user_id, current_balance,
        today_profit_loss, today_profit_loss_percentage,
        today_operations, today_win_rate,
        total_operations, total_winning_operations,
        total_losing_operations, overall_win_rate,
        total_profit_loss_usd, total_profit_loss_percentage,
        biggest_profit_operation, biggest_profit_pair,
        average_operation_time_minutes,
        last_calculated_at
    ) VALUES (
        user_id_param, current_balance,
        total_pnl, total_pnl_percent,
        total_ops, win_rate,
        overall_ops, overall_winning,
        overall_losing, overall_win_rate,
        overall_pnl, CASE WHEN current_balance > 0 THEN (overall_pnl / current_balance) * 100 ELSE 0 END,
        best_profit, best_pair,
        avg_hold_time::INTEGER,
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
        total_profit_loss_usd = EXCLUDED.total_profit_loss_usd,
        total_profit_loss_percentage = EXCLUDED.total_profit_loss_percentage,
        biggest_profit_operation = EXCLUDED.biggest_profit_operation,
        biggest_profit_pair = EXCLUDED.biggest_profit_pair,
        average_operation_time_minutes = EXCLUDED.average_operation_time_minutes,
        last_calculated_at = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT 'calculate_user_performance function updated successfully!' as status;

COMMIT;
