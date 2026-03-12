[CmdletBinding()]
param()

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

function Read-Json {
  param([Parameter(Mandatory = $true)][string]$Path)

  if (-not (Test-Path $Path)) {
    throw "Missing required file: $Path"
  }

  $raw = Get-Content -Path $Path -Raw -Encoding UTF8
  if ([string]::IsNullOrWhiteSpace($raw)) {
    throw "JSON file is empty: $Path"
  }

  return $raw | ConvertFrom-Json
}

function Assert-True {
  param(
    [Parameter(Mandatory = $true)][bool]$Condition,
    [Parameter(Mandatory = $true)][string]$Message
  )

  if (-not $Condition) {
    throw $Message
  }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $repoRoot
try {
  Invoke-External -Title "Generate gallery manifests" -File "python" -Args @(
    "backend/scripts/generate_gallery_manifests.py"
  )

  Invoke-External -Title "Validate backend syntax" -File "python" -Args @(
    "-m",
    "py_compile",
    "backend/app/main.py",
    "backend/app/auth.py",
    "backend/app/cosmos_core.py",
    "backend/app/routes/cosmos.py",
    "backend/scripts/generate_gallery_manifests.py",
    "backend/scripts/build_map1_structural_system.py"
  )

  $frontendScripts = @(
    "public/js/app.js",
    "public/js/motion-gallery.js",
    "public/js/zogs-gallery.js",
    "public/js/mega-gallery.js",
    "public/js/mapas-core.js",
    "public/js/worlds-router.js",
    "public/js/infinite-worlds.js",
    "public/js/universe.js",
    "public/js/news-dynamic.js",
    "public/js/admin/dev.js"
  )

  foreach ($scriptPath in $frontendScripts) {
    Invoke-External -Title "Validate frontend script: $scriptPath" -File "node" -Args @(
      "--check",
      $scriptPath
    )
  }

  $manifestsDir = "public/assets/manifests"
  $homeManifestPath = Join-Path $manifestsDir "home-gallery.json"
  $zogsManifestPath = Join-Path $manifestsDir "zogs-gallery.json"
  $packagesManifestPath = Join-Path $manifestsDir "image-data-packages.json"
  $worldSystemsPath = Join-Path $manifestsDir "world-systems.json"
  $workspaceManifestPath = Join-Path $manifestsDir "endcosmos-images-workspace.json"

  $homeManifest = Read-Json -Path $homeManifestPath
  $zogsManifest = Read-Json -Path $zogsManifestPath
  $packagesManifest = Read-Json -Path $packagesManifestPath
  $worldSystems = Read-Json -Path $worldSystemsPath
  $workspaceManifest = Read-Json -Path $workspaceManifestPath

  Assert-True -Condition ($homeManifest.slides.Count -gt 0) -Message "home-gallery.json must contain slides"
  Assert-True -Condition ($zogsManifest.sections.Count -gt 0) -Message "zogs-gallery.json must contain sections"
  Assert-True -Condition (-not [string]::IsNullOrWhiteSpace([string]$zogsManifest.base_image.src)) -Message "zogs-gallery.json must define base_image.src"

  Assert-True -Condition ($packagesManifest.total_packages -gt 0) -Message "image-data-packages.json must contain packages"
  Assert-True -Condition ($packagesManifest.total_images -gt 0) -Message "image-data-packages.json must contain images"

  $packageItemsCount = ($packagesManifest.packages | ForEach-Object { $_.items.Count } | Measure-Object -Sum).Sum
  Assert-True -Condition ($packageItemsCount -ge 1) -Message "image-data-packages.json packages must contain items"

  Assert-True -Condition ($worldSystems.systems.Count -gt 0) -Message "world-systems.json must contain systems"
  Assert-True -Condition ($workspaceManifest.images.Count -gt 0) -Message "endcosmos-images-workspace.json must contain images"

  $workspaceImages = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
  foreach ($workspacePath in $workspaceManifest.images) {
    if ($workspacePath -is [string] -and -not [string]::IsNullOrWhiteSpace($workspacePath)) {
      [void]$workspaceImages.Add($workspacePath)
    }
  }

  $homeHasWorkspaceMatch = $false
  foreach ($slide in $homeManifest.slides) {
    if ($slide.src -is [string] -and $workspaceImages.Contains($slide.src)) {
      $homeHasWorkspaceMatch = $true
      break
    }
  }
  Assert-True -Condition $homeHasWorkspaceMatch -Message "home-gallery.json must overlap with endcosmos-images-workspace.json"

  $zogsHasWorkspaceMatch = $false
  foreach ($section in $zogsManifest.sections) {
    foreach ($item in $section.items) {
      if ($item.src -is [string] -and $workspaceImages.Contains($item.src)) {
        $zogsHasWorkspaceMatch = $true
        break
      }
    }
    if ($zogsHasWorkspaceMatch) { break }
  }
  Assert-True -Condition $zogsHasWorkspaceMatch -Message "zogs-gallery.json must overlap with endcosmos-images-workspace.json"

  Write-Host "LIVE_PRODUCTION_VALIDATION_OK"
}
finally {
  Pop-Location
}
