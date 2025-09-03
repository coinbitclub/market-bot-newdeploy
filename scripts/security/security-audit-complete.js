#!/usr/bin/env node

/**
 * 🔒 AUDIT DE SEGURANÇA - DETECÇÃO DE CHAVES SENSÍVEIS
 * 
 * Este script analisa todo o projeto em busca de:
 * - Chaves API expostas
 * - Passwords em texto claro
 * - URLs de banco com credenciais
 * - Tokens sensíveis
 */

const fs = require('fs');
const path = require('path');

class SecurityAudit {
    constructor() {
        this.sensitivePatterns = {
            // PostgreSQL URLs
            postgres: /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^\s"']+)/gi,
            
            // API Keys patterns
            openai: /sk-[a-zA-Z0-9]{48,}/gi,
            stripe: /(sk_live_[a-zA-Z0-9]+|pk_live_[a-zA-Z0-9]+)/gi,
            binance: /[A-Za-z0-9]{64}/gi,
            
            // Auth tokens
            jwt: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/gi,
            
            // Generic secrets
            password: /(password|pwd|secret|token|key)[\s]*[=:]['"]([^'"]+)['"]/gi,
            
            // Specific services
            twilio: /(AC[a-z0-9]{32}|SK[a-z0-9]{32})/gi,
            ngrok: /[0-9]{1,2}[a-zA-Z0-9]{24,30}/gi
        };
        
        this.findings = [];
        this.excludePatterns = [
            'node_modules',
            '.git',
            'logs',
            'temp',
            'backups',
            '.json'
        ];
    }

    async scanProject() {
        console.log('🔒 INICIANDO AUDITORIA DE SEGURANÇA');
        console.log('='.repeat(50));
        
        const projectRoot = process.cwd();
        await this.scanDirectory(projectRoot);
        
        this.generateReport();
    }

    async scanDirectory(dirPath) {
        const items = fs.readdirSync(dirPath);
        
        for (const item of items) {
            const fullPath = path.join(dirPath, item);
            const relativePath = path.relative(process.cwd(), fullPath);
            
            // Skip excluded directories
            if (this.shouldExclude(relativePath)) continue;
            
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                await this.scanDirectory(fullPath);
            } else if (stat.isFile()) {
                await this.scanFile(fullPath);
            }
        }
    }

    shouldExclude(path) {
        return this.excludePatterns.some(pattern => 
            path.includes(pattern) || path.startsWith('.')
        );
    }

    async scanFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const relativePath = path.relative(process.cwd(), filePath);
            
            // Scan for each pattern type
            for (const [type, pattern] of Object.entries(this.sensitivePatterns)) {
                const matches = [...content.matchAll(pattern)];
                
                for (const match of matches) {
                    // Skip obvious examples/placeholders
                    if (this.isPlaceholder(match[0])) continue;
                    
                    this.findings.push({
                        type,
                        file: relativePath,
                        line: this.getLineNumber(content, match.index),
                        match: this.sanitizeMatch(match[0], type),
                        severity: this.getSeverity(type, match[0])
                    });
                }
            }
            
        } catch (error) {
            // Skip binary files or files that can't be read
        }
    }

    isPlaceholder(match) {
        const placeholders = [
            'your_api_key_here',
            'YOUR_API_KEY_HERE',
            'example',
            'placeholder',
            'test_key',
            'demo_key',
            'sample',
            'xxxx',
            '****'
        ];
        
        return placeholders.some(placeholder => 
            match.toLowerCase().includes(placeholder.toLowerCase())
        );
    }

    getLineNumber(content, index) {
        const beforeMatch = content.substring(0, index);
        return beforeMatch.split('\n').length;
    }

    sanitizeMatch(match, type) {
        // Sanitize sensitive data for reporting
        if (type === 'postgres') {
            return match.replace(/:([^@]+)@/, ':****@');
        }
        
        if (match.length > 20) {
            return match.substring(0, 10) + '...' + match.substring(match.length - 6);
        }
        
        return match.substring(0, 8) + '...';
    }

    getSeverity(type, match) {
        if (type === 'postgres' || type === 'stripe' || type === 'openai') {
            return 'CRITICAL';
        }
        
        if (type === 'binance' || type === 'twilio') {
            return 'HIGH';
        }
        
        return 'MEDIUM';
    }

    generateReport() {
        console.log('\n📊 RELATÓRIO DE AUDITORIA DE SEGURANÇA');
        console.log('='.repeat(50));
        
        if (this.findings.length === 0) {
            console.log('✅ Nenhuma exposição de dados sensíveis detectada!');
            return;
        }
        
        // Group by severity
        const bySeverity = this.findings.reduce((acc, finding) => {
            acc[finding.severity] = acc[finding.severity] || [];
            acc[finding.severity].push(finding);
            return acc;
        }, {});
        
        ['CRITICAL', 'HIGH', 'MEDIUM'].forEach(severity => {
            if (!bySeverity[severity]) return;
            
            console.log(`\n🚨 ${severity} (${bySeverity[severity].length} encontrados):`);
            console.log('-'.repeat(30));
            
            bySeverity[severity].forEach(finding => {
                console.log(`📄 ${finding.file}:${finding.line}`);
                console.log(`   Tipo: ${finding.type}`);
                console.log(`   Match: ${finding.match}`);
                console.log();
            });
        });
        
        this.generateSecurityActions();
    }

    generateSecurityActions() {
        console.log('\n🛡️ AÇÕES DE SEGURANÇA RECOMENDADAS');
        console.log('='.repeat(50));
        
        const criticalFindings = this.findings.filter(f => f.severity === 'CRITICAL');
        const highFindings = this.findings.filter(f => f.severity === 'HIGH');
        
        if (criticalFindings.length > 0) {
            console.log('🚨 AÇÃO IMEDIATA NECESSÁRIA:');
            console.log('1. Mover todas as chaves para variáveis de ambiente');
            console.log('2. Adicionar arquivos críticos ao .gitignore');
            console.log('3. Fazer commit cleanup do histórico Git');
            console.log('4. Rotacionar chaves expostas imediatamente');
            console.log();
        }
        
        if (highFindings.length > 0) {
            console.log('⚠️ AÇÃO PRIORITÁRIA:');
            console.log('1. Verificar se chaves estão ativas');
            console.log('2. Implementar validation de .env');
            console.log('3. Configurar pre-commit hooks');
            console.log();
        }
        
        console.log('✅ RECOMENDAÇÕES GERAIS:');
        console.log('1. Usar apenas process.env para chaves sensíveis');
        console.log('2. Implementar .env.example sem valores reais');
        console.log('3. Adicionar audit de segurança ao CI/CD');
        console.log('4. Configurar secrets management adequado');
        console.log();
        
        console.log('📋 PRÓXIMOS PASSOS:');
        console.log('1. Executar security-cleanup.js');
        console.log('2. Verificar .gitignore');
        console.log('3. Atualizar .env.example');
        console.log('4. Testar sistema sem exposições');
    }
}

// Executar auditoria
if (require.main === module) {
    const audit = new SecurityAudit();
    audit.scanProject().catch(console.error);
}

module.exports = SecurityAudit;
