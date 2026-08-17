#!/usr/bin/env node
/**
 * Fix the dsh-web-ui-all skin switcher's boot failure without touching the
 * third-party package.
 *
 * Symptom: after switching skins, the host fails to boot with
 * "failed to parse overlay .../cordis.patch.yml: YAMLException: end of the
 * stream or a document separator is expected (7:1)".
 *
 * Why: the profile boot patch template ships with a bare `[]` placeholder.
 * The skin manager (dsh-client-ui-skin-center) appends its rows after the
 * placeholder, and a YAML flow sequence cannot be followed by top-level
 * rows. The skin manager itself works fine on any placeholder-free patch
 * file, so the clean fix is to remove the placeholder once from the profile
 * file — no third-party code is modified, and upgrading @linxin666/dsh-web-
 * ui-all does not revert it.
 *
 * Idempotent: a patch file already free of the placeholder is left as is.
 * Re-run if a fresh profile was created.
 *
 * Usage: node scripts/patch-skin-center.mjs [--profile web]
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

function parseArgs(argv) {
  const options = { profile: 'web', help: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--profile') options.profile = argv[++i]
    else if (arg === '--help' || arg === '-h') options.help = true
    else {
      process.stderr.write(`unknown argument: ${arg}\n`)
      options.help = true
    }
  }
  return options
}

const { profile, help } = parseArgs(process.argv.slice(2))
if (help) {
  process.stdout.write(`Usage: node scripts/patch-skin-center.mjs [--profile web]\n`)
  process.exit(0)
}
if (!/^[a-z0-9-]+$/.test(profile)) {
  throw new Error(`invalid profile name: ${profile}`)
}

const target = join(homedir(), '.dsh', 'profiles', profile, 'cordis.patch.yml')
if (!existsSync(target)) {
  process.stderr.write(`not found: ${target}\n`)
  process.exit(1)
}

const source = readFileSync(target, 'utf8')
const next = source.replace(/^\s*\[\]\s*$/gm, '')
if (next === source) {
  process.stdout.write(`already fixed: ${target} (no \`[]\` placeholder)\n`)
  process.exit(0)
}

copyFileSync(target, `${target}.bak`)
writeFileSync(target, next, 'utf8')
process.stdout.write(`fixed ${target} (backup: ${target}.bak) — removed the \`[]\` placeholder\n`)
process.stdout.write(`No third-party code was modified; skin switching now produces valid YAML.\n`)
