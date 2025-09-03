# CoinBitClub Enterprise - Deploy Production Lithuania (Windows PowerShell)
# Script de deploy para VPS Lithuania

param(
    [Parameter(Mandatory=$false)]
    [string]$VpsHost = "31.97.72.77",
    
    [Parameter(Mandatory=$false)]
    [string]$VpsUser = "coinbitclub",
    
    [Parameter(Mandatory=$false)]
    [string]$SshKey = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$LocalDeploy = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBackup = $false
)

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "CoinBitClub Enterprise - Deploy" -ForegroundColor Cyan
Write-Host "Lithuania VPS: $VpsHost" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Função para verificar status
function Test-ServiceHealth {
    param([string]$Url)
    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec 10 -UseBasicParsing
        return $response.StatusCode -eq 200
    }
    catch {
        return $false
    }
}

if ($LocalDeploy) {
    Write-Host "🏠 Deploy local (Windows)..." -ForegroundColor Yellow
    
    # Verificar se Docker está rodando
    try {
        docker info | Out-Null
        Write-Host "✅ Docker está rodando" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Docker não está rodando. Iniciando..." -ForegroundColor Red
        Start-Service docker
        Start-Sleep 5
    }
    
    # Build da imagem
    Write-Host "🔨 Construindo imagem Docker..." -ForegroundColor Yellow
    docker build -t coinbitclub/trading-enterprise:latest .
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Build concluído" -ForegroundColor Green
    } else {
        Write-Host "❌ Erro no build" -ForegroundColor Red
        exit 1
    }
    
    # Deploy local
    Write-Host "🚀 Iniciando stack local..." -ForegroundColor Yellow
    docker-compose -f docker-compose.production.yml up -d
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Stack iniciado localmente" -ForegroundColor Green
        
        # Aguardar serviços
        Write-Host "⏳ Aguardando serviços..." -ForegroundColor Yellow
        Start-Sleep 15
        
        # Verificar saúde
        if (Test-ServiceHealth "http://localhost/health") {
            Write-Host "✅ Sistema saudável!" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Sistema pode estar iniciando..." -ForegroundColor Yellow
        }
        
        Write-Host "`n📊 Acesso local:" -ForegroundColor Cyan
        Write-Host "- App: http://localhost" -ForegroundColor White
        Write-Host "- Grafana: http://localhost:3001" -ForegroundColor White
        Write-Host "- Prometheus: http://localhost:9090" -ForegroundColor White
    } else {
        Write-Host "❌ Erro no deploy local" -ForegroundColor Red
        exit 1
    }
    
    return
}

# Deploy remoto no VPS Lithuania
Write-Host "🌍 Preparando deploy remoto..." -ForegroundColor Yellow

# Verificar arquivos necessários
$requiredFiles = @(
    "docker-compose.production.yml",
    "Dockerfile",
    "package.json"
)

foreach ($file in $requiredFiles) {
    if (!(Test-Path $file)) {
        Write-Host "❌ Arquivo necessário não encontrado: $file" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Arquivos verificados" -ForegroundColor Green

# Criar backup se necessário
if (!$SkipBackup) {
    Write-Host "💾 Criando backup..." -ForegroundColor Yellow
    $backupName = "backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Compress-Archive -Path "*.js", "*.json", "*.yml", "src", "config" -DestinationPath "backups\$backupName.zip" -Force
    Write-Host "✅ Backup criado: backups\$backupName.zip" -ForegroundColor Green
}

# Script de deploy remoto
$deployScript = @"
#!/bin/bash
echo "🚀 Iniciando deploy CoinBitClub Enterprise..."

cd /opt/coinbitclub/app

# Backup anterior
if [ -d "current" ]; then
    echo "💾 Criando backup da versão atual..."
    mv current backup-$(date +%Y%m%d-%H%M%S) 2>/dev/null || true
fi

# Criar diretório atual
mkdir -p current
cd current

# Parar serviços existentes
echo "⏹️ Parando serviços existentes..."
docker-compose -f docker-compose.production.yml down 2>/dev/null || true

# Aguardar parada completa
sleep 5

# Build da nova imagem
echo "🔨 Construindo nova imagem..."
docker build -t coinbitclub/trading-enterprise:latest .

if [ $? -eq 0 ]; then
    echo "✅ Build concluído"
else
    echo "❌ Erro no build"
    exit 1
fi

# Iniciar nova stack
echo "🚀 Iniciando nova stack..."
docker-compose -f docker-compose.production.yml up -d

if [ $? -eq 0 ]; then
    echo "✅ Stack iniciado"
else
    echo "❌ Erro ao iniciar stack"
    exit 1
fi

# Aguardar inicialização
echo "⏳ Aguardando inicialização dos serviços..."
sleep 30

# Verificar saúde dos serviços
echo "🔍 Verificando saúde dos serviços..."

# Verificar aplicação principal
if curl -f http://localhost/health >/dev/null 2>&1; then
    echo "✅ Aplicação principal: OK"
else
    echo "⚠️ Aplicação principal: Verificando..."
fi

# Verificar load balancer
if curl -f http://localhost >/dev/null 2>&1; then
    echo "✅ Load Balancer: OK"
else
    echo "⚠️ Load Balancer: Verificando..."
fi

# Verificar Prometheus
if curl -f http://localhost:9090/-/healthy >/dev/null 2>&1; then
    echo "✅ Prometheus: OK"
else
    echo "⚠️ Prometheus: Verificando..."
fi

# Verificar Grafana
if curl -f http://localhost:3001/api/health >/dev/null 2>&1; then
    echo "✅ Grafana: OK"
else
    echo "⚠️ Grafana: Verificando..."
fi

# Status dos containers
echo "📊 Status dos containers:"
docker-compose -f docker-compose.production.yml ps

echo "🎉 Deploy concluído!"
echo "📊 Sistema disponível em:"
echo "- App: http://31.97.72.77"
echo "- Grafana: http://31.97.72.77:3001"
echo "- Prometheus: http://31.97.72.77:9090"
"@

# Salvar script temporário
$tempScript = Join-Path $env:TEMP "deploy-remote.sh"
$deployScript | Out-File -FilePath $tempScript -Encoding UTF8

# Criar arquivo de transferência
$transferDir = Join-Path $env:TEMP "coinbitclub-deploy"
if (Test-Path $transferDir) {
    Remove-Item $transferDir -Recurse -Force
}
New-Item -ItemType Directory -Path $transferDir -Force

# Copiar arquivos necessários
Copy-Item "docker-compose.production.yml" "$transferDir\"
Copy-Item "Dockerfile" "$transferDir\"
Copy-Item "package.json" "$transferDir\"
Copy-Item "src" "$transferDir\" -Recurse -ErrorAction SilentlyContinue
Copy-Item "config" "$transferDir\" -Recurse -ErrorAction SilentlyContinue
Copy-Item "*.js" "$transferDir\" -ErrorAction SilentlyContinue

Write-Host "📦 Arquivos preparados para transfer" -ForegroundColor Green

# Construir comando SSH
$sshCommand = "ssh"
$scpCommand = "scp -r"
if ($SshKey) {
    $sshCommand += " -i `"$SshKey`""
    $scpCommand += " -i `"$SshKey`""
}

Write-Host "🚀 Executando deploy remoto..." -ForegroundColor Yellow

try {
    # Transferir arquivos
    Write-Host "📤 Transferindo arquivos..." -ForegroundColor Yellow
    if ($SshKey) {
        scp -r -i "$SshKey" "$transferDir\*" "$VpsUser@${VpsHost}:/opt/coinbitclub/app/current/"
        scp -i "$SshKey" "$tempScript" "$VpsUser@${VpsHost}:/tmp/deploy.sh"
    } else {
        scp -r "$transferDir\*" "$VpsUser@${VpsHost}:/opt/coinbitclub/app/current/"
        scp "$tempScript" "$VpsUser@${VpsHost}:/tmp/deploy.sh"
    }
    
    Write-Host "✅ Arquivos transferidos" -ForegroundColor Green
    
    # Executar deploy
    Write-Host "🎯 Executando deploy..." -ForegroundColor Yellow
    if ($SshKey) {
        ssh -i "$SshKey" "$VpsUser@$VpsHost" "chmod +x /tmp/deploy.sh && /tmp/deploy.sh"
    } else {
        ssh "$VpsUser@$VpsHost" "chmod +x /tmp/deploy.sh && /tmp/deploy.sh"
    }
    
    Write-Host "✅ Deploy concluído com sucesso!" -ForegroundColor Green
    
    # Verificar saúde remota
    Write-Host "🔍 Verificando sistema remoto..." -ForegroundColor Yellow
    Start-Sleep 10
    
    if (Test-ServiceHealth "http://$VpsHost/health") {
        Write-Host "✅ Sistema remoto saudável!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Sistema pode estar inicializando..." -ForegroundColor Yellow
    }
    
    Write-Host "`n📊 Acesso remoto:" -ForegroundColor Cyan
    Write-Host "- App: http://$VpsHost" -ForegroundColor White
    Write-Host "- Grafana: http://$VpsHost:3001" -ForegroundColor White
    Write-Host "- Prometheus: http://$VpsHost:9090" -ForegroundColor White
    
}
catch {
    Write-Host "❌ Erro durante deploy: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Verifique se:" -ForegroundColor Yellow
    Write-Host "   - O VPS está acessível: $VpsHost" -ForegroundColor Yellow
    Write-Host "   - As credenciais SSH estão corretas" -ForegroundColor Yellow
    Write-Host "   - O setup do VPS foi executado" -ForegroundColor Yellow
}
finally {
    # Limpar arquivos temporários
    if (Test-Path $tempScript) {
        Remove-Item $tempScript -Force
    }
    if (Test-Path $transferDir) {
        Remove-Item $transferDir -Recurse -Force
    }
}

Write-Host "`n🎉 Deploy finalizado!" -ForegroundColor Cyan
Write-Host "Para monitorar: npm run logs:view" -ForegroundColor White
