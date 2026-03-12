[CmdletBinding()]
param(
  [string]$Message = "",
  [switch]$ValidateOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-External {
  param(
    [Parameter(Mandatory = $true)][string]$Title,
    [Parameter(Mandatory = $true)][string]$File,
    [Parameter(Mandatory = $false)][string[]]$Args = @()
  )

  Write-Host "==> $Title"
  & $File @Args
  if ($LASTEXITCODE -ne 0) {
    throw "Step failed: $Title"
  }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $repoRoot
try {
  Invoke-External -Title "Validate live production standard" -File "powershell" -Args @(
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    "scripts/validate-live-production.ps1"
  )

  if ($ValidateOnly) {
    Write-Host "Validation-only mode completed."
    exit 0
  }

  Invoke-External -Title "Stage all changes" -File "git" -Args @("add", "-A")

  $stagedFiles = git diff --cached --name-only
  if (-not $stagedFiles) {
    Write-Host "No staged changes detected. Commit skipped."
    exit 0
  }

  if ([string]::IsNullOrWhiteSpace($Message)) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    $Message = "chore: validated web update $timestamp"
  }

  Invoke-External -Title "Create commit" -File "git" -Args @("commit", "-m", $Message)
  Write-Host "Commit created successfully."
}
finally {
  Pop-Location
}
