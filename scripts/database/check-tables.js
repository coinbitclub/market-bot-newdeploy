#!/usr/bin/env node

/**
 * Database Table Structure Checker
 * Verifies users and user_api_keys table structure and relationships
 */

const { Pool } = require('pg');
require('dotenv').config();

class DatabaseChecker {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
    }

    async checkTableExists(tableName) {
        try {
            const result = await this.pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'public'
                    AND table_name = $1
                )
            `, [tableName]);

            return result.rows[0].exists;
        } catch (error) {
            console.error(`❌ Error checking if table ${tableName} exists:`, error.message);
            return false;
        }
    }

    async getTableStructure(tableName) {
        try {
            const result = await this.pool.query(`
                SELECT
                    column_name,
                    data_type,
                    is_nullable,
                    column_default,
                    character_maximum_length
                FROM information_schema.columns
                WHERE table_schema = 'public'
                AND table_name = $1
                ORDER BY ordinal_position
            `, [tableName]);

            return result.rows;
        } catch (error) {
            console.error(`❌ Error getting structure for ${tableName}:`, error.message);
            return [];
        }
    }

    async getForeignKeys(tableName) {
        try {
            const result = await this.pool.query(`
                SELECT
                    kcu.column_name,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                    AND ccu.table_schema = tc.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_name = $1
            `, [tableName]);

            return result.rows;
        } catch (error) {
            console.error(`❌ Error getting foreign keys for ${tableName}:`, error.message);
            return [];
        }
    }

    async getRowCount(tableName) {
        try {
            const result = await this.pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
            return parseInt(result.rows[0].count);
        } catch (error) {
            console.error(`❌ Error getting row count for ${tableName}:`, error.message);
            return 0;
        }
    }

    async checkUsersTable() {
        console.log('\n🔍 CHECKING USERS TABLE');
        console.log('==========================================');

        const exists = await this.checkTableExists('users');
        if (!exists) {
            console.log('❌ Users table does not exist');
            return false;
        }

        console.log('✅ Users table exists');

        const structure = await this.getTableStructure('users');
        const count = await this.getRowCount('users');

        console.log(`📊 Total users: ${count}`);
        console.log('\n📋 Users table structure:');
        console.table(structure.map(col => ({
            column: col.column_name,
            type: col.data_type + (col.character_maximum_length ? `(${col.character_maximum_length})` : ''),
            nullable: col.is_nullable,
            default: col.column_default || 'none'
        })));

        // Check for API key fields in users table
        const apiFields = structure.filter(col =>
            col.column_name.includes('api_key') ||
            col.column_name.includes('secret_key') ||
            col.column_name.includes('testnet')
        );

        if (apiFields.length > 0) {
            console.log('\n🔑 API key fields found in users table:');
            apiFields.forEach(field => {
                console.log(`  - ${field.column_name} (${field.data_type})`);
            });
        }

        return true;
    }

    async checkUserApiKeysTable() {
        console.log('\n🔍 CHECKING USER_API_KEYS TABLE');
        console.log('==========================================');

        const exists = await this.checkTableExists('user_api_keys');
        if (!exists) {
            console.log('❌ user_api_keys table does not exist');
            return false;
        }

        console.log('✅ user_api_keys table exists');

        const structure = await this.getTableStructure('user_api_keys');
        const foreignKeys = await this.getForeignKeys('user_api_keys');
        const count = await this.getRowCount('user_api_keys');

        console.log(`📊 Total API keys: ${count}`);
        console.log('\n📋 user_api_keys table structure:');
        console.table(structure.map(col => ({
            column: col.column_name,
            type: col.data_type + (col.character_maximum_length ? `(${col.character_maximum_length})` : ''),
            nullable: col.is_nullable,
            default: col.column_default || 'none'
        })));

        if (foreignKeys.length > 0) {
            console.log('\n🔗 Foreign key relationships:');
            foreignKeys.forEach(fk => {
                console.log(`  ${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
            });
        }

        return true;
    }

    async checkRelationships() {
        console.log('\n🔍 CHECKING TABLE RELATIONSHIPS');
        console.log('==========================================');

        try {
            // Check if there are users with API keys in both tables
            const usersWithOldApiKeys = await this.pool.query(`
                SELECT COUNT(*) as count FROM users
                WHERE binance_api_key IS NOT NULL OR bybit_api_key IS NOT NULL
            `);

            const usersWithNewApiKeys = await this.pool.query(`
                SELECT COUNT(DISTINCT user_id) as count FROM user_api_keys
            `);

            console.log(`👥 Users with API keys in users table: ${usersWithOldApiKeys.rows[0].count}`);
            console.log(`👥 Users with API keys in user_api_keys table: ${usersWithNewApiKeys.rows[0].count}`);

            // Check for orphaned records
            const orphanedKeys = await this.pool.query(`
                SELECT COUNT(*) as count FROM user_api_keys uak
                LEFT JOIN users u ON uak.user_id = u.id
                WHERE u.id IS NULL
            `);

            if (orphanedKeys.rows[0].count > 0) {
                console.log(`⚠️ Found ${orphanedKeys.rows[0].count} orphaned API keys (no matching user)`);
            } else {
                console.log('✅ No orphaned API keys found');
            }

            // Show sample data if exists
            if (usersWithNewApiKeys.rows[0].count > 0) {
                const sampleData = await this.pool.query(`
                    SELECT
                        u.id, u.username, u.email,
                        uak.exchange, uak.environment, uak.is_active
                    FROM users u
                    JOIN user_api_keys uak ON u.id = uak.user_id
                    ORDER BY u.id
                    LIMIT 5
                `);

                console.log('\n📋 Sample API key relationships:');
                console.table(sampleData.rows);
            }

        } catch (error) {
            console.error('❌ Error checking relationships:', error.message);
        }
    }

    async run() {
        console.log('🔍 DATABASE TABLE STRUCTURE CHECK');
        console.log('==========================================');
        console.log(`🔗 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);

        try {
            await this.checkUsersTable();
            await this.checkUserApiKeysTable();
            await this.checkRelationships();

            console.log('\n✅ Database structure check completed');

        } catch (error) {
            console.error('\n❌ Database check failed:', error.message);
        } finally {
            await this.pool.end();
        }
    }
}

// Run the checker
const checker = new DatabaseChecker();
checker.run().catch(console.error);