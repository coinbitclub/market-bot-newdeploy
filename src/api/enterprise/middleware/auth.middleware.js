// 🔐 AUTH MIDDLEWARE - ENTERPRISE MARKETBOT
// Autenticação e autorização

const jwt = require('jsonwebtoken');
const db = require('../../../database/connection');

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(403).json({ error: 'Token inválido' });
    }
};

const requireAffiliate = async (req, res, next) => {
    try {
        const { userId } = req.user;
        
        const affiliate = await db.query(`
            SELECT id FROM affiliates WHERE user_id = $1
        `, [userId]);
        
        if (affiliate.rows.length === 0) {
            return res.status(403).json({ error: 'Acesso negado - não é afiliado' });
        }
        
        next();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const requireAdmin = async (req, res, next) => {
    try {
        const { userType } = req.user;
        
        if (userType !== 'ADMIN') {
            return res.status(403).json({ error: 'Acesso negado - admin necessário' });
        }
        
        next();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    authenticateToken,
    requireAffiliate,
    requireAdmin
};