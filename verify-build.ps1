$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Run-Command([string]$WorkingDirectory, [string]$Command, [string[]]$Arguments) {
  Write-Host "`n> $Command $($Arguments -join ' ')" -ForegroundColor Cyan
  Push-Location $WorkingDirectory
  try {
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Command failed with exit code $LASTEXITCODE : $Command $($Arguments -join ' ')" }
  } finally { Pop-Location }
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js is not installed. Install Node.js 18+ and reopen PowerShell.' }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'npm was not found. Reinstall Node.js and reopen PowerShell.' }
Write-Host "Node: $(node --version) | npm: $(npm --version)" -ForegroundColor Green

Run-Command (Join-Path $Root 'backend') 'npm' @('ci')
Run-Command (Join-Path $Root 'frontend') 'npm' @('ci')
Run-Command (Join-Path $Root 'frontend') 'npm' @('run', 'build')

Write-Host "`nChecking backend JavaScript syntax..." -ForegroundColor Cyan
$Backend = Join-Path $Root 'backend'
$Files = Get-ChildItem $Backend -Recurse -File -Filter '*.js' | Where-Object { $_.FullName -notmatch '[\\/]node_modules[\\/]' }
foreach ($File in $Files) {
  & node --check $File.FullName
  if ($LASTEXITCODE -ne 0) { throw "Syntax check failed: $($File.FullName)" }
}
Write-Host "Backend syntax checks passed for $($Files.Count) files." -ForegroundColor Green

$Tcp = $null
try {
  $Tcp = [System.Net.Sockets.TcpClient]::new()
  $Connect = $Tcp.BeginConnect('127.0.0.1', 3306, $null, $null)
  $Connected = $Connect.AsyncWaitHandle.WaitOne(1200, $false) -and $Tcp.Connected
} catch { $Connected = $false } finally { if ($Tcp) { $Tcp.Dispose() } }
if (-not $Connected) {
  Write-Warning 'MySQL is not listening on 127.0.0.1:3306. Build checks passed, but database integration and end-to-end feature tests were NOT run. Start MySQL, configure backend/.env, import database/schema.sql and database/seed.sql, then run backend/utils/testFlow.js with the API running.'
} else {
  Write-Host 'MySQL port is reachable. This confirms only TCP availability; it does not verify credentials or schema.' -ForegroundColor Yellow
  Write-Host 'For full feature tests, configure backend/.env, import schema.sql and seed.sql, start the backend, then run: cd backend; node utils/testFlow.js' -ForegroundColor Yellow
}
Write-Host "`nBuild verification script finished." -ForegroundColor Green
