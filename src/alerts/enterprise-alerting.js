/**
 * 🚨 ENTERPRISE ALERTING SYSTEM - SISTEMA DE ALERTAS AVANÇADO
 * ============================================================
 * 
 * Sistema inteligente de alertas multi-canal com escalação
 * Telegram, Email, SMS, webhook e regras de negócio
 * 
 * @author CoinBitClub Enterprise Team
 * @version 6.0.0 Advanced
 */

const nodemailer = require('nodemailer');
const axios = require('axios');

class EnterpriseAlertingSystem {
    constructor(options = {}) {
        this.config = {
            enabled: process.env.NOTIFICATIONS_ENABLED === 'true',
            cooldown: parseInt(process.env.MONITORING_ALERT_COOLDOWN) || 300000, // 5 minutos
            escalationTime: options.escalationTime || 900000, // 15 minutos
            channels: {
                email: process.env.EMAIL_NOTIFICATIONS === 'true',
                telegram: process.env.TELEGRAM_NOTIFICATIONS === 'true',
                sms: process.env.SMS_NOTIFICATIONS === 'true',
                webhook: !!process.env.ALERT_WEBHOOK_URL
            },
            ...options
        };

        this.alertHistory = new Map();
        this.activeAlerts = new Map();
        this.escalatedAlerts = new Set();
        
        this.stats = {
            totalAlerts: 0,
            criticalAlerts: 0,
            warningAlerts: 0,
            infoAlerts: 0,
            emailsSent: 0,
            telegramSent: 0,
            smsSent: 0,
            webhooksSent: 0
        };

        this.severityLevels = {
            CRITICAL: { priority: 1, emoji: '🔴', color: '#FF0000' },
            HIGH: { priority: 2, emoji: '🟠', color: '#FF8000' },
            MEDIUM: { priority: 3, emoji: '🟡', color: '#FFFF00' },
            LOW: { priority: 4, emoji: '🟢', color: '#00FF00' },
            INFO: { priority: 5, emoji: '🔵', color: '#0080FF' }
        };

        this.setupTransports();
        this.startAlertProcessor();

        console.log('🚨 Enterprise Alerting System inicializado');
        console.log(`📧 Email: ${this.config.channels.email} | 📱 Telegram: ${this.config.channels.telegram}`);
    }

    /**
     * 🔧 Configurar transportes de notificação
     */
    setupTransports() {
        // Email Transport
        if (this.config.channels.email) {
            this.emailTransport = nodemailer.createTransporter({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: false,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASSWORD
                }
            });
            console.log('📧 Email transport configurado');
        }

        // Telegram Bot
        if (this.config.channels.telegram) {
            this.telegramToken = process.env.TELEGRAM_BOT_TOKEN;
            this.telegramChatId = process.env.TELEGRAM_CHAT_ID;
            console.log('📱 Telegram bot configurado');
        }

        // SMS (Twilio)
        if (this.config.channels.sms) {
            this.twilioConfig = {
                accountSid: process.env.TWILIO_ACCOUNT_SID,
                authToken: process.env.TWILIO_AUTH_TOKEN,
                phoneNumber: process.env.TWILIO_PHONE_NUMBER
            };
            console.log('📱 SMS (Twilio) configurado');
        }

        // Webhook
        if (this.config.channels.webhook) {
            this.webhookUrl = process.env.ALERT_WEBHOOK_URL;
            console.log('🔗 Webhook configurado');
        }
    }

    /**
     * 🚨 Criar alerta
     */
    async createAlert(alert) {
        if (!this.config.enabled) {
            return { sent: false, reason: 'Alertas desabilitados' };
        }

        const alertData = {
            id: this.generateAlertId(),
            timestamp: new Date().toISOString(),
            severity: alert.severity || 'MEDIUM',
            title: alert.title || 'Alerta do Sistema',
            message: alert.message || '',
            component: alert.component || 'system',
            source: alert.source || 'unknown',
            metadata: alert.metadata || {},
            acknowledged: false,
            resolved: false,
            escalated: false
        };

        // Verificar cooldown
        const cooldownKey = `${alertData.component}_${alertData.severity}`;
        const lastAlert = this.alertHistory.get(cooldownKey);
        
        if (lastAlert && Date.now() - lastAlert < this.config.cooldown) {
            console.log(`⏱️ Alerta em cooldown: ${cooldownKey}`);
            return { sent: false, reason: 'Cooldown ativo' };
        }

        // Registrar alerta
        this.activeAlerts.set(alertData.id, alertData);
        this.alertHistory.set(cooldownKey, Date.now());
        
        // Atualizar estatísticas
        this.stats.totalAlerts++;
        switch (alertData.severity) {
            case 'CRITICAL':
                this.stats.criticalAlerts++;
                break;
            case 'HIGH':
            case 'MEDIUM':
                this.stats.warningAlerts++;
                break;
            default:
                this.stats.infoAlerts++;
        }

        console.log(`🚨 Novo alerta: ${alertData.severity} - ${alertData.title}`);

        // Enviar para todos os canais configurados
        const results = await this.sendToAllChannels(alertData);

        // Programar escalação se for crítico
        if (alertData.severity === 'CRITICAL') {
            this.scheduleEscalation(alertData);
        }

        return {
            sent: true,
            alertId: alertData.id,
            channels: results
        };
    }

    /**
     * 📢 Enviar para todos os canais
     */
    async sendToAllChannels(alert) {
        const results = {};

        // Email
        if (this.config.channels.email) {
            try {
                results.email = await this.sendEmail(alert);
                this.stats.emailsSent++;
            } catch (error) {
                results.email = { success: false, error: error.message };
            }
        }

        // Telegram
        if (this.config.channels.telegram) {
            try {
                results.telegram = await this.sendTelegram(alert);
                this.stats.telegramSent++;
            } catch (error) {
                results.telegram = { success: false, error: error.message };
            }
        }

        // SMS
        if (this.config.channels.sms && alert.severity === 'CRITICAL') {
            try {
                results.sms = await this.sendSMS(alert);
                this.stats.smsSent++;
            } catch (error) {
                results.sms = { success: false, error: error.message };
            }
        }

        // Webhook
        if (this.config.channels.webhook) {
            try {
                results.webhook = await this.sendWebhook(alert);
                this.stats.webhooksSent++;
            } catch (error) {
                results.webhook = { success: false, error: error.message };
            }
        }

        return results;
    }

    /**
     * 📧 Enviar email
     */
    async sendEmail(alert) {
        const severity = this.severityLevels[alert.severity];
        
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
                <div style="background: ${severity.color}; color: white; padding: 20px; text-align: center;">
                    <h1>${severity.emoji} ${alert.severity} ALERT</h1>
                </div>
                <div style="padding: 20px; background: #f5f5f5;">
                    <h2>${alert.title}</h2>
                    <p><strong>Component:</strong> ${alert.component}</p>
                    <p><strong>Source:</strong> ${alert.source}</p>
                    <p><strong>Time:</strong> ${alert.timestamp}</p>
                    <div style="background: white; padding: 15px; border-left: 4px solid ${severity.color};">
                        <p>${alert.message}</p>
                    </div>
                    ${Object.keys(alert.metadata).length > 0 ? `
                        <h3>Additional Information:</h3>
                        <ul>
                            ${Object.entries(alert.metadata).map(([key, value]) => 
                                `<li><strong>${key}:</strong> ${value}</li>`
                            ).join('')}
                        </ul>
                    ` : ''}
                </div>
                <div style="background: #333; color: white; padding: 10px; text-align: center;">
                    <p>CoinBitClub Enterprise Monitoring System</p>
                </div>
            </div>
        `;

        const mailOptions = {
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: process.env.ALERT_EMAIL || 'admin@coinbitclub.com',
            subject: `${severity.emoji} [${alert.severity}] ${alert.title}`,
            html: html
        };

        const result = await this.emailTransport.sendMail(mailOptions);
        return { success: true, messageId: result.messageId };
    }

    /**
     * 📱 Enviar Telegram
     */
    async sendTelegram(alert) {
        const severity = this.severityLevels[alert.severity];
        
        const message = `
${severity.emoji} *${alert.severity} ALERT*

*${alert.title}*

📍 *Component:* ${alert.component}
🔍 *Source:* ${alert.source}
⏰ *Time:* ${alert.timestamp}

💬 *Message:*
${alert.message}

${Object.keys(alert.metadata).length > 0 ? `
📊 *Additional Info:*
${Object.entries(alert.metadata).map(([key, value]) => `• *${key}:* ${value}`).join('\n')}
` : ''}

🆔 *Alert ID:* \`${alert.id}\`
        `.trim();

        const response = await axios.post(
            `https://api.telegram.org/bot${this.telegramToken}/sendMessage`,
            {
                chat_id: this.telegramChatId,
                text: message,
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            }
        );

        return { success: true, messageId: response.data.result.message_id };
    }

    /**
     * 📱 Enviar SMS
     */
    async sendSMS(alert) {
        const twilio = require('twilio')(
            this.twilioConfig.accountSid, 
            this.twilioConfig.authToken
        );

        const message = `🚨 ${alert.severity} ALERT: ${alert.title}\n\n${alert.message}\n\nComponent: ${alert.component}\nTime: ${new Date(alert.timestamp).toLocaleString()}`;

        const result = await twilio.messages.create({
            body: message,
            from: this.twilioConfig.phoneNumber,
            to: process.env.ALERT_PHONE || '+1234567890'
        });

        return { success: true, sid: result.sid };
    }

    /**
     * 🔗 Enviar Webhook
     */
    async sendWebhook(alert) {
        const payload = {
            event: 'alert_created',
            alert: alert,
            system: 'CoinBitClub Enterprise',
            environment: process.env.NODE_ENV,
            timestamp: Date.now()
        };

        const response = await axios.post(this.webhookUrl, payload, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'CoinBitClub-AlertSystem/6.0.0'
            },
            timeout: 10000
        });

        return { 
            success: true, 
            status: response.status,
            response: response.data 
        };
    }

    /**
     * ⏰ Programar escalação
     */
    scheduleEscalation(alert) {
        setTimeout(async () => {
            // Verificar se o alerta ainda está ativo e não foi reconhecido
            const currentAlert = this.activeAlerts.get(alert.id);
            
            if (currentAlert && !currentAlert.acknowledged && !currentAlert.resolved) {
                console.log(`🚨 Escalando alerta crítico: ${alert.id}`);
                
                currentAlert.escalated = true;
                this.escalatedAlerts.add(alert.id);
                
                // Enviar alerta de escalação
                await this.createAlert({
                    severity: 'CRITICAL',
                    title: `ESCALATION: ${alert.title}`,
                    message: `Alert ${alert.id} has been escalated due to no acknowledgment.\n\nOriginal Message: ${alert.message}`,
                    component: alert.component,
                    source: 'escalation_system',
                    metadata: {
                        originalAlertId: alert.id,
                        escalationTime: new Date().toISOString(),
                        ...alert.metadata
                    }
                });
            }
        }, this.config.escalationTime);
    }

    /**
     * ✅ Reconhecer alerta
     */
    acknowledgeAlert(alertId, userId = 'system') {
        const alert = this.activeAlerts.get(alertId);
        
        if (alert) {
            alert.acknowledged = true;
            alert.acknowledgedBy = userId;
            alert.acknowledgedAt = new Date().toISOString();
            
            console.log(`✅ Alerta reconhecido: ${alertId} por ${userId}`);
            return { success: true };
        }
        
        return { success: false, error: 'Alert not found' };
    }

    /**
     * ✅ Resolver alerta
     */
    resolveAlert(alertId, userId = 'system', resolution = '') {
        const alert = this.activeAlerts.get(alertId);
        
        if (alert) {
            alert.resolved = true;
            alert.resolvedBy = userId;
            alert.resolvedAt = new Date().toISOString();
            alert.resolution = resolution;
            
            // Remover dos alertas ativos
            this.activeAlerts.delete(alertId);
            this.escalatedAlerts.delete(alertId);
            
            console.log(`✅ Alerta resolvido: ${alertId} por ${userId}`);
            return { success: true };
        }
        
        return { success: false, error: 'Alert not found' };
    }

    /**
     * 🚨 Alertas predefinidos do sistema
     */
    
    // Trading alerts
    async tradingAlert(type, symbol, data = {}) {
        const alerts = {
            position_opened: {
                severity: 'INFO',
                title: `Position Opened: ${symbol}`,
                message: `New ${data.side} position opened for ${symbol}`,
                component: 'trading'
            },
            position_closed: {
                severity: 'INFO',
                title: `Position Closed: ${symbol}`,
                message: `${data.side} position closed for ${symbol} with P&L: ${data.pnl}`,
                component: 'trading'
            },
            high_loss: {
                severity: 'HIGH',
                title: `High Loss Alert: ${symbol}`,
                message: `Position has unrealized loss of ${data.loss}`,
                component: 'trading'
            },
            margin_call: {
                severity: 'CRITICAL',
                title: `Margin Call: ${symbol}`,
                message: `Margin call triggered for position ${symbol}`,
                component: 'trading'
            }
        };

        const alert = alerts[type];
        if (alert) {
            return await this.createAlert({
                ...alert,
                source: 'trading_system',
                metadata: { symbol, type, ...data }
            });
        }
    }

    // System alerts
    async systemAlert(type, data = {}) {
        const alerts = {
            high_cpu: {
                severity: 'HIGH',
                title: 'High CPU Usage',
                message: `CPU usage is at ${data.cpu}%`,
                component: 'system'
            },
            high_memory: {
                severity: 'HIGH',
                title: 'High Memory Usage',
                message: `Memory usage is at ${data.memory}%`,
                component: 'system'
            },
            disk_space: {
                severity: 'MEDIUM',
                title: 'Low Disk Space',
                message: `Disk space is at ${data.usage}%`,
                component: 'system'
            },
            service_down: {
                severity: 'CRITICAL',
                title: 'Service Down',
                message: `Service ${data.service} is not responding`,
                component: 'system'
            }
        };

        const alert = alerts[type];
        if (alert) {
            return await this.createAlert({
                ...alert,
                source: 'monitoring_system',
                metadata: data
            });
        }
    }

    // Security alerts
    async securityAlert(type, data = {}) {
        const alerts = {
            failed_login: {
                severity: 'MEDIUM',
                title: 'Failed Login Attempt',
                message: `Multiple failed login attempts from IP ${data.ip}`,
                component: 'security'
            },
            suspicious_activity: {
                severity: 'HIGH',
                title: 'Suspicious Activity',
                message: `Suspicious activity detected for user ${data.userId}`,
                component: 'security'
            },
            unauthorized_access: {
                severity: 'CRITICAL',
                title: 'Unauthorized Access',
                message: `Unauthorized access attempt detected`,
                component: 'security'
            }
        };

        const alert = alerts[type];
        if (alert) {
            return await this.createAlert({
                ...alert,
                source: 'security_system',
                metadata: data
            });
        }
    }

    /**
     * 🔄 Processador de alertas
     */
    startAlertProcessor() {
        setInterval(() => {
            // Limpar alertas antigos resolvidos
            const oneDay = 24 * 60 * 60 * 1000;
            const now = Date.now();
            
            for (const [key, timestamp] of this.alertHistory.entries()) {
                if (now - timestamp > oneDay) {
                    this.alertHistory.delete(key);
                }
            }
        }, 60000); // A cada minuto
    }

    /**
     * 🆔 Gerar ID único para alerta
     */
    generateAlertId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `alert_${timestamp}_${random}`;
    }

    /**
     * 📊 Obter estatísticas
     */
    getStats() {
        return {
            ...this.stats,
            activeAlerts: this.activeAlerts.size,
            escalatedAlerts: this.escalatedAlerts.size,
            channels: this.config.channels,
            cooldown: this.config.cooldown,
            uptime: Date.now() - (this.stats.startTime || Date.now())
        };
    }

    /**
     * 📋 Listar alertas ativos
     */
    getActiveAlerts() {
        return Array.from(this.activeAlerts.values()).sort((a, b) => {
            const aSeverity = this.severityLevels[a.severity].priority;
            const bSeverity = this.severityLevels[b.severity].priority;
            return aSeverity - bSeverity;
        });
    }

    /**
     * 🔌 Parar sistema de alertas
     */
    stop() {
        console.log('🚨 Enterprise Alerting System parado');
    }
}

module.exports = EnterpriseAlertingSystem;
