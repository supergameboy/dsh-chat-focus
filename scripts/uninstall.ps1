# Uninstall dsh-chat-focus from a dsh profile via the official `dsh plugin`
# command (pnpm remove + automatic bundle-layer removal). The host
# ui-conversation row restores itself once the bundle layer is gone.
#
# Optional: -CleanSettings removes the focus* fields the fork added to the
# 'ui-conversation' namespace in $DSH_HOME/settings.yaml (harmless leftovers;
# the host schema ignores unknown keys — clean only if you want zero residue).
#
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\uninstall.ps1 [-Profile web] [-CleanSettings]
param(
  [string]$Profile = 'web',
  [switch]$CleanSettings
)
$ErrorActionPreference = 'Stop'
$packageName = 'dsh-chat-focus'

$home = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $HOME '.dsh' }
$manifest = Join-Path $home "profiles\$Profile\package.json"
if (-not (Test-Path $manifest)) {
  throw "Profile manifest not found: $manifest"
}
$backup = "$manifest.dsh-chat-focus.bak"
Copy-Item $manifest $backup -Force
Write-Host "backed up $manifest -> $backup"

Write-Host "removing $packageName from profile '$Profile' ..."
dsh plugin --profile $Profile remove $packageName
if ($LASTEXITCODE -ne 0) { throw "dsh plugin remove failed (exit $LASTEXITCODE)" }

$json = Get-Content $manifest -Raw | ConvertFrom-Json
if ($json.dsh.profile.bundles -contains $packageName) {
  throw "bundle layer '$packageName' still listed after removal — reconcile failed"
}
Write-Host "OK: '$packageName' removed from dsh.profile.bundles; the host ui-conversation row will restore on next boot"

if ($CleanSettings) {
  $settings = Join-Path $home 'settings.yaml'
  if (Test-Path $settings) {
    $backupSettings = "$settings.dsh-chat-focus.bak"
    Copy-Item $settings $backupSettings -Force
    # Line-scoped cleanup: inside the ui-conversation section, drop lines
    # whose key starts with 'focus' (the fork's extension fields). The host
    # schema ignores unknown keys, so skipping this step is safe too.
    $lines = Get-Content $settings
    $inSection = $false
    $out = foreach ($line in $lines) {
      if ($line -match '^\S') { $inSection = $line -eq 'ui-conversation:' }
      if ($inSection -and $line -match '^\s+focus[A-Za-z]*:') { continue }
      $line
    }
    Set-Content -Path $settings -Value $out -Encoding UTF8
    Write-Host "cleaned focus* fields from settings.yaml (backup: $backupSettings)"
  }
}

Write-Host ""
Write-Host "Next step: restart the dsh web service."
Write-Host "Harmless residue left behind: localStorage 'dsh.chat-focus.fold.*' keys (browser-side)."
Write-Host "Re-install: powershell -ExecutionPolicy Bypass -File scripts\install.ps1 -Profile $Profile"
