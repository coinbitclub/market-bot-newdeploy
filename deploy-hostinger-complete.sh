#!/bin/bash
# CoinBitClub Enterprise v6.0.0 - Deploy Direto no Terminal Hostinger
# Execute este script completo diretamente no terminal da Hostinger

echo "🚀 COINBITCLUB ENTERPRISE v6.0.0 - DEPLOY HOSTINGER"
echo "================================================="

# Atualizar sistema
echo "📦 Atualizando sistema..."
apt update && apt upgrade -y

# Instalar Docker
echo "🐳 Instalando Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl start docker
    systemctl enable docker
fi

# Instalar Docker Compose
echo "🔧 Instalando Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-Linux-x86_64" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Criar diretório da aplicação
echo "📁 Criando estrutura..."
mkdir -p /opt/coinbitclub-enterprise
cd /opt/coinbitclub-enterprise

# Parar serviços existentes
docker-compose down 2>/dev/null || true
docker rm -f coinbitclub 2>/dev/null || true

# Criar package.json
echo "📋 Criando package.json..."
cat > package.json << 'EOF'
{
  "name": "coinbitclub-enterprise",
  "version": "6.0.0",
  "description": "CoinBitClub Enterprise Trading Platform",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "morgan": "^1.10.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "uuid": "^9.0.1"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF

# Criar aplicação Node.js completa
echo "💻 Criando aplicação..."
cat > server.js << 'EOF'
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de segurança
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting simples
const rateLimiter = new Map();
const rateLimit = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minuto
    const maxRequests = 100; // 100 requests por minuto
    
    if (!rateLimiter.has(ip)) {
        rateLimiter.set(ip, { count: 1, resetTime: now + windowMs });
        return next();
    }
    
    const limiter = rateLimiter.get(ip);
    if (now > limiter.resetTime) {
        rateLimiter.set(ip, { count: 1, resetTime: now + windowMs });
        return next();
    }
    
    if (limiter.count >= maxRequests) {
        return res.status(429).json({ error: 'Too many requests' });
    }
    
    limiter.count++;
    next();
};

app.use(rateLimit);

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '6.0.0',
        service: 'CoinBitClub Enterprise',
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

// Homepage com dashboard
app.get('/', (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CoinBitClub Enterprise v6.0.0</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white; min-height: 100vh; padding: 20px;
            }
            .container { max-width: 1200px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 40px; }
            .header h1 { font-size: 3em; margin-bottom: 10px; }
            .header p { font-size: 1.2em; opacity: 0.9; }
            .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 40px; }
            .card { 
                background: rgba(255,255,255,0.1); backdrop-filter: blur(10px);
                border-radius: 15px; padding: 25px; border: 1px solid rgba(255,255,255,0.2);
            }
            .card h3 { margin-bottom: 15px; color: #fff; }
            .endpoint { 
                background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;
                margin: 10px 0; font-family: monospace; font-size: 0.9em;
            }
            .status { display: inline-block; padding: 5px 15px; border-radius: 20px; }
            .online { background: #4CAF50; }
            .webhook { background: #FF9800; }
            .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; }
            .metric { text-align: center; }
            .metric-value { font-size: 2em; font-weight: bold; color: #4CAF50; }
            .metric-label { opacity: 0.8; font-size: 0.9em; }
            .btn { 
                display: inline-block; padding: 10px 20px; background: #4CAF50;
                color: white; text-decoration: none; border-radius: 8px; margin: 5px;
            }
            .btn:hover { background: #45a049; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚀 CoinBitClub Enterprise</h1>
                <p>Sistema de Trading Automatizado v6.0.0</p>
                <span class="status online">🟢 ONLINE</span>
            </div>
            
            <div class="cards">
                <div class="card">
                    <h3>📡 TradingView Webhook</h3>
                    <p>Endpoint para receber sinais do TradingView:</p>
                    <div class="endpoint">POST /api/enterprise/trading/webhooks/signal</div>
                    <p><strong>URL Completa:</strong></p>
                    <div class="endpoint">http://31.97.72.77/api/enterprise/trading/webhooks/signal</div>
                    <span class="status webhook">🔶 PRONTO</span>
                </div>
                
                <div class="card">
                    <h3>🔍 Monitoramento</h3>
                    <div class="metrics">
                        <div class="metric">
                            <div class="metric-value">${Math.floor(process.uptime())}</div>
                            <div class="metric-label">Uptime (s)</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value">${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}</div>
                            <div class="metric-label">Memory (MB)</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value">6.0.0</div>
                            <div class="metric-label">Version</div>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <h3>🛠️ Endpoints API</h3>
                    <a href="/health" class="btn">Health Check</a>
                    <a href="/api/enterprise/status" class="btn">Status API</a>
                    <div class="endpoint">GET /health</div>
                    <div class="endpoint">GET /api/enterprise/status</div>
                    <div class="endpoint">POST /api/enterprise/trading/webhooks/signal</div>
                </div>
            </div>
            
            <div class="card">
                <h3>📊 Teste do Webhook</h3>
                <p>Para testar o webhook, envie um POST para:</p>
                <div class="endpoint">curl -X POST http://31.97.72.77/api/enterprise/trading/webhooks/signal -H "Content-Type: application/json" -d '{"symbol":"BTCUSDT","action":"BUY","price":50000}'</div>
            </div>
        </div>
        
        <script>
            // Auto refresh a cada 30 segundos
            setTimeout(() => location.reload(), 30000);
        </script>
    </body>
    </html>
    `;
    res.send(html);
});

// TradingView Webhook Endpoint - PRINCIPAL
app.post('/api/enterprise/trading/webhooks/signal', (req, res) => {
    const timestamp = new Date().toISOString();
    const signal = req.body;
    
    console.log('📡 ========================================');
    console.log('📡 TRADINGVIEW SIGNAL RECEIVED');
    console.log('📡 ========================================');
    console.log('🕐 Timestamp:', timestamp);
    console.log('📊 Signal Data:', JSON.stringify(signal, null, 2));
    console.log('🌐 Remote IP:', req.ip || req.connection.remoteAddress);
    console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
    console.log('📡 ========================================');
    
    // Simular processamento
    const response = {
        success: true,
        message: 'TradingView signal received and processed successfully',
        timestamp: timestamp,
        signal_id: require('crypto').randomUUID(),
        processed_data: {
            symbol: signal.symbol || 'N/A',
            action: signal.action || 'N/A',
            price: signal.price || 'N/A',
            quantity: signal.quantity || 'N/A'
        },
        status: 'webhook_active',
        version: '6.0.0'
    };
    
    res.json(response);
});

// Status endpoint detalhado
app.get('/api/enterprise/status', (req, res) => {
    res.json({
        service: 'CoinBitClub Enterprise',
        version: '6.0.0',
        status: 'operational',
        timestamp: new Date().toISOString(),
        uptime_seconds: Math.floor(process.uptime()),
        memory_usage: process.memoryUsage(),
        endpoints: {
            webhook: '/api/enterprise/trading/webhooks/signal',
            health: '/health',
            status: '/api/enterprise/status'
        },
        features: {
            tradingview_webhook: 'active',
            rate_limiting: 'enabled',
            security_headers: 'enabled',
            compression: 'enabled'
        },
        server_info: {
            node_version: process.version,
            platform: process.platform,
            arch: process.arch
        }
    });
});

// Endpoint de métricas
app.get('/api/metrics', (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send(`
# HELP coinbitclub_uptime_seconds Application uptime in seconds
# TYPE coinbitclub_uptime_seconds gauge
coinbitclub_uptime_seconds ${Math.floor(process.uptime())}

# HELP coinbitclub_memory_usage_bytes Memory usage in bytes
# TYPE coinbitclub_memory_usage_bytes gauge
coinbitclub_memory_usage_bytes ${process.memoryUsage().heapUsed}

# HELP coinbitclub_version_info Version information
# TYPE coinbitclub_version_info gauge
coinbitclub_version_info{version="6.0.0"} 1
    `);
});

// Error handling
app.use((err, req, res, next) => {
    console.error('❌ Error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        available_endpoints: [
            'GET /',
            'GET /health',
            'GET /api/enterprise/status',
            'POST /api/enterprise/trading/webhooks/signal',
            'GET /api/metrics'
        ],
        timestamp: new Date().toISOString()
    });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 ========================================');
    console.log('🚀 COINBITCLUB ENTERPRISE v6.0.0 STARTED');
    console.log('🚀 ========================================');
    console.log('🌐 Server running on port:', PORT);
    console.log('🌐 Application URL: http://31.97.72.77');
    console.log('📡 TradingView Webhook: http://31.97.72.77/api/enterprise/trading/webhooks/signal');
    console.log('🔍 Health Check: http://31.97.72.77/health');
    console.log('📊 Status API: http://31.97.72.77/api/enterprise/status');
    console.log('🚀 ========================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('📴 Graceful shutdown initiated...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('📴 Graceful shutdown initiated...');
    process.exit(0);
});
EOF

# Criar docker-compose.yml
echo "🐳 Criando docker-compose.yml..."
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: coinbitclub-enterprise
    ports:
      - "80:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - coinbitclub-network

networks:
  coinbitclub-network:
    driver: bridge
EOF

# Criar Dockerfile
echo "🏗️ Criando Dockerfile..."
cat > Dockerfile << 'EOF'
FROM node:18-alpine

# Instalar dependências do sistema
RUN apk add --no-cache curl

# Criar diretório de trabalho
WORKDIR /app

# Copiar package.json e instalar dependências
COPY package.json ./
RUN npm install --only=production

# Copiar código da aplicação
COPY server.js ./

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S coinbitclub -u 1001

# Mudar ownership
RUN chown -R coinbitclub:nodejs /app
USER coinbitclub

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Comando inicial
CMD ["npm", "start"]
EOF

# Construir e iniciar aplicação
echo "🚀 Construindo e iniciando aplicação..."
docker-compose build
docker-compose up -d

# Aguardar inicialização
echo "⏳ Aguardando inicialização..."
sleep 20

# Verificar status
echo "📊 Verificando status..."
docker-compose ps
echo ""

# Testar endpoints
echo "🧪 Testando endpoints..."
echo "Testing health endpoint..."
curl -f http://localhost/health || echo "❌ Health check failed"
echo ""

echo "Testing main application..."
curl -f http://localhost/ > /dev/null && echo "✅ Main application working" || echo "❌ Main application failed"
echo ""

echo "Testing webhook endpoint..."
curl -X POST http://localhost/api/enterprise/trading/webhooks/signal \
     -H "Content-Type: application/json" \
     -d '{"symbol":"BTCUSDT","action":"BUY","price":50000}' && echo "✅ Webhook working" || echo "❌ Webhook failed"
echo ""

# Mostrar logs
echo "📋 Últimos logs:"
docker-compose logs --tail=20

echo ""
echo "✅ ========================================"
echo "✅ COINBITCLUB ENTERPRISE DEPLOY CONCLUÍDO"
echo "✅ ========================================"
echo ""
echo "🌐 Aplicação: http://31.97.72.77"
echo "🔍 Health Check: http://31.97.72.77/health"
echo "📊 Status API: http://31.97.72.77/api/enterprise/status"
echo "📡 TradingView Webhook: http://31.97.72.77/api/enterprise/trading/webhooks/signal"
echo ""
echo "📋 Para monitorar logs:"
echo "docker-compose logs -f"
echo ""
echo "🔄 Para reiniciar:"
echo "docker-compose restart"
echo ""
echo "🛑 Para parar:"
echo "docker-compose down"
echo ""
EOF
