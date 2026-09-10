/**
 * Host-side bubble-skin asset store.
 *
 * Skins are user-made bubble backdrops (static images, animated images, sprite
 * sheets). Their bytes are far too large for the settings document, so they
 * live as files under the harness home and reach the browser through the
 * authenticated `/api` surface:
 *
 * - `POST /chat-focus/<endpoint>`  mutations (list / save / delete / rename)
 * - `GET  /api/chat-focus/skin-asset?id=&v=`  asset bytes
 *
 * Both surfaces are owned by the Host `connection` service, so the existing
 * trust fence and browser-session authentication apply unchanged.
 *
 * @module dsh-chat-focus/skins/host
 */

import type { Context } from '@deepseek-ai/cordis'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import {
  newSkinId, EMPTY_SKIN_STYLE, SKIN_ASSET_PATH, SKIN_INDEX_VERSION, SKIN_MAX_INDEX_BYTES, SKIN_RPC_CHANNEL,
  validateSkinSave, type SkinDeleteRequest, type SkinRecord, type SkinRenameRequest,
  type SkinSaveRequest, type SkinIndex,
} from '../skin-contract.ts'

/** Result envelope returned by every RPC endpoint. */
type EndpointResult = { ok: true; value: unknown } | { ok: false; error: { code: string; message: string; details: object } }

/** One skin store rooted at a directory. */
class SkinStore {
  private queue: Promise<unknown> = Promise.resolve()

  /** @param root - absolute directory holding `index.json` and `<id>.bin` files. */
  constructor(private readonly root: string) {}

  /** Absolute path of one skin's asset file. */
  private assetPath(id: string): string {
    return join(this.root, `${id}.bin`)
  }

  /** Serialize every mutation so two saves cannot interleave index writes. */
  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const next = this.queue.then(task, task)
    this.queue = next.then(() => undefined, () => undefined)
    return next
  }

  /** Read the index document; a missing file is an empty store. */
  private async readIndex(): Promise<SkinIndex> {
    let text: string
    try {
      text = await readFile(join(this.root, 'index.json'), 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { version: SKIN_INDEX_VERSION, skins: [] }
      }
      throw error
    }
    const parsed = JSON.parse(text) as SkinIndex
    const skins = Array.isArray(parsed.skins) ? parsed.skins : []
    return { version: SKIN_INDEX_VERSION, skins: skins.map(normalizeRecord) }
  }

  /** Atomically replace the index document. */
  private async writeIndex(index: SkinIndex): Promise<void> {
    const body = `${JSON.stringify(index, undefined, 2)}\n`
    if (Buffer.byteLength(body, 'utf8') > SKIN_MAX_INDEX_BYTES) {
      throw new Error(`skin index exceeds ${String(SKIN_MAX_INDEX_BYTES)} bytes`)
    }
    const target = join(this.root, 'index.json')
    const temporary = `${target}.tmp`
    await writeFile(temporary, body, 'utf8')
    await rename(temporary, target)
  }

  /** List every stored skin, newest first. */
  async list(): Promise<SkinRecord[]> {
    const index = await this.readIndex()
    return [...index.skins].sort((a, b) => b.updatedAt - a.updatedAt)
  }

  /** Create or replace one skin (asset bytes + metadata) atomically. */
  async save(record: SkinRecord, asset: Buffer): Promise<SkinRecord> {
    return this.enqueue(async () => {
      await mkdir(this.root, { recursive: true })
      if (asset.byteLength > 0) {
        const temporary = `${this.assetPath(record.id)}.tmp`
        await writeFile(temporary, asset)
        await rename(temporary, this.assetPath(record.id))
      }
      const index = await this.readIndex()
      const at = index.skins.findIndex(candidate => candidate.id === record.id)
      if (at >= 0) index.skins[at] = record
      else index.skins.push(record)
      await this.writeIndex(index)
      return record
    })
  }

  /** Remove one skin's asset file and index entry. */
  async remove(id: string): Promise<boolean> {
    return this.enqueue(async () => {
      const index = await this.readIndex()
      const at = index.skins.findIndex(candidate => candidate.id === id)
      if (at < 0) return false
      index.skins.splice(at, 1)
      await this.writeIndex(index)
      await rm(this.assetPath(id), { force: true })
      return true
    })
  }

  /** Rename one skin in place (asset bytes are untouched). */
  async rename(id: string, name: string): Promise<SkinRecord | undefined> {
    return this.enqueue(async () => {
      const index = await this.readIndex()
      const at = index.skins.findIndex(candidate => candidate.id === id)
      if (at < 0) return undefined
      const record: SkinRecord = { ...index.skins[at]!, name, updatedAt: Date.now() }
      index.skins[at] = record
      await this.writeIndex(index)
      return record
    })
  }

  /** Read one skin's asset bytes with its media type. */
  async asset(id: string): Promise<{ body: Buffer; record: SkinRecord } | undefined> {
    const index = await this.readIndex()
    const record = index.skins.find(candidate => candidate.id === id)
    if (record === undefined) return undefined
    try {
      return { body: await readFile(this.assetPath(id)), record }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
      throw error
    }
  }
}

/** Refuse one endpoint with a structured failure. */
function fail(code: string, message: string): EndpointResult {
  return { ok: false, error: { code, message, details: {} } }
}

/**
 * Backfill one stored record with the fields a newer writer may not have
 * saved: the packaged style, and the focal point that replaced the earlier
 * coarse alignment (`position: top|center|bottom`).
 * @param record - stored record, possibly written by an older build.
 * @returns a record whose packaged style and focal point are complete.
 */
function normalizeRecord(record: SkinRecord): SkinRecord {
  const legacyText = record as SkinRecord & { readonly textColor?: unknown }
  const textColor = typeof legacyText.textColor === 'string' ? legacyText.textColor : ''
  const legacyAlign = (record as SkinRecord & { readonly position?: unknown }).position
  const focusX = record.focusX ?? 50
  const focusY = record.focusY ?? (legacyAlign === 'top' ? 0 : legacyAlign === 'bottom' ? 100 : 50)
  if (record.style !== undefined && record.focusY !== undefined) return record
  return {
    ...record,
    focusX,
    focusY,
    style: record.style ?? { ...EMPTY_SKIN_STYLE, textColor },
  }
}

/** Build the record for one save request (new or replaced). */
function recordFor(
  request: SkinSaveRequest,
  bytes: number,
  existing: SkinRecord | undefined,
): SkinRecord {
  const now = Date.now()
  return {
    id: request.id ?? newSkinId(),
    name: request.name,
    kind: request.kind,
    mime: request.mime,
    width: request.width,
    height: request.height,
    frames: request.frames,
    fps: request.fps,
    padding: request.padding,
    radius: request.radius,
    fit: request.fit,
    focusX: request.focusX,
    focusY: request.focusY,
    style: request.style,
    bytes,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
}

/** Response headers shared by GET and HEAD asset responses. */
function assetHeaders(record: SkinRecord): Record<string, string> {
  return {
    'content-type': record.mime,
    'content-length': String(record.bytes),
    // The URL carries `v=<updatedAt>`, so one version can be cached forever.
    'cache-control': 'private, max-age=31536000, immutable',
    etag: `"${record.id}-${String(record.updatedAt)}"`,
    'x-content-type-options': 'nosniff',
  }
}

/**
 * Resolve the harness home (`$DSH_HOME`, else `~/.dsh`) — the same precedence
 * the Host `dsh-home-paths` helper uses, inlined to avoid a peer dependency on
 * a package the plugin does not otherwise need.
 * @returns the absolute harness home.
 */
function harnessHome(): string {
  const configured = process.env.DSH_HOME
  if (configured !== undefined && configured.trim().length > 0) {
    const expanded = configured === '~' ? homedir() : configured.replace(/^~([\\/])/, `${homedir()}$1`)
    return resolve(expanded)
  }
  return join(homedir(), '.dsh')
}

/**
 * Parse one single-range `Range: bytes=` header against a body length.
 * Only the forms a media element emits are supported (start-end, start-, -suffix).
 * @param header - raw header value, or null.
 * @param length - served body length in bytes.
 * @returns the inclusive byte window, undefined when absent/unsupported, or
 *   'unsatisfiable' when the client asked for a window outside the body.
 */
export function parseByteRange(
  header: string | null,
  length: number,
): { start: number; end: number } | undefined | 'unsatisfiable' {
  if (header === null) return undefined
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (match === null) return undefined
  const rawStart = match[1] ?? ''
  const rawEnd = match[2] ?? ''
  if (rawStart === '' && rawEnd === '') return undefined
  let start: number
  let end: number
  if (rawStart === '') {
    // Suffix range: the last N bytes.
    const suffix = Number(rawEnd)
    if (!Number.isFinite(suffix) || suffix <= 0) return 'unsatisfiable'
    start = Math.max(0, length - suffix)
    end = length - 1
  } else {
    start = Number(rawStart)
    end = rawEnd === '' ? length - 1 : Math.min(Number(rawEnd), length - 1)
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= length) {
    return 'unsatisfiable'
  }
  return { start, end }
}

/** Minimal shape of the Host connection seam this module consumes. */
interface SkinConnection {
  rpc: {
    handle(
      channel: string,
      handler: (endpoint: string, payload: unknown, signal: AbortSignal) => Promise<EndpointResult>,
    ): () => Promise<void>
  }
  fetch: {
    register(route: {
      path: string
      methods: readonly ('GET' | 'HEAD')[]
      fetch: (request: Request) => Promise<Response>
    }): () => Promise<void>
  }
}

/**
 * Install the skin asset store on one context that owns `connection`.
 * Both surfaces are cordis-effect owned, so unloading the plugin removes them.
 * @param ctx - context carrying the Host connection seam.
 */
export function installSkinStore(ctx: Context): void {
  const connection = ctx.get('connection') as SkinConnection | undefined
  if (connection === undefined) return
  const store = new SkinStore(join(harnessHome(), 'chat-focus', 'skins'))

  ctx.effect(() => connection.rpc.handle(SKIN_RPC_CHANNEL, async (endpoint, payload) => {
    try {
      switch (endpoint) {
        case 'skins.list':
          return { ok: true, value: { records: await store.list() } }
        case 'skins.save': {
          const checked = validateSkinSave(payload)
          if (!checked.ok) return fail('skins/invalid', checked.message)
          const asset = Buffer.from(checked.value.asset, 'base64')
          // A parameter-only skin legitimately carries no bytes.
          if (asset.byteLength === 0 && checked.value.kind !== 'style') {
            return fail('skins/invalid', 'asset decoded to zero bytes')
          }
          const existing = checked.value.id === undefined
            ? undefined
            : (await store.list()).find(candidate => candidate.id === checked.value.id)
          const record = recordFor(checked.value, asset.byteLength, existing)
          return { ok: true, value: { record: await store.save(record, asset) } }
        }
        case 'skins.delete': {
          const request = payload as SkinDeleteRequest
          if (typeof request?.id !== 'string') return fail('skins/invalid', 'id is required')
          return { ok: true, value: { deleted: await store.remove(request.id) } }
        }
        case 'skins.rename': {
          const request = payload as SkinRenameRequest
          const name = typeof request?.name === 'string' ? request.name.trim() : ''
          if (typeof request?.id !== 'string' || name.length === 0 || name.length > 40) {
            return fail('skins/invalid', 'id and 1..40 character name are required')
          }
          const record = await store.rename(request.id, name)
          return record === undefined
            ? fail('skins/not-found', `unknown skin "${request.id}"`)
            : { ok: true, value: { record } }
        }
        default:
          return fail('skins/unknown-endpoint', `unknown endpoint "${endpoint}"`)
      }
    } catch (error) {
      return fail('skins/internal', error instanceof Error ? error.message : String(error))
    }
  }), 'chat-focus: skin RPC channel')

  ctx.effect(() => connection.fetch.register({
    path: SKIN_ASSET_PATH,
    methods: ['GET', 'HEAD'],
    fetch: async (request) => {
      const url = new URL(request.url)
      const id = url.searchParams.get('id') ?? ''
      const found = await store.asset(id)
      if (found === undefined) return new Response('not found', { status: 404 })
      const headers = assetHeaders(found.record)
      // Range support keeps a video skin seekable and loopable: media elements
      // re-request windows instead of re-downloading the whole asset.
      headers['accept-ranges'] = 'bytes'
      const range = parseByteRange(request.headers.get('range'), found.body.byteLength)
      if (range === 'unsatisfiable') {
        headers['content-range'] = `bytes */${String(found.body.byteLength)}`
        return new Response(null, { status: 416, headers })
      }
      if (range !== undefined) {
        headers['content-range'] = `bytes ${String(range.start)}-${String(range.end)}/${String(found.body.byteLength)}`
        headers['content-length'] = String(range.end - range.start + 1)
        if (request.method === 'HEAD') return new Response(null, { status: 206, headers })
        return new Response(new Uint8Array(found.body.subarray(range.start, range.end + 1)), { status: 206, headers })
      }
      if (request.method === 'HEAD') return new Response(null, { status: 200, headers })
      return new Response(new Uint8Array(found.body), { status: 200, headers })
    },
  }), 'chat-focus: skin asset route')
}
