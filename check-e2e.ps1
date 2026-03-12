param(
    [string]$ServerIp = "212.227.107.3",
    [string]$SshUser = "vivi",
    [int]$SshPort = 22,
    [int]$DbPort = 3306,
    [string]$PublicHealthUrl = "https://endcosmos.com/healthz",
    [string]$PublicZogsUrl = "https://endcosmos.com/zogs/",
    [switch]$UsePasswordAuth
)

$ErrorActionPreference = "Continue"

function Write-Section([string]$title) {
    Write-Host ""
    Write-Host "==== $title ====" -ForegroundColor Cyan
}

function Write-Ok([string]$msg) {
    Write-Host "[OK] $msg" -ForegroundColor Green
}

function Write-WarnMsg([string]$msg) {
    Write-Host "[WARN] $msg" -ForegroundColor Yellow
}

function Write-Fail([string]$msg) {
    Write-Host "[FAIL] $msg" -ForegroundColor Red
}

$sshTarget = "$SshUser@$ServerIp"

Write-Host "ENDCOSMOS E2E CHECK" -ForegroundColor Magenta
Write-Host "Target: $sshTarget"

Write-Section "Windows -> Debian network"
$sshNet = Test-NetConnection $ServerIp -Port $SshPort -WarningAction SilentlyContinue
if ($sshNet.TcpTestSucceeded) {
    Write-Ok "TCP $SshPort reachable"
} else {
    Write-Fail "TCP $SshPort not reachable"
}

$dbNet = Test-NetConnection $ServerIp -Port $DbPort -WarningAction SilentlyContinue
if ($dbNet.TcpTestSucceeded) {
    Write-Ok "TCP $DbPort reachable from Windows"
} else {
    Write-WarnMsg "TCP $DbPort not reachable from Windows (normal if DB is private)"
}

Write-Section "Windows -> Debian SSH"
$batchRemote = @'
printf OK_SSH_BATCH
printf "\n"
whoami
hostname
'@
$batchOut = & ssh -o BatchMode=yes -o ConnectTimeout=8 $sshTarget $batchRemote 2>&1
$batchText = ($batchOut | Out-String)

if ($LASTEXITCODE -eq 0 -and $batchText -match "OK_SSH_BATCH") {
    Write-Ok "SSH non-interactive auth works (key-based)"
} else {
    Write-WarnMsg "SSH non-interactive auth failed (password/key prompt required)"
    if ($UsePasswordAuth) {
        Write-Host "Running interactive SSH test (you may be prompted for password)..."
        $interactiveRemote = @'
printf OK_SSH
printf "\n"
whoami
hostname
date
'@
        $interactiveOut = & ssh -o ConnectTimeout=12 $sshTarget $interactiveRemote 2>&1
        $interactiveText = ($interactiveOut | Out-String)
        if ($LASTEXITCODE -eq 0 -and $interactiveText -match "OK_SSH") {
            Write-Ok "SSH interactive auth works"
        } else {
            Write-Fail "SSH interactive auth failed"
            Write-Host $interactiveText
        }
    } else {
        Write-Host "Tip: rerun with -UsePasswordAuth to validate interactive password login."
    }
}

Write-Section "Debian -> DB/service"
if ($LASTEXITCODE -eq 0 -or $UsePasswordAuth) {
        $remoteProbe = @'
set -e
printf DB_PORT_LISTEN:
printf "\n"
if command -v ss >/dev/null; then
    ss -lnt | grep -E :3306 || printf not-listening
else
    netstat -lnt 2>/dev/null | grep -E :3306 || printf not-listening
fi
printf "\n"
printf DB_SERVICE:
printf "\n"
systemctl is-active mariadb 2>/dev/null || systemctl is-active mysql 2>/dev/null || printf unknown
printf "\n"
'@
    $remoteOut = & ssh -o ConnectTimeout=10 $sshTarget $remoteProbe 2>&1
    $remoteText = ($remoteOut | Out-String)

    if ($LASTEXITCODE -eq 0) {
        Write-Ok "Remote DB probe executed"
        Write-Host $remoteText
    } else {
        Write-WarnMsg "Could not run remote DB probe automatically"
        Write-Host $remoteText
    }
} else {
    Write-WarnMsg "Skipping remote DB probe because SSH test did not establish a usable session"
}

Write-Section "Public health endpoint"
try {
    $resp = Invoke-WebRequest -Uri $PublicHealthUrl -UseBasicParsing -TimeoutSec 10
    if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 400) {
        Write-Ok "Health URL reachable: $PublicHealthUrl (HTTP $($resp.StatusCode))"
    } else {
        Write-WarnMsg "Health URL responded with HTTP $($resp.StatusCode)"
    }
} catch {
    Write-WarnMsg "Health URL check failed: $($_.Exception.Message)"
}

Write-Section "Public gallery endpoint"
try {
    $zogsResp = Invoke-WebRequest -Uri $PublicZogsUrl -UseBasicParsing -TimeoutSec 10
    if ($zogsResp.StatusCode -ge 200 -and $zogsResp.StatusCode -lt 400) {
        Write-Ok "Gallery URL reachable: $PublicZogsUrl (HTTP $($zogsResp.StatusCode))"
    } else {
        Write-WarnMsg "Gallery URL responded with HTTP $($zogsResp.StatusCode)"
    }
} catch {
    Write-WarnMsg "Gallery URL check failed: $($_.Exception.Message)"
}

Write-Section "Summary"
Write-Host "Completed checks."
Write-Host "- If SSH batch auth fails, configure key auth for unattended deploy/scp."
Write-Host "- If DB 3306 is closed from Windows, keep DB private and use Debian-local access."
Write-Host "- Run: .\\check-e2e.ps1 -UsePasswordAuth  (for full interactive validation)."
