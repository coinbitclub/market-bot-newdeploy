// Configuração do banco para sistema de saldo devedor
module.exports = {
  "connectionString": "process.env.DATABASE_URL",
  "ssl": {
    "rejectUnauthorized": false
  }
};