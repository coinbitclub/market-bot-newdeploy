# CoinBitClub Enterprise - Orchestration Manager (Windows PowerShell)
# Script para gerenciar orquestração local e remota

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("start", "stop", "restart", "status", "scale-up", "scale-down", "logs", "health")]
    [string]$Action = "start",
    
    [Parameter(Mandatory=$false)]
    [string]$VpsHost = "31.97.72.77",
    
    [Parameter(Mandatory=$false)]
    [string]$VpsUser = "coinbitclub",
    
    [Parameter(Mandatory=$false)]
    [string]$SshKey = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$Local = $false,
    
    [Parameter(Mandatory=$false)]
    [int]$Replicas = 8
)

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "CoinBitClub Enterprise - Orchestration" -ForegroundColor Cyan
Write-Host "Action: $Action" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Função para executar comando Docker Compose
function Invoke-DockerCompose {
    param(
        [string]$Command,
        [switch]$Remote = $false
    )
    
    $dockerCommand = "docker-compose -f docker-compose.production.yml $Command"
    
    if ($Remote) {
        $sshCmd = "ssh"
        if ($SshKey) {
            $sshCmd += " -i `"$SshKey`""
        }
        $sshCmd += " $VpsUser@$VpsHost `"cd /opt/coinbitclub/app/current; $dockerCommand`""
        
        Write-Host "🌍 Executando remotamente: $dockerCommand" -ForegroundColor Yellow
        Invoke-Expression $sshCmd
    } else {
        Write-Host "🏠 Executando localmente: $dockerCommand" -ForegroundColor Yellow
        Invoke-Expression $dockerCommand
    }
}

# Função para verificar status dos serviços
function Get-ServiceStatus {
    param([switch]$Remote = $false)
    
    Write-Host "`n📊 Status dos Serviços:" -ForegroundColor Cyan
    
    if ($Remote) {
        $sshCmd = "ssh"
        if ($SshKey) {
            $sshCmd += " -i `"$SshKey`""
        }
        $sshCmd += " $VpsUser@$VpsHost `"cd /opt/coinbitclub/app/current; docker-compose -f docker-compose.production.yml ps`""
        Invoke-Expression $sshCmd
    } else {
        docker-compose -f docker-compose.production.yml ps
    }
}

# Função para verificar saúde do sistema
function Test-SystemHealth {
    param([switch]$Remote = $false)
    
    Write-Host "`n🔍 Verificando Saúde do Sistema:" -ForegroundColor Cyan
    
    $baseUrl = if ($Remote) { "http://$VpsHost" } else { "http://localhost" }
    
    # Verificar aplicação principal
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/health" -TimeoutSec 10 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Aplicação Principal: Saudável" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "❌ Aplicação Principal: Indisponível" -ForegroundColor Red
    }
    
    # Verificar Prometheus
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl`:9090/-/healthy" -TimeoutSec 10 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Prometheus: Saudável" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "❌ Prometheus: Indisponível" -ForegroundColor Red
    }
    
    # Verificar Grafana
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl`:3001/api/health" -TimeoutSec 10 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Grafana: Saudável" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "❌ Grafana: Indisponível" -ForegroundColor Red
    }
}

# Executar ação solicitada
switch ($Action) {
    "start" {
        Write-Host "🚀 Iniciando orquestração..." -ForegroundColor Yellow
        Invoke-DockerCompose "up -d" -Remote:(!$Local)
        Start-Sleep 15
        Get-ServiceStatus -Remote:(!$Local)
        Test-SystemHealth -Remote:(!$Local)
    }
    
    "stop" {
        Write-Host "⏹️ Parando orquestração..." -ForegroundColor Yellow
        Invoke-DockerCompose "down" -Remote:(!$Local)
        Write-Host "✅ Serviços parados" -ForegroundColor Green
    }
    
    "restart" {
        Write-Host "🔄 Reiniciando orquestração..." -ForegroundColor Yellow
        Invoke-DockerCompose "restart" -Remote:(!$Local)
        Start-Sleep 10
        Get-ServiceStatus -Remote:(!$Local)
    }
    
    "status" {
        Get-ServiceStatus -Remote:(!$Local)
        Test-SystemHealth -Remote:(!$Local)
    }
    
    "scale-up" {
        Write-Host "📈 Escalando para $Replicas réplicas..." -ForegroundColor Yellow
        Invoke-DockerCompose "up -d --scale trading-app=$Replicas" -Remote:(!$Local)
        Start-Sleep 10
        Get-ServiceStatus -Remote:(!$Local)
    }
    
    "scale-down" {
        $downReplicas = [Math]::Max(2, $Replicas / 2)
        Write-Host "📉 Reduzindo para $downReplicas réplicas..." -ForegroundColor Yellow
        Invoke-DockerCompose "up -d --scale trading-app=$downReplicas" -Remote:(!$Local)
        Start-Sleep 10
        Get-ServiceStatus -Remote:(!$Local)
    }
    
    "logs" {
        Write-Host "📋 Visualizando logs..." -ForegroundColor Yellow
        Invoke-DockerCompose "logs -f --tail=100" -Remote:(!$Local)
    }
    
    "health" {
        Test-SystemHealth -Remote:(!$Local)
        
        # Informações adicionais
        $baseUrl = if (!$Local) { "http://$VpsHost" } else { "http://localhost" }
        Write-Host "`n📊 URLs de Acesso:" -ForegroundColor Cyan
        Write-Host "- Aplicação: $baseUrl" -ForegroundColor White
        Write-Host "- Grafana: $baseUrl`:3001 (admin/admin)" -ForegroundColor White
        Write-Host "- Prometheus: $baseUrl`:9090" -ForegroundColor White
    }
}

Write-Host "`n🎉 Operação concluída!" -ForegroundColor Green
