

## Overview

The `construct-complete-database.js` script is a comprehensive database construction tool that creates the entire CoinBitClub Enterprise database from scratch with all tables, columns, constraints, indexes, and initial seed data.

## Features

✅ **Complete Database Schema**
- 20+ tables with proper relationships
- All foreign key constraints
- Performance indexes
- JSONB columns for flexible data

✅ **Tables Created**
- Core tables: `users`, `plans`
- User-related: `user_sessions`, `user_settings`, `user_api_keys`, `user_balances`, `user_banking_settings`, etc.
- Trading: `trading_operations`, `performance_metrics`
- Payments: `payment_transactions`, `transactions`, `withdrawal_requests`
- Stripe: `stripe_customers`, `stripe_checkout_sessions`, `stripe_payment_intents`, etc.
- Affiliate: `commission_records`, `coupons`, `coupon_usage`

✅ **Initial Data Seeding**
- 5 default plans (TRIAL, FLEX_BR, PRO_BR, FLEX_US, PRO_US)
- Default admin user (username: `admin`, password: `admin123`)
- Sample data for testing

✅ **Smart Features**
- Connection validation before starting
- Graceful error handling
- Progress tracking with statistics
- Verification after construction
- Optional drop existing tables

## Usage

### 1. Basic Construction (Adds missing tables/columns)

```bash
node construct-complete-database.js
```

or using npm script:

```bash
npm run db:construct
```

This will:
- Connect to your database
- Create any missing tables
- Add any missing columns
- Create indexes
- Seed initial data (if tables are empty)
- Verify the structure

### 2. Fresh Construction (Drops all existing data)

⚠️ **WARNING: This will DELETE ALL existing data!**

```bash
node construct-complete-database.js --drop-existing
```

or using npm script:

```bash
npm run db:construct:fresh
```

This will:
- Drop all existing tables
- Create all tables from scratch
- Create all indexes
- Seed fresh initial data
- Verify the structure

## Environment Variables

Make sure your `.env` file contains:

```env
DATABASE_URL=postgresql://user:password@host:port/database
NODE_ENV=production
```

Example for Railway.app, Render.com, etc.:
```env
DATABASE_URL=postgresql://postgres:password@containers-us-west-123.railway.app:5432/railway?sslmode=require
NODE_ENV=production
```

## What Gets Created

### Core Tables

**plans**
- All plan configurations
- Regional pricing (Brazil/International)
- Commission rates
- Feature lists

**users**
- Full user profiles
- Multiple balance types (real, admin, commission)
- Exchange API keys
- Trading settings
- Banking information
- Affiliate tracking
- Security settings

### User Settings Tables

- `user_sessions` - Active user sessions
- `user_settings` - Key-value user settings
- `user_api_keys` - Exchange API key management
- `user_balances` - Detailed balance tracking
- `user_banking_settings` - Banking/PIX information
- `user_notification_settings` - Notification preferences
- `user_personal_settings` - Language, timezone, theme
- `user_preferences` - Dashboard customization
- `user_security_settings` - 2FA, login security
- `user_trading_settings` - Trading preferences

### Trading Tables

**trading_operations**
- Full trading history
- Entry/exit prices
- P&L tracking
- Signal confidence scores
- Risk management (stop loss, take profit)
- Exchange information

**performance_metrics**
- User performance tracking
- Custom metrics storage

### Payment Tables

**payment_transactions**
- Payment history
- Stripe integration
- Transaction status

**transactions**
- All financial transactions
- Commission tracking
- Balance movements

**withdrawal_requests**
- Withdrawal processing
- Admin approval workflow

### Stripe Tables

- `stripe_customers` - Stripe customer records
- `stripe_checkout_sessions` - Checkout session tracking
- `stripe_payment_intents` - Payment intent tracking
- `stripe_setup_intents` - Setup intent tracking
- `stripe_webhook_events` - Webhook event log

### Affiliate Tables

**commission_records**
- Commission earning history
- Affiliate tracking

**coupons**
- Discount coupon management
- Usage tracking

**coupon_usage**
- Coupon redemption history

## Performance Indexes

The script creates indexes on:
- User emails, usernames
- Plan codes, regions
- Trading operations (user_id, trading_pair, status, timestamps)
- Performance metrics (user_id, metric_key, timestamps)
- Payment transactions (user_id, status, timestamps)
- User sessions (user_id, expiration)

## Initial Seed Data

### Plans
- **TRIAL**: Free 7-day trial
- **FLEX_BR**: Brazilian prepaid plan (R$150 min, 20% commission)
- **PRO_BR**: Brazilian monthly plan (R$297/month, 10% commission)
- **FLEX_US**: International prepaid plan ($30 min, 20% commission)
- **PRO_US**: International monthly plan ($50/month, 10% commission)

### Admin User
- Username: `admin`
- Email: `admin@coinbitclub.com`
- Password: `admin123`
- Type: `ADMIN`
- Plan: `PRO_US`

⚠️ **Remember to change the admin password after first login!**

## Verification

After construction, the script automatically:
1. Lists all created tables
2. Shows record counts for key tables
3. Displays construction statistics

Example output:
```
📊 Construction Statistics:
   ✅ Tables created: 20
   ✅ Indexes created: 18
   ✅ Data records seeded: 6
   ❌ Errors: 0

📋 Total tables created: 20
   - commission_records
   - coupon_usage
   - coupons
   ...

📊 Data counts:
   - users: 1 records
   - plans: 5 records
   - trading_operations: 0 records
   - performance_metrics: 0 records

🎉 Database construction completed successfully!
✅ Your database is ready for production use
```

## Troubleshooting

### Connection Failed
```
❌ Database connection failed: connection refused
```
**Solution**: Check your `DATABASE_URL` in `.env` file

### SSL/TLS Required
```
❌ SSL/TLS required
```
**Solution**: Ensure `NODE_ENV=production` is set or add `?sslmode=require` to your `DATABASE_URL`

### Permission Denied
```
❌ permission denied to create table
```
**Solution**: Ensure your database user has CREATE privileges

### Table Already Exists
```
⚠️ Create users table (already exists)
```
**Solution**: This is normal. The script uses `CREATE TABLE IF NOT EXISTS` for safety

## Migration from Old Database

If you have an existing database with data you want to keep:

1. **Backup your current database first!**
   ```bash
   pg_dump -U user -d database > backup.sql
   ```

2. **Run the basic construction** (without --drop-existing):
   ```bash
   npm run db:construct
   ```
   This adds only missing tables/columns without deleting data.

3. **Verify your data is intact**:
   ```bash
   npm run test:db
   ```

## Integration with Application

After running the database construction:

1. **Test backend connection**:
   ```bash
   npm run test:db
   ```

2. **Start the backend**:
   ```bash
   npm start
   ```

3. **Verify API endpoints**:
   - `/api/health` - Should return healthy
   - `/api/plans/available` - Should return 5 plans
   - `/api/auth/login` - Should work with admin credentials

4. **Test frontend**:
   - Login with admin credentials
   - Check user dashboard
   - Verify plans page shows all plans

## Complete Database Structure

```
CoinBitClub Enterprise Database
├── Core
│   ├── users (62 columns)
│   └── plans (16 columns)
├── User Management
│   ├── user_sessions
│   ├── user_settings
│   ├── user_api_keys
│   ├── user_balances
│   ├── user_banking_settings
│   ├── user_notification_settings
│   ├── user_personal_settings
│   ├── user_preferences
│   ├── user_security_settings
│   └── user_trading_settings
├── Trading
│   ├── trading_operations (38 columns)
│   └── performance_metrics
├── Payments
│   ├── payment_transactions
│   ├── transactions
│   └── withdrawal_requests
├── Stripe Integration
│   ├── stripe_customers
│   ├── stripe_checkout_sessions
│   ├── stripe_payment_intents
│   ├── stripe_setup_intents
│   └── stripe_webhook_events
└── Affiliate System
    ├── commission_records
    ├── coupons
    └── coupon_usage
```

## Best Practices

1. **Always backup before running with --drop-existing**
2. **Run verification after construction**: `npm run test:db`
3. **Change default admin password immediately**
4. **Test in development before production**
5. **Use the basic construction for updates** (without --drop-existing)
6. **Monitor the statistics output for errors**

## Support

If you encounter any issues:

1. Check the error message in the console
2. Verify your `DATABASE_URL` is correct
3. Ensure your database user has proper permissions
4. Check the troubleshooting section above
5. Review the verification output

---

**Your database is now ready for production! 🎉**
