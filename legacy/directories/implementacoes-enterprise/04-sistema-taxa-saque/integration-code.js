
// INTEGRAÇÃO AUTOMÁTICA - Sistema de Taxa de Saque
const withdrawalFeesAPI = require('./implementacoes-enterprise/04-sistema-taxa-saque/routes/withdrawal-fees-api');
app.use('/api/withdrawal-fees', withdrawalFeesAPI);
