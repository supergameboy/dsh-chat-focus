/**
 * Sprite-sheet construction for the skin maker: turn a video or a PNG
 * sequence into ONE horizontal sheet that the runtime animates with a stepped
 * translation. Nothing here runs at render time — the maker only produces the
 * asset, so chat rendering never decodes video.
 *
 * @module dsh-chat-focus/client/skins/sprite
 */

import { SKIN_MAX_FRAMES } from '../../skin-contract.ts'
import { naturalOrder } from './detect.ts'

/** Largest sprite-sheet dimension browsers handle reliably. */
const MAX_SHEET_EDGE = 16384
/** Longest single-frame seek before the build is considered stuck. */
const SEEK_TIMEOUT_MS = 5000

/** Parameters shared by both builders. */
export interface SpriteOptions {
  /** Target per-frame width in pixels. */
  readonly frameWidth: number
  /** Desired frame count (video: sampled evenly; sequence: capped). */
  readonly frameCount: number
  /** Playback rate stored on the record. */
  readonly fps: number
  /** Video only: first sampled second. */
  readonly startSeconds?: number
  /** Video only: sampled span in seconds. */
  readonly durationSeconds?: number
}

/** One built sprite sheet. */
export interface SpriteResult {
  readonly blob: Blob
  readonly mime: string
  /** Per-frame pixel width. */
  readonly width: number
  /** Per-frame pixel height. */
  readonly height: number
  readonly frames: number
  readonly fps: number
  /** Source file names that could not be decoded and were skipped. */
  readonly skipped: readonly string[]
}

/** Progress tick for the wizard's progress bar. */
export interface SpriteProgress {
  readonly done: number
  readonly total: number
  readonly label: string
}

/** Build a sprite sheet from a video's frames. */
export type SpriteBuilder = (
  input: File | File[],
  options: SpriteOptions,
  onProgress: (progress: SpriteProgress) => void,
  signal: AbortSignal,
) => Promise<SpriteResult>

/** Throw when the caller cancelled the build. */
function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new DOMException('aborted', 'AbortError')
}

/** Yield one task so React can paint progress between frames. */
function yieldTask(): Promise<void> {
  return new Promise(resolve => { setTimeout(resolve, 0) })
}

/** Fit a per-frame size into the sheet budget. */
function frameBox(naturalWidth: number, naturalHeight: number, target: number, count: number): { width: number; height: number } {
  const ratio = naturalHeight > 0 ? naturalHeight / Math.max(1, naturalWidth) : 1
  let width = Math.max(32, Math.min(Math.round(target), 1024))
  if (width * count > MAX_SHEET_EDGE) width = Math.max(16, Math.floor(MAX_SHEET_EDGE / count))
  let height = Math.max(1, Math.round(width * ratio))
  if (height > MAX_SHEET_EDGE) {
    height = MAX_SHEET_EDGE
    width = Math.max(16, Math.round(height / Math.max(0.0001, ratio)))
  }
  return { width, height }
}

/** Draw a whole image/video frame with contain fit into one sheet cell. */
function drawContained(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  box: { width: number; height: number },
  offsetX: number,
): void {
  const scale = Math.min(box.width / Math.max(1, sourceWidth), box.height / Math.max(1, sourceHeight))
  const width = sourceWidth * scale
  const height = sourceHeight * scale
  context.drawImage(
    source,
    offsetX + (box.width - width) / 2,
    (box.height - height) / 2,
    width,
    height,
  )
}

/** Encode a canvas, preferring the requested type. */
function encode(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => { blob === null ? reject(new Error(`cannot encode ${mime}`)) : resolve(blob) },
      mime,
      quality,
    )
  })
}

/** Seek a video element and resolve once the frame is ready. */
function seek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const target = Math.abs(video.currentTime - time) < 0.0005 ? time + 0.001 : time
    const cleanup = (): void => {
      window.clearTimeout(timer)
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onError)
    }
    const onSeeked = (): void => { cleanup(); resolve() }
    const onError = (): void => { cleanup(); reject(new Error('video decode failed')) }
    const timer = window.setTimeout(() => {
      cleanup()
      reject(new Error('video seek timed out'))
    }, SEEK_TIMEOUT_MS)
    video.addEventListener('seeked', onSeeked)
    video.addEventListener('error', onError)
    video.currentTime = Math.max(0, target)
  })
}

/** Wait for one media element event (or its error counterpart). */
function once(element: HTMLVideoElement, ready: string, failure: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = (): void => {
      element.removeEventListener(ready, onReady)
      element.removeEventListener(failure, onError)
    }
    const onReady = (): void => { cleanup(); resolve() }
    const onError = (): void => { cleanup(); reject(new Error('cannot decode video')) }
    element.addEventListener(ready, onReady)
    element.addEventListener(failure, onError)
  })
}

/**
 * Sample a video evenly and compose the frames into one horizontal sheet.
 * Frames are drawn as JPEG (video has no alpha); the skin's radius clip gives
 * the bubble its shape.
 * @param file - video file.
 * @param options - sampling parameters.
 * @param onProgress - per-frame progress callback.
 * @param signal - cancellation.
 * @returns the encoded sheet plus its frame geometry.
 */
export async function buildSpriteFromVideo(
  file: File,
  options: SpriteOptions,
  onProgress: (progress: SpriteProgress) => void,
  signal: AbortSignal,
): Promise<SpriteResult> {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.src = url
  try {
    await once(video, 'loadedmetadata', 'error')
    throwIfAborted(signal)
    const naturalWidth = video.videoWidth
    const naturalHeight = video.videoHeight
    if (naturalWidth === 0 || naturalHeight === 0) throw new Error('video has no decodable video track')
    const total = video.duration
    if (!Number.isFinite(total) || total <= 0) throw new Error('video duration is unknown')
    const start = Math.max(0, Math.min(options.startSeconds ?? 0, Math.max(0, total - 0.05)))
    const span = Math.max(0.05, Math.min(options.durationSeconds ?? total - start, total - start))
    const count = Math.max(2, Math.min(Math.round(options.frameCount), SKIN_MAX_FRAMES))
    const box = frameBox(naturalWidth, naturalHeight, options.frameWidth, count)
    const canvas = document.createElement('canvas')
    canvas.width = box.width * count
    canvas.height = box.height
    const context = canvas.getContext('2d')
    if (context === null) throw new Error('canvas 2d context unavailable')
    for (let index = 0; index < count; index += 1) {
      throwIfAborted(signal)
      const time = start + (span * (index + 0.5)) / count
      await seek(video, Math.min(time, start + span - 0.001))
      context.drawImage(video, index * box.width, 0, box.width, box.height)
      onProgress({ done: index + 1, total: count, label: `${String(index + 1)}/${String(count)}` })
      await yieldTask()
    }
    throwIfAborted(signal)
    const blob = await encode(canvas, 'image/jpeg', 0.9)
    return {
      blob,
      mime: 'image/jpeg',
      width: box.width,
      height: box.height,
      frames: count,
      fps: Math.max(1, Math.min(Math.round(options.fps), 60)),
      skipped: [],
    }
  } finally {
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(url)
  }
}

/** Decode one image file into an element (caller owns the object URL). */
function loadImage(url: string, name: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => { resolve(image) }
    image.onerror = () => { reject(new Error(`cannot decode ${name}`)) }
    image.src = url
  })
}

/** Longest side a static skin artwork is normalized to. */
export const ARTWORK_MAX_EDGE = 256

/**
 * Normalize one static artwork to a bounded canonical size.
 *
 * `border-image-slice` counts source pixels, so a 1024px artwork would need a
 * 100+px frame on screen. Re-encoding to a small canonical size keeps the
 * source and display scales equal and shrinks the stored bytes. Artwork
 * already within budget passes through untouched (no quality loss).
 * @param file - source image.
 * @param maxEdge - longest allowed side in pixels.
 * @returns the (possibly re-encoded) asset and its dimensions.
 */
export async function normalizeArtwork(
  file: File,
  maxEdge = ARTWORK_MAX_EDGE,
): Promise<{ blob: Blob; mime: string; width: number; height: number }> {
  const url = URL.createObjectURL(file)
  try {
    const image = await loadImage(url, file.name)
    const width = image.naturalWidth > 0 ? image.naturalWidth : 300
    const height = image.naturalHeight > 0 ? image.naturalHeight : 150
    if (Math.max(width, height) <= maxEdge) {
      return { blob: file, mime: file.type || 'image/png', width, height }
    }
    const scale = maxEdge / Math.max(width, height)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    const context = canvas.getContext('2d')
    if (context === null) throw new Error('canvas 2d context unavailable')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    // WebP keeps the alpha channel and stays small; PNG is the fallback.
    const webp = await encode(canvas, 'image/webp', 0.92)
    const blob = webp.type === 'image/webp' ? webp : await encode(canvas, 'image/png')
    return { blob, mime: blob.type, width: canvas.width, height: canvas.height }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Compose a PNG sequence into one horizontal sheet, preserving alpha.
 * Frames are naturally ordered by filename and capped at the skin frame limit;
 * a frame that cannot be decoded is skipped and reported, and only an all-fail
 * selection aborts the build.
 * @param files - the selected PNG frames.
 * @param options - frame geometry and rate.
 * @param onProgress - per-frame progress callback.
 * @param signal - cancellation.
 * @returns the encoded sheet plus its frame geometry and skipped file names.
 */
export async function buildSpriteFromSequence(
  files: File[],
  options: SpriteOptions,
  onProgress: (progress: SpriteProgress) => void,
  signal: AbortSignal,
): Promise<SpriteResult> {
  const ordered = [...files].sort((a, b) => naturalOrder(a.name, b.name)).slice(0, SKIN_MAX_FRAMES)
  if (ordered.length === 0) throw new Error('no frames selected')
  const urls: string[] = []
  try {
    const images: HTMLImageElement[] = []
    const skipped: string[] = []
    for (const [index, file] of ordered.entries()) {
      throwIfAborted(signal)
      const url = URL.createObjectURL(file)
      urls.push(url)
      try {
        images.push(await loadImage(url, file.name))
      } catch {
        // One unreadable frame must not lose the whole animation.
        skipped.push(file.name)
      }
      onProgress({ done: index + 1, total: ordered.length, label: `${String(index + 1)}/${String(ordered.length)}` })
    }
    if (images.length === 0) throw new Error('no frame could be decoded')
    const first = images[0]!
    const box = frameBox(first.naturalWidth, first.naturalHeight, options.frameWidth, images.length)
    const canvas = document.createElement('canvas')
    canvas.width = box.width * images.length
    canvas.height = box.height
    const context = canvas.getContext('2d')
    if (context === null) throw new Error('canvas 2d context unavailable')
    images.forEach((image, index) => {
      drawContained(context, image, image.naturalWidth, image.naturalHeight, box, index * box.width)
    })
    throwIfAborted(signal)
    onProgress({ done: images.length, total: images.length, label: `${String(images.length)}/${String(images.length)}` })
    const blob = await encode(canvas, 'image/png')
    return {
      blob,
      mime: 'image/png',
      width: box.width,
      height: box.height,
      frames: images.length,
      fps: Math.max(1, Math.min(Math.round(options.fps), 60)),
      skipped,
    }
  } finally {
    for (const url of urls) URL.revokeObjectURL(url)
  }
}
