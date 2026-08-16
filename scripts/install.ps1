# Install dsh-chat-focus into a dsh profile via the official `dsh plugin`
# command (pnpm add + automatic bundle-layer reconciliation), with a
# pre-install backup and post-install verification.
#
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\install.ps1 [-Profile web] [-PluginPath E:\dsh-chat-focus]
param(
  [string]$Profile = 'web',
  [string]$PluginPath = (Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent)
)
$ErrorActionPreference = 'Stop'
$packageName = 'dsh-chat-focus'

$clientBundle = Join-Path $PluginPath 'lib\client.js'
if (-not (Test-Path $clientBundle)) {
  throw "Missing $clientBundle — run 'pnpm run bundle' in $PluginPath first"
}

$home = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $HOME '.dsh' }
$manifest = Join-Path $home "profiles\$Profile\package.json"
if (-not (Test-Path $manifest)) {
  throw "Profile manifest not found: $manifest"
}
$backup = "$manifest.dsh-chat-focus.bak"
Copy-Item $manifest $backup -Force
Write-Host "backed up $manifest -> $backup"

Write-Host "installing $packageName into profile '$Profile' ..."
dsh plugin --profile $Profile add "link:$PluginPath"
if ($LASTEXITCODE -ne 0) { throw "dsh plugin add failed (exit $LASTEXITCODE); profile restored from backup? remove the dependency manually if needed" }

$json = Get-Content $manifest -Raw | ConvertFrom-Json
if (-not ($json.dsh.profile.bundles -contains $packageName)) {
  throw "bundle layer '$packageName' missing from dsh.profile.bundles after install — reconcile failed"
}
Write-Host "OK: '$packageName' is in dsh.profile.bundles"
Write-Host ""
Write-Host "Next step: restart the dsh web service (the current session will reconnect)."
Write-Host "Rollback: powershell -ExecutionPolicy Bypass -File scripts\uninstall.ps1 -Profile $Profile"
