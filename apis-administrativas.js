/**
 * 🌐 APIs REST PARA SISTEMA ADMINISTRATIVO
 * =======================================
 * 
 * APIs completas para:
 * ✅ Autenticação e autorização
 * ✅ Gerenciamento de usuários
 * ✅ Sistema de afiliados
 * ✅ Classificação e promoções
 * ✅ Reset de senhas via SMS
 * ✅ Relatórios e logs
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const SistemaCompletoAdminTwilio = require('./sistema-completo-admin-twilio');

class APIsAdministrativas {
    constructor() {
        this.sistema = new SistemaCompletoAdminTwilio();
        this.app = express();
        this.jwtSecret = process.env.JWT_SECRET || 'coinbitclub-secret-key-2024';
        
        this.configurarMiddlewares();
        this.configurarRotas();
    }

    configurarMiddlewares() {
        // Middleware básico
        this.app.use(express.json({ limit: '50mb' }));
        this.app.use(express.urlencoded({ extended: true }));
        
        // CORS
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
            if (req.method === 'OPTIONS') {
                res.sendStatus(200);
            } else {
                next();
            }
        });

        // Rate limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: 100, // máximo 100 requests por IP
            message: { error: 'Muitas tentativas. Tente novamente em 15 minutos.' }
        });
        this.app.use('/api/', limiter);

        // Rate limiting específico para login
        const loginLimiter = rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 5, // máximo 5 tentativas de login
            message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' }
        });
        this.app.use('/api/auth/login', loginLimiter);
    }

    configurarRotas() {
        // 🔐 ROTAS DE AUTENTICAÇÃO
        this.app.post('/api/auth/login', this.login.bind(this));
        this.app.post('/api/auth/refresh', this.verificarToken.bind(this), this.refreshToken.bind(this));
        this.app.post('/api/auth/logout', this.verificarToken.bind(this), this.logout.bind(this));
        this.app.get('/api/auth/profile', this.verificarToken.bind(this), this.getProfile.bind(this));

        // 👥 ROTAS DE USUÁRIOS
        this.app.get('/api/users', this.verificarToken.bind(this), this.verificarPermissao(['ADMIN', 'AFFILIATE_VIP']), this.listarUsuarios.bind(this));
        this.app.post('/api/users', this.verificarToken.bind(this), this.verificarPermissao(['ADMIN']), this.criarUsuario.bind(this));
        this.app.get('/api/users/:id', this.verificarToken.bind(this), this.verificarPermissao(['ADMIN', 'AFFILIATE_VIP']), this.buscarUsuario.bind(this));
        this.app.put('/api/users/:id', this.verificarToken.bind(this), this.verificarPermissao(['ADMIN']), this.atualizarUsuario.bind(this));
        this.app.delete('/api/users/:id', this.verificarToken.bind(this), this.verificarPermissao(['ADMIN']), this.desativarUsuario.bind(this));

        // 🔄 ROTAS DE CLASSIFICAÇÃO/PROMOÇÃO
        this.app.post('/api/users/:id/promote', this.verificarToken.bind(this), this.verificarPermissao(['ADMIN']), this.promoverUsuario.bind(this));
        this.app.get('/api/users/:id/history', this.verificarToken.bind(this), this.verificarPermissao(['ADMIN', 'AFFILIATE_VIP']), this.historicoUsuario.bind(this));

        // 🔑 ROTAS DE RESET DE SENHA
        this.app.post('/api/auth/reset-password', this.resetarSenha.bind(this));
        this.app.post('/api/auth/reset-password-sms', this.verificarToken.bind(this), this.verificarPermissao(['ADMIN']), this.resetarSenhaViaSMS.bind(this));

        // 👑 ROTAS DE AFILIADOS
        this.app.get('/api/affiliates', this.verificarToken.bind(this), this.verificarPermissao(['ADMIN', 'AFFILIATE_VIP']), this.listarAfiliados.bind(this));
        this.app.get('/api/affiliates/:id/referrals', this.verificarToken.bind(this), this.verificarPermissao(['ADMIN', 'AFFILIATE_VIP', 'AFFILIATE']), this.listarIndicados.bind(this));
        this.app.get('/api/affiliates/:id/commissions', this.verificarToken.bind(this), this.verificarPermissao(['ADMIN', 'AFFILIATE_VIP', 'AFFILIATE']), this.listarComissoes.bind(this));

        // 📊 ROTAS DE RELATÓRIOS
        this.app.get('/api/reports/users', this.verificarToken.bind(this), this.verificarPermissao(['ADMIN']), this.relatorioUsuarios.bind(this));
        this.app.get('/api/reports/sms', this.verificarToken.bind(this), this.verificarPermissao(['ADMIN']), this.relatorioSMS.bind(this));
        this.app.get('/api/reports/admin-actions', this.verificarToken.bind(this), this.verificarPermissao(['ADMIN']), this.relatorioAcoesAdmin.bind(this));

        // 🛠️ ROTAS DE SISTEMA
        this.app.get('/api/system/config', this.verificarToken.bind(this), this.verificarPermissao(['ADMIN']), this.getSystemConfig.bind(this));
        this.app.get('/api/system/health', this.healthCheck.bind(this));
        this.app.post('/api/system/test-sms', this.verificarToken.bind(this), this.verificarPermissao(['ADMIN']), this.testarSMS.bind(this));

        // 📱 ROTA ESPECÍFICA DO TWILIO
        this.app.get('/api/twilio/status', this.verificarToken.bind(this), this.verificarPermissao(['ADMIN']), this.statusTwilio.bind(this));

        // Rota de erro 404
        this.app.use('*', (req, res) => {
            res.status(404).json({ error: 'Rota não encontrada' });
        });
    }

    // 🔐 MIDDLEWARE DE VERIFICAÇÃO DE TOKEN
    async verificarToken(req, res, next) {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            
            if (!token) {
                return res.status(401).json({ error: 'Token não fornecido' });
            }

            const decoded = jwt.verify(token, this.jwtSecret);
            
            // Buscar usuário atualizado
            const userResult = await this.sistema.pool.query(
                'SELECT id, email, full_name, user_type, plan_type, is_active FROM users WHERE id = $1',
                [decoded.userId]
            );

            if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
                return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
            }

            req.user = userResult.rows[0];
            next();

        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Token expirado' });
            }
            return res.status(401).json({ error: 'Token inválido' });
        }
    }

    // 🛡️ MIDDLEWARE DE VERIFICAÇÃO DE PERMISSÃO
    verificarPermissao(tiposPermitidos) {
        return (req, res, next) => {
            if (!tiposPermitidos.includes(req.user.user_type)) {
                return res.status(403).json({ 
                    error: 'Permissão negada',
                    required: tiposPermitidos,
                    current: req.user.user_type
                });
            }
            next();
        };
    }

    // 🔐 LOGIN
    async login(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ error: 'Email e senha são obrigatórios' });
            }

            // Buscar usuário
            const userResult = await this.sistema.pool.query(
                'SELECT id, email, full_name, password_hash, user_type, plan_type, is_active FROM users WHERE email = $1',
                [email.toLowerCase()]
            );

            if (userResult.rows.length === 0) {
                return res.status(401).json({ error: 'Credenciais inválidas' });
            }

            const user = userResult.rows[0];

            if (!user.is_active) {
                return res.status(401).json({ error: 'Conta desativada' });
            }

            // Verificar senha
            const senhaValida = await bcrypt.compare(password, user.password_hash);
            if (!senhaValida) {
                return res.status(401).json({ error: 'Credenciais inválidas' });
            }

            // Gerar token
            const token = jwt.sign(
                { 
                    userId: user.id, 
                    email: user.email, 
                    userType: user.user_type 
                },
                this.jwtSecret,
                { expiresIn: '24h' }
            );

            // Atualizar último login
            await this.sistema.pool.query(
                'UPDATE users SET last_login = NOW() WHERE id = $1',
                [user.id]
            );

            // Log de login
            await this.sistema.pool.query(
                'INSERT INTO admin_logs (admin_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
                [user.id, 'LOGIN', JSON.stringify({ method: 'password' }), req.ip]
            );

            res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.full_name,
                    type: user.user_type,
                    plan: user.plan_type
                }
            });

        } catch (error) {
            console.error('Erro no login:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    // 👤 PERFIL DO USUÁRIO
    async getProfile(req, res) {
        try {
            const userResult = await this.sistema.pool.query(`
                SELECT u.*, 
                       (SELECT COUNT(*) FROM users WHERE referred_by = u.id) as referrals_count,
                       (SELECT SUM(amount) FROM affiliate_commissions WHERE affiliate_id = u.id AND status = 'PAID') as total_commissions
                FROM users u 
                WHERE u.id = $1
            `, [req.user.id]);

            const user = userResult.rows[0];

            res.json({
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.full_name,
                    phone: user.phone,
                    userType: user.user_type,
                    planType: user.plan_type,
                    affiliateCode: user.affiliate_code,
                    canInvite: user.can_invite,
                    balanceBRL: parseFloat(user.balance_brl || 0),
                    balanceUSD: parseFloat(user.balance_usd || 0),
                    adminCreditsBRL: parseFloat(user.admin_credits_brl || 0),
                    adminCreditsUSD: parseFloat(user.admin_credits_usd || 0),
                    referralsCount: parseInt(user.referrals_count || 0),
                    totalCommissions: parseFloat(user.total_commissions || 0),
                    createdAt: user.created_at,
                    lastLogin: user.last_login
                }
            });

        } catch (error) {
            console.error('Erro ao buscar perfil:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    // 👥 LISTAR USUÁRIOS
    async listarUsuarios(req, res) {
        try {
            const { 
                userType, 
                planType, 
                isActive, 
                page = 1, 
                limit = 20, 
                search 
            } = req.query;

            const filtros = {
                userType,
                planType,
                isActive: isActive !== undefined ? isActive === 'true' : undefined,
                page: parseInt(page),
                limit: parseInt(limit),
                search
            };

            const resultado = await this.sistema.listarUsuarios(filtros);

            res.json({
                success: true,
                users: resultado.users,
                pagination: resultado.pagination
            });

        } catch (error) {
            console.error('Erro ao listar usuários:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    // 👤 CRIAR USUÁRIO
    async criarUsuario(req, res) {
        try {
            const {
                email,
                fullName,
                phone,
                userType = 'BASIC',
                planType = 'BASIC',
                referredBy,
                sendWelcomeSMS = true,
                documentType = 'CPF',
                documentNumber
            } = req.body;

            if (!email || !fullName) {
                return res.status(400).json({ error: 'Email e nome completo são obrigatórios' });
            }

            const resultado = await this.sistema.cadastrarUsuario({
                email,
                fullName,
                phone,
                userType,
                planType,
                referredBy,
                sendWelcomeSMS,
                documentType,
                documentNumber
            }, req.user.id);

            res.status(201).json(resultado);

        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            res.status(400).json({ error: error.message });
        }
    }

    // 🔄 PROMOVER USUÁRIO
    async promoverUsuario(req, res) {
        try {
            const { id } = req.params;
            const { userType, planType, reason } = req.body;

            if (!userType) {
                return res.status(400).json({ error: 'Tipo de usuário é obrigatório' });
            }

            const resultado = await this.sistema.alterarClassificacaoUsuario(
                req.user.id,
                parseInt(id),
                userType,
                planType,
                reason || 'Promoção administrativa'
            );

            res.json(resultado);

        } catch (error) {
            console.error('Erro ao promover usuário:', error);
            res.status(400).json({ error: error.message });
        }
    }

    // 🔑 RESETAR SENHA VIA SMS
    async resetarSenhaViaSMS(req, res) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({ error: 'Email é obrigatório' });
            }

            const resultado = await this.sistema.resetarSenhaViaSMS(email, req.user.id);

            res.json(resultado);

        } catch (error) {
            console.error('Erro ao resetar senha:', error);
            res.status(400).json({ error: error.message });
        }
    }

    // 📱 STATUS TWILIO
    async statusTwilio(req, res) {
        try {
            const status = await this.sistema.inicializarTwilio();
            res.json({
                success: true,
                twilio: status
            });

        } catch (error) {
            console.error('Erro ao verificar Twilio:', error);
            res.status(500).json({ error: 'Erro ao verificar status do Twilio' });
        }
    }

    // 🧪 TESTAR SMS
    async testarSMS(req, res) {
        try {
            const { phone, message } = req.body;

            if (!phone || !message) {
                return res.status(400).json({ error: 'Telefone e mensagem são obrigatórios' });
            }

            const resultado = await this.sistema.enviarSMS(phone, message);

            res.json({
                success: true,
                sms: resultado
            });

        } catch (error) {
            console.error('Erro ao testar SMS:', error);
            res.status(500).json({ error: 'Erro ao enviar SMS de teste' });
        }
    }

    // 🏥 HEALTH CHECK
    async healthCheck(req, res) {
        try {
            // Testar conexão com banco
            const dbResult = await this.sistema.pool.query('SELECT NOW()');
            
            // Testar Twilio
            const twilioStatus = await this.sistema.inicializarTwilio();

            res.json({
                success: true,
                system: 'healthy',
                timestamp: new Date().toISOString(),
                services: {
                    database: 'connected',
                    twilio: twilioStatus.status
                }
            });

        } catch (error) {
            res.status(503).json({
                success: false,
                system: 'unhealthy',
                error: error.message
            });
        }
    }

    // 🚀 INICIAR SERVIDOR
    async iniciar(porta = 3000) {
        try {
            // Inicializar sistema
            console.log('🔧 Inicializando sistema administrativo...');
            await this.sistema.inicializarTwilio();
            await this.sistema.criarEstruturaBanco();

            // Iniciar servidor
            this.app.listen(porta, () => {
                console.log(`\n🌐 SERVIDOR APIs ADMINISTRATIVAS INICIADO`);
                console.log(`=======================================`);
                console.log(`🎯 Porta: ${porta}`);
                console.log(`🔗 URL: http://localhost:${porta}`);
                console.log(`📋 Endpoints disponíveis:`);
                console.log(`   POST /api/auth/login`);
                console.log(`   GET  /api/auth/profile`);
                console.log(`   GET  /api/users`);
                console.log(`   POST /api/users`);
                console.log(`   POST /api/users/:id/promote`);
                console.log(`   POST /api/auth/reset-password-sms`);
                console.log(`   GET  /api/twilio/status`);
                console.log(`   POST /api/system/test-sms`);
                console.log(`   GET  /api/system/health`);
                console.log(`\n✅ Sistema pronto para receber requisições!`);
            });

        } catch (error) {
            console.error('❌ Erro ao iniciar servidor:', error);
            throw error;
        }
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const apis = new APIsAdministrativas();
    apis.iniciar(3000).catch(console.error);
}

module.exports = APIsAdministrativas;
