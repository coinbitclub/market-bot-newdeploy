FROM node:18-alpine

# Otimizações para performance
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=7168"

# Instalar dependências de sistema
RUN apk add --no-cache     curl     libc6-compat     && addgroup -g 1001 -S nodejs     && adduser -S nodejs -u 1001

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências com otimizações
RUN npm ci --only=production     && npm cache clean --force     && rm -rf /tmp/*

# Copiar código da aplicação
COPY . .

# Criar usuário não-root
USER nodejs

# Configurar health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3     CMD curl -f http://localhost:3333/health || exit 1

# Expor porta
EXPOSE 3333

# Comando otimizado
CMD ["node", "--max-old-space-size=7168", "enterprise-orchestrator.js"]