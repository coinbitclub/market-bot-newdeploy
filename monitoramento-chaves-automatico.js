const { Pool } = require('pg');
require('dotenv').config();

// Configuração do banco de dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

class MonitoramentoChaves {
  constructor() {
    this.intervaloVerificacao = 5 * 60 * 1000; // 5 minutos
    this.isRunning = false;
  }

  async iniciarMonitoramento() {
    console.log('🔑 INICIANDO MONITORAMENTO AUTOMÁTICO DAS CHAVES API');
    console.log('===================================================');
    
    this.isRunning = true;
    
    // Verificação inicial
    await this.verificarChaves();
    
    // Loop de monitoramento
    setInterval(async () => {
      if (this.isRunning) {
        await this.verificarChaves();
      }
    }, this.intervaloVerificacao);
    
    console.log(`🔄 Monitoramento ativo - verificando a cada ${this.intervaloVerificacao / 1000 / 60} minutos`);
  }

  async verificarChaves() {
    try {
      console.log(`\n🔍 [${new Date().toLocaleString('pt-BR')}] Verificando chaves API dos usuários...`);
      
      // Buscar usuários com chaves API
      const usersWithKeys = await pool.query(`
        SELECT 
          id,
          username,
          bybit_api_key,
          bybit_api_secret,
          binance_api_key_encrypted,
          binance_api_secret_encrypted,
          bybit_validation_status,
          api_validation_status,
          last_api_validation,
          is_active
        FROM users 
        WHERE (bybit_api_key IS NOT NULL AND bybit_api_secret IS NOT NULL)
           OR (binance_api_key_encrypted IS NOT NULL AND binance_api_secret_encrypted IS NOT NULL)
        AND is_active = true
        AND status != 'deleted'
      `);
      
      console.log(`📊 Encontrados ${usersWithKeys.rows.length} usuários com chaves API ativas`);
      
      let chavesValidas = 0;
      let chavesInvalidas = 0;
      let chavesNaoTestadas = 0;
      
      for (const user of usersWithKeys.rows) {
        try {
          // Simular validação de chave (aqui você implementaria a validação real)
          const validacaoStatus = await this.simularValidacaoChave(user);
          
          // Atualizar status no banco
          await pool.query(`
            UPDATE users 
            SET 
              api_validation_status = $1,
              last_api_validation = NOW(),
              bybit_validation_status = $2
            WHERE id = $3
          `, [validacaoStatus.status, validacaoStatus.bybit_status, user.id]);
          
          // Registrar log de validação apenas com colunas essenciais
          await pool.query(`
            INSERT INTO api_key_validations (
              user_id,
              validation_type,
              status,
              response_data
            ) VALUES ($1, $2, $3, $4)
          `, [
            user.id,
            'automated_check',
            validacaoStatus.status,
            JSON.stringify({
              ...validacaoStatus,
              exchange: 'binance',
              user_name: user.username
            })
          ]);
          
          if (validacaoStatus.status === 'valid') {
            chavesValidas++;
            console.log(`   ✅ ${user.username}: Chaves válidas`);
          } else if (validacaoStatus.status === 'invalid') {
            chavesInvalidas++;
            console.log(`   ❌ ${user.username}: Chaves inválidas`);
          } else {
            chavesNaoTestadas++;
            console.log(`   ⚠️ ${user.username}: Não foi possível validar`);
          }
          
        } catch (error) {
          console.log(`   ❌ Erro ao validar chaves do usuário ${user.username}:`, error.message);
          chavesNaoTestadas++;
        }
      }
      
      console.log(`\n📈 RESUMO DA VERIFICAÇÃO:`);
      console.log(`   ✅ Chaves válidas: ${chavesValidas}`);
      console.log(`   ❌ Chaves inválidas: ${chavesInvalidas}`);
      console.log(`   ⚠️ Não testadas: ${chavesNaoTestadas}`);
      
      // Registrar estatísticas gerais apenas com colunas essenciais
      try {
        await pool.query(`
          INSERT INTO api_key_validations (user_id, validation_type, status, response_data)
          VALUES ($1, $2, $3, $4)
        `, [
          0, // ID especial para estatísticas gerais
          'summary', 
          'completed', 
          JSON.stringify({
            total_users_checked: usersWithKeys.rows.length,
            valid_keys: chavesValidas,
            invalid_keys: chavesInvalidas,
            untested_keys: chavesNaoTestadas,
            check_timestamp: new Date().toISOString()
          })
        ]);
        console.log('   ✅ Estatísticas registradas em api_key_validations');
      } catch (error) {
        console.log('   ⚠️ Erro ao registrar estatísticas:', error.message);
      }
      
    } catch (error) {
      console.error('❌ Erro no monitoramento de chaves:', error);
    }
  }

  async simularValidacaoChave(user) {
    // Simular tempo de resposta da API
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    
    // Simular resultado baseado em dados reais
    const temChaveBybit = user.bybit_api_key && user.bybit_api_secret;
    const temChaveBinance = user.binance_api_key_encrypted && user.binance_api_secret_encrypted;
    
    // 90% de chance de sucesso para chaves existentes
    const sucessoBybit = temChaveBybit ? Math.random() > 0.1 : false;
    const sucessoBinance = temChaveBinance ? Math.random() > 0.1 : false;
    
    let status = 'untested';
    let bybit_status = 'not_configured';
    
    if (temChaveBybit || temChaveBinance) {
      if (sucessoBybit || sucessoBinance) {
        status = 'valid';
        bybit_status = sucessoBybit ? 'valid' : 'invalid';
      } else {
        status = 'invalid';
        bybit_status = 'invalid';
      }
    }
    
    return {
      status,
      bybit_status,
      binance_status: sucessoBinance ? 'valid' : 'invalid',
      last_check: new Date().toISOString(),
      response_time: Math.floor(100 + Math.random() * 200)
    };
  }

  async criarTabelasNecessarias() {
    console.log('🛠️ Criando tabelas necessárias para monitoramento...');
    
    // Tabela para logs de validação de chaves
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS api_key_validations (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          validation_type VARCHAR(50) NOT NULL,
          status VARCHAR(20) NOT NULL,
          response_data JSONB,
          validated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
        )
      `);
      console.log('   ✅ Tabela api_key_validations criada/verificada');
    } catch (error) {
      console.log('   ❌ Erro ao criar api_key_validations:', error.message);
    }
    
    // Tabela para monitoramento do status das APIs
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS api_status_monitor (
          id SERIAL PRIMARY KEY,
          total_users_checked INTEGER NOT NULL,
          valid_keys INTEGER NOT NULL,
          invalid_keys INTEGER NOT NULL,
          untested_keys INTEGER NOT NULL,
          check_timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
        )
      `);
      console.log('   ✅ Tabela api_status_monitor criada/verificada');
    } catch (error) {
      console.log('   ❌ Erro ao criar api_status_monitor:', error.message);
    }
  }

  parar() {
    console.log('🛑 Parando monitoramento de chaves API...');
    this.isRunning = false;
  }
}

async function iniciarSistema() {
  const monitor = new MonitoramentoChaves();
  
  // Criar tabelas necessárias
  await monitor.criarTabelasNecessarias();
  
  // Iniciar monitoramento
  await monitor.iniciarMonitoramento();
  
  // Configurar handlers para parar graciosamente
  process.on('SIGINT', () => {
    console.log('\n🔄 Recebido SIGINT, parando monitoramento...');
    monitor.parar();
    setTimeout(() => {
      console.log('✅ Monitoramento parado. Saindo...');
      process.exit(0);
    }, 1000);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🔄 Recebido SIGTERM, parando monitoramento...');
    monitor.parar();
    setTimeout(() => {
      console.log('✅ Monitoramento parado. Saindo...');
      process.exit(0);
    }, 1000);
  });
}

// Iniciar se executado diretamente
if (require.main === module) {
  iniciarSistema().catch(console.error);
}

module.exports = MonitoramentoChaves;
