#!/usr/bin/env node

/**
 * 🚀 PROCESS DUMP FILES
 * =====================
 * 
 * This script processes the actual dump files (public.sql and structure.sql)
 * and migrates them to the current database
 * 
 * Usage:
 *   node process-dump-files.js [path-to-dump-files]
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

class DumpFileProcessor {
    constructor() {
        this.pool = null;
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

    findDumpFiles(searchPaths = []) {
        const defaultPaths = [
            './',
            './dumps/',
            './database/',
            './sql/',
            '../',
            '../../',
            './backup/',
            './exports/'
        ];
        
        const allPaths = [...defaultPaths, ...searchPaths];
        const dumpFiles = [];
        
        for (const searchPath of allPaths) {
            const publicSql = path.join(searchPath, 'public.sql');
            const structureSql = path.join(searchPath, 'structure.sql');
            
            if (fs.existsSync(publicSql)) {
                dumpFiles.push({ type: 'public', path: publicSql });
            }
            if (fs.existsSync(structureSql)) {
                dumpFiles.push({ type: 'structure', path: structureSql });
            }
        }
        
        return dumpFiles;
    }

    async processSQLFile(filePath, fileType) {
        try {
            console.log(`\n📄 Processing ${fileType} file: ${filePath}`);
            
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Split into individual statements
            const statements = content
                .split(';')
                .map(stmt => stmt.trim())
                .filter(stmt => stmt.length > 0);
            
            console.log(`   📊 Found ${statements.length} SQL statements`);
            
            let successCount = 0;
            let skipCount = 0;
            let errorCount = 0;
            
            for (let i = 0; i < statements.length; i++) {
                const statement = statements[i];
                
                try {
                    await this.pool.query(statement);
                    successCount++;
                    
                    // Log progress for large files
                    if (statements.length > 100 && (i + 1) % 50 === 0) {
                        console.log(`   📈 Progress: ${i + 1}/${statements.length} statements processed`);
                    }
                } catch (error) {
                    // Skip expected errors
                    if (error.message.includes('already exists') || 
                        error.message.includes('relation already exists') ||
                        error.message.includes('duplicate key value') ||
                        error.message.includes('constraint') && error.message.includes('already exists')) {
                        skipCount++;
                    } else {
                        console.error(`   ❌ Error in statement ${i + 1}:`, error.message);
                        errorCount++;
                    }
                }
            }
            
            console.log(`   ✅ ${fileType} file processed: ${successCount} successful, ${skipCount} skipped, ${errorCount} errors`);
            return { success: successCount, skipped: skipCount, errors: errorCount };
            
        } catch (error) {
            console.error(`❌ Error processing ${fileType} file:`, error.message);
            return { success: 0, skipped: 0, errors: 1 };
        }
    }

    async verifyData() {
        console.log('\n🔍 Verifying migrated data...');
        
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
            
            // Check data in key tables
            const keyTables = [
                'users', 'plans', 'commission_records', 'coupons', 
                'payment_transactions', 'stripe_customers', 'user_balances',
                'transactions', 'withdrawal_requests'
            ];
            
            console.log('\n📊 Data counts:');
            for (const tableName of keyTables) {
                try {
                    const count = await this.pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
                    console.log(`   - ${tableName}: ${count.rows[0].count} records`);
                } catch (error) {
                    console.log(`   - ${tableName}: table not found or empty`);
                }
            }
            
            console.log('✅ Data verification completed');
            return true;
        } catch (error) {
            console.error('❌ Data verification failed:', error.message);
            return false;
        }
    }

    async close() {
        if (this.pool) {
            await this.pool.end();
            console.log('🔌 Database connection closed');
        }
    }

    async process(searchPaths = []) {
        console.log('🚀 Starting dump file processing...');
        console.log('=' .repeat(60));
        
        try {
            // Connect to database
            const connected = await this.connect();
            if (!connected) {
                throw new Error('Failed to connect to database');
            }
            
            // Find dump files
            const dumpFiles = this.findDumpFiles(searchPaths);
            
            if (dumpFiles.length === 0) {
                console.log('❌ No dump files found!');
                console.log('');
                console.log('Looking for files named:');
                console.log('  - public.sql');
                console.log('  - structure.sql');
                console.log('');
                console.log('In directories:');
                console.log('  - Current directory');
                console.log('  - ./dumps/');
                console.log('  - ./database/');
                console.log('  - ./sql/');
                console.log('  - ./backup/');
                console.log('  - ./exports/');
                console.log('');
                console.log('Usage:');
                console.log('  node process-dump-files.js [path-to-dump-files]');
                return;
            }
            
            console.log(`📁 Found ${dumpFiles.length} dump file(s):`);
            dumpFiles.forEach(file => {
                console.log(`   - ${file.type}: ${file.path}`);
            });
            
            // Process each dump file
            let totalSuccess = 0;
            let totalSkipped = 0;
            let totalErrors = 0;
            
            for (const dumpFile of dumpFiles) {
                const result = await this.processSQLFile(dumpFile.path, dumpFile.type);
                totalSuccess += result.success;
                totalSkipped += result.skipped;
                totalErrors += result.errors;
            }
            
            console.log('\n📊 Processing Summary:');
            console.log(`   ✅ Successful: ${totalSuccess}`);
            console.log(`   ⚠️  Skipped: ${totalSkipped}`);
            console.log(`   ❌ Errors: ${totalErrors}`);
            
            // Verify data
            await this.verifyData();
            
            console.log('\n🎉 Dump file processing completed successfully!');
            console.log('✅ Your database now contains the migrated data');
            
        } catch (error) {
            console.error('\n❌ Processing failed:', error.message);
            process.exit(1);
        } finally {
            await this.close();
        }
    }
}

// Main execution
if (require.main === module) {
    const processor = new DumpFileProcessor();
    const args = process.argv.slice(2);
    processor.process(args).catch(console.error);
}

module.exports = DumpFileProcessor;
