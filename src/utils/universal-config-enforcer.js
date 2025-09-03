/**
 * 🛡️ UNIVERSAL CONFIG ENFORCER
 * ===========================
 * 
 * Garante que TODA operação respeite as configurações obrigatórias da especificação
 * Deve ser importado por TODOS os sistemas de trading
 */

class UniversalConfigEnforcer {
    constructor() {
        // CONFIGURAÇÕES OBRIGATÓRIAS DA ESPECIFICAÇÃO TÉCNICA
        this.SPEC_CONFIG = {
          "MAX_POSITIONS_PER_USER": 2,
          "COOLDOWN_MINUTES_PER_SYMBOL": 120,
          "MAX_RISK_PER_TRADE": 0.02,
          "MANDATORY_STOP_LOSS": true,
          "MANDATORY_TAKE_PROFIT": true,
          "DEFAULT_LEVERAGE": 5,
          "DEFAULT_SL_MULTIPLIER": 2,
          "DEFAULT_TP_MULTIPLIER": 3,
          "DEFAULT_POSITION_SIZE_PERCENT": 30,
          "MAX_LEVERAGE": 10,
          "MAX_SL_MULTIPLIER": 4,
          "MAX_TP_MULTIPLIER": 5,
          "MIN_POSITION_SIZE_PERCENT": 10,
          "MAX_POSITION_SIZE_PERCENT": 50
};
    }

    /**
     * ⚠️ FORÇAR PARÂMETROS OBRIGATÓRIOS
     * Esta função SOBRESCREVE qualquer configuração do usuário
     */
    enforceSpecificationDefaults(userConfig = {}) {
        const enforced = {
            // Aplicar defaults obrigatórios
            leverage: userConfig.leverage || this.SPEC_CONFIG.DEFAULT_LEVERAGE,
            stopLoss: this.calculateMandatoryStopLoss(userConfig.leverage || this.SPEC_CONFIG.DEFAULT_LEVERAGE),
            takeProfit: this.calculateMandatoryTakeProfit(userConfig.leverage || this.SPEC_CONFIG.DEFAULT_LEVERAGE),
            positionSizePercent: userConfig.positionSizePercent || this.SPEC_CONFIG.DEFAULT_POSITION_SIZE_PERCENT,
            
            // Aplicar limites obrigatórios
            maxPositions: this.SPEC_CONFIG.MAX_POSITIONS_PER_USER,
            cooldownMinutes: this.SPEC_CONFIG.COOLDOWN_MINUTES_PER_SYMBOL,
            maxRiskPerTrade: this.SPEC_CONFIG.MAX_RISK_PER_TRADE,
            
            // Flags obrigatórias
            mandatoryStopLoss: this.SPEC_CONFIG.MANDATORY_STOP_LOSS,
            mandatoryTakeProfit: this.SPEC_CONFIG.MANDATORY_TAKE_PROFIT
        };

        // Validar e ajustar limites
        if (enforced.leverage > this.SPEC_CONFIG.MAX_LEVERAGE) {
            enforced.leverage = this.SPEC_CONFIG.MAX_LEVERAGE;
        }

        if (enforced.positionSizePercent > this.SPEC_CONFIG.MAX_POSITION_SIZE_PERCENT) {
            enforced.positionSizePercent = this.SPEC_CONFIG.MAX_POSITION_SIZE_PERCENT;
        }

        if (enforced.positionSizePercent < this.SPEC_CONFIG.MIN_POSITION_SIZE_PERCENT) {
            enforced.positionSizePercent = this.SPEC_CONFIG.MIN_POSITION_SIZE_PERCENT;
        }

        return enforced;
    }

    /**
     * 🧮 CALCULAR STOP LOSS OBRIGATÓRIO
     */
    calculateMandatoryStopLoss(leverage) {
        return leverage * this.SPEC_CONFIG.DEFAULT_SL_MULTIPLIER; // 2x alavancagem
    }

    /**
     * 🎯 CALCULAR TAKE PROFIT OBRIGATÓRIO
     */
    calculateMandatoryTakeProfit(leverage) {
        return leverage * this.SPEC_CONFIG.DEFAULT_TP_MULTIPLIER; // 3x alavancagem
    }

    /**
     * 🚨 VALIDAR SE OPERAÇÃO ATENDE ESPECIFICAÇÃO
     */
    validateAgainstSpecification(operation) {
        const errors = [];

        // Verificar se tem SL/TP obrigatórios
        if (!operation.stopLoss || operation.stopLoss <= 0) {
            errors.push('Stop Loss é OBRIGATÓRIO conforme especificação técnica');
        }

        if (!operation.takeProfit || operation.takeProfit <= 0) {
            errors.push('Take Profit é OBRIGATÓRIO conforme especificação técnica');
        }

        // Verificar limites
        if (operation.leverage > this.SPEC_CONFIG.MAX_LEVERAGE) {
            errors.push(`Leverage ${operation.leverage}x excede máximo da especificação (${this.SPEC_CONFIG.MAX_LEVERAGE}x)`);
        }

        if (operation.positionSizePercent > this.SPEC_CONFIG.MAX_POSITION_SIZE_PERCENT) {
            errors.push(`Tamanho posição ${operation.positionSizePercent}% excede máximo da especificação (${this.SPEC_CONFIG.MAX_POSITION_SIZE_PERCENT}%)`);
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            enforcedConfig: this.enforceSpecificationDefaults(operation)
        };
    }
}

module.exports = UniversalConfigEnforcer;