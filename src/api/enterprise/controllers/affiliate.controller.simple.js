// 🤝 AFFILIATE CONTROLLER SIMPLIFICADO

class AffiliateControllerSimple {
    async getStats(req, res) {
        res.json({ 
            affiliates: 0, 
            commissions: 0,
            mode: 'simulation',
            timestamp: new Date().toISOString()
        });
    }

    async getCommissions(req, res) {
        res.json({ 
            commissions: [], 
            total: 0,
            mode: 'simulation',
            timestamp: new Date().toISOString()
        });
    }

    async registerAffiliate(req, res) {
        res.json({ 
            success: true, 
            message: 'Afiliado registrado (simulação)',
            timestamp: new Date().toISOString()
        });
    }
}

const controller = new AffiliateControllerSimple();
module.exports = {
    getStats: controller.getStats.bind(controller),
    getCommissions: controller.getCommissions.bind(controller),
    registerAffiliate: controller.registerAffiliate.bind(controller)
};
