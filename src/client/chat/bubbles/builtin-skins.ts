/**
 * Built-in bubble skins: three read-only SVG backdrops that
 * ship with the bundle (no host round trip). They double as authoring examples
 * — each is a 120x120 canvas with a uniform middle region, so the maker's
 * slice values (14px) keep the corners crisp at any bubble size.
 *
 * @module dsh-chat-focus/client/chat/bubbles/builtin-skins
 */

import type { SkinEntry } from '../../skins/registry.ts'
import { EMPTY_SKIN_STYLE, type SkinRecord } from '../../../skin-contract.ts'

/** Wrap one SVG body as a data URI background source. */
function svg(body: string): string {
  const markup = '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" '
    + 'viewBox="0 0 120 120" preserveAspectRatio="none">' + body + '</svg>'
  return `data:image/svg+xml,${encodeURIComponent(markup)}`
}

const BUILTIN_PADDING = { top: 6, right: 10, bottom: 6, left: 10 }

/** Build one built-in entry. */
function builtin(
  id: string,
  name: string,
  url: string,
  textColor: string,
): SkinEntry {
  const record: SkinRecord = {
    id,
    name,
    kind: 'image',
    mime: 'image/svg+xml',
    width: 120,
    height: 120,
    frames: 1,
    fps: 0,
    padding: BUILTIN_PADDING,
    radius: 0,
    fit: 'stretch',
    focusX: 50,
    focusY: 50,
    style: { ...EMPTY_SKIN_STYLE, textColor },
    bytes: url.length,
    createdAt: 0,
    updatedAt: 0,
  }
  return { record, url, builtin: true }
}

/** 柔和蓝：浅蓝渐变 + 细边框，与默认主题最接近。 */
const SOFT = svg(
  '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">'
  + '<stop offset="0" stop-color="#f2f7ff"/><stop offset="1" stop-color="#dbeafe"/>'
  + '</linearGradient></defs>'
  + '<rect x="0.5" y="0.5" width="119" height="119" rx="12" fill="url(#g)" stroke="#c3d8ff"/>',
)

/** 玻璃拟态：半透明白 + 高光描边，透出会话背景。 */
const GLASS = svg(
  '<rect x="0.5" y="0.5" width="119" height="119" rx="12" fill="#ffffff" fill-opacity="0.42" stroke="#ffffff" stroke-opacity="0.75"/>',
)

/** 暗夜：深色填充 + 冷灰描边，配浅色文字。 */
const NIGHT = svg(
  '<rect x="0.5" y="0.5" width="119" height="119" rx="12" fill="#1f2937" stroke="#3f4b5e"/>',
)

/** Every built-in skin, in display order. */
export const BUILTIN_SKINS: readonly SkinEntry[] = [
  builtin('builtin-soft', '柔和蓝', SOFT, ''),
  builtin('builtin-glass', '玻璃拟态', GLASS, ''),
  builtin('builtin-night', '暗夜', NIGHT, '#f3f4f6'),
]
