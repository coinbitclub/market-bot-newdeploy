console.log('🚀 Node.js está funcionando!');
console.log('📅 Data:', new Date().toISOString());
console.log('📂 Diretório:', __dirname);
console.log('📄 Arquivo:', __filename);

// Tentar importar Express
try {
    const express = require('express');
    console.log('✅ Express importado com sucesso');
    
    const app = express();
    const PORT = 4001;
    
    app.get('/', (req, res) => {
        res.json({ 
            status: 'ok', 
            message: 'Teste Node.js funcionando!',
            timestamp: new Date().toISOString()
        });
    });
    
    app.listen(PORT, () => {
        console.log(`🌐 Servidor de teste rodando na porta ${PORT}`);
        console.log(`📊 Acesse: http://localhost:${PORT}`);
    });
    
} catch (error) {
    console.error('❌ Erro ao importar Express:', error.message);
}
