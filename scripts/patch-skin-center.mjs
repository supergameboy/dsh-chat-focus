#!/usr/bin/env node
/**
 * Fix the @linxin666/dsh-web-ui-all skin switcher writing invalid YAML into
 * the profile boot patch (cordis.patch.yml).
 *
 * Symptom: after switching skins in the GUI, the host fails to boot with
 * "failed to parse overlay .../cordis.patch.yml: YAMLException: end of the
 * stream or a document separator is expected (7:1)" — the skin-center
 * `useSkin` appends its managed rows right after the template's `[]`
 * placeholder, and a flow sequence cannot be followed by top-level rows.
 *
 * Fix: make `useSkin` strip the standalone `[]` placeholder line before
 * appending the managed skin section. Idempotent: a package already patched
 * is left untouched. Re-run after upgrading @linxin666/dsh-web-ui-all.
 *
 * Usage: node scripts/patch-skin-center.mjs [--profile web]
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const TARGET_REL = join('node_modules', '@linxin666', 'dsh-client-ui-skin-center', 'lib', 'index.js')
const OLD_LINE = 'const patch = stripLegacySkinRows(stripManaged(readPatch(paths.patchPath)));'
const NEW_LINE = 'const patch = stripLegacySkinRows(stripManaged(readPatch(paths.patchPath))).replace(/^\\s*\\[\\]\\s*$/gm, "");'

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

const target = join(homedir(), '.dsh', 'profiles', profile, TARGET_REL)
if (!existsSync(target)) {
  process.stderr.write(`not found: ${target} — is @linxin666/dsh-web-ui-all installed in profile '${profile}'?\n`)
  process.exit(1)
}

const source = readFileSync(target, 'utf8')
if (source.includes(NEW_LINE)) {
  process.stdout.write(`already patched: ${target}\n`)
  process.exit(0)
}
if (!source.includes(OLD_LINE)) {
  process.stderr.write(`unexpected source in ${target} — the upstream writer changed; please re-check\n`)
  process.exit(1)
}

copyFileSync(target, `${target}.bak`)
writeFileSync(target, source.replace(OLD_LINE, NEW_LINE), 'utf8')
process.stdout.write(`patched ${target} (backup: ${target}.bak)\n`)
process.stdout.write(`Restart the dsh web service for the fix to load.\n`)
