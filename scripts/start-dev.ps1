$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"
$backendEnvFile = Join-Path $backendDir ".env"

$backendEnvBootstrap = @"
if (Test-Path '$backendEnvFile') {
  Get-Content '$backendEnvFile' | ForEach-Object {
    if ([string]::IsNullOrWhiteSpace(`$_) -or `$_ -match '^\s*#') {
      return
    }

    `$parts = `$_ -split '=', 2
    if (`$parts.Length -eq 2) {
      `$name = `$parts[0].Trim()
      `$value = `$parts[1].Trim().Trim('\"')
      [Environment]::SetEnvironmentVariable(`$name, `$value, 'Process')
    }
  }
}
"@

$backendCommand = "$backendEnvBootstrap cd `"$backendDir`"; python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
$frontendCommand = "cd `"$frontendDir`"; npm.cmd run dev"

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCommand | Out-Null
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCommand | Out-Null

Write-Host ""
Write-Host "Academic Data Processing Suite launch started."
Write-Host "Backend:  http://127.0.0.1:8000"
Write-Host "Frontend: http://127.0.0.1:5173"
Write-Host ""
