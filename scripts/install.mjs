#!/usr/bin/env node
/**
 * Install dsh-chat-focus into a dsh profile via the official `dsh plugin`
 * command (pnpm add + automatic bundle-layer reconciliation), with a
 * pre-install backup and post-install verification.
 *
 * Cross-platform: runs on any Node-supported OS (the host is Node anyway).
 *
 * Usage: node scripts/install.mjs [--profile web] [--plugin-path E:\dsh-chat-focus]
 */
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE_NAME = 'dsh-chat-focus'
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)))

function parseArgs(argv) {
  const options = { profile: 'web', pluginPath: repoRoot, help: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--profile') options.profile = argv[++i]
    else if (arg === '--plugin-path') options.pluginPath = argv[++i]
    else if (arg === '--help' || arg === '-h') options.help = true
    else {
      process.stderr.write(`unknown argument: ${arg}\n`)
      options.help = true
    }
  }
  return options
}

function dshHome() {
  return process.env.DSH_HOME ?? join(homedir(), '.dsh')
}

const { profile, pluginPath, help } = parseArgs(process.argv.slice(2))
if (help) {
  process.stdout.write(`Usage: node scripts/install.mjs [--profile web] [--plugin-path <dir>]\n`)
  process.exit(0)
}
if (!/^[a-z0-9-]+$/.test(profile)) {
  throw new Error(`invalid profile name: ${profile}`)
}

const clientBundle = join(pluginPath, 'lib', 'client.js')
if (!existsSync(clientBundle)) {
  throw new Error(`Missing ${clientBundle} — run 'pnpm run bundle' in ${pluginPath} first`)
}

const manifest = join(dshHome(), 'profiles', profile, 'package.json')
if (!existsSync(manifest)) {
  throw new Error(`Profile manifest not found: ${manifest}`)
}
const backup = `${manifest}.dsh-chat-focus.bak`
copyFileSync(manifest, backup)
process.stdout.write(`backed up ${manifest} -> ${backup}\n`)

process.stdout.write(`installing ${PACKAGE_NAME} into profile '${profile}' ...\n`)
// Windows resolves dsh through its .cmd shim, which spawn() refuses without a
// shell since the CVE-2024-27980 hardening (same handling as the host CLI).
const result = spawnSync('dsh', ['plugin', '--profile', profile, 'add', `link:${pluginPath}`], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
if (result.error !== undefined) throw result.error
if (result.status !== 0) {
  throw new Error(`dsh plugin add failed (exit ${result.status}); remove the dependency manually if needed`)
}

const json = JSON.parse(readFileSync(manifest, 'utf8'))
if (!json.dsh?.profile?.bundles?.includes(PACKAGE_NAME)) {
  throw new Error(`bundle layer '${PACKAGE_NAME}' missing from dsh.profile.bundles after install — reconcile failed`)
}
process.stdout.write(`OK: '${PACKAGE_NAME}' is in dsh.profile.bundles\n`)
process.stdout.write(`\nNext step: restart the dsh web service (the current session will reconnect).\n`)
process.stdout.write(`Rollback: node scripts/uninstall.mjs --profile ${profile}\n`)
