#!/usr/bin/env node

/**
 * 🛡️ VALIDADORES DE DADOS
 * =======================
 * 
 * Previne inserção de dados NULL críticos
 */

class DataValidators {
    /**
     * 🎯 Validar dados de sinal antes de inserir
     */
    static validateSignalData(signalData) {
        const errors = [];

        // Campos obrigatórios
        if (!signalData.symbol && !signalData.ticker) {
            errors.push('symbol/ticker é obrigatório');
        }

        if (!signalData.action && !signalData.signal) {
            errors.push('action/signal é obrigatório');
        }

        // Garantir signal_type
        if (!signalData.signal_type) {
            // Auto-corrigir baseado na action
            signalData.signal_type = this.mapActionToSignalType(
                signalData.action || signalData.signal
            );
        }

        return { isValid: errors.length === 0, errors, data: signalData };
    }

    /**
     * 👥 Validar dados de usuário antes de inserir
     */
    static validateUserData(userData) {
        const errors = [];

        // Campos obrigatórios
        if (!userData.email) {
            errors.push('email é obrigatório');
        }

        // Garantir defaults
        userData.is_active = userData.is_active !== undefined ? userData.is_active : true;
        userData.plan_type = userData.plan_type || 'MONTHLY';
        userData.created_at = userData.created_at || new Date();
        userData.updated_at = userData.updated_at || new Date();

        return { isValid: errors.length === 0, errors, data: userData };
    }

    /**
     * 🔄 Mapear action para signal_type
     */
    static mapActionToSignalType(action) {
        const mapping = {
            'BUY': 'SINAL_LONG',
            'SELL': 'SINAL_SHORT', 
            'LONG': 'SINAL_LONG',
            'SHORT': 'SINAL_SHORT',
            'STRONG_BUY': 'SINAL_LONG_FORTE',
            'STRONG_SELL': 'SINAL_SHORT_FORTE'
        };

        return mapping[action?.toUpperCase()] || 'SINAL_LONG';
    }

    /**
     * 🔍 Validar antes de INSERT (uso geral)
     */
    static validateBeforeInsert(tableName, data) {
        switch (tableName) {
            case 'signals':
                return this.validateSignalData(data);
            case 'users':
                return this.validateUserData(data);
            default:
                return { isValid: true, errors: [], data };
        }
    }
}

module.exports = DataValidators;
