$pyPath = "C:\Users\admin\AppData\Local\Programs\Python\Python312\python.exe"
if (-not (Test-Path $pyPath)) {
    $pyPath = "python.exe"
}

# 1. Ensure Python Backend is running on port 8000
$conn = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if (-not $conn) {
    Write-Host "[*] Starting Python backend server on port 8000..." -ForegroundColor Yellow
    Start-Process -FilePath $pyPath -ArgumentList "-m uvicorn server:app --host 127.0.0.1 --port 8000" -WorkingDirectory "$PSScriptRoot\backend" -WindowStyle Hidden
    Start-Sleep -Seconds 4
} else {
    Write-Host "[*] Python backend server is already running on port 8000." -ForegroundColor Green
}

# 2. Start Cloudflare Tunnel
Write-Host "[*] Connecting Cloudflare Tunnel to the internet..." -ForegroundColor Cyan
$cfProcess = Start-Process -FilePath "$PSScriptRoot\cloudflared.exe" -ArgumentList "tunnel --url http://127.0.0.1:8000" -PassThru -NoNewWindow

$url = ""
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 1
    try {
        $ports = @(20241, 20242, 20243, 20244, 20245)
        foreach ($p in $ports) {
            $resp = Invoke-RestMethod -Uri "http://127.0.0.1:$p/quicktunnel" -ErrorAction SilentlyContinue -TimeoutSec 1
            if ($resp -and $resp.hostname) {
                $url = "https://" + $resp.hostname
                break
            }
        }
        if ($url) { break }
    } catch {}
}

if ($url) {
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Green
    Write-Host "  SUCCESS! YOUR APP IS LIVE ONLINE AT:" -ForegroundColor Yellow
    Write-Host "  $url" -ForegroundColor Cyan
    Write-Host "================================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Opening in your browser..." -ForegroundColor Gray
    Start-Process $url
    Write-Host ""
    Write-Host ">>> IMPORTANT: MINIMIZE this window (do NOT close it) to keep the website online! <<<" -ForegroundColor Red
    Write-Host ""
} else {
    Write-Host "Tunnel started. Scroll up in the logs above to see your trycloudflare.com URL." -ForegroundColor Yellow
}

$cfProcess.WaitForExit()
