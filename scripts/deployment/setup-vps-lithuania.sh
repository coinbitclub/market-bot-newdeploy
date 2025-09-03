#!/bin/bash

# 🇱🇹 Setup VPS Lituânia - CoinBitClub Enterprise
# ================================================
# Script completo para configurar VPS da Hostinger na Lituânia
# IP: 31.97.72.77 | Ubuntu 24.04 LTS | 4 CPUs, 16GB RAM, 200GB SSD

set -euo pipefail

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

# Verificar se está rodando como root
if [[ $EUID -eq 0 ]]; then
   error "Este script não deve ser executado como root!"
   exit 1
fi

log "🇱🇹 Iniciando configuração do VPS Lituânia para CoinBitClub Enterprise"
log "=================================================================="

# Verificar informações do sistema
log "📋 Verificando informações do sistema..."
echo "Hostname: $(hostname)"
echo "IP: $(curl -s ifconfig.me)"
echo "OS: $(lsb_release -d | cut -f2)"
echo "Kernel: $(uname -r)"
echo "CPU: $(nproc) cores"
echo "RAM: $(free -h | awk '/^Mem:/ {print $2}')"
echo "Disk: $(df -h / | awk 'NR==2 {print $2}')"

# 1. Atualização do sistema
log "🔄 Atualizando sistema Ubuntu 24.04 LTS..."
sudo apt update
sudo apt upgrade -y
sudo apt autoremove -y

# 2. Instalar dependências básicas
log "📦 Instalando dependências básicas..."
sudo apt install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    net-tools \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    fail2ban \
    ufw \
    certbot \
    python3-certbot-nginx

# 3. Configurar timezone para Lituânia
log "🕐 Configurando timezone para Europe/Vilnius..."
sudo timedatectl set-timezone Europe/Vilnius
log "Timezone atual: $(timedatectl show --property=Timezone --value)"

# 4. Instalar Docker
log "🐳 Instalando Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Adicionar usuário ao grupo docker
    sudo usermod -aG docker $USER
    
    # Habilitar Docker para iniciar com o sistema
    sudo systemctl enable docker
    sudo systemctl start docker
    
    log "✅ Docker instalado com sucesso!"
else
    log "✅ Docker já está instalado"
fi

# 5. Instalar Docker Compose
log "🔧 Instalando Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    log "✅ Docker Compose instalado com sucesso!"
else
    log "✅ Docker Compose já está instalado"
fi

# 6. Instalar NGINX
log "🌐 Instalando NGINX..."
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
    log "✅ NGINX instalado com sucesso!"
else
    log "✅ NGINX já está instalado"
fi

# 7. Configurar Firewall (UFW)
log "🔥 Configurando firewall UFW..."
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Portas essenciais
sudo ufw allow 22/tcp comment "SSH"
sudo ufw allow 80/tcp comment "HTTP"
sudo ufw allow 443/tcp comment "HTTPS"
sudo ufw allow 3000/tcp comment "Trading App"
sudo ufw allow 9090/tcp comment "Prometheus"
sudo ufw allow 3001/tcp comment "Grafana"

# Portas para Docker Swarm (se necessário no futuro)
sudo ufw allow 2376/tcp comment "Docker Daemon"
sudo ufw allow 2377/tcp comment "Docker Swarm"
sudo ufw allow 7946/tcp comment "Docker Network"
sudo ufw allow 7946/udp comment "Docker Network"
sudo ufw allow 4789/udp comment "Docker Overlay"

# Ativar firewall
sudo ufw --force enable
sudo ufw status verbose

log "✅ Firewall configurado com sucesso!"

# 8. Configurar Fail2Ban para proteção SSH
log "🛡️  Configurando Fail2Ban..."
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Configuração personalizada para SSH
sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
EOF

sudo systemctl restart fail2ban
log "✅ Fail2Ban configurado com sucesso!"

# 9. Configurar limites do sistema
log "⚙️  Configurando limites do sistema..."
sudo tee -a /etc/security/limits.conf > /dev/null <<EOF
# CoinBitClub Enterprise limits
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
EOF

# Configurar sysctls para performance
sudo tee /etc/sysctl.d/99-coinbitclub.conf > /dev/null <<EOF
# Network optimizations
net.core.somaxconn = 65536
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 65536
net.ipv4.tcp_keepalive_time = 600
net.ipv4.tcp_keepalive_intvl = 60
net.ipv4.tcp_keepalive_probes = 10

# Memory optimizations
vm.max_map_count = 262144
vm.swappiness = 10

# File system optimizations
fs.file-max = 2097152
EOF

sudo sysctl -p /etc/sysctl.d/99-coinbitclub.conf
log "✅ Limites do sistema configurados!"

# 10. Criar estrutura de diretórios
log "📁 Criando estrutura de diretórios..."
mkdir -p ~/coinbitclub-enterprise/{
    nginx/{conf.d,ssl,logs},
    postgres/{data,init-scripts},
    monitoring/{prometheus,grafana,loki},
    redis/data,
    logs,
    backups,
    scripts
}

log "✅ Estrutura de diretórios criada!"

# 11. Configurar SSH (melhorar segurança)
log "🔐 Configurando SSH para maior segurança..."
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Configurações de segurança SSH
sudo tee -a /etc/ssh/sshd_config.d/99-coinbitclub.conf > /dev/null <<EOF
# CoinBitClub SSH Security Configuration
PermitRootLogin no
PasswordAuthentication yes
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
Protocol 2
X11Forwarding no
EOF

sudo systemctl restart sshd
log "✅ SSH configurado com maior segurança!"

# 12. Configurar monitoramento básico
log "📊 Configurando monitoramento básico..."
# Criar script de monitoramento simples
sudo tee /usr/local/bin/system-monitor.sh > /dev/null <<'EOF'
#!/bin/bash
# Monitor básico do sistema

LOG_FILE="/var/log/coinbitclub-monitor.log"

# Função de log
log_metric() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

# CPU Usage
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
log_metric "CPU_USAGE=${CPU_USAGE}%"

# Memory Usage
MEM_USAGE=$(free | grep Mem | awk '{printf "%.2f", $3/$2 * 100.0}')
log_metric "MEM_USAGE=${MEM_USAGE}%"

# Disk Usage
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | cut -d'%' -f1)
log_metric "DISK_USAGE=${DISK_USAGE}%"

# Load Average
LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | cut -d',' -f1)
log_metric "LOAD_AVG=${LOAD_AVG}"

# Docker status (se estiver rodando)
if systemctl is-active --quiet docker; then
    DOCKER_CONTAINERS=$(docker ps -q | wc -l)
    log_metric "DOCKER_CONTAINERS=${DOCKER_CONTAINERS}"
fi
EOF

sudo chmod +x /usr/local/bin/system-monitor.sh

# Adicionar ao crontab para executar a cada 5 minutos
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/system-monitor.sh") | crontab -

log "✅ Monitoramento básico configurado!"

# 13. Configurar logrotate
log "🔄 Configurando rotação de logs..."
sudo tee /etc/logrotate.d/coinbitclub > /dev/null <<EOF
/var/log/coinbitclub-*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
}
EOF

log "✅ Rotação de logs configurada!"

# 14. Informações finais
log "🎉 Configuração do VPS concluída com sucesso!"
echo ""
echo "=================================================="
echo "🇱🇹 VPS LITUÂNIA CONFIGURADO PARA COINBITCLUB"
echo "=================================================="
echo "IP: $(curl -s ifconfig.me)"
echo "Localização: Vilnius, Lituânia"
echo "Sistema: $(lsb_release -d | cut -f2)"
echo "Docker: $(docker --version)"
echo "Docker Compose: $(docker-compose --version)"
echo "NGINX: $(nginx -v 2>&1)"
echo ""
echo "✅ Serviços habilitados:"
echo "   - Docker (Port: 2376)"
echo "   - NGINX (Port: 80, 443)"
echo "   - SSH (Port: 22)"
echo "   - UFW Firewall"
echo "   - Fail2Ban"
echo ""
echo "📁 Diretórios criados em: ~/coinbitclub-enterprise/"
echo "📊 Monitoramento: /var/log/coinbitclub-monitor.log"
echo ""
echo "🔄 PRÓXIMOS PASSOS:"
echo "1. Fazer logout e login novamente para aplicar grupo docker"
echo "2. Configurar certificados SSL: sudo certbot --nginx"
echo "3. Clonar repositório CoinBitClub"
echo "4. Configurar variáveis de ambiente (.env)"
echo "5. Executar deploy: ./deploy-production-lithuania.sh"
echo ""
echo "⚠️  IMPORTANTE:"
echo "- Backup das chaves SSH"
echo "- Configurar DNS para coinbitclub.lt"
echo "- Configurar variáveis de ambiente"
echo "- Testar todas as conexões antes do deploy"
echo ""

log "🇱🇹 VPS Lituânia está pronto para o CoinBitClub Enterprise!"

# Criar arquivo de informações do sistema
sudo tee /etc/coinbitclub-info > /dev/null <<EOF
# CoinBitClub Enterprise - VPS Information
SETUP_DATE=$(date)
VPS_LOCATION=Lithuania
VPS_CITY=Vilnius  
VPS_IP=$(curl -s ifconfig.me)
VPS_HOSTNAME=$(hostname)
OS_VERSION=$(lsb_release -d | cut -f2)
DOCKER_VERSION=$(docker --version)
NGINX_VERSION=$(nginx -v 2>&1)
SETUP_SCRIPT_VERSION=1.0.0
EOF

warn "⚠️  REINICIALIZAÇÃO RECOMENDADA para aplicar todas as configurações!"
echo "Execute: sudo reboot"
