-- 🔍 VALIDAÇÃO DE INTEGRIDADE DO BANCO DE DADOS
-- =============================================
-- Gerado automaticamente pelo EndpointMapper

-- Verificar existência das tabelas críticas

SELECT 'users' as table_name, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') 
            THEN 'EXISTS' 
            ELSE 'MISSING' 
       END as status;

SELECT 'positions' as table_name, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'positions') 
            THEN 'EXISTS' 
            ELSE 'MISSING' 
       END as status;

SELECT 'trades' as table_name, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trades') 
            THEN 'EXISTS' 
            ELSE 'MISSING' 
       END as status;

SELECT 'signals' as table_name, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'signals') 
            THEN 'EXISTS' 
            ELSE 'MISSING' 
       END as status;

SELECT 'active_positions' as table_name, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'active_positions') 
            THEN 'EXISTS' 
            ELSE 'MISSING' 
       END as status;

SELECT 'transactions' as table_name, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') 
            THEN 'EXISTS' 
            ELSE 'MISSING' 
       END as status;

SELECT 'coupons' as table_name, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coupons') 
            THEN 'EXISTS' 
            ELSE 'MISSING' 
       END as status;

SELECT 'coupon_usage' as table_name, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coupon_usage') 
            THEN 'EXISTS' 
            ELSE 'MISSING' 
       END as status;

SELECT 'fear_greed_index' as table_name, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fear_greed_index') 
            THEN 'EXISTS' 
            ELSE 'MISSING' 
       END as status;

SELECT 'top100_data' as table_name, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'top100_data') 
            THEN 'EXISTS' 
            ELSE 'MISSING' 
       END as status;

SELECT 'affiliates' as table_name, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'affiliates') 
            THEN 'EXISTS' 
            ELSE 'MISSING' 
       END as status;

SELECT 'commission_records' as table_name, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'commission_records') 
            THEN 'EXISTS' 
            ELSE 'MISSING' 
       END as status;

SELECT 'sms_logs' as table_name, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sms_logs') 
            THEN 'EXISTS' 
            ELSE 'MISSING' 
       END as status;

SELECT 'admin_actions' as table_name, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_actions') 
            THEN 'EXISTS' 
            ELSE 'MISSING' 
       END as status;

SELECT 'system_config' as table_name, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_config') 
            THEN 'EXISTS' 
            ELSE 'MISSING' 
       END as status;

-- Verificar campos NULL em tabelas críticas
SELECT 
    table_name,
    column_name,
    COUNT(*) as null_count
FROM (
    
    SELECT 'users' as table_name, column_name
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND is_nullable = 'NO' UNION ALL 
    SELECT 'positions' as table_name, column_name
    FROM information_schema.columns 
    WHERE table_name = 'positions' 
    AND is_nullable = 'NO' UNION ALL 
    SELECT 'trades' as table_name, column_name
    FROM information_schema.columns 
    WHERE table_name = 'trades' 
    AND is_nullable = 'NO' UNION ALL 
    SELECT 'signals' as table_name, column_name
    FROM information_schema.columns 
    WHERE table_name = 'signals' 
    AND is_nullable = 'NO' UNION ALL 
    SELECT 'active_positions' as table_name, column_name
    FROM information_schema.columns 
    WHERE table_name = 'active_positions' 
    AND is_nullable = 'NO' UNION ALL 
    SELECT 'transactions' as table_name, column_name
    FROM information_schema.columns 
    WHERE table_name = 'transactions' 
    AND is_nullable = 'NO' UNION ALL 
    SELECT 'coupons' as table_name, column_name
    FROM information_schema.columns 
    WHERE table_name = 'coupons' 
    AND is_nullable = 'NO' UNION ALL 
    SELECT 'coupon_usage' as table_name, column_name
    FROM information_schema.columns 
    WHERE table_name = 'coupon_usage' 
    AND is_nullable = 'NO' UNION ALL 
    SELECT 'fear_greed_index' as table_name, column_name
    FROM information_schema.columns 
    WHERE table_name = 'fear_greed_index' 
    AND is_nullable = 'NO' UNION ALL 
    SELECT 'top100_data' as table_name, column_name
    FROM information_schema.columns 
    WHERE table_name = 'top100_data' 
    AND is_nullable = 'NO' UNION ALL 
    SELECT 'affiliates' as table_name, column_name
    FROM information_schema.columns 
    WHERE table_name = 'affiliates' 
    AND is_nullable = 'NO' UNION ALL 
    SELECT 'commission_records' as table_name, column_name
    FROM information_schema.columns 
    WHERE table_name = 'commission_records' 
    AND is_nullable = 'NO' UNION ALL 
    SELECT 'sms_logs' as table_name, column_name
    FROM information_schema.columns 
    WHERE table_name = 'sms_logs' 
    AND is_nullable = 'NO' UNION ALL 
    SELECT 'admin_actions' as table_name, column_name
    FROM information_schema.columns 
    WHERE table_name = 'admin_actions' 
    AND is_nullable = 'NO' UNION ALL 
    SELECT 'system_config' as table_name, column_name
    FROM information_schema.columns 
    WHERE table_name = 'system_config' 
    AND is_nullable = 'NO'
) critical_columns
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = critical_columns.table_name
)
GROUP BY table_name, column_name
ORDER BY table_name, null_count DESC;