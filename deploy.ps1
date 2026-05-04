$deployHost = $env:DEPLOY_HOST
$deployUser = $env:DEPLOY_USER
$deployPath = $env:DEPLOY_PATH
$pm2AppName = $env:PM2_APP_NAME

if (-not $deployHost -or -not $deployUser -or -not $deployPath -or -not $pm2AppName) {
    Write-Host "Missing deploy environment variables." -ForegroundColor Red
    Write-Host "Set DEPLOY_HOST, DEPLOY_USER, DEPLOY_PATH, and PM2_APP_NAME before running this script." -ForegroundColor Yellow
    exit 1
}

Write-Host "Starting deployment..." -ForegroundColor Cyan

Write-Host "1/4 Building the Next.js project locally..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed. Stopping deployment." -ForegroundColor Red
    exit 1
}

Write-Host "2/4 Compressing files..." -ForegroundColor Yellow
tar -czf deploy.tar.gz .next public package.json package-lock.json next.config.mjs postcss.config.mjs tailwind.config.ts tsconfig.json components app lib types scripts

if ($LASTEXITCODE -ne 0) {
    Write-Host "Compression failed. Stopping deployment." -ForegroundColor Red
    exit 1
}

Write-Host "3/4 Uploading to the VPS..." -ForegroundColor Yellow
scp deploy.tar.gz "${deployUser}@${deployHost}:${deployPath}/"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload failed. Stopping deployment." -ForegroundColor Red
    exit 1
}

Write-Host "4/4 Extracting and restarting PM2 on the VPS..." -ForegroundColor Yellow
ssh "${deployUser}@${deployHost}" "cd '$deployPath' && tar -xzf deploy.tar.gz && npm install --omit=dev && pm2 restart '$pm2AppName'"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Remote restart failed." -ForegroundColor Red
    exit 1
}

Write-Host "Deployment complete. Your live site is updated." -ForegroundColor Green
