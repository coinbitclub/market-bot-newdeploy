const { Pool } = require('pg');
require('dotenv').config();

// Configuração do banco de dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function corrigirEstruturaTabelas() {
  try {
    console.log('🔧 CORRIGINDO ESTRUTURA DAS TABELAS DE MONITORAMENTO');
    console.log('==================================================');

    // 1. Corrigir tabela api_key_validations
    console.log('\n🔑 Corrigindo tabela api_key_validations...');
    
    // Verificar se a tabela existe
    const checkApiValidations = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'api_key_validations'
    `);
    
    if (checkApiValidations.rows.length === 0) {
      // Criar tabela do zero
      await pool.query(`
        CREATE TABLE api_key_validations (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          validation_type VARCHAR(50) NOT NULL DEFAULT 'automated_check',
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          response_data JSONB,
          validated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
        )
      `);
      console.log('   ✅ Tabela api_key_validations criada');
    } else {
      // Adicionar colunas faltantes
      try {
        await pool.query(`ALTER TABLE api_key_validations ADD COLUMN IF NOT EXISTS validation_type VARCHAR(50) DEFAULT 'automated_check'`);
        console.log('   ✅ Coluna validation_type adicionada');
      } catch (error) {
        console.log('   ⚠️ Coluna validation_type já existe');
      }
      
      try {
        await pool.query(`ALTER TABLE api_key_validations ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'`);
        console.log('   ✅ Coluna status adicionada');
      } catch (error) {
        console.log('   ⚠️ Coluna status já existe');
      }
    }

    // 2. Corrigir tabela api_status_monitor
    console.log('\n📊 Corrigindo tabela api_status_monitor...');
    
    const checkApiMonitor = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'api_status_monitor'
    `);
    
    if (checkApiMonitor.rows.length === 0) {
      // Criar tabela do zero
      await pool.query(`
        CREATE TABLE api_status_monitor (
          id SERIAL PRIMARY KEY,
          total_users_checked INTEGER NOT NULL DEFAULT 0,
          valid_keys INTEGER NOT NULL DEFAULT 0,
          invalid_keys INTEGER NOT NULL DEFAULT 0,
          untested_keys INTEGER NOT NULL DEFAULT 0,
          check_timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
        )
      `);
      console.log('   ✅ Tabela api_status_monitor criada');
    } else {
      // Adicionar colunas faltantes
      const columnsToAdd = [
        'total_users_checked INTEGER DEFAULT 0',
        'valid_keys INTEGER DEFAULT 0',
        'invalid_keys INTEGER DEFAULT 0',
        'untested_keys INTEGER DEFAULT 0',
        'check_timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()'
      ];
      
      for (const column of columnsToAdd) {
        try {
          await pool.query(`ALTER TABLE api_status_monitor ADD COLUMN IF NOT EXISTS ${column}`);
          console.log(`   ✅ Coluna ${column.split(' ')[0]} adicionada`);
        } catch (error) {
          console.log(`   ⚠️ Coluna ${column.split(' ')[0]} já existe`);
        }
      }
    }

    // 3. Verificar/corrigir tabela user_balances
    console.log('\n💰 Verificando tabela user_balances...');
    
    const checkUserBalances = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'user_balances'
    `);
    
    if (checkUserBalances.rows.length === 0) {
      await pool.query(`
        CREATE TABLE user_balances (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          exchange VARCHAR(50) NOT NULL,
          currency VARCHAR(10) NOT NULL,
          balance NUMERIC(20,8) DEFAULT 0,
          available_balance NUMERIC(20,8) DEFAULT 0,
          locked_balance NUMERIC(20,8) DEFAULT 0,
          created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
        )
      `);
      console.log('   ✅ Tabela user_balances criada');
    } else {
      console.log('   ✅ Tabela user_balances já existe');
    }

    // 4. Verificar estrutura das tabelas corrigidas
    console.log('\n🔍 VERIFICANDO ESTRUTURAS CORRIGIDAS...');
    
    const apiValidationsCols = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'api_key_validations' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Estrutura de api_key_validations:');
    apiValidationsCols.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    const apiMonitorCols = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'api_status_monitor' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Estrutura de api_status_monitor:');
    apiMonitorCols.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // 5. Criar dados iniciais para testes
    console.log('\n🌱 INSERINDO DADOS INICIAIS PARA TESTE...');
    
    try {
      await pool.query(`
        INSERT INTO api_status_monitor (total_users_checked, valid_keys, invalid_keys, untested_keys)
        VALUES (0, 0, 0, 0)
        ON CONFLICT DO NOTHING
      `);
      console.log('   ✅ Registro inicial inserido em api_status_monitor');
    } catch (error) {
      console.log('   ⚠️ Erro ao inserir dados iniciais:', error.message);
    }

    console.log('\n✅ CORREÇÃO DA ESTRUTURA CONCLUÍDA!');
    console.log('🔄 Agora o monitoramento de chaves deve funcionar corretamente');
    
  } catch (error) {
    console.error('❌ Erro na correção da estrutura:', error);
  } finally {
    await pool.end();
  }
}

// Executar correção
corrigirEstruturaTabelas();
