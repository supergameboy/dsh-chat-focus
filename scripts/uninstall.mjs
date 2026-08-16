#!/usr/bin/env node
/**
 * Uninstall dsh-chat-focus from a dsh profile via the official `dsh plugin`
 * command (pnpm remove + automatic bundle-layer removal). The host
 * ui-conversation row restores itself once the bundle layer is gone.
 *
 * Optional --clean-settings removes the focus* fields the fork added to the
 * 'ui-conversation' namespace in $DSH_HOME/settings.yaml (harmless leftovers;
 * the host schema ignores unknown keys — clean only for zero residue).
 *
 * Usage: node scripts/uninstall.mjs [--profile web] [--clean-settings]
 */
import { spawnSync } from 'node:child_process'
import {
  copyFileSync, existsSync, lstatSync, readFileSync, realpathSync, rmSync, writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE_NAME = 'dsh-chat-focus'
const repoRoot = fileURLToPath(new URL('..', import.meta.url))

function parseArgs(argv) {
  const options = { profile: 'web', cleanSettings: false, help: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--profile') options.profile = argv[++i]
    else if (arg === '--clean-settings') options.cleanSettings = true
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

/**
 * pnpm `link:` dependencies leave their directory link in the profile
 * node_modules after remove; clear it when it points at our checkout.
 * @param profileDir - the profile directory.
 */
function removeLeftoverLink(profileDir) {
  const link = join(profileDir, 'node_modules', PACKAGE_NAME)
  if (!existsSync(link)) return
  try {
    lstatSync(link)
  } catch {
    return // raced away
  }
  let target
  try {
    target = realpathSync(link)
  } catch {
    rmSync(link, { recursive: true, force: true })
    process.stdout.write(`removed stale node_modules link: ${link}\n`)
    return
  }
  if (target === realpathSync(repoRoot)) {
    rmSync(link, { recursive: true, force: true })
    process.stdout.write(`removed stale node_modules link: ${link}\n`)
  } else {
    process.stdout.write(`note: ${link} points elsewhere (${target}) — left in place\n`)
  }
}

const { profile, cleanSettings, help } = parseArgs(process.argv.slice(2))
if (help) {
  process.stdout.write(`Usage: node scripts/uninstall.mjs [--profile web] [--clean-settings]\n`)
  process.exit(0)
}
if (!/^[a-z0-9-]+$/.test(profile)) {
  throw new Error(`invalid profile name: ${profile}`)
}

const manifest = join(dshHome(), 'profiles', profile, 'package.json')
if (!existsSync(manifest)) {
  throw new Error(`Profile manifest not found: ${manifest}`)
}
const backup = `${manifest}.dsh-chat-focus.bak`
copyFileSync(manifest, backup)
process.stdout.write(`backed up ${manifest} -> ${backup}\n`)

process.stdout.write(`removing ${PACKAGE_NAME} from profile '${profile}' ...\n`)
const result = spawnSync('dsh', ['plugin', '--profile', profile, 'remove', PACKAGE_NAME], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
if (result.error !== undefined) throw result.error
if (result.status !== 0) throw new Error(`dsh plugin remove failed (exit ${result.status})`)

const json = JSON.parse(readFileSync(manifest, 'utf8'))
if (json.dsh?.profile?.bundles?.includes(PACKAGE_NAME)) {
  throw new Error(`bundle layer '${PACKAGE_NAME}' still listed after removal — reconcile failed`)
}
process.stdout.write(`OK: '${PACKAGE_NAME}' removed from dsh.profile.bundles; the host ui-conversation row restores on next boot\n`)
removeLeftoverLink(join(dshHome(), 'profiles', profile))

if (cleanSettings) {
  const settings = join(dshHome(), 'settings.yaml')
  if (existsSync(settings)) {
    copyFileSync(settings, `${settings}.dsh-chat-focus.bak`)
    // Line-scoped cleanup: inside the ui-conversation section, drop lines
    // whose key starts with 'focus' (the fork's extension fields).
    const lines = readFileSync(settings, 'utf8').split(/\r?\n/)
    let inSection = false
    const kept = []
    for (const line of lines) {
      if (/^\S/.test(line)) inSection = line === 'ui-conversation:'
      if (inSection && /^\s+focus[A-Za-z]*:/.test(line)) continue
      kept.push(line)
    }
    writeFileSync(settings, `${kept.join('\n')}\n`, 'utf8')
    process.stdout.write(`cleaned focus* fields from settings.yaml (backup: ${settings}.dsh-chat-focus.bak)\n`)
  } else {
    process.stdout.write(`settings.yaml not found at ${settings} — nothing to clean\n`)
  }
}

process.stdout.write(`\nNext step: restart the dsh web service.\n`)
process.stdout.write(`Harmless residue left behind: localStorage 'dsh.chat-focus.fold.*' keys (browser-side).\n`)
process.stdout.write(`Re-install: node scripts/install.mjs --profile ${profile}\n`)
