[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$Server,

  [Parameter(Mandatory = $true)]
  [string]$Username,

  [string]$RemoteRoot = "/var/www/endcosmos.com",
  [string]$BackendServiceName = "endcosmos-api",
  [string]$TarName = "endcosmos-sync.tar",
  [switch]$SkipNginxInstall,
  [switch]$SkipNginxReload,
  [switch]$SkipApiRestart
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $env:ENDCOSMOS_DEPLOY_PASSWORD) {
  throw "Missing ENDCOSMOS_DEPLOY_PASSWORD environment variable."
}

Import-Module Posh-SSH -ErrorAction Stop

Write-Host "Generating manifests..."
& python backend/scripts/generate_gallery_manifests.py
if ($LASTEXITCODE -ne 0) {
  throw "Manifest generation failed."
}

if (Test-Path $TarName) {
  Remove-Item $TarName -Force
}

Write-Host "Creating archive..."
& tar -cf $TarName `
  public `
  backend/app `
  backend/scripts `
  backend/sql `
  backend/requirements.txt `
  backend/README.md `
  backend/ENDCOSMOS_CORE.md `
  backend/.env.example `
  nginx
if ($LASTEXITCODE -ne 0) {
  throw "Tar creation failed."
}

$securePass = ConvertTo-SecureString $env:ENDCOSMOS_DEPLOY_PASSWORD -AsPlainText -Force
$credential = [pscredential]::new($Username, $securePass)

Write-Host "Uploading archive..."
$remoteTar = "/home/$Username/$TarName"
Set-SCPItem -ComputerName $Server -Credential $credential -Path $TarName -Destination "." -NewName $TarName -AcceptKey -ConnectionTimeout 20

Write-Host "Opening SSH session..."
$session = New-SSHSession -ComputerName $Server -Credential $credential -AcceptKey -ConnectionTimeout 20
$sessionId = $session.SessionId

try {

  $sudoPassword = $env:ENDCOSMOS_DEPLOY_PASSWORD
  $commands = New-Object System.Collections.Generic.List[string]
  $commands.Add("echo '$sudoPassword' | sudo -S -p '' mkdir -p '$RemoteRoot'")
  $commands.Add("echo '$sudoPassword' | sudo -S -p '' tar -xf '$remoteTar' -C '$RemoteRoot'")

  if (-not $SkipNginxInstall) {
    $commands.Add("echo '$sudoPassword' | sudo -S -p '' install -m 644 '$RemoteRoot/nginx/endcosmos.conf' /etc/nginx/sites-available/endcosmos.com")
    $commands.Add("echo '$sudoPassword' | sudo -S -p '' ln -sf /etc/nginx/sites-available/endcosmos.com /etc/nginx/sites-enabled/endcosmos.com")
  }

  if (-not $SkipNginxReload) {
    $commands.Add("echo '$sudoPassword' | sudo -S -p '' nginx -t")
    $commands.Add("echo '$sudoPassword' | sudo -S -p '' systemctl reload nginx")
  }

  if (-not $SkipApiRestart) {
    $commands.Add("echo '$sudoPassword' | sudo -S -p '' systemctl restart '$BackendServiceName'")
    $commands.Add("echo '$sudoPassword' | sudo -S -p '' systemctl is-active '$BackendServiceName'")
  }

  foreach ($cmd in $commands) {
    $result = Invoke-SSHCommand -SessionId $sessionId -Command $cmd -TimeOut 180
    if ($result.Output) {
      $result.Output | ForEach-Object { Write-Host $_ }
    }
    if ($result.ExitStatus -ne 0) {
      throw "Remote command failed (exit $($result.ExitStatus)): $cmd"
    }
  }
}
finally {
  Remove-SSHSession -SessionId $sessionId | Out-Null
  $env:ENDCOSMOS_DEPLOY_PASSWORD = $null
}

Write-Host "Local endpoint checks..."
$urls = @(
  "https://endcosmos.com/",
  "https://endcosmos.com/zogs/",
  "https://endcosmos.com/assets/manifests/zogs-gallery.json",
  "https://endcosmos.com/healthz"
)

foreach ($url in $urls) {
  try {
    $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 20
    Write-Host "$url => HTTP $($resp.StatusCode)"
  }
  catch {
    Write-Host "$url => ERROR $($_.Exception.Message)"
  }
}

Write-Host "Deploy finished."
