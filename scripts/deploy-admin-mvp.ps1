[CmdletBinding()]
param(
  [string]$Server = "vivi@212.227.107.3",
  [string]$RemoteRoot = "/var/www/endcosmos.com",
  [string]$ServiceName = "endcosmos-admin-mvp",
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Assert-LastExitCode {
  param([Parameter(Mandatory = $true)][string]$Step)
  if ($LASTEXITCODE -ne 0) {
    throw "Step failed: $Step"
  }
}

function Test-PublicUrl {
  param([Parameter(Mandatory = $true)][string]$Url)

  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 12
    Write-Host "  [$($response.StatusCode)] $Url"
  } catch {
    Write-Host "  [ERR] $Url -> $($_.Exception.Message)"
    throw "Public endpoint verification failed."
  }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $repoRoot

try {
  Write-Host "== Deploy Admin MVP =="
  Write-Host "Server: $Server"
  Write-Host "Remote root: $RemoteRoot"

  if ($DryRun) {
    Write-Host "[dry-run] Skipping local syntax check"
  } else {
    Write-Host "  -> Validate admin MVP python syntax"
    & python -m py_compile tools/endcosmos_admin_mvp/endcosmos_admin.py
    Assert-LastExitCode -Step "Validate admin MVP python syntax"
  }

  Write-Host "-> Checking remote sudo"
  if (-not $DryRun) {
    $sudoProbe = & ssh -o ConnectTimeout=12 -o BatchMode=yes $Server "if sudo -n nginx -t >/dev/null 2>&1; then echo SUDO_OK; else echo SUDO_LIMITED; fi"
    Assert-LastExitCode -Step "Probe sudo capabilities"

    if (((($sudoProbe | Out-String).Trim()) -ne "SUDO_OK")) {
      Write-Warning "sudo is restricted; deployment may fail on privileged steps."
    }
  }

  Write-Host "-> Sync tools/endcosmos_admin_mvp"
  if ($DryRun) {
    Write-Host "[dry-run] tar -cf - tools/endcosmos_admin_mvp | ssh $Server sudo -n mkdir -p '$RemoteRoot' && sudo -n tar -xf - -C '$RemoteRoot'"
  } else {
    $syncRemoteCommand = "sudo -n mkdir -p '$RemoteRoot' && sudo -n tar -xf - -C '$RemoteRoot' --no-same-owner --no-same-permissions --touch --no-overwrite-dir"
    & tar -cf - "tools/endcosmos_admin_mvp" | & ssh -o ConnectTimeout=12 -o BatchMode=yes $Server $syncRemoteCommand
    Assert-LastExitCode -Step "Sync admin MVP files"
  }

  $appDir = "$RemoteRoot/tools/endcosmos_admin_mvp"
  $nginxConf = "$RemoteRoot/nginx/endcosmos.conf"

  $remoteScriptTemplate = @'
set -e
APP_DIR='__APP_DIR__'
SERVICE='__SERVICE__'

sudo -n mkdir -p "$APP_DIR"
sudo -n chown -R vivi:www-data "$APP_DIR"
sudo -n find "$APP_DIR" -type d -exec chmod 755 {} \;
sudo -n find "$APP_DIR" -type f -exec chmod 644 {} \;

sudo -n tee /etc/systemd/system/$SERVICE.service >/dev/null <<'UNIT'
[Unit]
Description=EndCosmos Admin Control Plane MVP
After=network.target

[Service]
Type=simple
User=vivi
Group=www-data
WorkingDirectory=__APP_DIR__
ExecStart=/usr/bin/python3 __APP_DIR__/endcosmos_admin.py
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=__APP_DIR__

[Install]
WantedBy=multi-user.target
UNIT

sudo -n install -m 644 '__NGINX_CONF__' /etc/nginx/sites-available/endcosmos.com
sudo -n ln -sf /etc/nginx/sites-available/endcosmos.com /etc/nginx/sites-enabled/endcosmos.com
sudo -n systemctl daemon-reload
sudo -n systemctl enable $SERVICE
sudo -n systemctl restart $SERVICE
sudo -n systemctl is-active $SERVICE
sudo -n nginx -t
sudo -n systemctl reload nginx
sudo -n systemctl is-active nginx
'@

  $remoteScript = $remoteScriptTemplate.Replace('__APP_DIR__', $appDir).Replace('__SERVICE__', $ServiceName).Replace('__NGINX_CONF__', $nginxConf)

  Write-Host "-> Install service, permissions and nginx"
  if ($DryRun) {
    Write-Host "[dry-run] ssh $Server <remote setup script>"
  } else {
    Write-Host "  -> Run remote setup script"
    & ssh -o ConnectTimeout=12 -o BatchMode=yes $Server $remoteScript
    Assert-LastExitCode -Step "Run remote setup script"
  }

  Write-Host "-> Verify endpoints"
  if (-not $DryRun) {
    Write-Host "  -> Verify local remote health via SSH"
    & ssh -o ConnectTimeout=12 -o BatchMode=yes $Server "curl -fsS http://127.0.0.1:8088/health"
    Assert-LastExitCode -Step "Verify local remote health via SSH"

    Test-PublicUrl -Url "https://www.endcosmos.com/control-plane/"
    Test-PublicUrl -Url "https://www.endcosmos.com/control-plane/health"
  }

  Write-Host "Deploy Admin MVP completed."
}
catch {
  Write-Error "Deploy Admin MVP failed: $($_.Exception.Message)"
  throw
}
finally {
  Pop-Location
}
