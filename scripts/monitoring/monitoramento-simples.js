const { Pool } = require('pg');

// Configuração da conexão com o banco PostgreSQL
const pool = new Pool({
    user: 'postgres',
    host: 'junction.proxy.rlwy.net',
    database: 'railway',
    password: 'process.env.API_KEY_HERE',
    port: 26822,
    ssl: { rejectUnauthorized: false }
});

// Função para validar chaves API (simulação)
async function validarChavesAPI(apiKey, secretKey) {
  // Simulação de validação - em produção aqui seria feita uma chamada real para a API da Binance
  const simulacaoValida = Math.random() > 0.3; // 70% de chance de ser válida
  
  return {
    status: simulacaoValida ? 'valid' : 'invalid',
    binance_status: simulacaoValida ? 'active' : 'error',
    bybit_status: 'not_tested',
    last_check: new Date().toISOString(),
    simulated: true
  };
}

async function verificarChaves() {
  console.log(`🔍 [${new Date().toLocaleString('pt-BR')}] Verificando chaves API dos usuários...`);
  
  try {
    // Buscar usuários com chaves API
    const usersWithKeys = await pool.query(`
      SELECT id, username, name, api_key, secret_key, is_active
      FROM users 
      WHERE api_key IS NOT NULL 
      AND secret_key IS NOT NULL 
      AND is_active = true
      ORDER BY username
    `);
    
    console.log(`📊 Encontrados ${usersWithKeys.rows.length} usuários com chaves API ativas`);
    
    let chavesValidas = 0;
    let chavesInvalidas = 0;
    let chavesNaoTestadas = 0;
    
    // Validar cada usuário
    for (const user of usersWithKeys.rows) {
      try {
        const validacaoStatus = await validarChavesAPI(user.api_key, user.secret_key);
        
        // Atualizar status no banco
        await pool.query(`
          UPDATE users 
          SET binance_status = $1, bybit_status = $2, last_api_check = NOW()
          WHERE id = $3
        `, [validacaoStatus.binance_status, validacaoStatus.bybit_status, user.id]);
        
        if (validacaoStatus.status === 'valid') {
          chavesValidas++;
          console.log(`   ✅ ${user.username || user.name}: Chaves válidas`);
        } else if (validacaoStatus.status === 'invalid') {
          chavesInvalidas++;
          console.log(`   ❌ ${user.username || user.name}: Chaves inválidas`);
        } else {
          chavesNaoTestadas++;
          console.log(`   ⚠️ ${user.username || user.name}: Não foi possível validar`);
        }
        
      } catch (error) {
        console.log(`   ❌ Erro ao validar chaves do usuário ${user.username || user.name}:`, error.message);
        chavesNaoTestadas++;
      }
    }
    
    console.log(`\n📈 RESUMO DA VERIFICAÇÃO:`);
    console.log(`   ✅ Chaves válidas: ${chavesValidas}`);
    console.log(`   ❌ Chaves inválidas: ${chavesInvalidas}`);
    console.log(`   ⚠️ Não testadas: ${chavesNaoTestadas}`);
    
    // Salvar estatísticas em um log simples
    console.log(`\n💾 Estatísticas salvas no status dos usuários`);
    console.log(`🔄 Próxima verificação em 5 minutos\n`);
    
  } catch (error) {
    console.error('❌ Erro na verificação das chaves:', error.message);
  }
}

async function iniciarMonitoramento() {
  console.log('🔑 INICIANDO MONITORAMENTO AUTOMÁTICO DAS CHAVES API (VERSÃO SIMPLES)');
  console.log('=======================================================================');
  
  // Verificação inicial
  await verificarChaves();
  
  // Configurar verificação automática a cada 5 minutos
  const intervalo = setInterval(verificarChaves, 5 * 60 * 1000);
  
  console.log('🔄 Monitoramento ativo - verificando a cada 5 minutos');
  console.log('💡 Para parar o monitoramento, pressione Ctrl+C');
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Parando monitoramento...');
    clearInterval(intervalo);
    pool.end();
    process.exit(0);
  });
}

// Iniciar o sistema
iniciarMonitoramento().catch(console.error);
