/**
 * Bubble-skin wire contract shared by the Host asset store and the browser
 * registry. Pure data: no DOM, no node: imports, so both halves (and the
 * client bundle) can consume the same declarations and validators.
 *
 * @module dsh-chat-focus/skin-contract
 */

/** How a skin's asset is drawn inside the bubble backdrop. */
export type SkinKind =
  /** Static bitmap: painted as one layer (fit/焦点). */
  | 'image'
  /** Animated bitmap (GIF/APNG/WebP): whole-layer background, native animation. */
  | 'animated'
  /** Sprite sheet built from video frames or a PNG sequence: stepped translation. */
  | 'sprite'
  /** Video file played by a muted looping `<video>` layer (MP4/WebM). */
  | 'video'
  /** No asset at all: a skin that is only the packaged style. */
  | 'style'

/** Background fit modes a skin may use (the editor's own three). */
export const SKIN_FIT_MODES = ['cover', 'contain', 'stretch'] as const
/** Background fit. */
export type SkinFit = typeof SKIN_FIT_MODES[number]


/** Content padding in CSS pixels. */
export interface SkinPadding {
  readonly top: number
  readonly right: number
  readonly bottom: number
  readonly left: number
}

/**
 * The packaged look a skin carries with its artwork. Every field mirrors an
 * existing per-side ChatFocus setting, so applying a skin writes these into
 * the same fields the settings page edits — a skin is a packaged bundle of
 * the existing bubble-editor features plus media, never a parallel styling
 * system.
 */
export interface SkinStyle {
  /** Fallback backdrop color under/behind the artwork ('' = none). */
  readonly bg: string
  /** Gradient start color ('' = no gradient; overrides a bg image). */
  readonly gradientFrom: string
  readonly gradientTo: string
  /** Gradient angle in degrees, as a string number. */
  readonly gradientAngle: string
  /** Border color ('' = none). */
  readonly border: string
  /** Text-readability overlay, a number string in -100..100. */
  readonly overlay: string
  /** Whole-backdrop opacity percentage 0..100. */
  readonly backdropOpacity: number
  /** Frosted-glass preset: '' | '4px' | '10px' | '18px'. */
  readonly backdropBlur: string
  /** Text color ('' = theme default). */
  readonly textColor: string
  /** Font family stack ('' = theme default). */
  readonly font: string
  /** Font size ('' = theme default). */
  readonly fontSize: string
}

/** Style values a skin ships with when the maker left them untouched. */
export const EMPTY_SKIN_STYLE: SkinStyle = {
  bg: '',
  gradientFrom: '',
  gradientTo: '',
  gradientAngle: '135',
  border: '',
  overlay: '0',
  backdropOpacity: 100,
  backdropBlur: '',
  textColor: '',
  font: '',
  fontSize: '',
}

/** Frosted-glass values a skin may package. */
export const SKIN_BLUR_PRESETS: readonly string[] = ['', '4px', '10px', '18px']

/** One durable skin record: the element type of the Host index document. */
export interface SkinRecord {
  /** Stable identity; `SKIN_ID_PATTERN`. */
  readonly id: string
  /** User-facing name. */
  readonly name: string
  /** Rendering family. */
  readonly kind: SkinKind
  /** Asset media type (drives the served Content-Type). */
  readonly mime: string
  /** Single-frame pixel width (sprite: one frame's width). */
  readonly width: number
  /** Single-frame pixel height (sprite: one frame's height). */
  readonly height: number
  /** Sprite frame count; 1 for image/animated. */
  readonly frames: number
  /** Sprite frame rate; 0 for image/animated. */
  readonly fps: number
  /** Content padding the skin wants around the text. */
  readonly padding: SkinPadding
  /** Corner radius applied to the artwork layer. */
  readonly radius: number
  /** Whole-layer fit; meaningful for `kind === 'animated'` and `kind === 'video'`. */
  readonly fit: SkinFit
  /** Focal point X in percent of the source (50 = centred). */
  readonly focusX: number
  /** Focal point Y in percent of the source (50 = centred). */
  readonly focusY: number
  /** Packaged bubble-editor styling applied together with the artwork. */
  readonly style: SkinStyle
  /** Asset byte length. */
  readonly bytes: number
  /** Epoch ms. */
  readonly createdAt: number
  /** Epoch ms; also the asset cache version stamp. */
  readonly updatedAt: number
}

/** Root object of the Host skin index document. */
export interface SkinIndex {
  readonly version: 1
  readonly skins: SkinRecord[]
}

/** `skins.save` payload: metadata plus the base64 asset body. */
export interface SkinSaveRequest {
  /** Present = update in place; absent = create. */
  readonly id?: string
  readonly name: string
  readonly kind: SkinKind
  readonly mime: string
  readonly width: number
  readonly height: number
  readonly frames: number
  readonly fps: number
  readonly padding: SkinPadding
  readonly radius: number
  readonly fit: SkinFit
  /** Focal point X in percent of the source (50 = centred). */
  readonly focusX: number
  /** Focal point Y in percent of the source (50 = centred). */
  readonly focusY: number
  /** Packaged bubble-editor styling applied together with the artwork. */
  readonly style: SkinStyle
  /** Base64 (no `data:` prefix). */
  readonly asset: string
}

/** `skins.delete` payload. */
export interface SkinDeleteRequest {
  readonly id: string
}

/** `skins.rename` payload. */
export interface SkinRenameRequest {
  readonly id: string
  readonly name: string
}

/** `skins.list` result. */
export interface SkinListResult {
  readonly records: SkinRecord[]
}

/** `skins.save` / `skins.rename` result. */
export interface SkinSaveResult {
  readonly record: SkinRecord
}

/** `skins.delete` result. */
export interface SkinDeleteResult {
  readonly deleted: boolean
}

/** Single-segment authenticated RPC channel owned by the skin store. */
export const SKIN_RPC_CHANNEL = '/chat-focus'

/** Exact authenticated GET route serving skin asset bytes. */
export const SKIN_ASSET_PATH = '/api/chat-focus/skin-asset'

/** Index document schema version. */
export const SKIN_INDEX_VERSION = 1

/** Largest accepted asset body (decoded bytes). */
export const SKIN_MAX_ASSET_BYTES = 8 * 1024 * 1024

/** Largest accepted maker source file (before any conversion). */
export const SKIN_MAX_SOURCE_BYTES = 16 * 1024 * 1024

/** Largest accepted index document (keeps list reads bounded). */
export const SKIN_MAX_INDEX_BYTES = 256 * 1024

/** Largest accepted sprite frame count. */
export const SKIN_MAX_FRAMES = 60

/** Largest accepted skin name length. */
export const SKIN_NAME_MAX = 40

/** Skin id shape: lowercase, digits, dashes; 6..64 chars. */
export const SKIN_ID_PATTERN = /^[a-z0-9][a-z0-9-]{5,63}$/

/** Media types a skin asset may carry. */
export const SKIN_MIME_WHITELIST: readonly string[] = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/apng',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
]

/** Media types only the `video` skin family accepts. */
export const SKIN_VIDEO_MIME_WHITELIST: readonly string[] = ['video/mp4', 'video/webm']

/** Serialized asset URL for one skin version. */
export function skinAssetUrl(id: string, updatedAt: number): string {
  return `${SKIN_ASSET_PATH}?id=${encodeURIComponent(id)}&v=${String(updatedAt)}`
}

/** Mint a fresh skin id (lowercase hex with a dash-free body). */
export function newSkinId(): string {
  const globalCrypto = globalThis.crypto as { randomUUID?: () => string } | undefined
  const raw = globalCrypto?.randomUUID?.() ?? Math.random().toString(36).slice(2).padEnd(32, '0')
  const body = raw.toLowerCase().replace(/[^a-z0-9]/g, '')
  return `s${body}`.slice(0, 33).padEnd(7, '0')
}

/** Clamp one numeric field into a bounded integer. */
function bounded(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return Math.max(min, Math.min(max, Math.round(value)))
}

/** Read one slice/padding side object; every side must be a bounded number. */
function sides(value: unknown, max: number): SkinPadding | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const raw = value as Record<string, unknown>
  const left = bounded(raw.left, 0, max)
  const top = bounded(raw.top, 0, max)
  const right = bounded(raw.right, 0, max)
  const bottom = bounded(raw.bottom, 0, max)
  if (left === undefined || top === undefined || right === undefined || bottom === undefined) return undefined
  return { left, top, right, bottom }
}

/** Read one packaged style object; unknown fields fall back to their defaults. */
function skinStyle(value: unknown): SkinStyle | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const raw = value as Record<string, unknown>
  const text = (key: string, limit: number): string | undefined => {
    const field = raw[key]
    if (field === undefined) return ''
    if (typeof field !== 'string') return undefined
    return field.slice(0, limit)
  }
  const bg = text('bg', 128)
  const gradientFrom = text('gradientFrom', 128)
  const gradientTo = text('gradientTo', 128)
  const border = text('border', 128)
  const overlayRaw = text('overlay', 8)
  const backdropBlur = text('backdropBlur', 8)
  const textColor = text('textColor', 128)
  const font = text('font', 256)
  const fontSize = text('fontSize', 24)
  if (bg === undefined || gradientFrom === undefined || gradientTo === undefined || border === undefined
    || overlayRaw === undefined || backdropBlur === undefined || textColor === undefined
    || font === undefined || fontSize === undefined) return undefined
  const gradientAngleNumber = typeof raw.gradientAngle === 'string'
    ? Number(raw.gradientAngle)
    : typeof raw.gradientAngle === 'number' ? raw.gradientAngle : Number.NaN
  if (!Number.isFinite(gradientAngleNumber)) return undefined
  const gradientAngle = String(Math.max(0, Math.min(360, Math.round(gradientAngleNumber))))
  const overlayNumber = Number(overlayRaw === '' ? '0' : overlayRaw)
  if (!Number.isFinite(overlayNumber)) return undefined
  // Missing numbers fall back to their defaults, like the strings above.
  const backdropOpacity = raw.backdropOpacity === undefined
    ? EMPTY_SKIN_STYLE.backdropOpacity
    : bounded(raw.backdropOpacity, 0, 100)
  if (backdropOpacity === undefined) return undefined
  if (!SKIN_BLUR_PRESETS.includes(backdropBlur)) return undefined
  const overlay = String(Math.max(-100, Math.min(100, Math.round(overlayNumber))))
  return {
    bg, gradientFrom, gradientTo, gradientAngle, border, overlay,
    backdropOpacity, backdropBlur, textColor, font, fontSize,
  }
}

/** Validation outcome for one save request. */
export type SkinSaveValidation =
  | { readonly ok: true; readonly value: SkinSaveRequest }
  | { readonly ok: false; readonly message: string }

/**
 * Validate and normalize one `skins.save` payload (the Host rejects anything
 * this function refuses, so the browser can pre-flight the same rules).
 * @param request - untrusted payload.
 * @returns the normalized request or a human-readable refusal.
 */
export function validateSkinSave(request: unknown): SkinSaveValidation {
  if (typeof request !== 'object' || request === null) return { ok: false, message: 'payload must be an object' }
  const raw = request as Record<string, unknown>
  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  if (name.length === 0 || name.length > SKIN_NAME_MAX) {
    return { ok: false, message: `name must be 1..${String(SKIN_NAME_MAX)} characters` }
  }
  const kind = raw.kind
  if (kind !== 'image' && kind !== 'animated' && kind !== 'sprite' && kind !== 'video' && kind !== 'style') {
    return { ok: false, message: 'kind must be image|animated|sprite|video|style' }
  }
  const mime = typeof raw.mime === 'string' ? raw.mime : ''
  if (kind === 'style') {
    // A parameter-only skin carries no bytes at all.
    if (mime !== '') return { ok: false, message: 'a style skin must not declare a mime' }
  } else {
    if (!SKIN_MIME_WHITELIST.includes(mime)) return { ok: false, message: `unsupported mime "${mime}"` }
    // The family and the media type must agree: a `video` record is played by a
    // <video> layer, the image families by background/border painting.
    if ((kind === 'video') !== SKIN_VIDEO_MIME_WHITELIST.includes(mime)) {
      return { ok: false, message: 'kind and mime disagree (video skins carry video/*, image skins image/*)' }
    }
  }
  const width = bounded(raw.width, 1, 16384)
  const height = bounded(raw.height, 1, 16384)
  if (width === undefined || height === undefined) return { ok: false, message: 'width/height must be 1..16384' }
  const frames = bounded(raw.frames, 1, SKIN_MAX_FRAMES)
  const fps = bounded(raw.fps, 0, 60)
  if (frames === undefined || fps === undefined) return { ok: false, message: 'frames/fps out of range' }
  const padding = sides(raw.padding, 512)
  if (padding === undefined) {
    return { ok: false, message: 'padding must carry four non-negative numbers' }
  }
  const radius = bounded(raw.radius, 0, 512)
  if (radius === undefined) return { ok: false, message: 'radius must be 0..512' }
  const fit: SkinFit = SKIN_FIT_MODES.includes(raw.fit as SkinFit) ? raw.fit as SkinFit : 'cover'
  const focusX = bounded(raw.focusX, 0, 100) ?? 50
  const focusY = bounded(raw.focusY, 0, 100) ?? 50
  // A missing style object is accepted as the empty package: the skin then
  // only owns the artwork, and every bubble field keeps its user value.
  const style = raw.style === undefined ? EMPTY_SKIN_STYLE : skinStyle(raw.style)
  if (style === undefined) return { ok: false, message: 'style must carry the packaged bubble fields' }
  const asset = typeof raw.asset === 'string' ? raw.asset : ''
  if (kind !== 'style') {
    if (asset.length === 0) return { ok: false, message: 'asset is required' }
    // 4/3 is the base64 expansion; a little headroom absorbs padding newlines.
    if (asset.length > Math.ceil(SKIN_MAX_ASSET_BYTES * 4 / 3) + 1024) {
      return { ok: false, message: `asset exceeds ${String(SKIN_MAX_ASSET_BYTES)} bytes` }
    }
  } else if (asset.length !== 0) {
    return { ok: false, message: 'a style skin must not carry an asset' }
  }
  const id = typeof raw.id === 'string' && SKIN_ID_PATTERN.test(raw.id) ? raw.id : undefined
  if (raw.id !== undefined && id === undefined) return { ok: false, message: 'invalid skin id' }
  return {
    ok: true,
    value: { ...id === undefined ? {} : { id }, name, kind, mime, width, height, frames, fps, padding, radius, fit, focusX, focusY, style, asset },
  }
}
