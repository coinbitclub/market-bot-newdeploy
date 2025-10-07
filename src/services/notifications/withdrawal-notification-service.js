/**
 * 📧 WITHDRAWAL NOTIFICATION SERVICE
 * Email and SMS notifications for affiliate withdrawal events
 * CoinBitClub Enterprise v6.0.0 - Phase 2
 */

const { affiliateLogger } = require('../../config/winston.config');

class WithdrawalNotificationService {
    constructor() {
        this.emailEnabled = process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true';
        this.smsEnabled = process.env.SMS_NOTIFICATIONS_ENABLED === 'true';
    }

    /**
     * Send withdrawal requested notification
     */
    async notifyWithdrawalRequested(affiliate, withdrawal) {
        try {
            const emailData = {
                to: affiliate.email,
                subject: '💰 Withdrawal Request Submitted',
                template: 'withdrawal-requested',
                data: {
                    affiliateName: affiliate.name,
                    amount: withdrawal.amount,
                    method: withdrawal.method,
                    fees: withdrawal.fees,
                    netAmount: withdrawal.netAmount,
                    status: withdrawal.status,
                    withdrawalId: withdrawal.id,
                    estimatedProcessingTime: withdrawal.status === 'approved'
                        ? '1-2 business days'
                        : '2-3 business days (pending review)',
                    riskLevel: withdrawal.riskLevel || 'NORMAL'
                }
            };

            const emailSent = await this.sendEmail(emailData);

            affiliateLogger.info('Withdrawal requested notification sent', {
                affiliateId: affiliate.id,
                withdrawalId: withdrawal.id,
                emailSent,
                status: withdrawal.status
            });

            return {
                success: true,
                emailSent,
                channels: emailSent ? ['email'] : []
            };
        } catch (error) {
            affiliateLogger.error('Error sending withdrawal requested notification', {
                affiliateId: affiliate.id,
                withdrawalId: withdrawal.id,
                error: error.message
            });

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send withdrawal approved notification
     */
    async notifyWithdrawalApproved(affiliate, withdrawal) {
        try {
            const emailData = {
                to: affiliate.email,
                subject: '✅ Withdrawal Approved',
                template: 'withdrawal-approved',
                data: {
                    affiliateName: affiliate.name,
                    amount: withdrawal.amount,
                    method: withdrawal.method,
                    netAmount: withdrawal.netAmount,
                    withdrawalId: withdrawal.id,
                    approvedAt: withdrawal.approvedAt || new Date().toISOString(),
                    estimatedCompletion: withdrawal.method === 'PIX'
                        ? '24 hours'
                        : '2-3 business days'
                }
            };

            const emailSent = await this.sendEmail(emailData);

            // Send SMS for approved withdrawals
            let smsSent = false;
            if (this.smsEnabled && affiliate.phone) {
                const smsData = {
                    to: affiliate.phone,
                    message: `CoinBitClub: Your withdrawal of $${withdrawal.netAmount} has been approved! Estimated delivery: ${
                        withdrawal.method === 'PIX' ? '24h' : '2-3 days'
                    }`
                };
                smsSent = await this.sendSMS(smsData);
            }

            affiliateLogger.info('Withdrawal approved notification sent', {
                affiliateId: affiliate.id,
                withdrawalId: withdrawal.id,
                emailSent,
                smsSent
            });

            return {
                success: true,
                emailSent,
                smsSent,
                channels: [
                    ...(emailSent ? ['email'] : []),
                    ...(smsSent ? ['sms'] : [])
                ]
            };
        } catch (error) {
            affiliateLogger.error('Error sending withdrawal approved notification', {
                affiliateId: affiliate.id,
                withdrawalId: withdrawal.id,
                error: error.message
            });

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send withdrawal rejected notification
     */
    async notifyWithdrawalRejected(affiliate, withdrawal, reason) {
        try {
            const emailData = {
                to: affiliate.email,
                subject: '❌ Withdrawal Request Declined',
                template: 'withdrawal-rejected',
                data: {
                    affiliateName: affiliate.name,
                    amount: withdrawal.amount,
                    withdrawalId: withdrawal.id,
                    rejectedAt: withdrawal.rejectedAt || new Date().toISOString(),
                    reason: reason || 'Please contact support for more information',
                    supportEmail: process.env.SUPPORT_EMAIL || 'support@coinbitclub.com',
                    balanceRestored: true,
                    currentBalance: affiliate.currentBalance
                }
            };

            const emailSent = await this.sendEmail(emailData);

            affiliateLogger.warn('Withdrawal rejected notification sent', {
                affiliateId: affiliate.id,
                withdrawalId: withdrawal.id,
                reason,
                emailSent
            });

            return {
                success: true,
                emailSent,
                channels: emailSent ? ['email'] : []
            };
        } catch (error) {
            affiliateLogger.error('Error sending withdrawal rejected notification', {
                affiliateId: affiliate.id,
                withdrawalId: withdrawal.id,
                error: error.message
            });

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send withdrawal completed notification
     */
    async notifyWithdrawalCompleted(affiliate, withdrawal, transactionId) {
        try {
            const emailData = {
                to: affiliate.email,
                subject: '🎉 Withdrawal Completed',
                template: 'withdrawal-completed',
                data: {
                    affiliateName: affiliate.name,
                    amount: withdrawal.amount,
                    netAmount: withdrawal.netAmount,
                    method: withdrawal.method,
                    withdrawalId: withdrawal.id,
                    transactionId: transactionId || withdrawal.transactionId,
                    completedAt: withdrawal.completedAt || new Date().toISOString(),
                    fees: withdrawal.fees
                }
            };

            const emailSent = await this.sendEmail(emailData);

            // Send SMS for completed withdrawals
            let smsSent = false;
            if (this.smsEnabled && affiliate.phone) {
                const smsData = {
                    to: affiliate.phone,
                    message: `CoinBitClub: Your withdrawal of $${withdrawal.netAmount} has been completed! Transaction ID: ${transactionId || 'See email'}`
                };
                smsSent = await this.sendSMS(smsData);
            }

            affiliateLogger.info('Withdrawal completed notification sent', {
                affiliateId: affiliate.id,
                withdrawalId: withdrawal.id,
                transactionId,
                emailSent,
                smsSent
            });

            return {
                success: true,
                emailSent,
                smsSent,
                channels: [
                    ...(emailSent ? ['email'] : []),
                    ...(smsSent ? ['sms'] : [])
                ]
            };
        } catch (error) {
            affiliateLogger.error('Error sending withdrawal completed notification', {
                affiliateId: affiliate.id,
                withdrawalId: withdrawal.id,
                error: error.message
            });

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send admin notification for new withdrawal request
     */
    async notifyAdminNewWithdrawal(withdrawal, affiliate, riskScore) {
        try {
            const adminEmails = process.env.ADMIN_NOTIFICATION_EMAILS
                ? process.env.ADMIN_NOTIFICATION_EMAILS.split(',')
                : ['admin@coinbitclub.com'];

            const riskLevel = this.getRiskLevel(riskScore);
            const priority = riskScore >= 70 ? 'HIGH' : riskScore >= 40 ? 'MEDIUM' : 'LOW';

            for (const adminEmail of adminEmails) {
                const emailData = {
                    to: adminEmail.trim(),
                    subject: `🔔 New Withdrawal Request - ${priority} Priority`,
                    template: 'admin-withdrawal-alert',
                    data: {
                        withdrawalId: withdrawal.id,
                        affiliateCode: affiliate.code,
                        affiliateName: affiliate.name,
                        amount: withdrawal.amount,
                        method: withdrawal.method,
                        riskScore,
                        riskLevel,
                        priority,
                        requestedAt: withdrawal.requestDate,
                        affiliateBalance: affiliate.balance,
                        totalCommissions: affiliate.totalCommissions,
                        approvalUrl: `${process.env.ADMIN_DASHBOARD_URL}/withdrawals/${withdrawal.id}`
                    }
                };

                await this.sendEmail(emailData);
            }

            affiliateLogger.info('Admin withdrawal notification sent', {
                withdrawalId: withdrawal.id,
                affiliateId: affiliate.id,
                riskScore,
                adminCount: adminEmails.length
            });

            return {
                success: true,
                adminEmailsSent: adminEmails.length
            };
        } catch (error) {
            affiliateLogger.error('Error sending admin withdrawal notification', {
                withdrawalId: withdrawal.id,
                error: error.message
            });

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send email using configured email service
     */
    async sendEmail(emailData) {
        if (!this.emailEnabled) {
            affiliateLogger.debug('Email notifications disabled', { to: emailData.to });
            return false;
        }

        try {
            // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
            // For now, log the email content
            affiliateLogger.info('Email notification (simulated)', {
                to: emailData.to,
                subject: emailData.subject,
                template: emailData.template,
                data: emailData.data
            });

            // Simulate email sending
            return true;
        } catch (error) {
            affiliateLogger.error('Email send failed', {
                to: emailData.to,
                error: error.message
            });
            return false;
        }
    }

    /**
     * Send SMS using configured SMS service
     */
    async sendSMS(smsData) {
        if (!this.smsEnabled) {
            affiliateLogger.debug('SMS notifications disabled', { to: smsData.to });
            return false;
        }

        try {
            // TODO: Integrate with Twilio or other SMS service
            // For now, log the SMS content
            affiliateLogger.info('SMS notification (simulated)', {
                to: smsData.to,
                message: smsData.message
            });

            // Simulate SMS sending
            return true;
        } catch (error) {
            affiliateLogger.error('SMS send failed', {
                to: smsData.to,
                error: error.message
            });
            return false;
        }
    }

    /**
     * Get risk level from score
     */
    getRiskLevel(score) {
        if (score >= 80) return 'CRITICAL';
        if (score >= 60) return 'HIGH';
        if (score >= 40) return 'MEDIUM';
        if (score >= 20) return 'LOW';
        return 'MINIMAL';
    }
}

// Export singleton instance
module.exports = new WithdrawalNotificationService();
