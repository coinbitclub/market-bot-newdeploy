/**
 * 🛡️ SISTEMA INTEGRADO DE TRATAMENTO DE ERROS
 * ==========================================
 * 
 * Tratamento específico para:
 * - ❌ Database Constraint Error - Chaves duplicadas
 * - ❌ API Key Format Invalid - Chaves malformadas
 */

class ErrorHandlingSystem {
    constructor(pool, logger = console) {
        this.pool = pool;
        this.logger = logger;
        this.errorCounters = {
            constraint_violations: 0,
            invalid_api_keys: 0,
            total_handled: 0
        };
    }

    /**
     * 🔍 DETECTOR AUTOMÁTICO DE ERROS
     */
    detectErrorType(error) {
        // Erro de constraint de banco
        if (error.code === '23505' || error.message?.includes('duplicate key')) {
            return {
                type: 'DATABASE_CONSTRAINT',
                subtype: 'DUPLICATE_KEY',
                details: this.parseConstraintError(error)
            };
        }

        // Erro de constraint unique
        if (error.code === '23503' || error.message?.includes('violates unique constraint')) {
            return {
                type: 'DATABASE_CONSTRAINT', 
                subtype: 'UNIQUE_VIOLATION',
                details: this.parseConstraintError(error)
            };
        }

        // Erro de formato de API key
        if (error.message?.includes('API key') || error.message?.includes('invalid key format')) {
            return {
                type: 'API_KEY_FORMAT',
                subtype: 'INVALID_FORMAT',
                details: this.parseAPIKeyError(error)
            };
        }

        // Erro de autenticação API
        if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
            return {
                type: 'API_KEY_FORMAT',
                subtype: 'AUTHENTICATION_FAILED',
                details: this.parseAPIKeyError(error)
            };
        }

        // Erro não reconhecido
        return {
            type: 'UNKNOWN',
            subtype: 'UNHANDLED',
            details: { message: error.message, code: error.code }
        };
    }

    /**
     * 🔧 CORREÇÃO AUTOMÁTICA DE CONSTRAINT ERRORS
     */
    async handleConstraintError(error, context = {}) {
        this.errorCounters.constraint_violations++;
        
        const errorInfo = this.detectErrorType(error);
        this.logger.log(`🚨 Database Constraint Error detectado: ${errorInfo.subtype}`);

        try {
            switch (errorInfo.subtype) {
                case 'DUPLICATE_KEY':
                    return await this.fixDuplicateKeyError(error, context);
                
                case 'UNIQUE_VIOLATION':
                    return await this.fixUniqueViolationError(error, context);
                
                default:
                    return await this.handleGenericConstraintError(error, context);
            }
        } catch (fixError) {
            this.logger.error(`❌ Falha ao corrigir constraint error:`, fixError);
            return {
                success: false,
                error: 'CONSTRAINT_FIX_FAILED',
                original_error: error.message,
                fix_error: fixError.message
            };
        }
    }

    /**
     * 🔑 CORREÇÃO AUTOMÁTICA DE API KEY ERRORS
     */
    async handleAPIKeyError(error, context = {}) {
        this.errorCounters.invalid_api_keys++;
        
        const errorInfo = this.detectErrorType(error);
        this.logger.log(`🔑 API Key Error detectado: ${errorInfo.subtype}`);

        try {
            switch (errorInfo.subtype) {
                case 'INVALID_FORMAT':
                    return await this.fixInvalidFormatError(error, context);
                
                case 'AUTHENTICATION_FAILED':
                    return await this.fixAuthenticationError(error, context);
                
                default:
                    return await this.handleGenericAPIKeyError(error, context);
            }
        } catch (fixError) {
            this.logger.error(`❌ Falha ao corrigir API key error:`, fixError);
            return {
                success: false,
                error: 'API_KEY_FIX_FAILED',
                original_error: error.message,
                fix_error: fixError.message
            };
        }
    }

    /**
     * 🔧 Correção específica para chaves duplicadas
     */
    async fixDuplicateKeyError(error, context) {
        this.logger.log(`🔧 Corrigindo chave duplicada...`);

        // Extrair informações da tabela e coluna
        const tableName = this.extractTableFromError(error);
        const keyColumn = this.extractKeyColumnFromError(error);

        if (!tableName) {
            return { success: false, error: 'TABLE_NOT_IDENTIFIED' };
        }

        // Strategies por tabela
        const strategies = {
            'balances': () => this.fixBalancesDuplicate(context),
            'positions': () => this.fixPositionsDuplicate(context),
            'users': () => this.fixUsersDuplicate(context),
            'user_api_keys': () => this.fixAPIKeysDuplicate(context)
        };

        const strategy = strategies[tableName];
        if (strategy) {
            const result = await strategy();
            this.logger.log(`✅ Chave duplicada corrigida na tabela ${tableName}`);
            return result;
        }

        return { success: false, error: 'NO_STRATEGY_FOR_TABLE', table: tableName };
    }

    /**
     * 🔑 Correção específica para formato de API key
     */
    async fixInvalidFormatError(error, context) {
        this.logger.log(`🔑 Corrigindo formato de API key...`);

        const { user_id, exchange, api_key, api_secret } = context;

        if (!user_id || !exchange) {
            return { success: false, error: 'INSUFFICIENT_CONTEXT' };
        }

        // Validar e corrigir formato
        const validation = this.validateAndFixAPIKeyFormat(exchange, api_key, api_secret);
        
        if (!validation.valid) {
            // Marcar chave como inválida no banco
            await this.markAPIKeyAsInvalid(user_id, exchange, validation.reason);
            
            return {
                success: false,
                error: 'UNFIXABLE_FORMAT',
                reason: validation.reason,
                recommendations: validation.recommendations
            };
        }

        // Atualizar chave corrigida
        const updateResult = await this.updateAPIKey(user_id, exchange, validation.corrected_key, validation.corrected_secret);
        
        if (updateResult.success) {
            this.logger.log(`✅ API key corrigida para usuário ${user_id} na ${exchange}`);
            return {
                success: true,
                action: 'KEY_FORMAT_CORRECTED',
                corrected: validation.corrections_made,
                updated: updateResult.updated_columns
            };
        } else {
            this.logger.log(`⚠️ Não foi possível atualizar API key: ${updateResult.error}`);
            return {
                success: false,
                error: 'UPDATE_FAILED',
                reason: updateResult.error,
                validation: validation
            };
        }
    }

    /**
     * 🧹 Correção de balances duplicados
     */
    async fixBalancesDuplicate(context) {
        const { user_id, asset, account_type } = context;

        // Verificar estrutura da tabela balances primeiro
        const tableStructure = await this.pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'balances'
        `);
        
        const columns = tableStructure.rows.map(row => row.column_name);
        const balanceColumn = columns.includes('balance') ? 'balance' : 
                             columns.includes('amount') ? 'amount' : 
                             columns.includes('quantity') ? 'quantity' : null;

        if (!balanceColumn) {
            return { success: false, error: 'BALANCE_COLUMN_NOT_FOUND', available_columns: columns };
        }

        // Buscar todos os registros duplicados
        const duplicatesQuery = `
            SELECT id, ${balanceColumn}, updated_at 
            FROM balances 
            WHERE user_id = $1 AND asset = $2 AND account_type = $3
            ORDER BY updated_at DESC, id DESC
        `;
        
        const duplicates = await this.pool.query(duplicatesQuery, [user_id, asset, account_type]);
        
        if (duplicates.rows.length <= 1) {
            return { success: true, action: 'NO_DUPLICATES_FOUND' };
        }

        // Manter o mais recente, deletar os outros
        const keepRecord = duplicates.rows[0];
        const deleteIds = duplicates.rows.slice(1).map(r => r.id);

        await this.pool.query('DELETE FROM balances WHERE id = ANY($1)', [deleteIds]);

        return {
            success: true,
            action: 'DUPLICATES_REMOVED',
            kept_record: keepRecord.id,
            deleted_count: deleteIds.length,
            balance_column_used: balanceColumn
        };
    }

    /**
     * 🧹 Correção de positions duplicadas
     */
    async fixPositionsDuplicate(context) {
        const { user_id, symbol } = context;

        // Fechar posições duplicadas ativas, manter apenas a mais recente
        const updateQuery = `
            UPDATE positions 
            SET status = 'closed', closed_at = NOW(),
                close_reason = 'Duplicate position auto-closed'
            WHERE id NOT IN (
                SELECT id FROM positions 
                WHERE user_id = $1 AND symbol = $2 AND status = 'active'
                ORDER BY created_at DESC 
                LIMIT 1
            )
            AND user_id = $1 AND symbol = $2 AND status = 'active'
        `;

        const result = await this.pool.query(updateQuery, [user_id, symbol]);

        return {
            success: true,
            action: 'DUPLICATE_POSITIONS_CLOSED',
            closed_count: result.rowCount
        };
    }

    /**
     * 🔍 Validação e correção de formato de API key
     */
    validateAndFixAPIKeyFormat(exchange, apiKey, apiSecret) {
        const requirements = {
            binance: {
                apiKey: { minLength: 60, maxLength: 70, pattern: /^[A-Za-z0-9]+$/ },
                apiSecret: { minLength: 60, maxLength: 70, pattern: /^[A-Za-z0-9]+$/ }
            },
            bybit: {
                apiKey: { minLength: 15, maxLength: 30, pattern: /^[A-Za-z0-9]+$/ },
                apiSecret: { minLength: 30, maxLength: 50, pattern: /^[A-Za-z0-9]+$/ }
            }
        };

        const req = requirements[exchange];
        if (!req) {
            return { 
                valid: false, 
                reason: 'Exchange não suportada',
                recommendations: ['Verificar se exchange está configurada corretamente']
            };
        }

        const issues = [];
        const recommendations = [];

        // Verificar API Key
        if (!apiKey || apiKey.length < req.apiKey.minLength || apiKey.length > req.apiKey.maxLength) {
            issues.push(`API Key deve ter ${req.apiKey.minLength}-${req.apiKey.maxLength} caracteres (atual: ${apiKey?.length || 0})`);
            recommendations.push('Gerar nova API Key na exchange');
        }

        if (apiKey && !req.apiKey.pattern.test(apiKey)) {
            issues.push('API Key contém caracteres inválidos');
            recommendations.push('API Key deve conter apenas letras e números');
        }

        // Verificar API Secret
        if (!apiSecret || apiSecret.length < req.apiSecret.minLength || apiSecret.length > req.apiSecret.maxLength) {
            issues.push(`API Secret deve ter ${req.apiSecret.minLength}-${req.apiSecret.maxLength} caracteres (atual: ${apiSecret?.length || 0})`);
            recommendations.push('Gerar nova API Secret na exchange');
        }

        if (apiSecret && !req.apiSecret.pattern.test(apiSecret)) {
            issues.push('API Secret contém caracteres inválidos');
            recommendations.push('API Secret deve conter apenas letras e números');
        }

        return {
            valid: issues.length === 0,
            reason: issues.join('; '),
            recommendations,
            issues_found: issues
        };
    }

    /**
     * 📊 Marcar API key como inválida
     */
    async markAPIKeyAsInvalid(user_id, exchange, reason) {
        // Verificar se colunas de status existem
        const tableStructure = await this.pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users'
        `);
        
        const columns = tableStructure.rows.map(row => row.column_name);
        const statusColumn = `${exchange}_api_key_status`;
        const errorColumn = `${exchange}_api_key_error`;

        if (columns.includes(statusColumn)) {
            // Se colunas existem, usar elas
            const updateQuery = `
                UPDATE users 
                SET ${statusColumn} = 'invalid',
                    ${errorColumn} = $2,
                    updated_at = NOW()
                WHERE id = $1
            `;
            await this.pool.query(updateQuery, [user_id, reason]);
        } else {
            // Se não existem, usar uma abordagem alternativa
            // Criar entrada em uma tabela de log de erros ou usar comentário
            try {
                await this.pool.query(`
                    INSERT INTO api_key_errors (user_id, exchange, error_reason, created_at)
                    VALUES ($1, $2, $3, NOW())
                    ON CONFLICT (user_id, exchange) 
                    DO UPDATE SET error_reason = $3, created_at = NOW()
                `, [user_id, exchange, reason]);
            } catch (tableError) {
                // Se tabela não existe, apenas log no console
                this.logger.log(`📝 API Key Error logged: User ${user_id}, ${exchange}: ${reason}`);
            }
        }
    }

    /**
     * 🔄 Atualizar API key corrigida
     */
    async updateAPIKey(user_id, exchange, corrected_key, corrected_secret) {
        // Verificar estrutura da tabela users
        const tableStructure = await this.pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users'
        `);
        
        const columns = tableStructure.rows.map(row => row.column_name);
        const keyColumn = `${exchange}_api_key`;
        const secretColumn = `${exchange}_secret_key`;

        if (columns.includes(keyColumn) && columns.includes(secretColumn)) {
            const updateQuery = `
                UPDATE users 
                SET ${keyColumn} = $2,
                    ${secretColumn} = $3,
                    updated_at = NOW()
                WHERE id = $1
            `;
            await this.pool.query(updateQuery, [user_id, corrected_key, corrected_secret]);
            return { success: true, updated_columns: [keyColumn, secretColumn] };
        } else {
            return { 
                success: false, 
                error: 'COLUMNS_NOT_FOUND', 
                available_columns: columns,
                needed_columns: [keyColumn, secretColumn]
            };
        }
    }

    /**
     * 🔧 Parsers de erro
     */
    parseConstraintError(error) {
        return {
            table: this.extractTableFromError(error),
            constraint: this.extractConstraintFromError(error),
            column: this.extractKeyColumnFromError(error),
            message: error.message
        };
    }

    parseAPIKeyError(error) {
        return {
            type: error.message?.includes('401') ? 'authentication' : 'format',
            message: error.message,
            suggestions: ['Verificar formato da chave', 'Regenerar API key', 'Verificar permissões']
        };
    }

    extractTableFromError(error) {
        const match = error.message?.match(/table "(\w+)"/);
        return match ? match[1] : null;
    }

    extractConstraintFromError(error) {
        const match = error.message?.match(/constraint "([^"]+)"/);
        return match ? match[1] : null;
    }

    extractKeyColumnFromError(error) {
        const match = error.message?.match(/Key \(([^)]+)\)/);
        return match ? match[1] : null;
    }

    /**
     * 📊 Estatísticas de tratamento de erros
     */
    getErrorStats() {
        return {
            ...this.errorCounters,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 🔄 Middleware para captura automática
     */
    createErrorMiddleware() {
        return async (error, context = {}) => {
            this.errorCounters.total_handled++;
            
            const errorType = this.detectErrorType(error);
            
            switch (errorType.type) {
                case 'DATABASE_CONSTRAINT':
                    return await this.handleConstraintError(error, context);
                    
                case 'API_KEY_FORMAT':
                    return await this.handleAPIKeyError(error, context);
                    
                default:
                    this.logger.log(`⚠️ Erro não tratado automaticamente: ${errorType.type}`);
                    return { 
                        success: false, 
                        error: 'UNHANDLED_ERROR_TYPE', 
                        type: errorType.type,
                        original: error.message 
                    };
            }
        };
    }
}

module.exports = ErrorHandlingSystem;
