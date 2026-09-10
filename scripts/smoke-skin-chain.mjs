// Live smoke: authenticate once with the dsh launch token, then verify the
// served client bundle carries this increment's symbols and that the skin
// RPC + asset route (including Range) work against the running host.
import fs from 'node:fs'
import path from 'node:path'

const BASE = 'http://127.0.0.1:8123'
const TOKEN = 'Ljh2VQftK7WtCpYDasLMGxeivzClNXfX72aVBSBJzrU'
const WORK = path.resolve('.smoke')
fs.mkdirSync(WORK, { recursive: true })
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
let failures = 0
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail === '' ? '' : ` · ${detail}`}`)
  if (!ok) failures += 1
}

// One fetch with the session cookie jar maintained in the work dir.
const jar = []
async function fetchPage(url, init = {}) {
  const headers = new Headers(init.headers)
  if (jar.length > 0) headers.set('cookie', jar.join('; '))
  const response = await fetch(url, { ...init, headers, redirect: 'manual' })
  const setCookie = response.headers.getSetCookie?.() ?? []
  for (const cookie of setCookie) jar.push(cookie.split(';')[0])
  return response
}

// 1. Mint the session cookie from the launch token.
const root = await fetchPage(`${BASE}/?token=${TOKEN}`)
check('auth: token exchange', root.status === 303 || root.status === 200,
  `status ${String(root.status)}, cookie ${jar.length > 0 ? 'minted' : 'MISSING'}`)
await fetchPage(`${BASE}/`)

// 2. The graph must preload our bundle and the combo script must carry the new code.
const home = await fetchPage(`${BASE}/`)
const html = await home.text()
check('graph preloads dsh-chat-focus', html.includes('dsh-chat-focus/client.js'))
const combo = /\/plugins\/\?\?[^"']*dsh-chat-focus\/client\.js[^"']*/
  .exec(html)?.[0]?.replaceAll('&amp;', '&')
check('combo URL present', combo !== undefined)
if (combo !== undefined) {
  const script = await fetchPage(`${BASE}${combo}`)
  const body = await script.text()
  fs.writeFileSync(path.join(WORK, 'client.js'), body)
  check('bundle served', script.status === 200, `${String(body.length)} bytes, status ${String(script.status)}`)
  for (const marker of ['VideoLayer', 'focusBackgroundPosition', 'thumbGlyph', 'setFocusFields', 'tabRail', 'skin-asset', 'inspectVideo']) {
    // `parseByteRange` lives in the HOST half (lib/index.js), not this bundle;
    // Range behaviour is asserted directly against the asset route below.
    check(`bundle symbol ${marker}`, body.includes(marker))
  }
}

// 3. RPC: list → save → asset(+Range) → rename → list → delete.
async function rpc(endpoint, payload, rpcId) {
  const response = await fetchPage(`${BASE}/chat-focus/${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId, method: endpoint, payload }),
  })
  const body = await response.json()
  if (body.type !== 'server-response' || body.rpcId !== rpcId) throw new Error(`bad envelope for ${endpoint}`)
  return body.result
}

const empty = await rpc('skins.list', {}, 'smoke-1')
check('skins.list reaches the live store', empty.ok === true,
  `records ${String(empty.value.records.length)}`)
const beforeCount = empty.value.records.length

const saved = await rpc('skins.save', {
  name: 'smoke-测试皮肤', kind: 'image', mime: 'image/png', width: 120, height: 120,
  frames: 1, fps: 0, slice: { left: 12, top: 12, right: 12, bottom: 12 },
  padding: { top: 6, right: 10, bottom: 6, left: 10 }, radius: 0, fit: 'stretch',
  style: { bg: '#eef2ff', gradientFrom: '', gradientTo: '', gradientAngle: '135', border: '#c7d2fe', overlay: '-35', backdropOpacity: 60, backdropBlur: '10px', textColor: '#1f2937', font: '', fontSize: '14px' },
  asset: PNG,
}, 'smoke-2')
const record = saved.value?.record
  check('skins.save round-trips the packaged style', record?.style?.backdropOpacity === 60 && record?.style?.overlay === '-35', JSON.stringify(record?.style ?? null).slice(0, 90))
check('skins.save persists', saved.ok === true && record !== undefined,
  saved.ok === true ? `id ${record?.id ?? '?'}` : (saved.error?.message ?? 'no error message'))

if (saved.ok === true && record !== undefined) {
  const assetUrl = `${BASE}/api/chat-focus/skin-asset?id=${encodeURIComponent(record.id)}&v=${String(record.updatedAt)}`
  const full = await fetchPage(assetUrl)
  const fullBody = Buffer.from(await full.arrayBuffer())
  check('asset full GET', full.status === 200 && full.headers.get('content-type') === 'image/png',
    `status ${String(full.status)}, ${String(fullBody.length)} bytes`)
  check('asset declares Range support', full.headers.get('accept-ranges') === 'bytes')
  const windowed = await fetchPage(assetUrl, { headers: { range: 'bytes=2-5' } })
  const windowBody = Buffer.from(await windowed.arrayBuffer())
  check('asset Range window', windowed.status === 206 && windowBody.length === 4,
    `status ${String(windowed.status)}, content-range ${String(windowed.headers.get('content-range'))}`)
  const suffix = await fetchPage(assetUrl, { headers: { range: 'bytes=-3' } })
  const suffixBody = await suffix.arrayBuffer()
  check('asset Range suffix', suffix.status === 206 && suffixBody.byteLength === 3)
  const outside = await fetchPage(assetUrl, { headers: { range: `bytes=${String(fullBody.length + 9)}-` } })
  check('asset Range unsatisfiable', outside.status === 416, `status ${String(outside.status)}`)

  const renamed = await rpc('skins.rename', { id: record.id, name: 'smoke-改名' }, 'smoke-3')
  check('skins.rename', renamed.ok === true)
}

// Parameter-only skin: no bytes, no mime, nothing on disk.
const styleOnly = await rpc('skins.save', {
  name: 'smoke-纯参数', kind: 'style', mime: '', width: 1, height: 1, frames: 1, fps: 0,
  padding: { top: 8, right: 12, bottom: 8, left: 12 },
  radius: 16, fit: 'cover', focusX: 30, focusY: 70, asset: '',
  style: { bg: '#fff7ed', gradientFrom: '', gradientTo: '', gradientAngle: '135', border: '#fed7aa', overlay: '0', backdropOpacity: 100, backdropBlur: '', textColor: '', font: '', fontSize: '' },
}, 'smoke-7')
const styleRecord = styleOnly.value?.record
check('a parameter-only skin saves', styleOnly.ok === true && styleRecord?.kind === 'style', styleOnly.ok === true ? `bytes ${String(styleRecord?.bytes)}` : styleOnly.error?.message)
check('a parameter-only skin writes no asset', styleRecord?.bytes === 0)

// Whole-layer alignment round-trips.
const aligned = await rpc('skins.save', {
  name: 'smoke-对齐', kind: 'animated', mime: 'image/gif', width: 64, height: 64, frames: 1, fps: 0,
  padding: { top: 8, right: 12, bottom: 8, left: 12 },
  radius: 12, fit: 'contain', focusX: 20, focusY: 80, asset: PNG,
  style: { bg: '', gradientFrom: '', gradientTo: '', gradientAngle: '135', border: '', overlay: '0', backdropOpacity: 100, backdropBlur: '', textColor: '', font: '', fontSize: '' },
}, 'smoke-8')
const alignedRecord = aligned.value?.record
check('fit/focus round-trip', alignedRecord?.fit === 'contain' && alignedRecord?.focusX === 20 && alignedRecord?.focusY === 80, `${String(alignedRecord?.fit)}/${String(alignedRecord?.focusX)},${String(alignedRecord?.focusY)}`)
if (alignedRecord !== undefined) await rpc('skins.delete', { id: alignedRecord.id }, 'smoke-9')
if (styleRecord !== undefined) await rpc('skins.delete', { id: styleRecord.id }, 'smoke-10')
const listing = await rpc('skins.list', {}, 'smoke-4')
// The library is not pristine: earlier browser-test skins persist in the
// harness home, so assert relative to the pre-test count.
check('skins.list sees the saved skin', listing.value.records.length === beforeCount + 1,
  `before ${String(beforeCount)}, after ${String(listing.value.records.length)}`)

const deleted = await rpc('skins.delete', { id: record?.id ?? '' }, 'smoke-5')
check('skins.delete', deleted.ok === true && deleted.value?.deleted === true)
const after = await rpc('skins.list', {}, 'smoke-6')
check('library back to the pre-test state', after.value.records.length === beforeCount,
  `records ${String(after.value.records.length)}`)

console.log(failures === 0 ? '\nALL SMOKE CHECKS PASSED' : `\n${String(failures)} SMOKE CHECK(S) FAILED`)
process.exitCode = failures === 0 ? 0 : 1
