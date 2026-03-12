[CmdletBinding()]
param(
  [string]$Server = "vivi@212.227.107.3",
  [string]$RemoteRoot = "/var/www/endcosmos.com",
  [string]$BackendServiceName = "endcosmos-api",
  [switch]$DryRun,
  [switch]$OpenBrowser
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$deployScript = Join-Path $PSScriptRoot "ec-deploy.ps1"

Write-Host "== ENDCOSMOS GO PUBLIC =="
Write-Host "Repo root: $repoRoot"

$deployArgs = @(
  "-Server", $Server,
  "-RemoteRoot", $RemoteRoot,
  "-BackendServiceName", $BackendServiceName
)
if ($DryRun) { $deployArgs += "-DryRun" }

Push-Location $repoRoot
try {
  & powershell -NoProfile -ExecutionPolicy Bypass -File $deployScript @deployArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Go-public failed during deploy."
  }

  Write-Host ""
  Write-Host "PUBLIC STATUS: endcosmos.com online." -ForegroundColor Green

  if ($OpenBrowser) {
    Start-Process "https://endcosmos.com/"
    Start-Process "https://endcosmos.com/zogs/"
    Start-Process "https://endcosmos.com/healthz"
    Write-Host "Opened public URLs in browser."
  }
}
finally {
  Pop-Location
}
