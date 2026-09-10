/**
 * Browser-side skin registry: the single source the chat bubbles and the
 * settings panels read. Durable records come from the Host asset store over
 * the authenticated RPC channel; built-in skins ship with the bundle as inline
 * data URIs and need no round trip.
 *
 * @module dsh-chat-focus/client/skins/registry
 */

import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import {
  SKIN_RPC_CHANNEL, skinAssetUrl,
  type SkinRecord, type SkinSaveRequest,
} from '../../skin-contract.ts'

/** Load lifecycle of the durable half of the library. */
export type SkinStatus = 'idle' | 'loading' | 'ready' | 'unavailable'

/** Observable library snapshot. */
export interface SkinState {
  readonly status: SkinStatus
  readonly records: readonly SkinRecord[]
  /** Human-readable reason when `status === 'unavailable'`. */
  readonly error?: string
}

/** One renderable skin: durable record plus the URL its bytes load from. */
export interface SkinEntry {
  readonly record: SkinRecord
  /** Asset URL (host route for durable skins, data URI for built-ins). */
  readonly url: string
  /** Built-ins are read-only: no rename/delete. */
  readonly builtin: boolean
}

/** One `client-request` envelope reply. */
interface RpcReply {
  readonly type?: unknown
  readonly rpcId?: unknown
  readonly result?: { readonly ok?: unknown; readonly value?: unknown; readonly error?: { readonly message?: unknown } }
}

/** Mint a correlation id without importing the connection client half. */
function correlationId(): string {
  const globalCrypto = globalThis.crypto as { randomUUID?: () => string } | undefined
  return globalCrypto?.randomUUID?.() ?? `cf-${String(Date.now())}-${Math.random().toString(36).slice(2)}`
}

/**
 * Invoke one skin-store endpoint over the host's authenticated RPC channel.
 * @param endpoint - endpoint name (`skins.list` …).
 * @param payload - JSON payload.
 * @returns the endpoint value.
 */
async function callEndpoint<T>(endpoint: string, payload: unknown): Promise<T> {
  const rpcId = correlationId()
  const response = await fetch(`${SKIN_RPC_CHANNEL}/${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId, method: endpoint, payload }),
  })
  if (!response.ok) throw new Error(`skin store unreachable (HTTP ${String(response.status)})`)
  const body = await response.json() as RpcReply
  if (body.type !== 'server-response' || body.rpcId !== rpcId || typeof body.result !== 'object' || body.result === null) {
    throw new Error('skin store returned an invalid response')
  }
  if (body.result.ok !== true) {
    const message = typeof body.result.error?.message === 'string' ? body.result.error.message : 'request rejected'
    throw new Error(message)
  }
  return body.result.value as T
}

/** Read one base64 body for a Blob. */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('cannot read the generated asset'))
        return
      }
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.onerror = () => { reject(new Error('cannot read the generated asset')) }
    reader.readAsDataURL(blob)
  })
}

/** Bubble-skin library shared by the chat view and the settings page. */
export class SkinRegistry {
  /** Observable state; components subscribe through `useSyncExternalStore`. */
  readonly state: SnapshotStore<SkinState> = createSnapshotStore<SkinState>({ status: 'idle', records: [] })

  private entries: SkinEntry[] = []

  /** @param builtins - bundle-provided read-only skins. */
  constructor(private readonly builtins: readonly SkinEntry[]) {
    this.entries = [...builtins]
    this.publish('idle', [])
  }

  /** Every known skin, built-ins first. */
  list(): readonly SkinEntry[] {
    return this.entries
  }

  /** Resolve one applied skin id. */
  resolve(id: string): SkinEntry | undefined {
    if (id === '') return undefined
    return this.entries.find(entry => entry.record.id === id)
  }

  /** Asset URL of one entry. */
  urlOf(entry: SkinEntry): string {
    return entry.builtin ? entry.url : skinAssetUrl(entry.record.id, entry.record.updatedAt)
  }

  /** Whether the durable half is usable (a failed probe disables the maker). */
  get available(): boolean {
    return this.state.getSnapshot().status !== 'unavailable'
  }

  /** Publish a snapshot, rebuilding the renderable entry list. */
  private publish(status: SkinStatus, records: readonly SkinRecord[], error?: string): void {
    this.entries = [
      ...this.builtins,
      ...records.map(record => ({ record, url: skinAssetUrl(record.id, record.updatedAt), builtin: false })),
    ]
    this.state.set(error === undefined ? { status, records } : { status, records, error })
  }

  /**
   * Load the durable library. A transport failure marks the library
   * unavailable (the maker hides itself) but keeps built-ins usable.
   * @param force - reload even when already ready.
   */
  async load(force = false): Promise<void> {
    const current = this.state.getSnapshot()
    if (!force && (current.status === 'loading' || current.status === 'ready')) return
    this.publish('loading', current.records)
    try {
      const result = await callEndpoint<{ records: SkinRecord[] }>('skins.list', {})
      this.publish('ready', result.records)
    } catch (error) {
      this.publish('unavailable', [], error instanceof Error ? error.message : String(error))
    }
  }

  /** Persist one skin (create or replace) and refresh the list. */
  async save(request: SkinSaveRequest): Promise<SkinRecord> {
    const result = await callEndpoint<{ record: SkinRecord }>('skins.save', request)
    await this.load(true)
    return result.record
  }

  /** Delete one durable skin. */
  async remove(id: string): Promise<void> {
    await callEndpoint<{ deleted: boolean }>('skins.delete', { id })
    await this.load(true)
  }

  /** Rename one durable skin. */
  async rename(id: string, name: string): Promise<void> {
    await callEndpoint<{ record: SkinRecord }>('skins.rename', { id, name })
    await this.load(true)
  }
}
