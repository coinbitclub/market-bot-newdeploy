#!/bin/bash

# 🚀 Database Deployment Script
# =============================
# 
# This script handles database migration and seeding for deployment
# Works with any PostgreSQL database provider
#
# Usage:
#   chmod +x deploy-database.sh
#   ./deploy-database.sh
#
# Environment Variables Required:
#   DATABASE_URL or individual DB_* variables
#

set -e  # Exit on any error

echo "🚀 Starting database deployment..."
echo "=================================="

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ] && [ -z "$DB_PASSWORD" ]; then
    echo "❌ Error: No database configuration found"
    echo "Please set either:"
    echo "  - DATABASE_URL=postgresql://user:pass@host:port/db"
    echo "  - Or individual DB_* variables (DB_HOST, DB_USER, DB_PASSWORD, etc.)"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed"
    exit 1
fi

echo "✅ Environment check passed"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install --production
fi

# Run database migration and seeding
echo "🔄 Running database migration and seeding..."
npm run db:setup:deploy

# Verify setup
echo "🔍 Verifying database setup..."
npm run test:db

echo ""
echo "🎉 Database deployment completed successfully!"
echo "✅ Your database is ready for production"
echo ""
echo "Next steps:"
echo "1. Start your backend: npm start"
echo "2. Test API endpoints: curl http://localhost:3333/api/plans/available"
echo "3. Check logs for any errors"
