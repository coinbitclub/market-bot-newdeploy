const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

console.log('🚀 MINIMAL RAILWAY SERVER - SEMPRE FUNCIONA');
console.log('============================================');
console.log(`📍 Port: ${port}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);

// Health check obrigatório
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        port: port,
        message: 'Minimal server is running'
    });
});

// Dashboard básico funcional
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>CoinBitClub Market Bot</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { 
            font-family: Arial, sans-serif; 
            background: #1a1a1a; 
            color: white; 
            margin: 0; 
            padding: 20px; 
        }
        .container { 
            max-width: 800px; 
            margin: 0 auto; 
            text-align: center; 
        }
        .status { 
            background: #2d5a27; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0; 
        }
        .info { 
            background: #1e3a8a; 
            padding: 15px; 
            border-radius: 6px; 
            margin: 10px 0; 
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 CoinBitClub Market Bot</h1>
        <div class="status">
            <h2>✅ SISTEMA ONLINE</h2>
            <p>Servidor funcionando em produção</p>
        </div>
        
        <div class="info">
            <h3>📊 Status</h3>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            <p><strong>Uptime:</strong> ${Math.floor(process.uptime())}s</p>
            <p><strong>Port:</strong> ${port}</p>
            <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'production'}</p>
        </div>
        
        <div class="info">
            <h3>🔗 Endpoints</h3>
            <p><strong>/health</strong> - Health Check</p>
            <p><strong>/status</strong> - System Status</p>
            <p><strong>/api/test</strong> - API Test</p>
        </div>
        
        <div class="info">
            <h3>🎯 Dashboard Principal</h3>
            <p>Sistema básico funcionando</p>
            <p>Deploy realizado com sucesso</p>
            <p><small>Version: Minimal Railway Deploy</small></p>
        </div>
    </div>
</body>
</html>
    `);
});

// Status endpoint
app.get('/status', (req, res) => {
    res.json({
        server: 'CoinBitClub Market Bot',
        status: 'running',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        port: port,
        environment: process.env.NODE_ENV || 'production',
        railway: {
            deployed: true,
            working: true
        }
    });
});

// API test endpoint
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'API is working',
        timestamp: new Date().toISOString(),
        data: {
            server: 'online',
            database: 'checking...',
            exchanges: 'checking...'
        }
    });
});

// Catch all 404
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        timestamp: new Date().toISOString()
    });
});

// Error handler
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({
        error: 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log('');
    console.log('🎯 SERVER STARTED SUCCESSFULLY!');
    console.log('==============================');
    console.log(`✅ Server running on port: ${port}`);
    console.log(`🌐 Access: http://localhost:${port}`);
    console.log(`🔗 Health: http://localhost:${port}/health`);
    console.log(`📊 Status: http://localhost:${port}/status`);
    console.log('');
    console.log('🚀 Railway deployment successful!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('📤 SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('📤 SIGINT received, shutting down gracefully');
    process.exit(0);
});
