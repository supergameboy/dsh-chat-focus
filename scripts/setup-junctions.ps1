# Setup build-time node_modules links against the host checkout
# (E:\deepseek-harness rc.5 baseline). pnpm workspace cannot install across
# parent directories reliably, so the few packages tsdown/tsc need are linked
# by hand. Run from the repo root. Never run pnpm install afterwards here:
# it may rewrite the host node_modules through these junctions.
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $MyInvocation.MyCommand.Path
$hostRoot = if ($env:DSH_HOST_ROOT) { $env:DSH_HOST_ROOT } else { Join-Path $repo '..\deepseek-harness' }
$nm = Join-Path $repo 'node_modules'

function Link-Dir([string]$name, [string]$target) {
  $path = Join-Path $nm $name
  if (Test-Path $path) { Write-Host "exists: $name"; return }
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $path) | Out-Null
  New-Item -ItemType Junction -Path $path -Target $target | Out-Null
  Write-Host "linked: $name"
}

New-Item -ItemType Directory -Force -Path $nm | Out-Null

# Registry deps (tsc/tsdown resolution + @types for react JSX).
Link-Dir 'react'           (Join-Path $hostRoot 'node_modules\.pnpm\node_modules\react')
Link-Dir 'react-dom'       (Join-Path $hostRoot 'node_modules\.pnpm\node_modules\react-dom')
Link-Dir 'clsx'            (Join-Path $hostRoot 'node_modules\.pnpm\node_modules\clsx')
Link-Dir 'typescript'      (Join-Path $hostRoot 'node_modules\typescript')
Link-Dir 'tsdown'          (Join-Path $hostRoot 'node_modules\tsdown')
Link-Dir 'lightningcss'    (Join-Path $hostRoot 'node_modules\lightningcss')
Link-Dir 'tsx'             (Join-Path $hostRoot 'node_modules\tsx')
Link-Dir '@types\react'    (Join-Path $hostRoot 'node_modules\.pnpm\node_modules\@types\react')

# Vendored framework libraries (inlined into the client bundle).
Link-Dir '@deepseek-ai\cordis'      (Join-Path $hostRoot 'vendor\cordis')
Link-Dir '@deepseek-ai\cosmokit'    (Join-Path $hostRoot 'vendor\cosmokit')
Link-Dir '@deepseek-ai\schemastery' (Join-Path $hostRoot 'vendor\schemastery')

# Node-half dependency (externalized, linked for completeness).
Link-Dir '@deepseek-ai\dsh-settings' (Join-Path $hostRoot 'packages\settings\settings')

Write-Host 'setup complete'
