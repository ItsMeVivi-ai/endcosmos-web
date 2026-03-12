<#
.SYNOPSIS
  Instala la clave publica SSH local en el servidor endcosmos.com (una sola vez).
  Despues de ejecutar esto, ya no necesitaras contraseña para deploy.

.EXAMPLE
  # Opcion A: introducir password cuando se pida
  .\scripts\setup-ssh-key.ps1

  # Opcion B: con variable de entorno
  $env:ENDCOSMOS_DEPLOY_PASSWORD = "tu_password_aqui"
  .\scripts\setup-ssh-key.ps1
#>

param(
  [string]$Server   = "212.227.107.3",
  [string]$User     = "vivi",
  [int]   $Port     = 22
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$pubKeyFile = "$env:USERPROFILE\.ssh\id_rsa.pub"
if (-not (Test-Path $pubKeyFile)) {
  $pubKeyFile = "$env:USERPROFILE\.ssh\id_ed25519.pub"
}
if (-not (Test-Path $pubKeyFile)) {
  throw "No se encontro clave publica en ~/.ssh/. Genera una con: ssh-keygen -t rsa"
}
$pubKey = (Get-Content $pubKeyFile -Raw).Trim()
Write-Host "Clave a instalar: $(Split-Path $pubKeyFile -Leaf)"
Write-Host "  $($pubKey.Substring(0, [Math]::Min(60, $pubKey.Length)))..."

# Obtener password
$password = $env:ENDCOSMOS_DEPLOY_PASSWORD
if (-not $password) {
  # Comprobar si estamos en sesion interactiva antes de usar Read-Host
  $isInteractive = [Environment]::UserInteractive -and -not [System.Console]::IsInputRedirected
  if ($isInteractive) {
    $securePass = Read-Host "Password SSH para $User@$Server" -AsSecureString
    $bstr       = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePass)
    $password   = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  } else {
    Write-Host ""
    Write-Host "ERROR: No se encontro la password SSH." -ForegroundColor Red
    Write-Host "Ejecuta en PowerShell interactivo:" -ForegroundColor Yellow
    Write-Host '  $env:ENDCOSMOS_DEPLOY_PASSWORD = "tu_password"' -ForegroundColor Cyan
    Write-Host "  .\scripts\setup-ssh-key.ps1" -ForegroundColor Cyan
    exit 1
  }
}

if (-not $password) { throw "Se requiere password." }

# Conectar via Posh-SSH
try { Import-Module Posh-SSH -ErrorAction Stop } catch {
  throw "Posh-SSH no esta instalado. Ejecuta: Install-Module Posh-SSH -Scope CurrentUser"
}

$secure     = ConvertTo-SecureString $password -AsPlainText -Force
$credential = [pscredential]::new($User, $secure)

Write-Host "`nConectando a $User@$Server via Posh-SSH..."
$session = New-SSHSession -ComputerName $Server -Port $Port -Credential $credential -AcceptKey -ConnectionTimeout 20
$id      = $session.SessionId

$escapedKey = $pubKey -replace "'", "'\''"
$cmd = "mkdir -p ~/.ssh && chmod 700 ~/.ssh && grep -qxF '$escapedKey' ~/.ssh/authorized_keys 2>/dev/null || echo '$escapedKey' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo CLAVE_OK"

Write-Host "Instalando clave..."
$result = Invoke-SSHCommand -SessionId $id -Command $cmd
$result.Output | ForEach-Object { Write-Host "  [servidor] $_" }

Remove-SSHSession -SessionId $id | Out-Null

# Verificar que ahora funciona con BatchMode
Write-Host "`nVerificando acceso SSH con clave (sin password)..."
Start-Sleep -Seconds 1
$test = & ssh -o BatchMode=yes -o ConnectTimeout=8 "$User@$Server" "echo CONEXION_OK" 2>&1
if ($LASTEXITCODE -eq 0) {
  Write-Host "[OK] SSH con clave funciona correctamente."
  Write-Host ""
  Write-Host "Ahora puedes ejecutar el deploy de imagenes:"
  Write-Host "  .\scripts\sync-zogs-images.ps1 -Server $User@$Server"
} else {
  Write-Host "[WARN] La clave puede haberse instalado pero la verificacion fallo."
  Write-Host "Salida: $test"
  Write-Host "Intenta manualmente: ssh $User@$Server"
}
