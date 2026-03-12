<#
.SYNOPSIS
  Sincroniza las imagenes ZOGS desde el equipo local al servidor endcosmos.com.

.DESCRIPTION
  1. Copia imagenes nuevas de C:\Users\Vivi\OneDrive\COSMOS\ZOGS al workspace local.
  2. Regenera los manifiestos de galeria.
  3. Sube public/assets/zogs/ y los manifiestos al servidor via SSH (tar-over-ssh).

  REQUISITO: Autenticacion SSH funcionando.
  - Con clave:     ssh-keyscan / ssh-copy-id ya debe estar hecho.
  - Con password:  Establece $env:ENDCOSMOS_DEPLOY_PASSWORD antes de ejecutar.

.EXAMPLE
  # Solo sincronizar local (sin subir al servidor):
  .\scripts\sync-zogs-images.ps1 -LocalOnly

  # Sincronizar y desplegar (clave SSH ya configurada):
  .\scripts\sync-zogs-images.ps1 -Server vivi@212.227.107.3

  # Sincronizar y desplegar con password:
  $env:ENDCOSMOS_DEPLOY_PASSWORD = "tu_password"
  .\scripts\sync-zogs-images.ps1 -Server vivi@212.227.107.3 -UsePassword

  # Solo instalar clave publica en el servidor (una sola vez):
  $env:ENDCOSMOS_DEPLOY_PASSWORD = "tu_password"
  .\scripts\sync-zogs-images.ps1 -InstallPubKey -Server vivi@212.227.107.3
#>

[CmdletBinding()]
param(
  [string]$Server            = "vivi@212.227.107.3",
  [string]$RemoteRoot        = "/var/www/endcosmos.com",
  [string]$ZogsSource        = "C:\Users\Vivi\OneDrive\COSMOS\ZOGS",
  [string]$WorkspaceRoot     = "$PSScriptRoot\..",
  [switch]$LocalOnly,
  [switch]$UsePassword,
  [switch]$InstallPubKey,
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$WorkspaceRoot = Resolve-Path $WorkspaceRoot
$assetsZogs    = Join-Path $WorkspaceRoot "public\assets\zogs"
$assetsInbox   = Join-Path $assetsZogs "inbox"

# ──────────────────────────────────────────────────────────────────────────────
# PASO 1: Instalar clave publica (una sola vez, requiere password)
# ──────────────────────────────────────────────────────────────────────────────
if ($InstallPubKey) {
  Write-Host "`n[SETUP] Instalando clave publica SSH en el servidor..."
  $pubKeyFile = "$env:USERPROFILE\.ssh\id_rsa.pub"
  if (-not (Test-Path $pubKeyFile)) {
    $pubKeyFile = "$env:USERPROFILE\.ssh\id_ed25519.pub"
  }
  if (-not (Test-Path $pubKeyFile)) {
    throw "No se encontro clave publica en ~/.ssh/. Ejecuta ssh-keygen primero."
  }
  $pubKey = Get-Content $pubKeyFile -Raw

  if (-not $env:ENDCOSMOS_DEPLOY_PASSWORD) {
    throw "Establece `$env:ENDCOSMOS_DEPLOY_PASSWORD con la password del servidor."
  }

  # Usar sshpass si esta disponible
  $sshpass = Get-Command sshpass -ErrorAction SilentlyContinue
  if ($sshpass) {
    $cmd = "mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '$pubKey' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo CLAVE_INSTALADA"
    if ($DryRun) {
      Write-Host "[dry-run] sshpass -p *** ssh $Server '$cmd'"
    } else {
      $env:SSHPASS = $env:ENDCOSMOS_DEPLOY_PASSWORD
      sshpass -e ssh -o StrictHostKeyChecking=no $Server $cmd
    }
  } else {
    # Si no hay sshpass, usar Posh-SSH
    try {
      Import-Module Posh-SSH -ErrorAction Stop
    } catch {
      Write-Host "ADVERTENCIA: ni sshpass ni Posh-SSH disponibles."
      Write-Host "Para instalar la clave manualmente, copia este contenido en el servidor:"
      Write-Host ""
      Write-Host "  ~/.ssh/authorized_keys:"
      Get-Content $pubKeyFile
      Write-Host ""
      Write-Host "O ejecuta en el servidor:"
      Write-Host "  mkdir -p ~/.ssh && echo '$(Get-Content $pubKeyFile)' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
      return
    }
    $secure      = ConvertTo-SecureString $env:ENDCOSMOS_DEPLOY_PASSWORD -AsPlainText -Force
    $credential  = [pscredential]::new(($Server -split "@")[0], $secure)
    $hostOnly    = ($Server -split "@")[-1]
    $session     = New-SSHSession -ComputerName $hostOnly -Credential $credential -AcceptKey -ConnectionTimeout 20
    $cmd         = "mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '$(Get-Content $pubKeyFile)' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo CLAVE_INSTALADA"
    if (-not $DryRun) {
      Invoke-SSHCommand -SessionId $session.SessionId -Command $cmd | Select-Object -ExpandProperty Output
      Remove-SSHSession -SessionId $session.SessionId | Out-Null
    } else {
      Write-Host "[dry-run] Posh-SSH: $cmd"
      Remove-SSHSession -SessionId $session.SessionId | Out-Null
    }
  }
  Write-Host "[OK] Clave publica instalada. Ahora puedes ejecutar el script sin -InstallPubKey."
  return
}

# ──────────────────────────────────────────────────────────────────────────────
# PASO 2: Sincronizar imagenes ZOGS → workspace local
# ──────────────────────────────────────────────────────────────────────────────
Write-Host "`n[1/3] Sincronizando imagenes de ZOGS al workspace local..."

$mappings = @(
  @{ Src = "$ZogsSource\Imagenes V1";                    Dst = "$assetsInbox\v1" }
  @{ Src = "$ZogsSource\Imagenes V2";                    Dst = "$assetsInbox\v2" }
  @{ Src = "$ZogsSource\Imagenes V2\endcosmos_images";   Dst = "$assetsInbox\v2" }
  @{ Src = "$ZogsSource\_catalog";                       Dst = "$assetsInbox\catalog" }
)

$copied = 0
foreach ($map in $mappings) {
  if (-not (Test-Path $map.Src)) {
    Write-Host "  ADVERTENCIA: No encontrado: $($map.Src)"
    continue
  }
  $dstFiles = if (Test-Path $map.Dst) {
    (Get-ChildItem $map.Dst -File).Name
  } else {
    @()
  }
  $newFiles = Get-ChildItem $map.Src -File |
    Where-Object { $_.Extension -in ".png",".jpg",".jpeg",".webp",".avif" -and $_.Name -notin $dstFiles }
  foreach ($f in $newFiles) {
    if ($DryRun) {
      Write-Host "  [dry-run] Copiar: $($f.Name) --> $($map.Dst)"
    } else {
      New-Item -ItemType Directory -Force -Path $map.Dst | Out-Null
      Copy-Item $f.FullName -Destination $map.Dst
    }
    $copied++
  }
}

Write-Host "  Imagenes nuevas copiadas: $copied"

# ──────────────────────────────────────────────────────────────────────────────
# PASO 3: Normalizar assets + clasificar + regenerar manifiestos
# ──────────────────────────────────────────────────────────────────────────────
Write-Host "`n[2/3] Procesando pipeline de assets (nombres, categorias, duplicados, galerias)..."
$pyExe = @(
  "$WorkspaceRoot\.venv\Scripts\python.exe",
  "python"
) | Where-Object { Get-Command $_ -ErrorAction SilentlyContinue } | Select-Object -First 1

if (-not $pyExe) { throw "Python no encontrado." }

if ($DryRun) {
  Write-Host "  [dry-run] $pyExe backend/scripts/asset_ingest_pipeline.py --source public/assets/zogs/inbox --dry-run"
} else {
  Push-Location $WorkspaceRoot
  try { & $pyExe backend/scripts/asset_ingest_pipeline.py --source public/assets/zogs/inbox } finally { Pop-Location }
  if ($LASTEXITCODE -ne 0) { throw "Error en el pipeline de assets." }
  Write-Host "  Pipeline de assets ejecutado y galerias actualizadas."
}

# ──────────────────────────────────────────────────────────────────────────────
# PASO 4: Subir al servidor via SSH
# ──────────────────────────────────────────────────────────────────────────────
if ($LocalOnly) {
  Write-Host "`n[3/3] Modo -LocalOnly: saltando deploy SSH."
  Write-Host "`nSINCRONIZACION LOCAL COMPLETADA."
  return
}

Write-Host "`n[3/3] Subiendo imagenes al servidor ($Server)..."

$sshArgs = @("-o", "ConnectTimeout=12", "-o", "StrictHostKeyChecking=no")

if ($UsePassword -and $env:ENDCOSMOS_DEPLOY_PASSWORD) {
  $sshpass = Get-Command sshpass -ErrorAction SilentlyContinue
  if (-not $sshpass) {
    Write-Host "ADVERTENCIA: sshpass no encontrado. Intentando Posh-SSH..."
    try {
      Import-Module Posh-SSH -ErrorAction Stop
      $secure     = ConvertTo-SecureString $env:ENDCOSMOS_DEPLOY_PASSWORD -AsPlainText -Force
      $user       = ($Server -split "@")[0]
      $hostOnly   = ($Server -split "@")[-1]
      $credential = [pscredential]::new($user, $secure)
      $session    = New-SSHSession -ComputerName $hostOnly -Credential $credential -AcceptKey
      Write-Host "  Conectado via Posh-SSH. Transfiriendo archivos..."

      # Subir via SCP
      foreach ($folder in @("public\assets\zogs", "public\assets\manifests")) {
        $localPath  = Join-Path $WorkspaceRoot $folder
        $remotePath = "$RemoteRoot/$(($folder -replace '\\','/'))"
        if ($DryRun) {
          Write-Host "  [dry-run] SCP: $localPath --> $remotePath"
        } else {
          Set-SCPFolder -ComputerName $hostOnly -Credential $credential -Path $localPath -Destination $remotePath -AcceptKey
          Write-Host "  Subido: $folder"
        }
      }
      Remove-SSHSession -SessionId $session.SessionId | Out-Null
    } catch {
      Write-Error "No se pudo conectar con Posh-SSH: $_"
      Write-Host "`nPara instalar Posh-SSH: Install-Module Posh-SSH -Scope CurrentUser"
      Write-Host "O ejecuta el script una vez con -InstallPubKey para agregar la clave al servidor."
      exit 1
    }
    Write-Host "`nDEPLOY COMPLETADO."
    return
  }
}

# Subir con tar-over-SSH (clave configurada o sshpass)
Push-Location $WorkspaceRoot
try {
  $folders = "public/assets/zogs", "public/assets/manifests"
  if ($DryRun) {
    Write-Host "  [dry-run] tar -cf - $($folders -join ' ') | ssh $Server 'cd $RemoteRoot && tar -xf - --no-same-permissions --no-same-owner'"
  } else {
    & tar -cf - @folders | ssh @sshArgs $Server "cd '$RemoteRoot' && tar -xf - --no-same-permissions --no-same-owner 2>/dev/null; true"
    if ($LASTEXITCODE -ne 0) { throw "Error en tar-over-SSH." }
  }
} finally {
  Pop-Location
}

Write-Host "`nDEPLOY COMPLETADO."
