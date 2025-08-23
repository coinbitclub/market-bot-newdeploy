const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function corrigirTabela() {
  try {
    console.log('🔧 Corrigindo estrutura da tabela api_key_validations...');
    
    // Adicionar colunas faltantes
    const colunas = [
      { nome: 'validation_type', tipo: 'VARCHAR(50)' },
      { nome: 'status', tipo: 'VARCHAR(20)' },
      { nome: 'response_data', tipo: 'JSONB' },
      { nome: 'validated_at', tipo: 'TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()' }
    ];
    
    for (const coluna of colunas) {
      try {
        const checkCol = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'api_key_validations' 
          AND column_name = $1
        `, [coluna.nome]);
        
        if (checkCol.rows.length === 0) {
          console.log(`   Adicionando coluna ${coluna.nome}...`);
          await pool.query(`ALTER TABLE api_key_validations ADD COLUMN ${coluna.nome} ${coluna.tipo}`);
          console.log(`   ✅ Coluna ${coluna.nome} adicionada`);
        } else {
          console.log(`   ✅ Coluna ${coluna.nome} já existe`);
        }
      } catch (error) {
        console.log(`   ⚠️ Erro ao adicionar ${coluna.nome}:`, error.message);
      }
    }
    
    console.log('✅ Estrutura da tabela corrigida');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

corrigirTabela();
