[CmdletBinding()]
param(
  [ValidateSet("start", "stop", "restart", "status", "validate", "deploy", "all")]
  [string]$Action = "status",

  [string]$ApiHost = "127.0.0.1",
  [int]$ApiPort = 8000,
  [int]$WebPort = 5500,

  [string]$Server = "vivi@212.227.107.3",
  [string]$RemoteRoot = "/var/www/endcosmos.com",
  [string]$BackendServiceName = "endcosmos-api",

  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$runtimeDir = Join-Path $repoRoot ".runtime"
$apiPidFile = Join-Path $runtimeDir "api.pid"
$webPidFile = Join-Path $runtimeDir "web.pid"
$apiLog = Join-Path $runtimeDir "api.log"
$webLog = Join-Path $runtimeDir "web.log"

function Initialize-RuntimeDir {
  if (-not (Test-Path $runtimeDir)) {
    New-Item -Path $runtimeDir -ItemType Directory | Out-Null
  }
}

function Test-Http {
  param([Parameter(Mandatory = $true)][string]$Url)
  try {
    $res = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 4
    return [pscustomobject]@{ Url = $Url; Ok = $true; Status = $res.StatusCode }
  } catch {
    return [pscustomobject]@{ Url = $Url; Ok = $false; Status = "ERR" }
  }
}

function Read-ServicePid {
  param([Parameter(Mandatory = $true)][string]$PidFile)
  if (-not (Test-Path $PidFile)) { return $null }
  $raw = (Get-Content $PidFile -Raw).Trim()
  if ([string]::IsNullOrWhiteSpace($raw)) { return $null }
  $servicePid = 0
  if (-not [int]::TryParse($raw, [ref]$servicePid)) { return $null }
  return $servicePid
}

function Test-ServiceRunning {
  param([int]$ServicePid)
  if (-not $ServicePid) { return $false }
  try {
    $null = Get-Process -Id $ServicePid -ErrorAction Stop
    return $true
  } catch {
    return $false
  }
}

function Start-Api {
  Initialize-RuntimeDir
  $existing = Read-ServicePid -PidFile $apiPidFile
  if ($existing -and (Test-ServiceRunning -ServicePid $existing)) {
    Write-Host "API already running (PID $existing)."
    return
  }

  if ($DryRun) {
    Write-Host "[dry-run] Start API: uvicorn app.main:app --reload --host $ApiHost --port $ApiPort"
    return
  }

  $apiCwd = Join-Path $repoRoot "backend"
  $process = Start-Process -FilePath "python" -ArgumentList @("-m", "uvicorn", "app.main:app", "--reload", "--host", $ApiHost, "--port", "$ApiPort") -WorkingDirectory $apiCwd -RedirectStandardOutput $apiLog -RedirectStandardError $apiLog -WindowStyle Hidden -PassThru
  Set-Content -Path $apiPidFile -Value $process.Id
  Write-Host "API started (PID $($process.Id))."
}

function Start-Web {
  Initialize-RuntimeDir
  $existing = Read-ServicePid -PidFile $webPidFile
  if ($existing -and (Test-ServiceRunning -ServicePid $existing)) {
    Write-Host "Web server already running (PID $existing)."
    return
  }

  if ($DryRun) {
    Write-Host "[dry-run] Start static web: python -m http.server $WebPort --directory public"
    return
  }

  $process = Start-Process -FilePath "python" -ArgumentList @("-m", "http.server", "$WebPort", "--directory", "public") -WorkingDirectory $repoRoot -RedirectStandardOutput $webLog -RedirectStandardError $webLog -WindowStyle Hidden -PassThru
  Set-Content -Path $webPidFile -Value $process.Id
  Write-Host "Web server started (PID $($process.Id))."
}

function Stop-ServiceByPid {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$PidFile
  )

  $servicePid = Read-ServicePid -PidFile $PidFile
  if (-not $servicePid) {
    Write-Host "$Name not running (no PID file)."
    return
  }

  if (-not (Test-ServiceRunning -ServicePid $servicePid)) {
    Remove-Item -Path $PidFile -ErrorAction SilentlyContinue
    Write-Host "$Name already stopped (stale PID cleaned)."
    return
  }

  if ($DryRun) {
    Write-Host "[dry-run] Stop $Name PID $servicePid"
    return
  }

  Stop-Process -Id $servicePid -Force
  Remove-Item -Path $PidFile -ErrorAction SilentlyContinue
  Write-Host "$Name stopped (PID $servicePid)."
}

function Invoke-ValidationPipeline {
  Write-Host "Running validation pipeline..."
  if ($DryRun) {
    Write-Host "[dry-run] python backend/scripts/generate_gallery_manifests.py"
    Write-Host "[dry-run] python -m py_compile backend/app/main.py backend/app/auth.py backend/app/routes/world.py backend/app/routes/admin.py backend/app/internal_world_db.py backend/scripts/generate_gallery_manifests.py"
    Write-Host "[dry-run] node --check public/js/app.js"
    Write-Host "[dry-run] node --check public/js/motion-gallery.js"
    Write-Host "[dry-run] node --check public/js/zogs-gallery.js"
    Write-Host "[dry-run] node --check public/js/register.js"
    Write-Host "[dry-run] node --check public/js/classes.js"
    Write-Host "[dry-run] node --check public/js/cosmos-dynamic-clock.js"
    Write-Host "[dry-run] node --check public/js/world-core.js"
    return
  }

  Push-Location $repoRoot
  try {
    & python backend/scripts/generate_gallery_manifests.py
    if ($LASTEXITCODE -ne 0) { throw "Manifest generation failed." }

    & python -m py_compile backend/app/main.py backend/app/auth.py backend/app/routes/world.py backend/app/routes/admin.py backend/app/internal_world_db.py backend/app/routes/ai.py backend/scripts/generate_gallery_manifests.py
    if ($LASTEXITCODE -ne 0) { throw "Backend syntax validation failed." }

    $frontendScripts = @(
      "public/js/app.js",
      "public/js/motion-gallery.js",
      "public/js/zogs-gallery.js",
      "public/js/register.js",
      "public/js/classes.js",
      "public/js/cosmos-dynamic-clock.js",
      "public/js/world-core.js"
    )

    foreach ($script in $frontendScripts) {
      & node --check $script
      if ($LASTEXITCODE -ne 0) { throw "Frontend syntax validation failed for $script" }
    }
  }
  finally {
    Pop-Location
  }

  Write-Host "Validation completed."
}

function Deploy-All {
  $deployScript = Join-Path $PSScriptRoot "ec-deploy.ps1"
  if (-not (Test-Path $deployScript)) {
    throw "Deploy script not found: $deployScript"
  }

  if ($DryRun) {
    Write-Host "[dry-run] powershell -NoProfile -ExecutionPolicy Bypass -File scripts/ec-deploy.ps1 -Server $Server -RemoteRoot $RemoteRoot -BackendServiceName $BackendServiceName"
    return
  }

  & powershell -NoProfile -ExecutionPolicy Bypass -File $deployScript -Server $Server -RemoteRoot $RemoteRoot -BackendServiceName $BackendServiceName
  if ($LASTEXITCODE -ne 0) {
    throw "Deploy failed."
  }

  Write-Host "Deploy completed."
}

function Show-Status {
  $apiPid = Read-ServicePid -PidFile $apiPidFile
  $webPid = Read-ServicePid -PidFile $webPidFile

  $apiRunning = $apiPid -and (Test-ServiceRunning -ServicePid $apiPid)
  $webRunning = $webPid -and (Test-ServiceRunning -ServicePid $webPid)

  Write-Host "API process: " -NoNewline
  if ($apiRunning) { Write-Host "UP (PID $apiPid)" -ForegroundColor Green } else { Write-Host "DOWN" -ForegroundColor Yellow }

  Write-Host "WEB process: " -NoNewline
  if ($webRunning) { Write-Host "UP (PID $webPid)" -ForegroundColor Green } else { Write-Host "DOWN" -ForegroundColor Yellow }

  $apiCheck = Test-Http -Url "http://$ApiHost`:$ApiPort/health"
  $webCheck = Test-Http -Url "http://127.0.0.1:$WebPort/"

  Write-Host "API health endpoint: $($apiCheck.Status) -> $($apiCheck.Url)"
  Write-Host "WEB endpoint: $($webCheck.Status) -> $($webCheck.Url)"
}

Push-Location $repoRoot
try {
  switch ($Action) {
    "start" {
      Start-Api
      Start-Web
      Show-Status
    }
    "stop" {
      Stop-ServiceByPid -Name "API" -PidFile $apiPidFile
      Stop-ServiceByPid -Name "WEB" -PidFile $webPidFile
      Show-Status
    }
    "restart" {
      Stop-ServiceByPid -Name "API" -PidFile $apiPidFile
      Stop-ServiceByPid -Name "WEB" -PidFile $webPidFile
      Start-Api
      Start-Web
      Show-Status
    }
    "status" {
      Show-Status
    }
    "validate" {
      Invoke-ValidationPipeline
    }
    "deploy" {
      Invoke-ValidationPipeline
      Deploy-All
    }
    "all" {
      Invoke-ValidationPipeline
      Stop-ServiceByPid -Name "API" -PidFile $apiPidFile
      Stop-ServiceByPid -Name "WEB" -PidFile $webPidFile
      Start-Api
      Start-Web
      Show-Status
    }
  }
}
finally {
  Pop-Location
}
