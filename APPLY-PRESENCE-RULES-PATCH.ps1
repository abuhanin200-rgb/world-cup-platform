$ErrorActionPreference = "Stop"

$rulesPath = Join-Path $PSScriptRoot "firestore.rules"
if (-not (Test-Path $rulesPath)) {
  throw "firestore.rules not found. Run this script from the project root."
}

$content = [System.IO.File]::ReadAllText($rulesPath)

if ($content -notmatch 'match /onlinePresence/\{userId\}') {
  throw "onlinePresence rule block was not found. No changes were made."
}

if ($content -match '"deviceType"') {
  Write-Host "Presence rule fields are already installed." -ForegroundColor Green
  exit 0
}

$replacement = @' 
"lastSeen",
          "lastActiveAt",
          "pageEnteredAt",
          "lastChallengeStudioVisit",
          "deviceType",
          "deviceLabel",
          "browserName",
          "isStandalone",
          "isVisible",
'@

$pattern = '"lastSeen",\s*\r?\n\s*"lastChallengeStudioVisit",'
$matches = [regex]::Matches($content, $pattern)
if ($matches.Count -lt 2) {
  throw "Expected onlinePresence allow-list entries were not found twice. No changes were made."
}

$content = [regex]::Replace($content, $pattern, $replacement.TrimEnd())
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($rulesPath, $content, $utf8NoBom)

Write-Host "Presence fields added to firestore.rules without replacing the rest of your rules." -ForegroundColor Green
Write-Host "Next: npx firebase deploy --only firestore:rules" -ForegroundColor Cyan
