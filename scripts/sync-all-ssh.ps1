#pragma warning disable PSAvoidAssignmentToAutomaticVariable
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$Server,

  [string]$RemoteRoot = "/var/www/endcosmos.com",
  [string]$IdentityFile = "",
  [switch]$BatchMode,
  [switch]$DryRun,

  [switch]$SkipPublic,
  [switch]$SkipBackend,
  [switch]$SkipNginx,
  [switch]$SkipManifestBuild,

  [switch]$InstallNginxConfig,
  [switch]$ReloadNginx,

  [switch]$ApplyDatabase,
  [switch]$RestartApi,
  [string]$BackendServiceName = "endcosmos-api",

  [switch]$Verify
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function New-SshOptions {
  if ($BatchMode -and -not [string]::IsNullOrWhiteSpace($IdentityFile)) {
    return @("-o", "ConnectTimeout=12", "-o", "BatchMode=yes", "-i", $IdentityFile)
  }
  if ($BatchMode) {
    return @("-o", "ConnectTimeout=12", "-o", "BatchMode=yes")
  }
  if (-not [string]::IsNullOrWhiteSpace($IdentityFile)) {
    return @("-o", "ConnectTimeout=12", "-i", $IdentityFile)
  }
  return @("-o", "ConnectTimeout=12")
}

function Invoke-Ssh {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RemoteCommand
  )

  $sshOptions = New-SshOptions
  if ($DryRun) {
    Write-Host "[dry-run] ssh $($sshOptions -join ' ') $Server `"$RemoteCommand`""
    return
  }

  & ssh @sshOptions $Server $RemoteCommand
  if ($LASTEXITCODE -ne 0) {
    throw "SSH command failed."
  }
}

function Send-Tar {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Sources
  )

  $sshOptions = New-SshOptions
  $sourceText = $Sources -join ", "
  if ($DryRun) {
    Write-Host "[dry-run] tar -cf - $sourceText | ssh $($sshOptions -join ' ') $Server ""sudo -n mkdir -p '$RemoteRoot' && sudo -n tar -xf - -C '$RemoteRoot'"""
    return
  }

  & tar -cf - @Sources | ssh @sshOptions $Server "sudo -n mkdir -p '$RemoteRoot' && sudo -n tar -xf - -C '$RemoteRoot' --no-same-owner --no-same-permissions --touch --no-overwrite-dir"
  if ($LASTEXITCODE -eq 0) {
    return
  }

  Write-Warning "Tar-over-SSH failed. Falling back to SCP recursive sync..."
  foreach ($source in $Sources) {
    if ($DryRun) {
      Write-Host "[dry-run] scp -r $source ${Server}:$RemoteRoot/"
      continue
    }

    & scp @sshOptions -r $source "$($Server):$RemoteRoot/"
    if ($LASTEXITCODE -ne 0) {
      throw "SCP fallback failed for '$source'."
    }
  }
}

function Assert-Path {
  param([Parameter(Mandatory = $true)][string]$PathToCheck)
  if (-not (Test-Path $PathToCheck)) {
    throw "Missing required path: $PathToCheck"
  }
}

Write-Host "== ENDCOSMOS SSH SYNC =="
Write-Host "Server: $Server"
Write-Host "Remote root: $RemoteRoot"

if (-not $SkipNginx) {
  if (-not $InstallNginxConfig) { $InstallNginxConfig = $true }
  if (-not $ReloadNginx) { $ReloadNginx = $true }
}

Assert-Path -PathToCheck "./public"
Assert-Path -PathToCheck "./backend"
Assert-Path -PathToCheck "./nginx/endcosmos.conf"

$needsSudo = $InstallNginxConfig -or $ReloadNginx -or $RestartApi -or $ApplyDatabase
if (-not $DryRun -and $needsSudo) {
  Write-Host "[0/8] Checking sudo capability for remote user..."
  $sshOptions = New-SshOptions
  $sudoCheck = & ssh @sshOptions $Server "if sudo -n true >/dev/null 2>&1; then echo SUDO_OK; else echo SUDO_NO; fi"
  if ($LASTEXITCODE -ne 0 -or (($sudoCheck | Out-String).Trim() -ne "SUDO_OK")) {
    throw "Remote user '$Server' requires passwordless sudo for requested privileged operations (nginx/api/sql)."
  }
}

if (-not $SkipManifestBuild) {
  Write-Host "[1/8] Rebuilding gallery manifests..."
  if ($DryRun) {
    Write-Host "[dry-run] python backend/scripts/generate_gallery_manifests.py"
  } else {
    & python backend/scripts/generate_gallery_manifests.py
    if ($LASTEXITCODE -ne 0) {
      throw "Manifest generation failed."
    }
  }
} else {
  Write-Host "[1/8] Manifest build skipped."
}

if (-not $SkipPublic) {
  Write-Host "[2/8] Sync public/ ..."
  Send-Tar -Sources @("public")
} else {
  Write-Host "[2/8] public/ skipped."
}

if (-not $SkipBackend) {
  Write-Host "[3/8] Sync backend/ ..."
  Send-Tar -Sources @(
    "backend/app",
    "backend/scripts",
    "backend/sql",
    "backend/requirements.txt",
    "backend/README.md",
    "backend/ENDCOSMOS_CORE.md",
    "backend/.env.example"
  )
} else {
  Write-Host "[3/8] backend/ skipped."
}

if (-not $SkipNginx) {
  Write-Host "[4/8] Sync nginx/ ..."
  Send-Tar -Sources @("nginx")
} else {
  Write-Host "[4/8] nginx/ skipped."
}

if ($InstallNginxConfig) {
  Write-Host "[5/8] Installing nginx config to /etc/nginx/sites-available/endcosmos.com ..."
  $installCmdTemplate = @'
set -e
sudo install -m 644 '__REMOTE_ROOT__/nginx/endcosmos.conf' /etc/nginx/sites-available/endcosmos.com
sudo ln -sf /etc/nginx/sites-available/endcosmos.com /etc/nginx/sites-enabled/endcosmos.com
'@
  $installCmd = $installCmdTemplate.Replace("__REMOTE_ROOT__", $RemoteRoot)
  Invoke-Ssh -RemoteCommand $installCmd
} else {
  Write-Host "[5/8] nginx install skipped."
}

if ($ApplyDatabase) {
  Write-Host "[6/8] Applying SQL schema on remote DB ..."
  $dbCmdTemplate = @'
set -e
cd '__REMOTE_ROOT__/backend'
mysql endcosmos_auth < sql/endcosmos_auth.sql
'@
  $dbCmd = $dbCmdTemplate.Replace("__REMOTE_ROOT__", $RemoteRoot)
  Invoke-Ssh -RemoteCommand $dbCmd
} else {
  Write-Host "[6/8] SQL apply skipped."
}

if ($ReloadNginx) {
  Write-Host "[7/8] Validating and reloading nginx ..."
  $repairCmdTemplate = @'
set -e
sudo install -m 644 '__REMOTE_ROOT__/nginx/endcosmos.conf' /etc/nginx/sites-available/endcosmos.com
sudo ln -sf /etc/nginx/sites-available/endcosmos.com /etc/nginx/sites-enabled/endcosmos.com
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl is-active nginx
'@
  $repairCmd = $repairCmdTemplate.Replace("__REMOTE_ROOT__", $RemoteRoot)
  Invoke-Ssh -RemoteCommand $repairCmd
} else {
  Write-Host "[7/8] nginx reload skipped."
}

if ($RestartApi) {
  Write-Host "[8/8] Restarting backend service '$BackendServiceName' ..."
  Invoke-Ssh -RemoteCommand "sudo systemctl restart '$BackendServiceName' && sudo systemctl is-active '$BackendServiceName' && sudo systemctl status '$BackendServiceName' --no-pager"
} else {
  Write-Host "[8/8] backend restart skipped."
}

if ($Verify) {
  Write-Host "Verifying public endpoints..."
  try {
    $siteResponse = Invoke-WebRequest -Uri "https://endcosmos.com/" -UseBasicParsing -TimeoutSec 12
    Write-Host "home => HTTP $($siteResponse.StatusCode)"
  } catch {
    Write-Host "home => ERROR: $($_.Exception.Message)"
  }

  try {
    $health = Invoke-WebRequest -Uri "https://endcosmos.com/healthz" -UseBasicParsing -TimeoutSec 12
    Write-Host "healthz => HTTP $($health.StatusCode)"
  } catch {
    Write-Host "healthz => ERROR: $($_.Exception.Message)"
  }
}

Write-Host "SYNC completed."
#pragma warning restore PSAvoidAssignmentToAutomaticVariable
