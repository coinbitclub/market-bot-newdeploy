/**
 * 🤖 OPENAI RATE LIMITER - OTIMIZAÇÃO INTELIGENTE
 * ===============================================
 * 
 * Sistema avançado de rate limiting e cache para OpenAI GPT-4
 * Implementa fallback inteligente conforme especificação
 * 
 * @author CoinBitClub Enterprise Team
 * @version 6.0.0
 */

const crypto = require('crypto');

class OpenAIRateLimiter {
    constructor() {
        this.callsPerMinute = 0;
        this.callsPerHour = 0;
        this.lastMinuteReset = Date.now();
        this.lastHourReset = Date.now();
        
        // Configurações conforme especificação
        this.limits = {
            callsPerMinute: 20,     // Máximo 20 chamadas por minuto
            callsPerHour: 500,      // Máximo 500 chamadas por hora
            cacheDuration: 300000,  // Cache de 5 minutos
            fallbackThreshold: 3    // Após 3 falhas, usar fallback
        };
        
        this.cache = new Map();
        this.failureCount = 0;
        this.lastFailure = null;
        this.isInFallbackMode = false;
        
        console.log('🤖 OpenAI Rate Limiter inicializado');
        console.log(`📊 Limites: ${this.limits.callsPerMinute}/min, ${this.limits.callsPerHour}/hora`);
        
        this.startCleanupInterval();
    }

    /**
     * 🧠 Fazer chamada otimizada para OpenAI
     */
    async makeOptimizedCall(prompt, options = {}) {
        try {
            // 1. Verificar se pode fazer nova chamada
            const canMakeCall = this.checkRateLimits();
            if (!canMakeCall.allowed) {
                console.log(`⏱️ Rate limit atingido: ${canMakeCall.reason}`);
                return this.getFallbackResponse(prompt);
            }

            // 2. Verificar cache primeiro
            const cacheKey = this.generateCacheKey(prompt);
            const cached = this.getCachedResponse(cacheKey);
            
            if (cached) {
                console.log('💾 Resposta encontrada no cache');
                return cached;
            }

            // 3. Verificar se está em modo fallback
            if (this.isInFallbackMode) {
                console.log('🔄 Sistema em modo fallback - usando análise local');
                return this.getFallbackResponse(prompt);
            }

            // 4. Fazer chamada para OpenAI
            console.log('🤖 Fazendo chamada para OpenAI GPT-4...');
            this.incrementCounters();
            
            const result = await this.callOpenAI(prompt, options);
            
            // 5. Cache do resultado
            this.cacheResponse(cacheKey, result);
            
            // 6. Reset contador de falhas em caso de sucesso
            this.failureCount = 0;
            this.isInFallbackMode = false;
            
            return result;

        } catch (error) {
            console.error('❌ Erro na chamada OpenAI:', error.message);
            
            // Incrementar contador de falhas
            this.failureCount++;
            this.lastFailure = Date.now();
            
            // Ativar modo fallback se muitas falhas
            if (this.failureCount >= this.limits.fallbackThreshold) {
                this.isInFallbackMode = true;
                console.log('🔄 Ativando modo fallback após múltiplas falhas');
            }
            
            return this.getFallbackResponse(prompt);
        }
    }

    /**
     * 📊 Verificar limites de rate limiting
     */
    checkRateLimits() {
        const now = Date.now();
        
        // Reset contadores se necessário
        if (now - this.lastMinuteReset > 60000) {
            this.callsPerMinute = 0;
            this.lastMinuteReset = now;
        }
        
        if (now - this.lastHourReset > 3600000) {
            this.callsPerHour = 0;
            this.lastHourReset = now;
        }
        
        // Verificar limites
        if (this.callsPerMinute >= this.limits.callsPerMinute) {
            return {
                allowed: false,
                reason: `Limite por minuto atingido (${this.callsPerMinute}/${this.limits.callsPerMinute})`
            };
        }
        
        if (this.callsPerHour >= this.limits.callsPerHour) {
            return {
                allowed: false,
                reason: `Limite por hora atingido (${this.callsPerHour}/${this.limits.callsPerHour})`
            };
        }
        
        return { allowed: true };
    }

    /**
     * 🔢 Incrementar contadores
     */
    incrementCounters() {
        this.callsPerMinute++;
        this.callsPerHour++;
    }

    /**
     * 🔑 Gerar chave de cache
     */
    generateCacheKey(prompt) {
        const hash = crypto.createHash('md5').update(prompt).digest('hex');
        return `openai_${hash}`;
    }

    /**
     * 💾 Obter resposta do cache
     */
    getCachedResponse(cacheKey) {
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.limits.cacheDuration) {
            return cached.response;
        }
        
        // Remove cache expirado
        if (cached) {
            this.cache.delete(cacheKey);
        }
        
        return null;
    }

    /**
     * 💾 Salvar resposta no cache
     */
    cacheResponse(cacheKey, response) {
        this.cache.set(cacheKey, {
            response: response,
            timestamp: Date.now()
        });
    }

    /**
     * 🤖 Chamada real para OpenAI
     */
    async callOpenAI(prompt, options = {}) {
        const OpenAI = require('openai');
        
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key não configurada');
        }
        
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        const completion = await openai.chat.completions.create({
            model: options.model || 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content: 'Você é um especialista em análise de mercado de criptomoedas. Responda sempre em JSON válido conforme solicitado.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: options.max_tokens || 500,
            temperature: options.temperature || 0.3,
            timeout: 15000 // 15 segundos timeout
        });

        const response = completion.choices[0]?.message?.content;
        
        if (!response) {
            throw new Error('Resposta vazia do OpenAI');
        }

        try {
            // Tentar parsear como JSON
            return JSON.parse(response);
        } catch (jsonError) {
            // Se não for JSON válido, retornar como texto
            return { analysis: response, source: 'openai_text' };
        }
    }

    /**
     * 🔄 Resposta de fallback (sem IA)
     */
    getFallbackResponse(prompt) {
        console.log('🔄 Gerando resposta de fallback...');
        
        // Análise básica baseada em palavras-chave
        const promptLower = prompt.toLowerCase();
        
        let direction = 'NEUTRO';
        let confidence = 60;
        let reasoning = 'Análise de fallback baseada em regras simples';
        
        // Detectar sinais no prompt
        if (promptLower.includes('fear') && promptLower.includes('greed')) {
            if (promptLower.includes('< 30') || promptLower.includes('medo')) {
                direction = 'SOMENTE_LONG';
                confidence = 75;
                reasoning = 'Fear & Greed baixo indica oportunidade de compra';
            } else if (promptLower.includes('> 80') || promptLower.includes('ganância')) {
                direction = 'SOMENTE_SHORT';
                confidence = 75;
                reasoning = 'Fear & Greed alto indica sobrecompra';
            }
        }
        
        if (promptLower.includes('long') && !promptLower.includes('short')) {
            direction = 'LONG';
            confidence = Math.max(confidence, 65);
        } else if (promptLower.includes('short') && !promptLower.includes('long')) {
            direction = 'SHORT';
            confidence = Math.max(confidence, 65);
        }

        return {
            market_direction: direction,
            confidence_level: confidence,
            reasoning: reasoning,
            key_factors: ['Análise de fallback', 'Sistema sem OpenAI', 'Regras básicas'],
            market_moment: 'Análise simplificada',
            divergencia_detectada: false,
            reducao_parametros: false,
            close_signal: 'NONE',
            analysis_type: 'fallback_system',
            fallback_mode: true,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 📊 Obter estatísticas do rate limiter
     */
    getStats() {
        return {
            calls_per_minute: this.callsPerMinute,
            calls_per_hour: this.callsPerHour,
            cache_size: this.cache.size,
            failure_count: this.failureCount,
            is_fallback_mode: this.isInFallbackMode,
            last_failure: this.lastFailure,
            limits: this.limits,
            next_minute_reset: 60000 - (Date.now() - this.lastMinuteReset),
            next_hour_reset: 3600000 - (Date.now() - this.lastHourReset)
        };
    }

    /**
     * 🧹 Limpeza automática de cache
     */
    startCleanupInterval() {
        setInterval(() => {
            const now = Date.now();
            let cleaned = 0;
            
            for (const [key, value] of this.cache.entries()) {
                if (now - value.timestamp > this.limits.cacheDuration) {
                    this.cache.delete(key);
                    cleaned++;
                }
            }
            
            if (cleaned > 0) {
                console.log(`🧹 Cache limpo: ${cleaned} entradas removidas`);
            }
            
            // Reset modo fallback após 1 hora sem falhas
            if (this.isInFallbackMode && this.lastFailure && 
                now - this.lastFailure > 3600000) {
                this.isInFallbackMode = false;
                this.failureCount = 0;
                console.log('✅ Modo fallback desativado - sistema recuperado');
            }
            
        }, 60000); // Limpeza a cada minuto
    }

    /**
     * 🔄 Reset manual do sistema
     */
    reset() {
        this.callsPerMinute = 0;
        this.callsPerHour = 0;
        this.failureCount = 0;
        this.isInFallbackMode = false;
        this.cache.clear();
        
        console.log('🔄 OpenAI Rate Limiter resetado');
    }
}

module.exports = OpenAIRateLimiter;
