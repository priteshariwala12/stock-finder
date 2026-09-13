$token = 'nfp_td4LL2xkjyC4aXXvWm2DiXJ9QaxaE5Zad54e'
$siteId = 'cceb2a59-62b1-42e8-8123-0565c66df61a'
$zipPath = "$PSScriptRoot\netlify_deploy.zip"

Write-Host "Reading zip file $zipPath..."
$zipBytes = [System.IO.File]::ReadAllBytes($zipPath)
Write-Host "Zip size: $($zipBytes.Length) bytes"

$headers = @{
    'Authorization' = "Bearer $token"
}

Write-Host "Deploying to Netlify site stockfinderind ($siteId)..."
try {
    $resp = Invoke-RestMethod -Uri "https://api.netlify.com/api/v1/sites/$siteId/deploys" -Method Post -ContentType "application/zip" -Headers $headers -Body $zipBytes -TimeoutSec 60
    Write-Host "SUCCESS! Deploy created." -ForegroundColor Green
    Write-Host "Deploy ID: $($resp.id)"
    Write-Host "State: $($resp.state)"
    Write-Host "Deploy URL: $($resp.deploy_ssl_url)"
    Write-Host "Live Site URL: $($resp.ssl_url)"
} catch {
    Write-Host "Error during deploy: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host "Response Body: $($reader.ReadToEnd())"
    }
}
