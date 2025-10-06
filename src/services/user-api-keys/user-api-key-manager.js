/**
 * 🔑 USER API KEY MANAGER (ADAPTED FOR EXISTING TABLE STRUCTURE)
 * Manages user API keys using existing user_api_keys table
 *
 * IMPORTANT: Works with EXISTING database structure:
 * - Uses user_api_keys table (not users table columns)
 * - Encrypts api_secret before storage
 * - Adds verification and audit tracking
 */

const apiKeyEncryption = require('../security/api-key-encryption');

class UserAPIKeyManager {
    constructor(dbPoolManager) {
        this.dbPoolManager = dbPoolManager;
    }

    /**
     * Save user's API key (adapted for existing table structure)
     */
    async saveAPIKey(userId, exchange, apiKey, apiSecret) {
        try {
            // Validate format
            const validation = apiKeyEncryption.validateAPIKeyFormat(apiKey, exchange);
            if (!validation.valid) {
                return {
                    success: false,
                    error: validation.error
                };
            }

            // Encrypt the API secret
            const encryptedSecret = apiKeyEncryption.encrypt(apiSecret);

            // Check if key already exists for this user/exchange
            const existing = await this.dbPoolManager.executeRead(`
                SELECT id FROM user_api_keys
                WHERE user_id = $1 AND exchange = $2
            `, [userId, exchange.toLowerCase()]);

            if (existing.rows.length > 0) {
                // Update existing
                await this.dbPoolManager.executeWrite(`
                    UPDATE user_api_keys
                    SET
                        api_key = $1,
                        api_secret = $2,
                        is_active = TRUE,
                        enabled = TRUE,
                        verified = FALSE,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = $3 AND exchange = $4
                `, [apiKey, encryptedSecret, userId, exchange.toLowerCase()]);
            } else {
                // Insert new
                await this.dbPoolManager.executeWrite(`
                    INSERT INTO user_api_keys (user_id, exchange, api_key, api_secret, is_active, enabled, verified)
                    VALUES ($1, $2, $3, $4, TRUE, TRUE, FALSE)
                `, [userId, exchange.toLowerCase(), apiKey, encryptedSecret]);
            }

            // Log the action
            await this.logAPIKeyAction(userId, exchange, 'API_KEY_SAVED', 'SUCCESS');

            console.log(`✅ API key saved for user ${userId} on ${exchange}`);

            return {
                success: true,
                message: 'API key saved successfully',
                masked_key: apiKeyEncryption.maskAPIKey(apiKey)
            };

        } catch (error) {
            console.error(`❌ Error saving API key:`, error);
            await this.logAPIKeyAction(userId, exchange, 'API_KEY_SAVE_FAILED', 'ERROR', error.message);
            return {
                success: false,
                error: 'Failed to save API key'
            };
        }
    }

    /**
     * Get user's API credentials
     */
    async getAPICredentials(userId, exchange) {
        try {
            const result = await this.dbPoolManager.executeRead(`
                SELECT api_key, api_secret, is_active, enabled, verified
                FROM user_api_keys
                WHERE user_id = $1 AND exchange = $2
                ORDER BY updated_at DESC
                LIMIT 1
            `, [userId, exchange.toLowerCase()]);

            if (result.rows.length === 0) {
                return {
                    success: false,
                    error: 'API key not found'
                };
            }

            const row = result.rows[0];

            // Decrypt the API secret
            const apiSecret = apiKeyEncryption.decrypt(row.api_secret);

            // If decryption failed, return error but don't crash
            if (apiSecret === null) {
                console.warn(`⚠️ API key decryption failed for user ${userId}, exchange ${exchange}`);
                return {
                    success: false,
                    error: 'API key decryption failed - key may be corrupted',
                    needsReentry: true
                };
            }

            return {
                success: true,
                apiKey: row.api_key,
                apiSecret: apiSecret,
                enabled: row.enabled && row.is_active
            };

        } catch (error) {
            console.warn(`⚠️ Error retrieving API key:`, error.message);
            return {
                success: false,
                error: 'Failed to retrieve API key',
                needsReentry: true
            };
        }
    }

    /**
     * Verify API key with exchange
     */
    async verifyAPIKey(userId, exchange) {
        try {
            // Get credentials
            const credentials = await this.getAPICredentials(userId, exchange);
            if (!credentials.success) {
                return credentials;
            }

            // Create temporary exchange service instance
            let exchangeService;
            if (exchange.toLowerCase() === 'bybit') {
                const BybitService = require('../exchange/bybit-service');
                exchangeService = new BybitService();
                exchangeService.apiKey = credentials.apiKey;
                exchangeService.apiSecret = credentials.apiSecret;
            } else if (exchange.toLowerCase() === 'binance') {
                const BinanceService = require('../exchange/binance-service');
                exchangeService = new BinanceService();
                exchangeService.apiKey = credentials.apiKey;
                exchangeService.apiSecret = credentials.apiSecret;
            } else {
                return {
                    success: false,
                    error: `Exchange ${exchange} not supported`
                };
            }

            // Test the API key by fetching account info
            let testResult;
            if (exchange.toLowerCase() === 'bybit') {
                testResult = await exchangeService.getAccountBalance();
            } else {
                testResult = await exchangeService.getAccountInfo();
            }

            if (!testResult || testResult.error) {
                await this.updateAPIKeyStatus(userId, exchange, false, false);
                await this.logAPIKeyAction(userId, exchange, 'API_KEY_VERIFICATION_FAILED', 'ERROR');
                return {
                    success: false,
                    error: 'API key verification failed'
                };
            }

            // Update verification status
            await this.updateAPIKeyStatus(userId, exchange, true, true);
            await this.logAPIKeyAction(userId, exchange, 'API_KEY_VERIFIED', 'SUCCESS');

            // Check permissions
            const permissions = await this.checkAPIKeyPermissions(exchangeService, exchange);

            // Save permissions
            await this.saveAPIKeyPermissions(userId, exchange, permissions);

            console.log(`✅ API key verified for user ${userId} on ${exchange}`);

            return {
                success: true,
                message: 'API key verified successfully',
                permissions
            };

        } catch (error) {
            console.error(`❌ Error verifying API key:`, error);
            await this.updateAPIKeyStatus(userId, exchange, false, false);
            await this.logAPIKeyAction(userId, exchange, 'API_KEY_VERIFICATION_ERROR', 'ERROR', error.message);
            return {
                success: false,
                error: `Verification failed: ${error.message}`
            };
        }
    }

    /**
     * Check API key permissions on exchange
     */
    async checkAPIKeyPermissions(exchangeService, exchange) {
        try {
            const accountInfo = exchange.toLowerCase() === 'bybit'
                ? await exchangeService.getAccountBalance()
                : await exchangeService.getAccountInfo();

            return {
                can_read: !!accountInfo,
                can_trade: false, // Would need to test actual trade
                can_withdraw: false
            };

        } catch (error) {
            console.error('Error checking permissions:', error);
            return {
                can_read: false,
                can_trade: false,
                can_withdraw: false
            };
        }
    }

    /**
     * Update API key verification status in user_api_keys table
     */
    async updateAPIKeyStatus(userId, exchange, enabled, verified) {
        await this.dbPoolManager.executeWrite(`
            UPDATE user_api_keys
            SET
                is_active = $1,
                enabled = $2,
                verified = $3,
                verified_at = ${verified ? 'CURRENT_TIMESTAMP' : 'NULL'},
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $4 AND exchange = $5
        `, [enabled, enabled, verified, userId, exchange.toLowerCase()]);
    }

    /**
     * Save API key permissions
     */
    async saveAPIKeyPermissions(userId, exchange, permissions) {
        await this.dbPoolManager.executeWrite(`
            INSERT INTO user_api_key_permissions (user_id, exchange, can_trade, can_withdraw, can_read, last_checked_at)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id, exchange)
            DO UPDATE SET
                can_trade = $3,
                can_withdraw = $4,
                can_read = $5,
                last_checked_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
        `, [userId, exchange.toLowerCase(), permissions.can_trade, permissions.can_withdraw, permissions.can_read]);
    }

    /**
     * Delete user's API key
     */
    async deleteAPIKey(userId, exchange) {
        try {
            await this.dbPoolManager.executeWrite(`
                DELETE FROM user_api_keys
                WHERE user_id = $1 AND exchange = $2
            `, [userId, exchange.toLowerCase()]);

            await this.logAPIKeyAction(userId, exchange, 'API_KEY_DELETED', 'SUCCESS');

            console.log(`✅ API key deleted for user ${userId} on ${exchange}`);

            return {
                success: true,
                message: 'API key deleted successfully'
            };

        } catch (error) {
            console.error(`❌ Error deleting API key:`, error);
            return {
                success: false,
                error: 'Failed to delete API key'
            };
        }
    }

    /**
     * Get user's API key status
     */
    async getAPIKeyStatus(userId, exchange) {
        try {
            const result = await this.dbPoolManager.executeRead(`
                SELECT api_key, is_active, enabled, verified, verified_at
                FROM user_api_keys
                WHERE user_id = $1 AND exchange = $2
                ORDER BY updated_at DESC
                LIMIT 1
            `, [userId, exchange.toLowerCase()]);

            if (result.rows.length === 0) {
                return {
                    success: true,
                    has_key: false
                };
            }

            const row = result.rows[0];

            return {
                success: true,
                has_key: true,
                masked_key: apiKeyEncryption.maskAPIKey(row.api_key),
                enabled: row.enabled && row.is_active,
                verified: row.verified,
                verified_at: row.verified_at
            };

        } catch (error) {
            console.error(`❌ Error getting API key status:`, error);
            return {
                success: false,
                error: 'Failed to get API key status'
            };
        }
    }

    /**
     * Set user's trading mode (PERSONAL only)
     */
    async setTradingMode(userId, mode) {
        try {
            // System only supports PERSONAL mode
            if (mode !== 'PERSONAL') {
                return {
                    success: false,
                    error: 'Only PERSONAL trading mode is supported. Users must connect their own Bybit/Binance API keys.'
                };
            }

            await this.dbPoolManager.executeWrite(`
                UPDATE users
                SET trading_mode = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
            `, [mode, userId]);

            await this.logAPIKeyAction(userId, 'SYSTEM', `TRADING_MODE_SET_${mode}`, 'SUCCESS');

            return {
                success: true,
                message: `Trading mode set to ${mode}`
            };

        } catch (error) {
            console.error(`❌ Error setting trading mode:`, error);
            return {
                success: false,
                error: 'Failed to set trading mode'
            };
        }
    }

    /**
     * Log API key action for audit
     */
    async logAPIKeyAction(userId, exchange, action, status, details = null) {
        try {
            await this.dbPoolManager.executeWrite(`
                INSERT INTO user_api_keys_audit (user_id, exchange, action, status, details)
                VALUES ($1, $2, $3, $4, $5)
            `, [userId, exchange, action, status, details]);
        } catch (error) {
            console.error('Error logging API key action:', error);
        }
    }
}

module.exports = UserAPIKeyManager;
