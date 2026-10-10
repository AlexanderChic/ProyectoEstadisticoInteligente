# ============================================================================
# Habilita TCP/IP en SQL Server Express (SQLEXPRESS) en el puerto 1433 y
# reinicia el servicio, para que aplicaciones como Node.js puedan conectarse.
# Debe ejecutarse como Administrador.
# ============================================================================
$log = "$env:TEMP\habilitar_tcp_log.txt"
"Inicio: $(Get-Date)" | Out-File $log

try {
    $tcpRoot = Get-ChildItem "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server" |
        Where-Object { $_.PSChildName -match '^MSSQL\d+\.SQLEXPRESS$' } | Select-Object -First 1
    $tcpPath = Join-Path $tcpRoot.PSPath "MSSQLServer\SuperSocketNetLib\Tcp"
    $ipall   = Join-Path $tcpPath "IPAll"

    Set-ItemProperty -Path $tcpPath -Name Enabled -Value 1
    Set-ItemProperty -Path $ipall -Name TcpPort -Value "1433"
    Set-ItemProperty -Path $ipall -Name TcpDynamicPorts -Value ""
    "TCP habilitado y puerto 1433 configurado." | Out-File $log -Append

    Restart-Service 'MSSQL$SQLEXPRESS' -Force
    "Servicio SQLEXPRESS reiniciado." | Out-File $log -Append

    Start-Sleep -Seconds 3
    $port = Test-NetConnection -ComputerName localhost -Port 1433 -WarningAction SilentlyContinue
    "Puerto 1433 accesible: $($port.TcpTestSucceeded)" | Out-File $log -Append
    "OK" | Out-File $log -Append
} catch {
    "ERROR: $($_.Exception.Message)" | Out-File $log -Append
}
