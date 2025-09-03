#!/bin/bash

# CONFIGURAÇÃO AUTOMÁTICA DO NGINX PROXY
echo "🔧 Configurando proxy Nginx para CoinBitClub..."

RAILWAY_URL="${1:-https://coinbitclub-backend.railway.app}"

# Atualizar sistema
echo "📦 Atualizando sistema..."
apt-get update -y && apt-get upgrade -y

# Instalar Nginx e ferramentas
echo "🔧 Instalando Nginx..."
apt-get install -y nginx curl ufw certbot python3-certbot-nginx htop

# Configurar firewall
echo "🔥 Configurando firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Configurar Nginx
echo "⚙️ Configurando Nginx..."
cat > /etc/nginx/sites-available/coinbitclub << 'NGINX_CONFIG'
# Configuração otimizada para trading automatizado
upstream railway_backend {
    server RAILWAY_HOST;
    keepalive 32;
}

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    
    # Logs detalhados
    access_log /var/log/nginx/coinbitclub.access.log;
    error_log /var/log/nginx/coinbitclub.error.log;
    
    # Configurações otimizadas para API trading
    client_max_body_size 10M;
    client_body_timeout 30s;
    client_header_timeout 30s;
    
    # Proxy principal para Railway
    location / {
        proxy_pass $RAILWAY_URL;
        proxy_http_version 1.1;
        
        # Headers essenciais
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection "";
        
        # Timeouts otimizados para trading
        proxy_connect_timeout 10s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Desabilitar cache para dados em tempo real
        proxy_buffering off;
        proxy_cache off;
        proxy_no_cache 1;
        proxy_cache_bypass 1;
        
        # Headers para APIs de exchange
        proxy_set_header User-Agent "CoinBitClub-Proxy/1.0";
        proxy_set_header Accept "application/json";
    }
    
    # Health check do proxy
    location /proxy-health {
        return 200 "CoinBitClub Proxy OK";
        add_header Content-Type text/plain;
        access_log off;
    }
    
    # Status detalhado
    location /proxy-status {
        return 200 '{
            "status": "operational",
            "service": "CoinBitClub Trading Proxy",
            "backend": "$RAILWAY_URL",
            "timestamp": "\$time_iso8601",
            "server_ip": "\$server_addr"
        }';
        add_header Content-Type application/json;
    }
}
NGINX_CONFIG

# Substituir URL do Railway
sed -i "s|\$RAILWAY_URL|$RAILWAY_URL|g" /etc/nginx/sites-available/coinbitclub

# Ativar configuração
ln -sf /etc/nginx/sites-available/coinbitclub /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Configuração global do Nginx
cat > /etc/nginx/nginx.conf << 'NGINX_GLOBAL'
user www-data;
worker_processes auto;
pid /run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    # Configurações básicas
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    # MIME types
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Logs
    log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                   '\$status \$body_bytes_sent "\$http_referer" '
                   '"\$http_user_agent" "\$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log;
    
    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Sites
    include /etc/nginx/sites-enabled/*;
}
NGINX_GLOBAL

# Testar configuração
echo "🧪 Testando configuração Nginx..."
nginx -t

if [ $? -eq 0 ]; then
    # Reiniciar Nginx
    systemctl restart nginx
    systemctl enable nginx
    
    echo "✅ Nginx configurado com sucesso!"
    echo ""
    echo "🌐 IP deste servidor: $(curl -s ifconfig.me)"
    echo "🔗 Railway backend: $RAILWAY_URL"
    echo ""
    echo "🧪 Testando conectividade..."
    sleep 3
    
    # Testar proxy
    if curl -s http://localhost/proxy-health | grep -q "OK"; then
        echo "✅ Proxy health check: OK"
    else
        echo "❌ Proxy health check: FALHOU"
    fi
    
    if curl -s http://localhost/health | grep -q "healthy"; then
        echo "✅ Railway via proxy: OK"
    else
        echo "⚠️ Railway via proxy: Verifique conectividade"
    fi
    
    echo ""
    echo "📊 STATUS FINAL:"
    systemctl status nginx --no-pager -l
    
    echo ""
    echo "🎯 CONFIGURE ESTE IP NAS EXCHANGES:"
    echo "$(curl -s ifconfig.me)"
    
else
    echo "❌ Erro na configuração do Nginx"
    nginx -t
    exit 1
fi