// 💰 FINANCIAL CONTROLLER SIMPLIFICADO

class FinancialControllerSimple {
    async getBalance(req, res) {
        res.json({ 
            balance: 1000, 
            currency: 'USD', 
            mode: 'simulation',
            timestamp: new Date().toISOString()
        });
    }

    async getTransactions(req, res) {
        res.json({ 
            transactions: [], 
            total: 0,
            mode: 'simulation',
            timestamp: new Date().toISOString()
        });
    }

    async processDeposit(req, res) {
        res.json({ 
            success: true, 
            message: 'Depósito processado (simulação)',
            timestamp: new Date().toISOString()
        });
    }

    async processWithdraw(req, res) {
        res.json({ 
            success: true, 
            message: 'Saque processado (simulação)',
            timestamp: new Date().toISOString()
        });
    }
}

const controller = new FinancialControllerSimple();
module.exports = {
    getBalance: controller.getBalance.bind(controller),
    getTransactions: controller.getTransactions.bind(controller),
    processDeposit: controller.processDeposit.bind(controller),
    processWithdraw: controller.processWithdraw.bind(controller)
};
