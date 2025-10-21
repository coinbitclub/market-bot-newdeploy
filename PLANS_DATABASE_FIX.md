# 🔧 Plans Database Fix - CoinBitClub Enterprise

## Problem Analysis

The backend is failing because:
1. **Missing `plans` table** - The database doesn't have the plans table
2. **Backend code bug** - `region is not defined` error in fallback code
3. **Database structure mismatch** - Backend expects plans table that doesn't exist

## Solution Steps

### 1. Create Plans Table
Run the migration script to create the plans table:

```bash
# Make the script executable
chmod +x scripts/setup-plans-table.js

# Run the migration
node scripts/setup-plans-table.js
```

### 2. Fix Backend Code
The backend code has been fixed to:
- Use `userRegion` instead of undefined `region` variable
- Handle database connection errors gracefully
- Fall back to hardcoded plans when database is unavailable

### 3. Verify Integration
After running the migration, restart your backend server and test the plans API:

```bash
# Test the plans API
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3333/api/plans/available
```

## Migration Script Features

The `create-plans-table.sql` migration includes:

### Table Structure
- **Primary fields**: id, code, name, description
- **Plan configuration**: type, price, currency, billing_period
- **Business logic**: commission_rate, minimum_balance
- **Features**: JSONB array of plan features
- **Regional support**: region field for Brazil/International
- **Stripe integration**: stripe_product_id, stripe_price_id
- **Trading limits**: max_leverage, max_positions, etc.

### Default Plans
- **TRIAL**: Free trial plan (global)
- **FLEX_BR**: Prepaid plan for Brazil
- **FLEX_US**: Prepaid plan for International
- **PRO_BR**: Monthly plan for Brazil (R$297)
- **PRO_US**: Monthly plan for International ($50)

### Indexes and Performance
- Indexes on code, type, region, is_active
- Trigger for automatic updated_at timestamp
- Proper constraints and data types

## Backend Code Fixes

### Fixed Issues
1. **Variable scope error**: `region` → `userRegion`
2. **Database error handling**: Graceful fallback to hardcoded plans
3. **Query optimization**: Better error messages and logging

### Updated Files
- `src/routes/plans.js` - Fixed region variable reference
- `migrations/create-plans-table.sql` - New migration script
- `scripts/setup-plans-table.js` - Setup script

## Testing the Fix

### 1. Run Migration
```bash
node scripts/setup-plans-table.js
```

### 2. Restart Backend
```bash
# Stop current backend
# Start backend again
npm run start
```

### 3. Test API Endpoints
```bash
# Test available plans
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3333/api/plans/available

# Test plan status
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3333/api/plans/status
```

### 4. Verify Frontend
- Open frontend plans page
- Check that plans load correctly
- Verify regional filtering works
- Test plan subscription flow

## Expected Results

After the fix:
- ✅ Plans table created with 5 default plans
- ✅ Backend API returns plans from database
- ✅ Regional filtering works (Brazil vs International)
- ✅ Fallback system works if database fails
- ✅ Frontend displays plans correctly
- ✅ Stripe integration ready for payments

## Troubleshooting

### If migration fails:
1. Check database connection
2. Verify DATABASE_URL in .env
3. Check database permissions
4. Review error logs

### If backend still fails:
1. Restart backend server
2. Check database connection
3. Verify plans table exists
4. Check error logs for specific issues

### If frontend doesn't load plans:
1. Check browser network tab
2. Verify API endpoints return data
3. Check authentication token
4. Review frontend console errors

## Next Steps

After successful migration:
1. **Test all plan types** (TRIAL, FLEX, PRO)
2. **Verify Stripe integration** with test payments
3. **Test regional filtering** (Brazil vs International)
4. **Monitor error logs** for any issues
5. **Update documentation** with new database structure

## Database Schema

The new plans table structure:

```sql
CREATE TABLE plans (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    billing_period VARCHAR(20) DEFAULT 'month',
    commission_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    minimum_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    features JSONB DEFAULT '[]'::jsonb,
    is_popular BOOLEAN DEFAULT false,
    is_recommended BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    region VARCHAR(20) DEFAULT 'international',
    stripe_product_id VARCHAR(100),
    stripe_price_id VARCHAR(100),
    max_leverage INTEGER DEFAULT 5,
    max_positions INTEGER DEFAULT 3,
    max_daily_loss DECIMAL(10,2) DEFAULT 200.00,
    min_balance_required DECIMAL(10,2) DEFAULT 30.00,
    stop_loss_percentage DECIMAL(5,2) DEFAULT 2.5,
    take_profit_percentage DECIMAL(5,2) DEFAULT 4.0,
    cooldown_minutes INTEGER DEFAULT 3,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

This comprehensive fix should resolve all the plans-related database issues and get your system working properly with the new database structure.

