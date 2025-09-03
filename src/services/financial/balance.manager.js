// 💰 BALANCE MANAGER - ENTERPRISE MARKETBOT
// Gestão dos 6 tipos de saldo conforme especificação

class BalanceManager {
    constructor() {
        this.balanceTypes = {
            saldo_real_brl: 'WITHDRAWABLE',     // Pode sacar
            saldo_real_usd: 'WITHDRAWABLE',     // Pode sacar
            saldo_admin_brl: 'NON_WITHDRAWABLE', // Não pode sacar
            saldo_admin_usd: 'NON_WITHDRAWABLE', // Não pode sacar
            saldo_comissao_brl: 'CONVERTIBLE',  // Pode converter (+10%)
            saldo_comissao_usd: 'CONVERTIBLE'   // Pode converter (+10%)
        };
    }

    async getBalance(userId) {
        // Integração com PostgreSQL Railway
        return {
            saldo_real_brl: 0,
            saldo_real_usd: 0,
            saldo_admin_brl: 0,
            saldo_admin_usd: 0,
            saldo_comissao_brl: 0,
            saldo_comissao_usd: 0
        };
    }

    async updateBalance(userId, type, amount, operation = 'ADD') {
        console.log(`Balance update: ${userId} - ${type} ${operation} ${amount}`);
        return { success: true };
    }

    async convertCommission(userId, amount, currency) {
        const bonus = amount * 0.10; // +10% bônus
        const total = amount + bonus;
        
        console.log(`Commission conversion: ${amount} → ${total} (bonus: ${bonus})`);
        return { converted: amount, received: total, bonus };
    }

    canWithdraw(balanceType) {
        return this.balanceTypes[balanceType] === 'WITHDRAWABLE';
    }

    canConvert(balanceType) {
        return this.balanceTypes[balanceType] === 'CONVERTIBLE';
    }
}

module.exports = BalanceManager;