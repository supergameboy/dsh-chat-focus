/**
 * Integration checks for the Host skin asset store: real files under a
 * throwaway DSH_HOME, a fake `connection` seam that captures the registered
 * RPC channel and Fetch route, and the full save → list → serve → rename →
 * delete cycle (TC-19/20/21).
 */
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { SKIN_ASSET_PATH, SKIN_RPC_CHANNEL, type SkinSaveRequest } from '../src/skin-contract.ts'

/** One captured RPC result envelope. */
interface EndpointResult {
  ok: boolean
  value?: unknown
  error?: { code: string; message: string }
}

type RpcHandler = (endpoint: string, payload: unknown, signal: AbortSignal) => Promise<EndpointResult>

/** Fake cordis context: only `get` and `effect` are consumed by the store. */
function fakeContext(captured: {
  rpc?: RpcHandler
  route?: { path: string; methods: readonly string[]; fetch: (request: Request) => Promise<Response> }
  disposers: (() => void)[]
}): Context {
  const connection = {
    rpc: {
      handle: (_channel: string, handler: RpcHandler) => {
        captured.rpc = handler
        return () => Promise.resolve()
      },
    },
    fetch: {
      register: (route: { path: string; methods: readonly string[]; fetch: (request: Request) => Promise<Response> }) => {
        captured.route = route
        return () => Promise.resolve()
      },
    },
  }
  return {
    get: (name: string) => (name === 'connection' ? connection : undefined),
    effect: (callback: () => unknown) => {
      const disposer = callback()
      if (typeof disposer === 'function') captured.disposers.push(disposer as () => void)
    },
  } as unknown as Context
}

const home = await mkdtemp(join(tmpdir(), 'cf-skin-'))
process.env.DSH_HOME = home
// The store resolves DSH_HOME lazily at install time, so the import order is safe.
const { installSkinStore } = await import('../src/skins/host.ts')

const captured: Parameters<typeof fakeContext>[0] = { disposers: [] }
installSkinStore(fakeContext(captured))
assert.ok(captured.rpc !== undefined, 'the RPC channel is registered')
assert.ok(captured.route !== undefined, 'the asset route is registered')
assert.equal(captured.route.path, SKIN_ASSET_PATH, 'the asset route owns the contract path')
assert.deepEqual(captured.route.methods, ['GET', 'HEAD'], 'only safe methods are exposed')
assert.equal(SKIN_RPC_CHANNEL, '/chat-focus', 'the RPC channel stays single-segment (host pattern)')

const rpc = captured.rpc as RpcHandler
const route = captured.route as NonNullable<typeof captured.route>

// A 1x1 transparent PNG, base64 (no data: prefix).
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const request: SkinSaveRequest = {
  name: '测试皮肤',
  kind: 'image',
  mime: 'image/png',
  width: 120,
  height: 120,
  frames: 1,
  fps: 0,
  slice: { left: 12, top: 12, right: 12, bottom: 12 },
  padding: { top: 6, right: 10, bottom: 6, left: 10 },
  radius: 0,
  fit: 'stretch',
  textColor: '',
  asset: PNG,
}

// 1. An empty store lists nothing and refuses malformed payloads.
const empty = await rpc('skins.list', {}, new AbortController().signal)
assert.equal(empty.ok, true)
assert.deepEqual((empty.value as { records: unknown[] }).records, [], 'a fresh store is empty')
const refused = await rpc('skins.save', { ...request, mime: 'text/html' }, new AbortController().signal)
assert.equal(refused.ok, false, 'a non-image mime is refused')
assert.equal(refused.error?.code, 'skins/invalid')

// 2. Save persists the asset and its metadata.
const saved = await rpc('skins.save', request, new AbortController().signal)
assert.equal(saved.ok, true, 'a valid save succeeds')
const record = (saved.value as { record: { id: string; name: string; bytes: number; updatedAt: number } }).record
assert.match(record.id, /^[a-z0-9][a-z0-9-]{5,63}$/, 'the host mints a valid id')
assert.equal(record.name, '测试皮肤')
assert.equal(record.bytes, Buffer.from(PNG, 'base64').byteLength, 'the recorded size matches the decoded asset')
const onDisk = await readFile(join(home, 'chat-focus', 'skins', `${record.id}.bin`))
assert.equal(onDisk.toString('base64'), PNG, 'the asset round-trips through disk')
const index = JSON.parse(await readFile(join(home, 'chat-focus', 'skins', 'index.json'), 'utf8')) as { version: number; skins: unknown[] }
assert.equal(index.version, 1, 'the index carries its schema version')
assert.equal(index.skins.length, 1, 'the index lists the saved skin')

// 3. The asset route serves bytes with cache and type headers.
const asset = await route.fetch(new Request(`http://x${SKIN_ASSET_PATH}?id=${record.id}&v=${String(record.updatedAt)}`))
assert.equal(asset.status, 200)
assert.equal(asset.headers.get('content-type'), 'image/png')
assert.match(asset.headers.get('cache-control') ?? '', /immutable/, 'the versioned URL is cacheable forever')
assert.equal(Buffer.from(await asset.arrayBuffer()).toString('base64'), PNG, 'the served body matches the upload')
const head = await route.fetch(new Request(`http://x${SKIN_ASSET_PATH}?id=${record.id}`, { method: 'HEAD' }))
assert.equal(head.status, 200)
assert.equal((await head.arrayBuffer()).byteLength, 0, 'HEAD returns headers only')
const missing = await route.fetch(new Request(`http://x${SKIN_ASSET_PATH}?id=nope`))
assert.equal(missing.status, 404, 'an unknown id is a 404')

// 4. A second store over the same home sees the same library (durability).
// The index is rewritten in the LEGACY shape first, so the reload also proves
// records written before the packaged style keep rendering.
const legacyIndex = {
  version: 1,
  skins: [
    record,
    {
      id: 'legacy01',
      name: '旧版皮肤',
      kind: 'image', mime: 'image/png', width: 120, height: 120,
      frames: 1, fps: 0,
      slice: { left: 12, top: 12, right: 12, bottom: 12 },
      padding: { top: 6, right: 10, bottom: 6, left: 10 },
      radius: 0, fit: 'stretch', textColor: '#123456', bytes: 70,
      createdAt: 1, updatedAt: 1,
    },
  ],
}
await writeFile(join(home, 'chat-focus', 'skins', 'index.json'), `${JSON.stringify(legacyIndex, undefined, 2)}\n`, 'utf8')
const captured2: Parameters<typeof fakeContext>[0] = { disposers: [] }
installSkinStore(fakeContext(captured2))
const reloaded = await (captured2.rpc as RpcHandler)('skins.list', {}, new AbortController().signal)
const records = (reloaded.value as { records: { id: string; style?: { textColor?: string } }[] }).records
assert.equal(records.length, 2, 'the library survives a reload')
assert.equal(records.find(entry => entry.id === 'legacy01')?.style?.textColor, '#123456',
  'a legacy record gains the packaged style')

// 5. Rename keeps the asset and bumps the version stamp.
const renamed = await rpc('skins.rename', { id: record.id, name: '改名后' }, new AbortController().signal)
assert.equal(renamed.ok, true)
const renamedRecord = (renamed.value as { record: { name: string; updatedAt: number; createdAt: number } }).record
assert.equal(renamedRecord.name, '改名后')
assert.ok(renamedRecord.updatedAt >= record.updatedAt, 'the version stamp moves forward')
assert.equal((await rpc('skins.rename', { id: 'nope', name: 'x' }, new AbortController().signal)).ok, false,
  'renaming an unknown skin fails')
assert.equal((await rpc('skins.rename', { id: record.id, name: '' }, new AbortController().signal)).ok, false,
  'an empty rename fails')

// 6. Delete removes both the index entry and the asset file.
const deleted = await rpc('skins.delete', { id: record.id }, new AbortController().signal)
assert.equal(deleted.ok, true)
assert.equal((deleted.value as { deleted: boolean }).deleted, true)
const afterDelete = await route.fetch(new Request(`http://x${SKIN_ASSET_PATH}?id=${record.id}`))
assert.equal(afterDelete.status, 404, 'the asset is gone')
const again = await rpc('skins.delete', { id: record.id }, new AbortController().signal)
assert.equal((again.value as { deleted: boolean }).deleted, false, 'deleting twice reports no deletion')

// 7. Unknown endpoints fail structurally instead of throwing.
const unknown = await rpc('skins.bogus', {}, new AbortController().signal)
assert.equal(unknown.ok, false)
assert.equal(unknown.error?.code, 'skins/unknown-endpoint')

// 8. Range requests serve video windows (media elements seek and loop).
const ranged = await route.fetch(new Request(`http://x${SKIN_ASSET_PATH}?id=nope`, {
  headers: { range: 'bytes=0-3' },
}))
assert.equal(ranged.status, 404, 'a missing asset is still a 404 with a Range header')
const savedAgain = await rpc('skins.save', request, new AbortController().signal)
const rangedRecord = (savedAgain.value as { record: { id: string; updatedAt: number } }).record
const full = await route.fetch(new Request(`http://x${SKIN_ASSET_PATH}?id=${rangedRecord.id}`))
const fullBody = Buffer.from(await full.arrayBuffer())
const windowed = await route.fetch(new Request(`http://x${SKIN_ASSET_PATH}?id=${rangedRecord.id}`, {
  headers: { range: 'bytes=2-5' },
}))
assert.equal(windowed.status, 206, 'a byte window is a partial response')
assert.equal(windowed.headers.get('content-range'), `bytes 2-5/${String(fullBody.byteLength)}`)
assert.equal(windowed.headers.get('accept-ranges'), 'bytes')
assert.equal(Buffer.from(await windowed.arrayBuffer()).toString('base64'),
  fullBody.subarray(2, 6).toString('base64'), 'the window matches the full body slice')
const suffix = await route.fetch(new Request(`http://x${SKIN_ASSET_PATH}?id=${rangedRecord.id}`, {
  headers: { range: 'bytes=-3' },
}))
assert.equal(suffix.status, 206, 'a suffix range is supported')
assert.equal(Buffer.from(await suffix.arrayBuffer()).length, 3, 'the suffix window is the requested length')
const outside = await route.fetch(new Request(`http://x${SKIN_ASSET_PATH}?id=${rangedRecord.id}`, {
  headers: { range: `bytes=${String(fullBody.byteLength + 10)}-` },
}))
assert.equal(outside.status, 416, 'a window past the body is unsatisfiable')
await rpc('skins.delete', { id: rangedRecord.id }, new AbortController().signal)

// 9. The store is inert without the connection service.
const inert: Parameters<typeof fakeContext>[0] = { disposers: [] }
installSkinStore({ get: () => undefined, effect: () => { throw new Error('must not run') } } as unknown as Context)
assert.equal(inert.rpc, undefined, 'no connection means no registration')

await rm(home, { recursive: true, force: true })
console.log('skin store checks: all passed')
