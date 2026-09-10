/**
 * The render-time projection of one applied skin: the flat shape the backdrop
 * renderer consumes. Derived from a `SkinEntry` plus the URL its bytes load
 * from, so the renderer never touches the registry or the wire record.
 *
 * A skin owns ONLY the artwork and its geometry (slice / padding / radius /
 * fit); every colour, gradient, and text field flows through the per-side
 * ChatFocus settings, which the packaged style seeds when the skin is applied.
 *
 * @module dsh-chat-focus/client/chat/bubbles/skin-render
 */

import type { SkinFit, SkinKind, SkinPadding } from '../../../skin-contract.ts'
import type { SkinEntry } from '../../skins/registry.ts'

/** One applied skin, ready to render. */
export interface SkinRender {
  readonly id: string
  /** Asset URL (host route or inline data URI). */
  readonly url: string
  readonly kind: SkinKind
  readonly padding: SkinPadding
  readonly radius: number
  readonly fit: SkinFit
  /** Focal point in percent of the source. */
  readonly focusX: number
  readonly focusY: number
  readonly frames: number
  readonly fps: number
  /** Source pixel width. */
  readonly width: number
  /** Source pixel height. */
  readonly height: number
}

/**
 * Project one library entry into its render form.
 * @param entry - resolved library entry.
 * @param url - asset URL for this entry (the registry owns URL construction).
 * @returns the flat render descriptor.
 */
export function toSkinRender(entry: SkinEntry, url: string): SkinRender {
  const record = entry.record
  return {
    id: record.id,
    url,
    kind: record.kind,
    padding: record.padding,
    radius: record.radius,
    fit: record.fit,
    focusX: record.focusX,
    focusY: record.focusY,
    frames: record.frames,
    fps: record.fps,
    width: record.width,
    height: record.height,
  }
}
