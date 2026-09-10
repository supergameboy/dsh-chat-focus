/**
 * Bubble-skin geometry: pure functions mapping a skin record onto the CSS the
 * backdrop renderer applies. Kept free of React and DOM so the arithmetic
 * (sprite stepping, focal positioning) is unit-testable under node.
 *
 * @module dsh-chat-focus/client/skins/geometry
 */

import type { SkinFit, SkinPadding } from '../../skin-contract.ts'

/** Largest padding value accepted from the editor. */
const SIDE_MAX = 512

/** Sprite animation parameters for one frame count. */
export interface SpriteFrames {
  /** `steps()` count: exactly `frames - 1`. */
  readonly steps: number
  /** Keyframe end position as a percentage of the sprite element's width. */
  readonly endPercent: number
  /** One loop's duration in seconds. */
  readonly durationSeconds: number
}

/**
 * Stepped-translation parameters for one sprite.
 *
 * The sprite element is `frames × 100%` wide and shows one frame per step. A
 * `translateX` percentage resolves against the element's own width, so frame
 * `k` sits at `-k/frames × 100%`. `steps(frames - 1)` yields the discrete
 * values `i/(frames-1)` of the keyframe range, so the end position must be
 * `-((frames - 1)/frames) × 100%` to land exactly on every frame.
 * @param frames - frame count.
 * @param fps - playback rate; non-positive falls back to 12.
 * @returns parameters, or null when the sprite is effectively static.
 */
export function spriteFrames(frames: number, fps: number): SpriteFrames | null {
  const count = Math.round(frames)
  if (!Number.isFinite(count) || count <= 1) return null
  const rate = Number.isFinite(fps) && fps > 0 ? fps : 12
  return {
    steps: count - 1,
    endPercent: -((count - 1) / count) * 100,
    durationSeconds: count / rate,
  }
}

/** CSS width of the sprite strip element (one frame per 100%). */
export function spriteElementWidth(frames: number): string {
  const count = Math.max(1, Math.round(frames))
  return `${String(count * 100)}%`
}

/** Sanitized keyframes name for one skin version (ids are already lowercase). */
export function spriteKeyframesName(id: string, frames: number): string {
  return `cf-sprite-${id.replace(/[^a-z0-9-]/g, '')}-${String(Math.max(1, Math.round(frames)))}`
}

/** CSS `background-size` for one whole-layer fit mode. */
export function layerBackgroundSize(fit: SkinFit): string {
  if (fit === 'cover') return 'cover'
  if (fit === 'contain') return 'contain'
  return '100% 100%'
}

/**
 * CSS `background-position` for one focal point, so the part the author
 * cares about always stays visible under a covering fit.
 * @param focusX - focal X in percent of the source (0..100).
 * @param focusY - focal Y in percent of the source (0..100).
 * @returns the CSS `background-position` value.
 */
export function focusBackgroundPosition(focusX: number, focusY: number): string {
  const x = Math.max(0, Math.min(100, focusX))
  const y = Math.max(0, Math.min(100, focusY))
  return `${String(Math.round(x))}% ${String(Math.round(y))}%`
}

/**
 * `object-fit` for the video layer. `stretch` maps to `fill` so a video skin
 * can be authored to the bubble's aspect ratio, matching the background path.
 * @param fit - whole-layer fit mode.
 * @returns the CSS `object-fit` keyword.
 */
export function videoObjectFit(fit: SkinFit): 'cover' | 'contain' | 'fill' {
  if (fit === 'cover') return 'cover'
  if (fit === 'contain') return 'contain'
  return 'fill'
}

/** Clamp a padding record into the accepted range. */
export function clampPadding(padding: SkinPadding): SkinPadding {
  const side = (value: number): number => Number.isFinite(value)
    ? Math.max(0, Math.min(Math.round(value), SIDE_MAX))
    : 0
  return {
    top: side(padding.top),
    right: side(padding.right),
    bottom: side(padding.bottom),
    left: side(padding.left),
  }
}

/** Render a padding record as a CSS shorthand. */
export function paddingShorthand(padding: SkinPadding): string {
  const { top, right, bottom, left } = clampPadding(padding)
  return `${String(top)}px ${String(right)}px ${String(bottom)}px ${String(left)}px`
}
