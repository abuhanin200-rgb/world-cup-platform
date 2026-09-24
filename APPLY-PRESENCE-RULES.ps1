$ErrorActionPreference = "Stop"
Write-Host "Deploying Firestore presence rules..." -ForegroundColor Cyan
npx firebase deploy --only firestore:rules
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Presence rules deployed successfully." -ForegroundColor Green
