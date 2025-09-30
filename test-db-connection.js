const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

console.log('Testing connection with:', process.env.DATABASE_URL);

pool.query('SELECT NOW()')
  .then(res => {
    console.log('✅ Connection successful!');
    console.log('Server time:', res.rows[0].now);
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Connection failed:');
    console.error('Error code:', err.code);
    console.error('Error message:', err.message);
    console.error('\nFull error:', err);
    process.exit(1);
  });