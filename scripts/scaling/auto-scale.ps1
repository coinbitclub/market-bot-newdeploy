# Auto-scaling script for Docker Swarm
# Monitora CPU e memória para escalar automaticamente

$serviceName = "market-bot-newdeploy_app"
$minReplicas = 4
$maxReplicas = 16
$cpuThreshold = 70
$memoryThreshold = 80

while ($true) {
    try {
        # Verificar métricas atuais
        $stats = docker service ps $serviceName --format "table {{.Name}}\t{{.CurrentState}}" | Where-Object { $_ -match "Running" }
        $currentReplicas = ($stats | Measure-Object).Count
        
        # Verificar CPU e memória via Prometheus
        $cpuUsage = Invoke-RestMethod -Uri "http://localhost:9090/api/v1/query?query=avg(rate(container_cpu_usage_seconds_total[5m])*100)"
        $memoryUsage = Invoke-RestMethod -Uri "http://localhost:9090/api/v1/query?query=avg(container_memory_usage_bytes/container_memory_max_bytes*100)"
        
        $avgCpu = [math]::Round($cpuUsage.data.result[0].value[1], 2)
        $avgMemory = [math]::Round($memoryUsage.data.result[0].value[1], 2)
        
        Write-Host "$(Get-Date): CPU: $avgCpu%, Memory: $avgMemory%, Replicas: $currentReplicas"
        
        # Decidir se deve escalar
        if (($avgCpu -gt $cpuThreshold -or $avgMemory -gt $memoryThreshold) -and $currentReplicas -lt $maxReplicas) {
            $newReplicas = $currentReplicas + 2
            if ($newReplicas -gt $maxReplicas) { $newReplicas = $maxReplicas }
            
            Write-Host "Scaling UP to $newReplicas replicas (CPU: $avgCpu%, Memory: $avgMemory%)"
            docker service scale $serviceName=$newReplicas
            Start-Sleep -Seconds 120  # Cooldown
        }
        elseif (($avgCpu -lt 30 -and $avgMemory -lt 40) -and $currentReplicas -gt $minReplicas) {
            $newReplicas = $currentReplicas - 1
            if ($newReplicas -lt $minReplicas) { $newReplicas = $minReplicas }
            
            Write-Host "Scaling DOWN to $newReplicas replicas (CPU: $avgCpu%, Memory: $avgMemory%)"
            docker service scale $serviceName=$newReplicas
            Start-Sleep -Seconds 300  # Longer cooldown for scale down
        }
        
        Start-Sleep -Seconds 30
    }
    catch {
        Write-Error "Auto-scaling error: $_"
        Start-Sleep -Seconds 60
    }
}