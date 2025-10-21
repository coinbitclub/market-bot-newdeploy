#!/usr/bin/env node

/**
 * 🔧 DATABASE MIGRATION: Add position_size_percentage column
 * =========================================================
 * 
 * This script adds the missing position_size_percentage column to the users table.
 * It's safe to run multiple times as it checks if the column already exists.
 * 
 * Usage: node scripts/database/add-position-size-percentage-column.js
 */
require('dotenv').config({ path: '.env' });

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

class PositionSizePercentageMigration {
    constructor() {
        this.pool = null;
    }

    async initialize() {
        try {
            // Get database configuration
            const connectionString = process.env.DATABASE_URL || 
                                   process.env.POSTGRES_URL || 
                                   process.env.DB_URL;
            
            if (!connectionString) {
                console.error('❌ No database connection string found. Please set DATABASE_URL or POSTGRES_URL environment variable.');
                process.exit(1);
            }

            // Auto-detect if SSL is needed
            const needsSSL = process.env.NODE_ENV === 'production' || 
                           connectionString.includes('sslmode=require') ||
                           connectionString.includes('railway.app') ||
                           connectionString.includes('render.com') ||
                           connectionString.includes('supabase.co') ||
                           connectionString.includes('heroku.com');

            this.pool = new Pool({
                connectionString,
                ssl: needsSSL ? { rejectUnauthorized: false } : false,
                max: 5,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 10000
            });

            // Test connection
            const client = await this.pool.connect();
            console.log('✅ Connected to database');
            client.release();

        } catch (error) {
            console.error('❌ Failed to connect to database:', error.message);
            process.exit(1);
        }
    }

    async runMigration() {
        try {
            console.log('🚀 Starting position_size_percentage column migration...');
            
            // Read the migration SQL file
            const migrationPath = path.join(__dirname, '../../migrations/add-position-size-percentage-column.sql');
            const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
            
            // Execute the migration
            const result = await this.pool.query(migrationSQL);
            
            console.log('✅ Migration completed successfully');
            console.log('📊 Migration result:', result);
            
            // Verify the column exists
            await this.verifyColumn();
            
        } catch (error) {
            console.error('❌ Migration failed:', error.message);
            console.error('Full error:', error);
            throw error;
        }
    }

    async verifyColumn() {
        try {
            console.log('🔍 Verifying column was added...');
            
            const result = await this.pool.query(`
                SELECT 
                    column_name, 
                    data_type, 
                    column_default, 
                    is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                AND column_name = 'position_size_percentage'
            `);
            
            if (result.rows.length > 0) {
                console.log('✅ Column verification successful:');
                console.log('   Column:', result.rows[0].column_name);
                console.log('   Type:', result.rows[0].data_type);
                console.log('   Default:', result.rows[0].column_default);
                console.log('   Nullable:', result.rows[0].is_nullable);
            } else {
                console.log('⚠️ Column not found after migration');
            }
            
        } catch (error) {
            console.error('❌ Column verification failed:', error.message);
        }
    }

    async checkExistingData() {
        try {
            console.log('📊 Checking existing user data...');
            
            const result = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(position_size_percentage) as users_with_position_size,
                    AVG(position_size_percentage) as avg_position_size
                FROM users
            `);
            
            if (result.rows.length > 0) {
                const stats = result.rows[0];
                console.log('📈 User statistics:');
                console.log(`   Total users: ${stats.total_users}`);
                console.log(`   Users with position_size_percentage: ${stats.users_with_position_size}`);
                console.log(`   Average position size: ${parseFloat(stats.avg_position_size || 0).toFixed(2)}%`);
            }
            
        } catch (error) {
            console.error('❌ Failed to check existing data:', error.message);
        }
    }

    async close() {
        if (this.pool) {
            await this.pool.end();
            console.log('🔌 Database connection closed');
        }
    }
}

// Main execution
async function main() {
    const migration = new PositionSizePercentageMigration();
    
    try {
        await migration.initialize();
        await migration.runMigration();
        await migration.checkExistingData();
        console.log('🎉 Migration completed successfully!');
        
    } catch (error) {
        console.error('💥 Migration failed:', error.message);
        process.exit(1);
        
    } finally {
        await migration.close();
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = PositionSizePercentageMigration;
