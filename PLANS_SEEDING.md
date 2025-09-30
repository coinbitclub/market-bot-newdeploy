# 📋 Plans Seeding Documentation

## Overview

This document describes how to seed the database with the 3 universal plans for CoinBitClub Enterprise v6.0.0.

## Quick Start

### Seed Plans
```bash
# Navigate to backend directory
cd F:/work/MarkBot/market-bot-newdeploy

# Seed the 3 universal plans
node scripts/seed-plans.js

# Verify the plans were seeded correctly
node scripts/verify-plans.js
```

### NPM Scripts (if added to package.json)
```bash
# Seed plans
npm run db:seed-plans

# Verify plans
npm run db:verify-plans
```

## The 3 Universal Plans

### 1. Free Trial (TRIAL)
- **Price**: $0.00 USD
- **Type**: TRIAL
- **Commission**: 0%
- **Minimum Balance**: $0
- **Features**: 7-day free trial, TESTNET only, basic support

### 2. FLEX Plan (FLEX) - Most Popular
- **Price**: $0.00 USD
- **Type**: PREPAID
- **Commission**: 20%
- **Minimum Balance**: $30
- **Features**: 24/7 trading, prepaid system, standard support

### 3. PRO Plan (PRO)
- **Price**: $50.00 USD/month
- **Type**: MONTHLY
- **Commission**: 10%
- **Minimum Balance**: $20
- **Features**: VIP support, advanced strategies, premium community

## Database Schema

The plans are stored in the `plans` table with the following structure:

```sql
CREATE TABLE plans (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    billing_period VARCHAR(20) NOT NULL DEFAULT 'none',
    commission_rate DECIMAL(5,2) NOT NULL DEFAULT 20.00,
    minimum_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_popular BOOLEAN DEFAULT FALSE,
    is_recommended BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    stripe_product_id VARCHAR(255),
    region VARCHAR(50) NOT NULL DEFAULT 'global',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Files Created

### Scripts
- `scripts/seed-plans.js` - Main seeding script
- `scripts/verify-plans.js` - Verification script

### SQL Files
- `src/database/migrations/seed-3-universal-plans.sql` - SQL seeding script
- `src/database/migrations/create-plans-table.sql` - Table creation (existing)

## Usage in Application

### Backend API
The plans can be accessed via the authenticated API:
```bash
GET /api/plans/available
```

### Frontend Components
- `UniversalPlans.tsx` - Displays all 3 plans
- Available at: `http://localhost:3003/universal-plans`

## Environment Requirements

- PostgreSQL database running
- Environment variables configured in `.env`:
  - `DATABASE_URL` or connection parameters
- Node.js with pg package installed

## Troubleshooting

### Database Connection Issues
```bash
# Test database connection
npm run test:db

# Check if database exists
npm run db:verify
```

### Re-seeding Plans
The seeding script will clear existing plans and re-seed. This is safe to run multiple times.

### Verification
Always run the verification script after seeding to ensure data integrity:
```bash
node scripts/verify-plans.js
```

## Success Indicators

After successful seeding, you should see:
- ✅ 3 total plans in database
- ✅ 3 active plans
- ✅ 1 popular plan (FLEX)
- ✅ 1 recommended plan (FLEX)
- ✅ All plans have 'global' region
- ✅ All plans have USD currency

## Next Steps

1. Plans are now seeded in database
2. Backend API will serve these plans to authenticated users
3. Frontend components will display these plans
4. Users can subscribe to any of the 3 plans
5. All plans are universal (no regional restrictions)

## Support

For issues with seeding:
1. Check database connection
2. Verify PostgreSQL service is running
3. Check environment variables
4. Review error logs in console output