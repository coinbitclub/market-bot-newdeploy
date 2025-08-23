// POSITION SAFETY VALIDATOR
// Valida posições de trading para segurança

class PositionSafetyValidator {
    constructor() {
        this.maxLeverage = parseInt(process.env.MAX_LEVERAGE) || 10;
        this.maxRiskPerTrade = parseFloat(process.env.MAX_RISK_PER_TRADE) || 0.02; // 2%
    }

    validatePositionSafety(position) {
        const {
            leverage = 1,
            stopLoss = 0,
            takeProfit = 0,
            orderValue = 0,
            accountBalance = 1000
        } = position;

        const validation = {
            isValid: true,
            warnings: [],
            errors: [],
            riskLevel: 'LOW',
            maxRisk: this.maxRiskPerTrade * 100 + '%'
        };

        // Validar leverage
        if (leverage > this.maxLeverage) {
            validation.errors.push(`Leverage ${leverage}x excede o máximo permitido de ${this.maxLeverage}x`);
            validation.isValid = false;
        }

        // Validar stop loss
        if (stopLoss <= 0) {
            validation.warnings.push('Stop Loss não definido - risco alto');
            validation.riskLevel = 'HIGH';
        }

        // Calcular risco da posição
        const riskValue = orderValue * leverage;
        const riskPercentage = riskValue / accountBalance;

        if (riskPercentage > this.maxRiskPerTrade) {
            validation.errors.push(`Risco de ${(riskPercentage * 100).toFixed(2)}% excede o máximo de ${(this.maxRiskPerTrade * 100).toFixed(2)}%`);
            validation.isValid = false;
        }

        // Definir nível de risco
        if (riskPercentage > 0.01) validation.riskLevel = 'MEDIUM';
        if (riskPercentage > 0.015) validation.riskLevel = 'HIGH';

        validation.calculatedRisk = (riskPercentage * 100).toFixed(2) + '%';

        return validation;
    }

    calculatePositionSize(accountBalance, riskPercentage, stopLossDistance) {
        const riskAmount = accountBalance * (riskPercentage / 100);
        const positionSize = riskAmount / (stopLossDistance / 100);
        
        return {
            positionSize: Math.round(positionSize * 100) / 100,
            riskAmount: Math.round(riskAmount * 100) / 100,
            maxLoss: Math.round(riskAmount * 100) / 100
        };
    }
}

module.exports = PositionSafetyValidator;
