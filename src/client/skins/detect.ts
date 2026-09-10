/**
 * Media sniffing for the skin maker: decide what a user's files actually are
 * (static image / animated image / video / PNG sequence) from MIME plus a few
 * header bytes, and read pixel dimensions without uploading anything.
 *
 * @module dsh-chat-focus/client/skins/detect
 */

import { SKIN_MAX_SOURCE_BYTES } from '../../skin-contract.ts'

/** How the maker should treat the selected files. */
export type MediaKind = 'image' | 'animated' | 'sequence' | 'video' | 'style'

/** One decoded image header. */
export interface ImageInfo {
  /** Intrinsic pixel width (SVG without intrinsic size falls back to 300). */
  readonly width: number
  /** Intrinsic pixel height (SVG without intrinsic size falls back to 150). */
  readonly height: number
  /** Whether the file carries multiple frames (GIF/APNG/animated WebP). */
  readonly animated: boolean
}

/** Files selected for one skin, classified. */
export interface DetectedMedia {
  readonly kind: MediaKind
  readonly files: File[]
  /** First-file dimensions when known (sequence/video: measured on prepare). */
  readonly info?: ImageInfo
}

const VIDEO_MIME = /^video\//
const IMAGE_MIME = /^image\//

/** ASCII bytes at an offset, for magic-number checks. */
function ascii(bytes: Uint8Array, offset: number, length: number): string {
  let out = ''
  for (let i = offset; i < offset + length && i < bytes.length; i += 1) out += String.fromCharCode(bytes[i]!)
  return out
}

/** Whether the byte prefix contains a chunk/extension name (case-sensitive). */
function containsAscii(bytes: Uint8Array, needle: string, limit = 4096): boolean {
  const end = Math.min(bytes.length, limit)
  outer: for (let i = 0; i + needle.length <= end; i += 1) {
    for (let j = 0; j < needle.length; j += 1) {
      if (bytes[i + j] !== needle.charCodeAt(j)) continue outer
    }
    return true
  }
  return false
}

/**
 * Decide whether an image file is animated by inspecting its container.
 * GIF: the Netscape looping extension (written by every animated encoder).
 * PNG: an `acTL` chunk marks APNG. WebP: an `ANIM` chunk marks animation.
 * @param bytes - file prefix (a few KB is enough).
 * @returns true when the container declares multiple frames.
 */
export function sniffAnimated(bytes: Uint8Array): boolean {
  if (ascii(bytes, 0, 3) === 'GIF') return containsAscii(bytes, 'NETSCAPE2.0') || countGifFrames(bytes) > 1
  if (ascii(bytes, 1, 3) === 'PNG') return containsAscii(bytes, 'acTL')
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return containsAscii(bytes, 'ANIM')
  return false
}

/** Count GIF image-descriptor separators as a fallback animation signal. */
function countGifFrames(bytes: Uint8Array): number {
  let frames = 0
  for (let i = 0; i < bytes.length; i += 1) {
    if (bytes[i] === 0x2c) frames += 1
    if (frames > 1) return frames
  }
  return frames
}

/** Read the first `limit` bytes of one file. */
async function prefix(file: File, limit = 4096): Promise<Uint8Array> {
  const slice = file.slice(0, limit)
  return new Uint8Array(await slice.arrayBuffer())
}

/**
 * Decode intrinsic dimensions through an `<img>` element (works for every
 * browser-supported format, including SVG).
 * @param file - image file.
 * @returns pixel dimensions and the animation flag.
 */
export async function inspectImage(file: File): Promise<ImageInfo> {
  const animated = sniffAnimated(await prefix(file))
  const url = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => { resolve(element) }
      element.onerror = () => { reject(new Error(`cannot decode ${file.name}`)) }
      element.src = url
    })
    return {
      // An SVG without width/height reports 0 here; 300x150 is the CSS default.
      width: image.naturalWidth > 0 ? image.naturalWidth : 300,
      height: image.naturalHeight > 0 ? image.naturalHeight : 150,
      animated,
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Classify the maker's file selection.
 * @param files - selected files in user order.
 * @returns the detected kind plus the first image's decoded info when cheap.
 */
export async function detectMedia(files: File[]): Promise<DetectedMedia> {
  if (files.length === 0) throw new Error('no files selected')
  // Bound the source before any decoding work: a 200MB video would otherwise
  // stall the wizard before the user learns it can never be stored.
  const limitMb = SKIN_MAX_SOURCE_BYTES / (1024 * 1024)
  for (const file of files) {
    if (file.size > SKIN_MAX_SOURCE_BYTES) {
      throw new Error(`${file.name} exceeds ${String(limitMb)}MB`)
    }
  }
  if (files.length > 1) return { kind: 'sequence', files }
  const file = files[0]!
  if (VIDEO_MIME.test(file.type)) return { kind: 'video', files }
  if (IMAGE_MIME.test(file.type) || /\.(png|jpe?g|webp|gif|apng|svg)$/i.test(file.name)) {
    const info = await inspectImage(file)
    return { kind: info.animated ? 'animated' : 'image', files, info }
  }
  throw new Error(`unsupported file type: ${file.type || file.name}`)
}

/** Natural-order comparator for frame filenames (`frame2` before `frame10`). */
export function naturalOrder(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

/** Intrinsic geometry of one video file. */
export interface VideoInfo {
  /** Pixel width (falls back to 640 when the container reports nothing). */
  readonly width: number
  /** Pixel height (falls back to 360). */
  readonly height: number
  /** Duration in seconds (0 when unknown). */
  readonly duration: number
}

/**
 * Read a video's intrinsic size and duration through a `<video>` element.
 * Used by the maker's "play the file directly" route, which stores the video
 * as-is instead of baking frames into a sprite sheet.
 * @param file - video file.
 * @returns pixel dimensions and duration.
 */
export async function inspectVideo(file: File): Promise<VideoInfo> {
  const url = URL.createObjectURL(file)
  try {
    const element = await new Promise<HTMLVideoElement>((resolve, reject) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.muted = true
      video.onloadedmetadata = () => { resolve(video) }
      video.onerror = () => { reject(new Error(`cannot decode ${file.name}`)) }
      video.src = url
    })
    return {
      width: element.videoWidth > 0 ? element.videoWidth : 640,
      height: element.videoHeight > 0 ? element.videoHeight : 360,
      duration: Number.isFinite(element.duration) ? element.duration : 0,
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}
