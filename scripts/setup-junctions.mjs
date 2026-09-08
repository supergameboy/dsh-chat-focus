#!/usr/bin/env node
/**
 * Set up build-time node_modules links against the host checkout
 * (default ../deepseek-harness, 0.1.2-alpha.5 baseline). pnpm workspace cannot install
 * across parent directories reliably, so the few packages tsdown/tsc need are
 * linked by hand. Cross-platform: directory junctions on Windows, symlinks
 * elsewhere. Never run pnpm install afterwards here — it may rewrite the host
 * node_modules through these links.
 *
 * Usage: node scripts/setup-junctions.mjs [--host-root <dir>]
 */
import { existsSync, mkdirSync, symlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)))

function parseArgs(argv) {
  let hostRoot = join(repoRoot, '..', 'deepseek-harness')
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--host-root') hostRoot = argv[++i]
  }
  return hostRoot
}

const hostRoot = parseArgs(process.argv.slice(2))
const nm = join(repoRoot, 'node_modules')
const linkType = process.platform === 'win32' ? 'junction' : 'dir'

function linkDir(name, target) {
  const path = join(nm, name)
  if (existsSync(path)) {
    process.stdout.write(`exists: ${name}\n`)
    return
  }
  mkdirSync(dirname(path), { recursive: true })
  symlinkSync(target, path, linkType)
  process.stdout.write(`linked: ${name}\n`)
}

mkdirSync(nm, { recursive: true })

// Registry deps (tsc/tsdown resolution + @types for react JSX).
linkDir('react', join(hostRoot, 'node_modules', '.pnpm', 'node_modules', 'react'))
linkDir('react-dom', join(hostRoot, 'node_modules', '.pnpm', 'node_modules', 'react-dom'))
linkDir('clsx', join(hostRoot, 'node_modules', '.pnpm', 'node_modules', 'clsx'))
linkDir('typescript', join(hostRoot, 'node_modules', 'typescript'))
linkDir('tsdown', join(hostRoot, 'node_modules', 'tsdown'))
linkDir('lightningcss', join(hostRoot, 'node_modules', 'lightningcss'))
linkDir('tsx', join(hostRoot, 'node_modules', 'tsx'))
linkDir('@types/react', join(hostRoot, 'node_modules', '.pnpm', 'node_modules', '@types', 'react'))
linkDir('@types/react-dom', join(hostRoot, 'node_modules', '.pnpm', '@types+react-dom@18.3.7_@types+react@18.3.31', 'node_modules', '@types', 'react-dom'))

// Vendored framework libraries (inlined into the client bundle).
linkDir('@deepseek-ai/cordis', join(hostRoot, 'vendor', 'cordis'))
linkDir('@deepseek-ai/cosmokit', join(hostRoot, 'vendor', 'cosmokit'))
linkDir('@deepseek-ai/schemastery', join(hostRoot, 'vendor', 'schemastery'))

// Node-half dependency (externalized, linked for completeness).
linkDir('@deepseek-ai/dsh-settings', join(hostRoot, 'packages', 'settings', 'settings'))

// alpha.5 contract packages: engine store (module-table seed word), inline
// wire layers (dsh-session/dsh-llm/dsh-util-*), row/type authorities, and the
// api session/workspace controller faces. dsh-client-runtime no longer exists
// on the host (removed in 0.1.2-alpha.5) and must not be linked.
linkDir('@deepseek-ai/dsh-client-store', join(hostRoot, 'packages', 'client', 'store'))
linkDir('@deepseek-ai/dsh-client-ui-conversation', join(hostRoot, 'packages', 'client', 'ui-conversation'))
linkDir('@deepseek-ai/dsh-session', join(hostRoot, 'packages', 'core', 'session'))
linkDir('@deepseek-ai/dsh-llm', join(hostRoot, 'packages', 'llm', 'llm'))
linkDir('@deepseek-ai/dsh-util-workspace-path', join(hostRoot, 'packages', 'util', 'workspace-path'))
linkDir('@deepseek-ai/dsh-util-crypto', join(hostRoot, 'packages', 'util', 'crypto'))
linkDir('@deepseek-ai/dsh-api-session-controller', join(hostRoot, 'packages', 'api', 'session-controller'))
linkDir('@deepseek-ai/dsh-api-workspace-controller', join(hostRoot, 'packages', 'api', 'workspace-controller'))

process.stdout.write('setup complete\n')
