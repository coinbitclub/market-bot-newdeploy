/**
 * EMERGENCY MIGRATION ENDPOINT
 * Adds missing columns to database tables
 * Access via: GET /api/emergency-migration/run
 */

class EmergencyMigrationRoute {
    constructor() {
        this.dbPoolManager = null;
    }

    setDbPoolManager(dbPoolManager) {
        this.dbPoolManager = dbPoolManager;
    }

    async runMigration(req, res) {
        try {
            console.log('🚨 EMERGENCY MIGRATION STARTED');

            const steps = [];

            // Step 1: Add columns to user_api_keys
            try {
                await this.dbPoolManager.executeWrite(`
                    ALTER TABLE user_api_keys
                    ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE
                `);
                steps.push('✅ Added column: user_api_keys.enabled');
            } catch (e) {
                steps.push(`⚠️ user_api_keys.enabled: ${e.message}`);
            }

            try {
                await this.dbPoolManager.executeWrite(`
                    ALTER TABLE user_api_keys
                    ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE
                `);
                steps.push('✅ Added column: user_api_keys.verified');
            } catch (e) {
                steps.push(`⚠️ user_api_keys.verified: ${e.message}`);
            }

            try {
                await this.dbPoolManager.executeWrite(`
                    ALTER TABLE user_api_keys
                    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP
                `);
                steps.push('✅ Added column: user_api_keys.verified_at');
            } catch (e) {
                steps.push(`⚠️ user_api_keys.verified_at: ${e.message}`);
            }

            try {
                await this.dbPoolManager.executeWrite(`
                    ALTER TABLE user_api_keys
                    ADD COLUMN IF NOT EXISTS last_connection TIMESTAMP
                `);
                steps.push('✅ Added column: user_api_keys.last_connection');
            } catch (e) {
                steps.push(`⚠️ user_api_keys.last_connection: ${e.message}`);
            }

            // Step 2: Add column to users table
            try {
                await this.dbPoolManager.executeWrite(`
                    ALTER TABLE users
                    ADD COLUMN IF NOT EXISTS trading_mode VARCHAR(20) DEFAULT 'PERSONAL'
                `);
                steps.push('✅ Added column: users.trading_mode');
            } catch (e) {
                steps.push(`⚠️ users.trading_mode: ${e.message}`);
            }

            // Step 3: Create permissions table
            try {
                await this.dbPoolManager.executeWrite(`
                    CREATE TABLE IF NOT EXISTS user_api_key_permissions (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        exchange VARCHAR(20) NOT NULL,
                        can_trade BOOLEAN DEFAULT FALSE,
                        can_withdraw BOOLEAN DEFAULT FALSE,
                        can_read BOOLEAN DEFAULT FALSE,
                        last_checked_at TIMESTAMP,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(user_id, exchange)
                    )
                `);
                steps.push('✅ Created table: user_api_key_permissions');
            } catch (e) {
                steps.push(`⚠️ user_api_key_permissions: ${e.message}`);
            }

            // Step 4: Create audit table
            try {
                await this.dbPoolManager.executeWrite(`
                    CREATE TABLE IF NOT EXISTS user_api_keys_audit (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        exchange VARCHAR(100) NOT NULL,
                        action VARCHAR(100) NOT NULL,
                        status VARCHAR(50) NOT NULL,
                        details TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `);
                steps.push('✅ Created table: user_api_keys_audit');
            } catch (e) {
                steps.push(`⚠️ user_api_keys_audit: ${e.message}`);
            }

            // Step 5: Create indexes
            try {
                await this.dbPoolManager.executeWrite(`
                    CREATE INDEX IF NOT EXISTS idx_user_api_keys_audit_user_id
                    ON user_api_keys_audit(user_id)
                `);
                steps.push('✅ Created index: idx_user_api_keys_audit_user_id');
            } catch (e) {
                steps.push(`⚠️ idx_user_api_keys_audit_user_id: ${e.message}`);
            }

            try {
                await this.dbPoolManager.executeWrite(`
                    CREATE INDEX IF NOT EXISTS idx_user_api_keys_audit_created_at
                    ON user_api_keys_audit(created_at)
                `);
                steps.push('✅ Created index: idx_user_api_keys_audit_created_at');
            } catch (e) {
                steps.push(`⚠️ idx_user_api_keys_audit_created_at: ${e.message}`);
            }

            // Step 6: Update existing data
            try {
                const result = await this.dbPoolManager.executeWrite(`
                    UPDATE user_api_keys
                    SET enabled = TRUE, verified = FALSE
                    WHERE enabled IS NULL OR verified IS NULL
                `);
                steps.push(`✅ Updated ${result.rowCount} rows in user_api_keys`);
            } catch (e) {
                steps.push(`⚠️ Update user_api_keys: ${e.message}`);
            }

            try {
                const result = await this.dbPoolManager.executeWrite(`
                    UPDATE users
                    SET trading_mode = 'PERSONAL'
                    WHERE trading_mode IS NULL
                `);
                steps.push(`✅ Updated ${result.rowCount} rows in users`);
            } catch (e) {
                steps.push(`⚠️ Update users: ${e.message}`);
            }

            console.log('✅ EMERGENCY MIGRATION COMPLETED');
            console.log(steps.join('\n'));

            res.json({
                success: true,
                message: 'Migration completed',
                steps: steps,
                note: 'RESTART BACKEND SERVER NOW for changes to take effect'
            });

        } catch (error) {
            console.error('❌ Migration failed:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                stack: error.stack
            });
        }
    }

    getRouter() {
        const router = require('express').Router();
        router.get('/run', this.runMigration.bind(this));
        return router;
    }
}

module.exports = EmergencyMigrationRoute;
