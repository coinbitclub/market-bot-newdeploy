/**
 * CORREÇÃO TWILIO API - Inicialização Correta
 */

const axios = require('axios');

class TwilioCorrigido {
    constructor() {
        // Configuração correta do cliente Twilio
        this.accountSid = process.env.TWILIO_ACCOUNT_SID || '[SENSITIVE_DATA_REMOVED]';
        this.authToken = process.env.TWILIO_AUTH_TOKEN || '[SENSITIVE_DATA_REMOVED]';
        this.baseURL = 'https://api.twilio.com/2010-04-01';
    }

    async testarConexao() {
        try {
            // Testar acesso à conta usando REST API diretamente
            const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
            
            const response = await axios.get(`${this.baseURL}/Accounts/${this.accountSid}.json`, {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('✅ Twilio conectado:', response.data.friendly_name);
            return { status: 'SUCESSO', conta: response.data.friendly_name };
        } catch (error) {
            console.error('❌ Erro Twilio:', error.message);
            
            // Se for erro de auth, as credenciais estão incorretas
            if (error.response && error.response.status === 401) {
                return { 
                    status: 'ERRO_AUTH', 
                    erro: 'Credenciais Twilio inválidas',
                    solucao: 'Verificar Account SID e Auth Token no Railway'
                };
            }
            
            return { status: 'ERRO', erro: error.message };
        }
    }

    async enviarSMS(para, mensagem) {
        try {
            const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
            
            const data = new URLSearchParams({
                Body: mensagem,
                From: '+1234567890', // Número Twilio
                To: para
            });

            const response = await axios.post(`${this.baseURL}/Accounts/${this.accountSid}/Messages.json`, data, {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            
            return { status: 'SUCESSO', sid: response.data.sid };
        } catch (error) {
            console.error('❌ Erro ao enviar SMS:', error.message);
            return { status: 'ERRO', erro: error.message };
        }
    }
}

module.exports = TwilioCorrigido;