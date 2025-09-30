# 📋 PLANS SYSTEM SETUP
## CoinBitClub Enterprise v6.0.0

This guide explains how to set up the plans system with database integration.

## 🗂️ Current State

**BEFORE**: Plans were hardcoded in `src/routes/plans.js`
**NOW**: Plans are stored in database with fallback to smart mock data

## 📁 Files Created/Modified

### 1. Database Migration
- `src/database/migrations/create-plans-table.sql` - SQL schema and initial data
- `src/database/migrate-plans.js` - Migration script

### 2. Backend Routes
- `src/routes/plans-updated.js` - New database-integrated plans routes
- `src/routes/plans.js` - Original file (backup)

### 3. Frontend Integration
- `frontend-premium/pages/user/plans.tsx` - Updated to use real backend
- `frontend-premium/src/services/planService.ts` - Fixed auth token issue

## 🚀 Setup Instructions

### Step 1: Run Database Migration
```bash
cd market-bot-newdeploy
node src/database/migrate-plans.js
```

### Step 2: Replace Plans Routes (Optional)
```bash
# Backup original
mv src/routes/plans.js src/routes/plans-original.js

# Use new database version
mv src/routes/plans-updated.js src/routes/plans.js
```

### Step 3: Restart Backend
```bash
npm start
```

## 📊 Plans Created

The migration creates **5 plans** based on frontend mock data:

### Brazil Region:
1. **TRIAL** - Trial Gratuito (Free, 7 days)
2. **FLEX_BR** - FLEX Brasil (Prepaid, 20% commission)
3. **PRO_BR** - PRO Brasil (R$297/month, 10% commission)

### International Region:
4. **FLEX_US** - FLEX Global ($0, 20% commission)
5. **PRO_US** - PRO Global ($50/month, 10% commission)

## 🗄️ Database Schema

```sql
CREATE TABLE plans (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- 'MONTHLY', 'PREPAID', 'TRIAL'
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    billing_period VARCHAR(20) NOT NULL DEFAULT 'none',
    commission_rate DECIMAL(5,2) NOT NULL DEFAULT 20.00,
    minimum_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_popular BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    stripe_product_id VARCHAR(255),
    region VARCHAR(50) NOT NULL DEFAULT 'brazil',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔄 How It Works

### Backend Behavior:
1. **Database Available**: Loads plans from `plans` table
2. **Database Unavailable**: Falls back to smart mock data (same as frontend)
3. **Authentication**: Uses JWT tokens for plan operations

### Frontend Behavior:
1. **User Authenticated**: Makes real API calls to backend
2. **User Not Authenticated**: Falls back to mock data for development
3. **API Unavailable**: Uses local mock data

## 🛠️ Management Commands

### Check Plans in Database:
```bash
node src/database/migrate-plans.js
```

### Force Recreate Plans:
```bash
node src/database/migrate-plans.js --force
```

### Add New Plan Manually:
```sql
INSERT INTO plans (code, name, description, type, price, currency, features, region)
VALUES (
    'NEW_PLAN',
    'My New Plan',
    'Description here',
    'MONTHLY',
    99.00,
    'BRL',
    '["Feature 1", "Feature 2"]'::jsonb,
    'brazil'
);
```

## 🔧 Configuration

### Environment Variables:
```env
POSTGRES_DB=coinbitclub_enterprise
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
```

### Frontend API URL:
```env
NEXT_PUBLIC_API_URL=http://localhost:3333
```

## 🧪 Testing

### Test Database Connection:
```bash
cd market-bot-newdeploy
npm run test:db
```

### Test Plans API:
```bash
# Get available plans
curl http://localhost:3333/api/plans/available?region=brazil

# Get plan status (requires auth)
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3333/api/plans/status
```

### Test Frontend:
1. Visit `http://localhost:3003/user/plans`
2. Should show plans from backend (or mock data if not authenticated)

## 🚨 Troubleshooting

### Plans Not Loading:
1. Check database connection
2. Check if `plans` table exists
3. Check authentication token format
4. Fallback mock data should still work

### Database Errors:
1. Ensure PostgreSQL is running
2. Check DATABASE_URL format
3. Run migration script again

### Frontend Errors:
1. Check browser console for auth errors
2. Verify API base URL
3. Check token storage (`auth_access_token`)

## 📈 Next Steps

1. **Add Plan Subscription Logic**: Complete Stripe integration
2. **Add Plan Validation**: Implement business rules
3. **Add Plan Analytics**: Track plan usage
4. **Add Admin Interface**: Manage plans via dashboard

## 💡 Benefits

✅ **Database-Driven**: Plans are now data, not code
✅ **Backward Compatible**: Falls back to mock data gracefully
✅ **Frontend Integration**: Real API calls with auth
✅ **Development Friendly**: Works without database
✅ **Production Ready**: Proper error handling and validation