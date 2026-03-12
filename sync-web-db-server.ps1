param(
    [string]$Server = "vivi@212.227.107.3",
    [string]$RemoteRoot = "/var/www/endcosmos.com",
    [switch]$ApplyDatabase,
    [switch]$ReloadNginx,
    [switch]$Verify,
    [switch]$BatchMode,
    [switch]$InstallNginxConfig,
    [switch]$RestartApi,
    [string]$BackendServiceName = "endcosmos-api",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$scriptPath = Join-Path $PSScriptRoot "scripts/sync-all-ssh.ps1"

$args = @(
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    $scriptPath,
    "-Server",
    $Server,
    "-RemoteRoot",
    $RemoteRoot,
    "-BackendServiceName",
    $BackendServiceName
)

if ($ApplyDatabase) { $args += "-ApplyDatabase" }
if ($ReloadNginx) { $args += "-ReloadNginx" }
if ($Verify) { $args += "-Verify" }
if ($BatchMode) { $args += "-BatchMode" }
if ($InstallNginxConfig) { $args += "-InstallNginxConfig" }
if ($RestartApi) { $args += "-RestartApi" }
if ($DryRun) { $args += "-DryRun" }

& powershell @args
