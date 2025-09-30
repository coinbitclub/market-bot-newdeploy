# 🚀 Backend Deployment Guide

## Database Connection Issues

If you're seeing errors like:
```
❌ Master: Indisponível - connect ECONNREFUSED ::1:5432
🚨 ALERTA: Master database indisponível!
```

This means your backend is trying to connect to a local PostgreSQL database that doesn't exist in your deployment environment.

## Quick Fix

### 1. Set Database Environment Variables

You need to provide your database connection details. Choose one of these options:

#### Option A: Use DATABASE_URL (Recommended)
```bash
DATABASE_URL=postgresql://username:password@host:port/database_name
```

#### Option B: Use Individual Variables
```bash
DB_HOST=your-database-host.com
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_username
DB_PASSWORD=your_password
```

### 2. Platform-Specific Examples

#### Railway
```bash
DATABASE_URL=postgresql://postgres:password@containers-us-west-xyz.railway.app:5432/railway
```

#### Heroku
```bash
DATABASE_URL=postgres://username:password@hostname:5432/database
```

#### DigitalOcean
```bash
DATABASE_URL=postgresql://username:password@db-postgresql-nyc1-12345-do-user-123456-0.db.ondigitalocean.com:25060/defaultdb?sslmode=require
```

#### Supabase
```bash
DATABASE_URL=postgresql://postgres:password@db.xyz.supabase.co:5432/postgres
```

#### Neon
```bash
DATABASE_URL=postgresql://username:password@ep-xyz.us-east-1.aws.neon.tech/neondb?sslmode=require
```

## Deployment Platforms

### Railway
1. **Add PostgreSQL service** in Railway dashboard
2. **Set environment variables:**
   ```bash
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   NODE_ENV=production
   ```
3. **Deploy your code**

### Heroku
1. **Add PostgreSQL addon:**
   ```bash
   heroku addons:create heroku-postgresql:hobby-dev
   ```
2. **Environment variables are automatically set:**
   ```bash
   DATABASE_URL=postgres://...
   ```
3. **Deploy:**
   ```bash
   git push heroku main
   ```

### DigitalOcean App Platform
1. **Create PostgreSQL database** in DigitalOcean
2. **Set environment variables** in App Platform:
   ```bash
   DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
   NODE_ENV=production
   ```
3. **Deploy your app**

### Vercel (with external database)
1. **Set environment variables** in Vercel dashboard:
   ```bash
   DATABASE_URL=your_external_database_url
   NODE_ENV=production
   ```
2. **Deploy:**
   ```bash
   vercel --prod
   ```

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Complete database connection string | `postgresql://user:pass@host:5432/db` |
| `DB_HOST` | Database host | `db.example.com` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `myapp_production` |
| `DB_USER` | Database username | `postgres` |
| `DB_PASSWORD` | Database password | `secure_password` |
| `NODE_ENV` | Environment | `production` |

## Mock Mode Fallback

If no database configuration is provided, the backend will automatically run in **mock mode**:
- ✅ API endpoints will work with mock data
- ✅ No database connection required
- ✅ Perfect for testing and development
- ⚠️ Data won't persist between restarts

## Testing Database Connection

### 1. Check Environment Variables
```bash
echo $DATABASE_URL
```

### 2. Test Connection
```bash
# Using psql
psql $DATABASE_URL -c "SELECT version();"

# Using Node.js
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT version()', (err, res) => {
  if (err) console.error(err);
  else console.log(res.rows[0]);
  pool.end();
});
"
```

### 3. Check Backend Logs
Look for these messages:
- ✅ `✅ Conectado ao PostgreSQL`
- ✅ `✅ Todos os pools de conexão inicializados`
- ⚠️ `⚠️ No database configuration found, running in mock mode`

## Troubleshooting

### Connection Refused
- **Problem:** `ECONNREFUSED ::1:5432`
- **Solution:** Set proper `DATABASE_URL` or database environment variables

### SSL Issues
- **Problem:** SSL connection errors
- **Solution:** Add `?sslmode=require` to your DATABASE_URL

### Authentication Failed
- **Problem:** `password authentication failed`
- **Solution:** Check username and password in your DATABASE_URL

### Database Not Found
- **Problem:** `database "xyz" does not exist`
- **Solution:** Create the database or update the database name in your connection string

## Production Checklist

- [ ] Database environment variables set
- [ ] SSL enabled for production (`sslmode=require`)
- [ ] Connection pooling configured
- [ ] Database migrations run (if needed)
- [ ] Backup strategy in place
- [ ] Monitoring configured

## Support

If you're still having issues:
1. Check your hosting platform's database documentation
2. Verify your database credentials
3. Test the connection string locally
4. Check the backend logs for specific error messages
