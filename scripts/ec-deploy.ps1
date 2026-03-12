[CmdletBinding()]
param(
  [string]$Server = "vivi@212.227.107.3",
  [string]$RemoteRoot = "/var/www/endcosmos.com",
  [string]$BackendServiceName = "endcosmos-api",
  [string]$ImagePath = "/var/www/endcosmos.com/public/assets/images",
  [string]$ImageOwner = "www-data",
  [string]$ImageGroup = "www-data",
  [bool]$RequireSudo = $true,
  [switch]$DryRun,
  [switch]$SkipValidate,
  [switch]$SkipBuild,
  [switch]$SkipPublic,
  [switch]$SkipBackend,
  [switch]$SkipNginx,
  [switch]$SkipManifestBuild,
  [switch]$SkipInstallNginxConfig,
  [switch]$SkipReloadNginx,
  [switch]$SkipRestartApi,
  [switch]$SkipVerify
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)][string]$Title,
    [Parameter(Mandatory = $true)][scriptblock]$Action
  )

  Write-Host ""
  Write-Host "==> $Title"
  & $Action
}

function Invoke-External {
  param(
    [Parameter(Mandatory = $true)][string]$Title,
    [Parameter(Mandatory = $true)][string]$File,
    [string[]]$Args = @()
  )

  Write-Host "  -> $Title"
  & $File @Args
  if ($LASTEXITCODE -ne 0) {
    throw "Step failed: $Title"
  }
}

function Test-HttpEndpoint {
  param(
    [Parameter(Mandatory = $true)][string]$Url
  )

  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 12
    return [pscustomobject]@{ Url = $Url; Ok = $true; Status = $response.StatusCode; Message = "OK" }
  } catch {
    return [pscustomobject]@{ Url = $Url; Ok = $false; Status = "ERR"; Message = $_.Exception.Message }
  }
}

function Test-RemoteSudo {
  param(
    [Parameter(Mandatory = $true)][string]$Target
  )

  if ($DryRun) {
    return $true
  }

  $sudoCheck = & ssh -o BatchMode=yes -o ConnectTimeout=8 $Target "if sudo -n true >/dev/null 2>&1; then echo SUDO_OK; else echo SUDO_NO; fi"
  return ($LASTEXITCODE -eq 0 -and (($sudoCheck | Out-String).Trim() -eq "SUDO_OK"))
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$syncScript = Join-Path $PSScriptRoot "sync-all-ssh.ps1"

Push-Location $repoRoot
try {
  Write-Host "== ENDCOSMOS CONTROL-PLANE DEPLOY =="
  Write-Host "Repo root: $repoRoot"
  Write-Host "Server: $Server"
  Write-Host "Remote root: $RemoteRoot"

  $canUseSudo = $false

  Invoke-Step -Title "Verify SSH access" -Action {
    if ($DryRun) {
      Write-Host "  [dry-run] ssh -o BatchMode=yes -o ConnectTimeout=8 $Server \"echo OK_SSH\""
      return
    }

    & ssh -o BatchMode=yes -o ConnectTimeout=8 $Server "echo OK_SSH"
    if ($LASTEXITCODE -ne 0) {
      throw "SSH access failed for $Server"
    }
  }

  Invoke-Step -Title "Check privileged remote capabilities" -Action {
    $canUseSudo = Test-RemoteSudo -Target $Server
    if ($canUseSudo) {
      Write-Host "  sudo -n available. Nginx/API privileged steps enabled."
    } else {
      Write-Host "  sudo -n not available on $Server."
      if ($RequireSudo) {
        throw "Sudo is required. Configure passwordless sudo for user 'vivi' before deploy. Suggested remote command (as root): echo 'vivi ALL=(ALL) NOPASSWD: /usr/sbin/nginx, /bin/systemctl, /usr/bin/install, /bin/ln' > /etc/sudoers.d/90-vivi-endcosmos && chmod 440 /etc/sudoers.d/90-vivi-endcosmos"
      }
      Write-Host "  continuing without sudo because RequireSudo=false"
    }
  }

  if (-not $SkipValidate) {
    Invoke-Step -Title "Validate local project" -Action {
      Invoke-External -Title "Generate gallery manifests" -File "python" -Args @(
        "backend/scripts/generate_gallery_manifests.py"
      )
      Invoke-External -Title "Validate backend syntax" -File "python" -Args @(
        "-m",
        "py_compile",
        "backend/app/main.py",
        "backend/app/auth.py",
        "backend/app/routes/world.py",
        "backend/app/routes/admin.py",
        "backend/app/internal_world_db.py",
        "backend/scripts/generate_gallery_manifests.py"
      )
      Invoke-External -Title "Validate frontend script: app.js" -File "node" -Args @(
        "--check",
        "public/js/app.js"
      )
      Invoke-External -Title "Validate frontend script: motion-gallery.js" -File "node" -Args @(
        "--check",
        "public/js/motion-gallery.js"
      )
      Invoke-External -Title "Validate frontend script: zogs-gallery.js" -File "node" -Args @(
        "--check",
        "public/js/zogs-gallery.js"
      )
      Invoke-External -Title "Validate frontend script: register.js" -File "node" -Args @(
        "--check",
        "public/js/register.js"
      )
      Invoke-External -Title "Validate frontend script: classes.js" -File "node" -Args @(
        "--check",
        "public/js/classes.js"
      )
      Invoke-External -Title "Validate frontend script: cosmos-dynamic-clock.js" -File "node" -Args @(
        "--check",
        "public/js/cosmos-dynamic-clock.js"
      )
    }
  } else {
    Write-Host ""
    Write-Host "==> Validate local project"
    Write-Host "  skipped"
  }

  if (-not $SkipBuild) {
    Invoke-Step -Title "Run frontend build when available" -Action {
      $packageJson = Join-Path $repoRoot "package.json"
      if (-not (Test-Path $packageJson)) {
        Write-Host "  No package.json at repo root. Build skipped."
        return
      }

      $package = Get-Content $packageJson -Raw | ConvertFrom-Json
      if (-not $package.scripts -or -not $package.scripts.build) {
        Write-Host "  package.json has no build script. Build skipped."
        return
      }

      Invoke-External -Title "npm run build" -File "npm" -Args @("run", "build")
    }
  } else {
    Write-Host ""
    Write-Host "==> Run frontend build when available"
    Write-Host "  skipped"
  }

  Invoke-Step -Title "Deploy to server" -Action {
    $deployArgs = @(
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      $syncScript,
      "-Server",
      $Server,
      "-RemoteRoot",
      $RemoteRoot,
      "-BackendServiceName",
      $BackendServiceName
    )

    if ($DryRun) { $deployArgs += "-DryRun" }
    if ($SkipPublic) { $deployArgs += "-SkipPublic" }
    if ($SkipBackend) { $deployArgs += "-SkipBackend" }
    if ($SkipNginx) { $deployArgs += "-SkipNginx" }
    if ($SkipManifestBuild) { $deployArgs += "-SkipManifestBuild" }
    if (-not $SkipInstallNginxConfig) { $deployArgs += "-InstallNginxConfig" }
    if (-not $SkipReloadNginx) { $deployArgs += "-ReloadNginx" }
    if (-not $SkipRestartApi) { $deployArgs += "-RestartApi" }

    & powershell @deployArgs
    if ($LASTEXITCODE -ne 0) {
      throw "Server deploy failed."
    }
  }

  if (-not $SkipVerify) {
    Invoke-Step -Title "Verify live endpoints" -Action {
      $checks = @(
        "http://endcosmos.com/",
        "https://endcosmos.com/",
        "https://www.endcosmos.com/",
        "http://endcosmos.com/zogs/",
        "http://endcosmos.com/assets/manifests/zogs-gallery.json",
        "http://endcosmos.com/healthz"
      )

      foreach ($url in $checks) {
        $result = Test-HttpEndpoint -Url $url
        if ($result.Ok) {
          Write-Host "  [$($result.Status)] $($result.Url)"
        } else {
          Write-Host "  [$($result.Status)] $($result.Url) -> $($result.Message)"
        }
      }

      if (-not $DryRun) {
        Write-Host "  -> Remote privileged error scan"
        & ssh -o BatchMode=yes -o ConnectTimeout=8 $Server "sudo -n nginx -t && sudo -n systemctl is-active nginx && sudo -n systemctl is-active '$BackendServiceName'"
        if ($LASTEXITCODE -ne 0) {
          throw "Remote error scan failed (nginx/api state)."
        }

        Write-Host "  -> Remote image permissions compliance check"
        $permCheckCmd = @"
set -e
IMAGE_PATH='$ImagePath'
EXPECTED_OWNER='$ImageOwner'
EXPECTED_GROUP='$ImageGroup'

[ -d "`$IMAGE_PATH" ] || { echo "IMAGE_PATH_MISSING:`$IMAGE_PATH"; exit 20; }

ACTUAL_OWNER="`$(stat -c '%U' "`$IMAGE_PATH")"
ACTUAL_GROUP="`$(stat -c '%G' "`$IMAGE_PATH")"
ACTUAL_MODE="`$(stat -c '%a' "`$IMAGE_PATH")"

if [ "`$ACTUAL_OWNER" != "`$EXPECTED_OWNER" ] || [ "`$ACTUAL_GROUP" != "`$EXPECTED_GROUP" ]; then
  echo "IMAGE_OWNER_GROUP_MISMATCH:`$ACTUAL_OWNER:`$ACTUAL_GROUP expected `$EXPECTED_OWNER:`$EXPECTED_GROUP"
  exit 21
fi

if [ "`$ACTUAL_MODE" != "755" ]; then
  echo "IMAGE_DIR_MODE_MISMATCH:`$ACTUAL_MODE expected 755"
  exit 22
fi

BAD_DIRS="`$(find "`$IMAGE_PATH" -type d ! -perm 755 | wc -l)"
BAD_FILES="`$(find "`$IMAGE_PATH" -type f ! -perm 644 | wc -l)"

if [ "`$BAD_DIRS" -ne 0 ] || [ "`$BAD_FILES" -ne 0 ]; then
  echo "IMAGE_TREE_MODE_MISMATCH:dirs=`$BAD_DIRS files=`$BAD_FILES"
  exit 23
fi

echo "IMAGE_PERMS_OK:`$IMAGE_PATH"
"@

        & ssh -o BatchMode=yes -o ConnectTimeout=8 $Server "sudo -n sh -lc '$($permCheckCmd -replace "'","'\''")'"
        if ($LASTEXITCODE -ne 0) {
          throw "Remote image permissions compliance check failed."
        }
      }
    }
  } else {
    Write-Host ""
    Write-Host "==> Verify live endpoints"
    Write-Host "  skipped"
  }

  Write-Host ""
  Write-Host "ENDCOSMOS DEPLOY COMPLETED."
}
finally {
  Pop-Location
}