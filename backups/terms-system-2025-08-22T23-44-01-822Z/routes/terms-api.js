/**
 * ===============================================
 * 📋 SISTEMA DE ACEITE DE TERMOS E POLÍTICAS
 * ===============================================
 * Arquivo: terms-api.js
 * Versão: 1.0.0
 * Data: 2025-08-22
 * 
 * 🎯 FUNCIONALIDADES:
 * ✅ Obter termos atuais
 * ✅ Registrar aceite de usuário
 * ✅ Verificar status de aceite
 * ✅ APIs administrativas
 * ✅ Auditoria completa
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// ===============================================
// 🔗 MIDDLEWARE DE VALIDAÇÃO
// ===============================================

const validateTermsAcceptance = (req, res, next) => {
    const { termsVersionId } = req.body;
    
    if (!termsVersionId) {
        return res.status(400).json({
            success: false,
            error: 'ID da versão dos termos é obrigatório',
            code: 'TERMS_VERSION_REQUIRED'
        });
    }
    
    next();
};

const getClientInfo = (req) => {
    return {
        ip: req.ip || req.connection.remoteAddress || req.socket.remoteAddress,
        userAgent: req.get('User-Agent') || 'Unknown',
        headers: {
            'accept-language': req.get('Accept-Language'),
            'accept-encoding': req.get('Accept-Encoding'),
            'host': req.get('Host')
        }
    };
};

// ===============================================
// 📖 ROTA: Obter Termos Atuais
// ===============================================

router.get('/current', async (req, res) => {
    try {
        console.log('📖 Buscando termos atuais...');
        
        const query = `
            SELECT 
                id,
                version,
                title,
                terms_content,
                privacy_policy,
                effective_date,
                created_at,
                metadata
            FROM terms_versions 
            WHERE is_active = true 
            ORDER BY effective_date DESC 
            LIMIT 1
        `;
        
        const result = await db.query(query);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Nenhuma versão ativa de termos encontrada',
                code: 'NO_ACTIVE_TERMS'
            });
        }
        
        const terms = result.rows[0];
        
        console.log(`✅ Termos atuais encontrados: v${terms.version}`);
        
        res.json({
            success: true,
            data: {
                id: terms.id,
                version: terms.version,
                title: terms.title,
                termsContent: terms.terms_content,
                privacyPolicy: terms.privacy_policy,
                effectiveDate: terms.effective_date,
                createdAt: terms.created_at,
                metadata: terms.metadata
            }
        });
        
    } catch (error) {
        console.error('❌ Erro ao buscar termos atuais:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor ao buscar termos',
            code: 'INTERNAL_ERROR'
        });
    }
});

// ===============================================
// ✅ ROTA: Registrar Aceite de Termos
// ===============================================

router.post('/accept', authenticateToken, validateTermsAcceptance, async (req, res) => {
    try {
        const { termsVersionId } = req.body;
        const userId = req.user.id;
        const clientInfo = getClientInfo(req);
        
        console.log(`✅ Registrando aceite de termos - User: ${userId}, Version: ${termsVersionId}`);
        
        // Verificar se a versão dos termos existe e está ativa
        const termsCheck = await db.query(
            'SELECT id, version, is_active FROM terms_versions WHERE id = $1',
            [termsVersionId]
        );
        
        if (termsCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Versão de termos não encontrada',
                code: 'TERMS_VERSION_NOT_FOUND'
            });
        }
        
        const termsVersion = termsCheck.rows[0];
        
        if (!termsVersion.is_active) {
            return res.status(400).json({
                success: false,
                error: 'Esta versão de termos não está mais ativa',
                code: 'TERMS_VERSION_INACTIVE'
            });
        }
        
        // Registrar aceite usando função do banco
        const acceptanceResult = await db.query(
            'SELECT register_terms_acceptance($1, $2, $3, $4, $5) as acceptance_id',
            [
                userId,
                termsVersionId,
                clientInfo.ip,
                clientInfo.userAgent,
                JSON.stringify({
                    headers: clientInfo.headers,
                    timestamp: new Date().toISOString(),
                    source: 'web_platform'
                })
            ]
        );
        
        const acceptanceId = acceptanceResult.rows[0].acceptance_id;
        
        console.log(`✅ Aceite registrado com ID: ${acceptanceId}`);
        
        res.json({
            success: true,
            message: 'Aceite de termos registrado com sucesso',
            data: {
                acceptanceId: acceptanceId,
                termsVersion: termsVersion.version,
                acceptedAt: new Date().toISOString(),
                userId: userId
            }
        });
        
    } catch (error) {
        console.error('❌ Erro ao registrar aceite:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor ao registrar aceite',
            code: 'INTERNAL_ERROR'
        });
    }
});

// ===============================================
// 🔍 ROTA: Verificar Status de Aceite do Usuário
// ===============================================

router.get('/user/:userId/status', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const requestingUserId = req.user.id;
        
        // Verificar se o usuário pode acessar esses dados
        if (parseInt(userId) !== requestingUserId && !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Acesso negado',
                code: 'ACCESS_DENIED'
            });
        }
        
        console.log(`🔍 Verificando status de aceite - User: ${userId}`);
        
        // Usar função do banco para verificar status
        const statusResult = await db.query(
            'SELECT * FROM check_user_terms_status($1)',
            [userId]
        );
        
        const status = statusResult.rows[0];
        
        console.log(`📊 Status: ${status.needs_acceptance ? 'PRECISA ACEITAR' : 'OK'}`);
        
        res.json({
            success: true,
            data: {
                userId: parseInt(userId),
                needsAcceptance: status.needs_acceptance,
                currentVersion: status.current_version,
                acceptedVersion: status.accepted_version,
                acceptedAt: status.accepted_at,
                status: status.needs_acceptance ? 'PENDING' : 'ACCEPTED'
            }
        });
        
    } catch (error) {
        console.error('❌ Erro ao verificar status:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor ao verificar status',
            code: 'INTERNAL_ERROR'
        });
    }
});

// ===============================================
// 📊 ROTA: Dashboard de Status (Admin)
// ===============================================

router.get('/dashboard', authenticateToken, requireAdmin, async (req, res) => {
    try {
        console.log('📊 Gerando dashboard de termos (admin)...');
        
        // Estatísticas gerais
        const statsQuery = `
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN needs_acceptance THEN 1 END) as users_need_acceptance,
                COUNT(CASE WHEN NOT needs_acceptance THEN 1 END) as users_accepted
            FROM v_user_terms_status
        `;
        
        const statsResult = await db.query(statsQuery);
        const stats = statsResult.rows[0];
        
        // Relatório de compliance por versão
        const complianceQuery = `
            SELECT * FROM v_terms_compliance_report
            ORDER BY effective_date DESC
        `;
        
        const complianceResult = await db.query(complianceQuery);
        
        // Aceites recentes
        const recentQuery = `
            SELECT 
                uta.accepted_at,
                u.email,
                tv.version,
                uta.ip_address
            FROM user_terms_acceptance uta
            JOIN users u ON uta.user_id = u.id
            JOIN terms_versions tv ON uta.terms_version_id = tv.id
            WHERE uta.is_current = true
            ORDER BY uta.accepted_at DESC
            LIMIT 10
        `;
        
        const recentResult = await db.query(recentQuery);
        
        res.json({
            success: true,
            data: {
                statistics: {
                    totalUsers: parseInt(stats.total_users),
                    usersNeedAcceptance: parseInt(stats.users_need_acceptance),
                    usersAccepted: parseInt(stats.users_accepted),
                    complianceRate: stats.total_users > 0 
                        ? ((stats.users_accepted / stats.total_users) * 100).toFixed(2)
                        : 0
                },
                complianceReport: complianceResult.rows,
                recentAcceptances: recentResult.rows,
                generatedAt: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('❌ Erro ao gerar dashboard:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor ao gerar dashboard',
            code: 'INTERNAL_ERROR'
        });
    }
});

// ===============================================
// ➕ ROTA: Criar Nova Versão de Termos (Admin)
// ===============================================

router.post('/admin/create-version', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { version, title, termsContent, privacyPolicy, effectiveDate } = req.body;
        const adminId = req.user.id;
        
        console.log(`➕ Criando nova versão de termos: ${version}`);
        
        // Validações
        if (!version || !title || !termsContent || !privacyPolicy) {
            return res.status(400).json({
                success: false,
                error: 'Todos os campos são obrigatórios',
                code: 'MISSING_REQUIRED_FIELDS'
            });
        }
        
        // Verificar se versão já existe
        const existingVersion = await db.query(
            'SELECT id FROM terms_versions WHERE version = $1',
            [version]
        );
        
        if (existingVersion.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Esta versão já existe',
                code: 'VERSION_ALREADY_EXISTS'
            });
        }
        
        // Inserir nova versão
        const insertQuery = `
            INSERT INTO terms_versions (
                version, title, terms_content, privacy_policy, 
                effective_date, created_by, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, version, created_at
        `;
        
        const effective = effectiveDate ? new Date(effectiveDate) : new Date();
        
        const result = await db.query(insertQuery, [
            version,
            title,
            termsContent,
            privacyPolicy,
            effective,
            adminId,
            JSON.stringify({
                created_by_admin: adminId,
                creation_source: 'admin_panel'
            })
        ]);
        
        const newVersion = result.rows[0];
        
        console.log(`✅ Nova versão criada: ${newVersion.version} (ID: ${newVersion.id})`);
        
        res.json({
            success: true,
            message: 'Nova versão de termos criada com sucesso',
            data: {
                id: newVersion.id,
                version: newVersion.version,
                createdAt: newVersion.created_at
            }
        });
        
    } catch (error) {
        console.error('❌ Erro ao criar versão:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor ao criar versão',
            code: 'INTERNAL_ERROR'
        });
    }
});

// ===============================================
// 🔄 ROTA: Ativar Versão de Termos (Admin)
// ===============================================

router.put('/admin/activate/:versionId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { versionId } = req.params;
        const adminId = req.user.id;
        
        console.log(`🔄 Ativando versão de termos: ${versionId}`);
        
        // Verificar se a versão existe
        const versionCheck = await db.query(
            'SELECT id, version FROM terms_versions WHERE id = $1',
            [versionId]
        );
        
        if (versionCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Versão não encontrada',
                code: 'VERSION_NOT_FOUND'
            });
        }
        
        const version = versionCheck.rows[0];
        
        // Desativar todas as versões atuais
        await db.query('UPDATE terms_versions SET is_active = false WHERE is_active = true');
        
        // Ativar a versão específica
        await db.query(
            'UPDATE terms_versions SET is_active = true, updated_at = NOW() WHERE id = $1',
            [versionId]
        );
        
        // Log da ativação
        await db.query(
            `INSERT INTO terms_acceptance_log (user_id, terms_version_id, action, context)
             VALUES ($1, $2, 'ACTIVATED', $3)`,
            [
                adminId,
                versionId,
                JSON.stringify({
                    activated_by_admin: adminId,
                    previous_active_versions_deactivated: true
                })
            ]
        );
        
        console.log(`✅ Versão ativada: ${version.version}`);
        
        res.json({
            success: true,
            message: 'Versão ativada com sucesso',
            data: {
                versionId: parseInt(versionId),
                version: version.version,
                activatedAt: new Date().toISOString(),
                activatedBy: adminId
            }
        });
        
    } catch (error) {
        console.error('❌ Erro ao ativar versão:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor ao ativar versão',
            code: 'INTERNAL_ERROR'
        });
    }
});

// ===============================================
// 📋 ROTA: Listar Todas as Versões (Admin)
// ===============================================

router.get('/admin/versions', authenticateToken, requireAdmin, async (req, res) => {
    try {
        console.log('📋 Listando todas as versões de termos...');
        
        const query = `
            SELECT 
                id,
                version,
                title,
                effective_date,
                created_at,
                is_active,
                metadata,
                (SELECT COUNT(*) FROM user_terms_acceptance WHERE terms_version_id = tv.id) as acceptance_count
            FROM terms_versions tv
            ORDER BY effective_date DESC
        `;
        
        const result = await db.query(query);
        
        res.json({
            success: true,
            data: {
                versions: result.rows,
                total: result.rows.length
            }
        });
        
    } catch (error) {
        console.error('❌ Erro ao listar versões:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor ao listar versões',
            code: 'INTERNAL_ERROR'
        });
    }
});

// ===============================================
// 📊 ROTA: Relatório de Compliance (Admin)
// ===============================================

router.get('/admin/compliance-report', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { startDate, endDate, format } = req.query;
        
        console.log('📊 Gerando relatório de compliance...');
        
        let dateFilter = '';
        const params = [];
        
        if (startDate && endDate) {
            dateFilter = 'WHERE uta.accepted_at BETWEEN $1 AND $2';
            params.push(startDate, endDate);
        }
        
        const query = `
            SELECT 
                tv.version,
                tv.title,
                tv.effective_date,
                COUNT(uta.id) as total_acceptances,
                COUNT(DISTINCT uta.user_id) as unique_users,
                MIN(uta.accepted_at) as first_acceptance,
                MAX(uta.accepted_at) as last_acceptance,
                ROUND(AVG(EXTRACT(EPOCH FROM (uta.accepted_at - tv.effective_date))/3600), 2) as avg_hours_to_accept
            FROM terms_versions tv
            LEFT JOIN user_terms_acceptance uta ON tv.id = uta.terms_version_id
            ${dateFilter}
            GROUP BY tv.id, tv.version, tv.title, tv.effective_date
            ORDER BY tv.effective_date DESC
        `;
        
        const result = await db.query(query, params);
        
        const reportData = {
            generatedAt: new Date().toISOString(),
            period: startDate && endDate ? { startDate, endDate } : 'All time',
            summary: {
                totalVersions: result.rows.length,
                totalAcceptances: result.rows.reduce((sum, row) => sum + parseInt(row.total_acceptances || 0), 0),
                uniqueUsers: new Set(result.rows.flatMap(row => row.unique_users || 0)).size
            },
            details: result.rows
        };
        
        if (format === 'csv') {
            // Implementar exportação CSV se necessário
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="compliance-report.csv"');
            // ... lógica de CSV
        } else {
            res.json({
                success: true,
                data: reportData
            });
        }
        
    } catch (error) {
        console.error('❌ Erro ao gerar relatório:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor ao gerar relatório',
            code: 'INTERNAL_ERROR'
        });
    }
});

// ===============================================
// 🏥 ROTA: Health Check
// ===============================================

router.get('/health', async (req, res) => {
    try {
        // Verificar conexão com banco
        const dbCheck = await db.query('SELECT 1');
        
        // Verificar se existe versão ativa
        const activeTermsCheck = await db.query(
            'SELECT COUNT(*) as count FROM terms_versions WHERE is_active = true'
        );
        
        const hasActiveTerms = parseInt(activeTermsCheck.rows[0].count) > 0;
        
        res.json({
            success: true,
            status: 'healthy',
            checks: {
                database: dbCheck.rows.length > 0,
                activeTerms: hasActiveTerms
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Health check failed:', error);
        res.status(500).json({
            success: false,
            status: 'unhealthy',
            error: error.message
        });
    }
});

// ===============================================
// 📤 EXPORTAR ROUTER
// ===============================================

module.exports = router;

console.log('📋 Sistema de Termos e Políticas carregado com sucesso!');
console.log('🔗 Rotas disponíveis:');
console.log('   GET  /api/terms/current - Obter termos atuais');
console.log('   POST /api/terms/accept - Registrar aceite');
console.log('   GET  /api/terms/user/:id/status - Status do usuário');
console.log('   GET  /api/terms/dashboard - Dashboard admin');
console.log('   POST /api/terms/admin/create-version - Criar versão');
console.log('   PUT  /api/terms/admin/activate/:id - Ativar versão');
console.log('   GET  /api/terms/admin/versions - Listar versões');
console.log('   GET  /api/terms/admin/compliance-report - Relatório');
console.log('   GET  /api/terms/health - Health check');
