$ErrorActionPreference = 'Stop'
Write-Host '1/3 Cleaning stale Next.js cache (.next)...' -ForegroundColor Cyan
if (Test-Path '.next') { Remove-Item -Recurse -Force '.next' }
Write-Host '2/3 Running TypeScript check...' -ForegroundColor Cyan
npm run typecheck
Write-Host '3/3 Running production build with Webpack...' -ForegroundColor Cyan
npm run build
