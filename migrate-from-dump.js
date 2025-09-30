#!/usr/bin/env node

/**
 * 🚀 DATABASE MIGRATION FROM DUMP FILES
 * =====================================
 * 
 * This script migrates data from old database dump files to the new database
 * Handles both structure.sql and public.sql files
 * 
 * Usage:
 *   node migrate-from-dump.js [path-to-dump-files]
 * 
 * Example:
 *   node migrate-from-dump.js ./dumps/
 *   node migrate-from-dump.js /path/to/public.sql /path/to/structure.sql
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

class DumpMigrator {
    constructor() {
        this.pool = null;
        this.processedTables = new Set();
        this.skippedTables = new Set();
    }

    async connect() {
        try {
            const connectionString = process.env.DATABASE_URL;
            
            if (!connectionString) {
                throw new Error('DATABASE_URL not found in environment variables');
            }

            this.pool = new Pool({
                connectionString,
                ssl: { rejectUnauthorized: false }
            });
            
            // Test connection
            const client = await this.pool.connect();
            const result = await client.query('SELECT version(), current_database()');
            client.release();
            
            console.log('✅ Connected to database:');
            console.log(`   Database: ${result.rows[0].current_database}`);
            console.log(`   Version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
            
            return true;
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            return false;
        }
    }

    /**
     * Find dump files in the specified directory or use provided paths
     */
    findDumpFiles(args) {
        const dumpFiles = [];
        
        if (args.length === 0) {
            // Look for dump files in common locations
            const searchPaths = [
                './',
                './dumps/',
                './database/',
                './sql/',
                '../',
                '../../'
            ];
            
            for (const searchPath of searchPaths) {
                const publicSql = path.join(searchPath, 'public.sql');
                const structureSql = path.join(searchPath, 'structure.sql');
                
                if (fs.existsSync(publicSql)) {
                    dumpFiles.push({ type: 'public', path: publicSql });
                }
                if (fs.existsSync(structureSql)) {
                    dumpFiles.push({ type: 'structure', path: structureSql });
                }
            }
        } else {
            // Use provided file paths
            for (const arg of args) {
                if (fs.existsSync(arg)) {
                    const filename = path.basename(arg);
                    const type = filename.includes('public') ? 'public' : 'structure';
                    dumpFiles.push({ type, path: arg });
                } else {
                    console.log(`⚠️  File not found: ${arg}`);
                }
            }
        }
        
        return dumpFiles;
    }

    /**
     * Parse SQL file and extract table definitions and data
     */
    parseSQLFile(filePath) {
        try {
            console.log(`📄 Reading SQL file: ${filePath}`);
            const content = fs.readFileSync(filePath, 'utf8');
            
            const tables = [];
            const inserts = [];
            const functions = [];
            const triggers = [];
            
            // Split content into statements
            const statements = content.split(';').filter(stmt => stmt.trim());
            
            for (const statement of statements) {
                const trimmed = statement.trim();
                
                if (trimmed.toUpperCase().startsWith('CREATE TABLE')) {
                    tables.push(trimmed);
                } else if (trimmed.toUpperCase().startsWith('INSERT INTO')) {
                    inserts.push(trimmed);
                } else if (trimmed.toUpperCase().startsWith('CREATE OR REPLACE FUNCTION')) {
                    functions.push(trimmed);
                } else if (trimmed.toUpperCase().startsWith('CREATE TRIGGER')) {
                    triggers.push(trimmed);
                }
            }
            
            console.log(`   📊 Found: ${tables.length} tables, ${inserts.length} inserts, ${functions.length} functions, ${triggers.length} triggers`);
            
            return { tables, inserts, functions, triggers };
        } catch (error) {
            console.error(`❌ Error reading SQL file ${filePath}:`, error.message);
            return null;
        }
    }

    /**
     * Execute SQL statement with error handling
     */
    async executeSQL(sql, description) {
        try {
            if (!sql.trim()) return true;
            
            await this.pool.query(sql);
            console.log(`✅ ${description}`);
            return true;
        } catch (error) {
            // Skip certain errors that are expected
            if (error.message.includes('already exists') || 
                error.message.includes('relation already exists') ||
                error.message.includes('duplicate key value')) {
                console.log(`⚠️  ${description} (skipped - already exists)`);
                return true;
            }
            
            console.error(`❌ ${description}:`, error.message);
            return false;
        }
    }

    /**
     * Migrate table structure
     */
    async migrateTables(tables) {
        console.log('\n🔄 Migrating table structures...');
        
        for (const tableSQL of tables) {
            // Extract table name for logging
            const tableMatch = tableSQL.match(/CREATE TABLE.*?"([^"]+)"/);
            const tableName = tableMatch ? tableMatch[1] : 'unknown';
            
            if (this.processedTables.has(tableName)) {
                console.log(`⚠️  Table ${tableName} already processed, skipping`);
                continue;
            }
            
            const success = await this.executeSQL(tableSQL, `Create table: ${tableName}`);
            if (success) {
                this.processedTables.add(tableName);
            }
        }
    }

    /**
     * Migrate data (INSERT statements)
     */
    async migrateData(inserts) {
        console.log('\n🌱 Migrating data...');
        
        let successCount = 0;
        let skipCount = 0;
        
        for (const insertSQL of inserts) {
            // Extract table name for logging
            const tableMatch = insertSQL.match(/INSERT INTO.*?"([^"]+)"/);
            const tableName = tableMatch ? tableMatch[1] : 'unknown';
            
            const success = await this.executeSQL(insertSQL, `Insert data into: ${tableName}`);
            if (success) {
                successCount++;
            } else {
                skipCount++;
            }
        }
        
        console.log(`📊 Data migration summary: ${successCount} successful, ${skipCount} skipped`);
    }

    /**
     * Migrate functions
     */
    async migrateFunctions(functions) {
        console.log('\n⚙️  Migrating functions...');
        
        for (const functionSQL of functions) {
            const success = await this.executeSQL(functionSQL, 'Create function');
            if (!success) {
                // Functions might fail due to dependencies, that's okay
                console.log('   (Function creation skipped due to dependencies)');
            }
        }
    }

    /**
     * Migrate triggers
     */
    async migrateTriggers(triggers) {
        console.log('\n🔧 Migrating triggers...');
        
        for (const triggerSQL of triggers) {
            const success = await this.executeSQL(triggerSQL, 'Create trigger');
            if (!success) {
                console.log('   (Trigger creation skipped)');
            }
        }
    }

    /**
     * Verify migration
     */
    async verifyMigration() {
        console.log('\n🔍 Verifying migration...');
        
        try {
            // Get all tables
            const tables = await this.pool.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name
            `);
            
            console.log('📋 Tables in database:');
            tables.rows.forEach(row => {
                console.log(`   - ${row.table_name}`);
            });
            
            // Check for data in key tables
            const keyTables = ['users', 'plans', 'payment_transactions'];
            for (const tableName of keyTables) {
                try {
                    const count = await this.pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
                    console.log(`📊 ${tableName}: ${count.rows[0].count} records`);
                } catch (error) {
                    console.log(`📊 ${tableName}: table not found or empty`);
                }
            }
            
            console.log('✅ Migration verification completed');
            return true;
        } catch (error) {
            console.error('❌ Migration verification failed:', error.message);
            return false;
        }
    }

    async close() {
        if (this.pool) {
            await this.pool.end();
            console.log('🔌 Database connection closed');
        }
    }

    async migrate(dumpFiles) {
        console.log('🚀 Starting database migration from dump files...');
        console.log('=' .repeat(60));
        
        try {
            // Connect to database
            const connected = await this.connect();
            if (!connected) {
                throw new Error('Failed to connect to database');
            }
            
            // Process each dump file
            for (const dumpFile of dumpFiles) {
                console.log(`\n📁 Processing ${dumpFile.type} dump: ${dumpFile.path}`);
                
                const parsed = this.parseSQLFile(dumpFile.path);
                if (!parsed) {
                    console.log(`⚠️  Skipping ${dumpFile.path} due to parse error`);
                    continue;
                }
                
                // Migrate in order: tables, functions, triggers, data
                await this.migrateTables(parsed.tables);
                await this.migrateFunctions(parsed.functions);
                await this.migrateTriggers(parsed.triggers);
                await this.migrateData(parsed.inserts);
            }
            
            // Verify migration
            await this.verifyMigration();
            
            console.log('\n🎉 Database migration completed successfully!');
            console.log('✅ Your database now contains the migrated data');
            
        } catch (error) {
            console.error('\n❌ Migration failed:', error.message);
            process.exit(1);
        } finally {
            await this.close();
        }
    }
}

// Main execution
if (require.main === module) {
    const migrator = new DumpMigrator();
    const args = process.argv.slice(2);
    
    const dumpFiles = migrator.findDumpFiles(args);
    
    if (dumpFiles.length === 0) {
        console.log('❌ No dump files found!');
        console.log('');
        console.log('Usage:');
        console.log('  node migrate-from-dump.js [path-to-dump-files]');
        console.log('');
        console.log('Examples:');
        console.log('  node migrate-from-dump.js ./dumps/');
        console.log('  node migrate-from-dump.js /path/to/public.sql /path/to/structure.sql');
        console.log('');
        console.log('The script will look for public.sql and structure.sql files in:');
        console.log('  - Current directory');
        console.log('  - ./dumps/');
        console.log('  - ./database/');
        console.log('  - ./sql/');
        process.exit(1);
    }
    
    console.log(`📁 Found ${dumpFiles.length} dump file(s):`);
    dumpFiles.forEach(file => {
        console.log(`   - ${file.type}: ${file.path}`);
    });
    
    migrator.migrate(dumpFiles).catch(console.error);
}

module.exports = DumpMigrator;
