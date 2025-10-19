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
                        verified = FALSE,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = $3 AND exchange = $4
                `, [apiKey, encryptedSecret, userId, exchange.toLowerCase()]);
            } else {
                // Insert new
                await this.dbPoolManager.executeWrite(`
                    INSERT INTO user_api_keys (user_id, exchange, api_key, api_secret, is_active, verified)
                    VALUES ($1, $2, $3, $4, TRUE, FALSE)
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
                SELECT api_key, api_secret, is_active, verified
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
                enabled: row.is_active
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

            // Create temporary exchange service instance with user credentials
            let exchangeService;
            if (exchange.toLowerCase() === 'bybit') {
                const BybitService = require('../exchange/bybit-service');
                exchangeService = new BybitService({
                    apiKey: credentials.apiKey,
                    apiSecret: credentials.apiSecret
                });
            } else if (exchange.toLowerCase() === 'binance') {
                const BinanceService = require('../exchange/binance-service');
                exchangeService = new BinanceService({
                    apiKey: credentials.apiKey,
                    apiSecret: credentials.apiSecret
                });
            } else {
                return {
                    success: false,
                    error: `Exchange ${exchange} not supported`
                };
            }

            // Test the API key by fetching account info
            let testResult;
            if (exchange.toLowerCase() === 'bybit') {
                // Use getAccountBalancence for Bybit (returns account details)
                testResult = await exchangeService.getAccountBalance();
            } else if (exchange.toLowerCase() === 'binance') {
                // Use getAccountBalance for Binance
                testResult = await exchangeService.getAccountBalance();
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
            // Both Bybit and Binance use getAccountBalance()
            const accountInfo = await exchangeService.getAccountBalance();

            // Check if we got valid account data
            const hasValidData = accountInfo && (accountInfo.data || accountInfo.balances);

            return {
                can_read: !!hasValidData,
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
                verified = $2,
                verified_at = ${verified ? 'CURRENT_TIMESTAMP' : 'NULL'},
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $3 AND exchange = $4
        `, [enabled, verified, userId, exchange.toLowerCase()]);
    }

    /**
     * Save API key permissions
     * NOTE: Optimized DB structure - permissions stored in user_api_keys table as JSONB
     */
    async saveAPIKeyPermissions(userId, exchange, permissions) {
        // Permissions are stored as individual boolean columns in user_api_keys table
        console.log(`📝 API key permissions tracked for user ${userId} on ${exchange}:`, permissions);
        
        // Update permissions in user_api_keys table
        try {
            await this.dbPoolManager.executeWrite(`
                UPDATE user_api_keys 
                SET can_read = $1,
                    can_trade = $2,
                    can_withdraw = $3,
                    updated_at = NOW()
                WHERE user_id = $4 AND exchange = $5
            `, [
                permissions.can_read || false,
                permissions.can_trade || false, 
                permissions.can_withdraw || false,
                userId, 
                exchange.toLowerCase()
            ]);
        } catch (error) {
            console.error('Error updating API key permissions:', error.message);
        }
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
                SELECT api_key, is_active, verified, verified_at
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
                enabled: row.is_active,
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
     * NOTE: Now uses admin_actions table for centralized audit trail
     */
    async logAPIKeyAction(userId, exchange, action, status, details = null) {
        try {
            // Log to admin_actions table (centralized audit)
            await this.dbPoolManager.executeWrite(`
                INSERT INTO admin_actions (
                    admin_user_id, 
                    action_type, 
                    target_entity_type, 
                    target_entity_id,
                    action_data,
                    performed_at
                )
                VALUES ($1, $2, $3, $4, $5, NOW())
            `, [
                userId, 
                `api_key_${action}`, 
                'user_api_key', 
                userId,
                JSON.stringify({ exchange, status, details })
            ]);
        } catch (error) {
            // Non-critical - don't break the flow if logging fails
            console.log('API key action logged (optional audit):', action);
        }
    }
}

module.exports = UserAPIKeyManager;
