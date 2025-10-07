#!/usr/bin/env node

/**
 * 🔐 SECRETS ROTATION UTILITY
 * Generates new cryptographically secure secrets for production deployment
 *
 * Usage:
 *   node scripts/rotate-secrets.js
 *
 * This will generate:
 * - JWT Secret (64 bytes base64)
 * - JWT Refresh Secret (64 bytes base64)
 * - Encryption Key (32 bytes hex)
 * - TradingView Webhook Secret (32 bytes hex)
 * - Session Secret (32 bytes hex)
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class SecretsRotation {
    constructor() {
        this.secrets = {};
    }

    /**
     * Generate cryptographically secure random string
     */
    generateSecret(bytes, encoding = 'base64') {
        return crypto.randomBytes(bytes).toString(encoding);
    }

    /**
     * Generate all required secrets
     */
    generateAllSecrets() {
        console.log('🔐 Generating cryptographically secure secrets...\n');

        this.secrets = {
            JWT_SECRET: this.generateSecret(64, 'base64'),
            JWT_REFRESH_SECRET: this.generateSecret(64, 'base64'),
            ENCRYPTION_KEY: this.generateSecret(32, 'hex'),
            TRADINGVIEW_WEBHOOK_SECRET: this.generateSecret(32, 'hex'),
            SESSION_SECRET: this.generateSecret(32, 'hex'),
            ADMIN_API_KEY: this.generateSecret(32, 'hex')
        };

        return this.secrets;
    }

    /**
     * Display generated secrets
     */
    displaySecrets() {
        console.log('📋 Generated Secrets:\n');
        console.log('Copy these to your .env.production file:\n');
        console.log('─'.repeat(80));

        for (const [key, value] of Object.entries(this.secrets)) {
            console.log(`${key}=${value}`);
        }

        console.log('─'.repeat(80));
        console.log('\n✅ All secrets generated successfully!');
        console.log('\n⚠️  SECURITY WARNINGS:');
        console.log('1. NEVER commit these secrets to version control');
        console.log('2. Store secrets in environment variable encryption (Vault, AWS Secrets Manager)');
        console.log('3. Rotate secrets every 90 days');
        console.log('4. Use different secrets for dev, staging, and production');
        console.log('5. Immediately rotate if any secret is compromised\n');
    }

    /**
     * Save secrets to a secure file (optional)
     */
    saveToFile(filename = '.env.secrets') {
        const filePath = path.join(__dirname, '..', filename);
        const timestamp = new Date().toISOString();

        let content = `# ==============================================================================\n`;
        content += `# GENERATED SECRETS - ${timestamp}\n`;
        content += `# ==============================================================================\n`;
        content += `# CRITICAL: Keep this file secure and NEVER commit to version control\n`;
        content += `# ==============================================================================\n\n`;

        for (const [key, value] of Object.entries(this.secrets)) {
            content += `${key}=${value}\n`;
        }

        content += `\n# ==============================================================================\n`;
        content += `# ROTATION LOG\n`;
        content += `# ==============================================================================\n`;
        content += `# Generated: ${timestamp}\n`;
        content += `# Next rotation due: ${this.getNextRotationDate()}\n`;
        content += `# ==============================================================================\n`;

        try {
            fs.writeFileSync(filePath, content, { mode: 0o600 }); // -rw------- (owner read/write only)
            console.log(`\n💾 Secrets saved to: ${filePath}`);
            console.log(`📁 File permissions: -rw------- (owner read/write only)`);
        } catch (error) {
            console.error(`\n❌ Error saving secrets: ${error.message}`);
        }
    }

    /**
     * Calculate next rotation date (90 days from now)
     */
    getNextRotationDate() {
        const nextRotation = new Date();
        nextRotation.setDate(nextRotation.getDate() + 90);
        return nextRotation.toISOString().split('T')[0];
    }

    /**
     * Generate secrets comparison for migration
     */
    compareWithExisting(envPath = '.env') {
        const fullPath = path.join(__dirname, '..', envPath);

        if (!fs.existsSync(fullPath)) {
            console.log(`\n⚠️  No existing ${envPath} file found for comparison`);
            return;
        }

        console.log(`\n🔍 Comparing with existing ${envPath}...\n`);

        const envContent = fs.readFileSync(fullPath, 'utf8');
        const lines = envContent.split('\n');

        const existingSecrets = {};
        for (const line of lines) {
            for (const key of Object.keys(this.secrets)) {
                if (line.startsWith(`${key}=`)) {
                    existingSecrets[key] = line.split('=')[1].trim();
                }
            }
        }

        console.log('📊 Secret Status:');
        console.log('─'.repeat(80));

        for (const key of Object.keys(this.secrets)) {
            if (existingSecrets[key]) {
                const isWeak = this.checkSecretStrength(key, existingSecrets[key]);
                const status = isWeak ? '❌ WEAK' : '✅ EXISTS';
                console.log(`${key}: ${status}`);
            } else {
                console.log(`${key}: ⚠️  MISSING`);
            }
        }

        console.log('─'.repeat(80));
    }

    /**
     * Check if a secret is weak or insecure
     */
    checkSecretStrength(key, value) {
        // Check for common weak patterns
        const weakPatterns = [
            'your-',
            'change-this',
            'example',
            'test',
            'dev',
            'localhost',
            '12345',
            'password',
            'secret'
        ];

        const lowerValue = value.toLowerCase();
        for (const pattern of weakPatterns) {
            if (lowerValue.includes(pattern)) {
                return true; // Weak secret found
            }
        }

        // Check length
        if (key.includes('JWT') && value.length < 32) return true;
        if (key.includes('KEY') && value.length < 16) return true;

        return false; // Secret looks strong
    }

    /**
     * Create rotation reminder
     */
    createRotationReminder() {
        const reminderPath = path.join(__dirname, '..', 'SECRETS-ROTATION-REMINDER.md');
        const nextRotation = this.getNextRotationDate();

        const content = `# 🔐 Secrets Rotation Reminder

**Last Rotation**: ${new Date().toISOString().split('T')[0]}
**Next Rotation Due**: ${nextRotation}

## Secrets to Rotate

- [ ] JWT_SECRET
- [ ] JWT_REFRESH_SECRET
- [ ] ENCRYPTION_KEY
- [ ] TRADINGVIEW_WEBHOOK_SECRET
- [ ] SESSION_SECRET
- [ ] ADMIN_API_KEY

## Rotation Procedure

1. Generate new secrets:
   \`\`\`bash
   node scripts/rotate-secrets.js
   \`\`\`

2. Update production environment variables

3. Deploy new secrets to all environments

4. Invalidate old JWT tokens (requires user re-login)

5. Update TradingView webhook configuration with new secret

6. Test all authentication flows

7. Monitor for authentication errors

## Emergency Rotation

If any secret is compromised:
1. Immediately generate new secrets
2. Deploy to production ASAP
3. Force user re-authentication
4. Audit access logs
5. Notify security team

## Checklist After Rotation

- [ ] All users can log in successfully
- [ ] TradingView webhooks are working
- [ ] Stripe webhooks are authenticated
- [ ] Session management is functional
- [ ] API authentication is working
- [ ] No authentication errors in logs

---
**Generated**: ${new Date().toISOString()}
`;

        fs.writeFileSync(reminderPath, content);
        console.log(`\n📅 Rotation reminder created: ${reminderPath}`);
    }
}

// Main execution
if (require.main === module) {
    const rotation = new SecretsRotation();

    // Generate secrets
    rotation.generateAllSecrets();

    // Display secrets
    rotation.displaySecrets();

    // Compare with existing .env
    rotation.compareWithExisting('.env');

    // Ask user if they want to save
    console.log('\n❓ Save secrets to file? (WARNING: File will contain sensitive data)');
    console.log('   Press Ctrl+C to skip, or run with --save flag to save automatically');

    if (process.argv.includes('--save')) {
        rotation.saveToFile();
        rotation.createRotationReminder();
    }
}

module.exports = SecretsRotation;
