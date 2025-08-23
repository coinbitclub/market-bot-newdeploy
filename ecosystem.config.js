module.exports = {
  apps: [{
    name: 'coinbitclub-bot',
    script: 'coinbitclub-launcher.js',
    instances: 1,
    exec_mode: 'fork',
    
    // Configurações de ambiente
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    
    // Configurações de restart automático
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    
    // Configurações de log
    log_file: './logs/coinbitclub-combined.log',
    out_file: './logs/coinbitclub-out.log',
    error_file: './logs/coinbitclub-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Configurações de restart
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Configurações específicas
    kill_timeout: 5000,
    listen_timeout: 3000,
    
    // Variáveis de ambiente específicas para produção
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      LOG_LEVEL: 'info'
    }
  }]
};
