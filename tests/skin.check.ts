/** Behavioral checks for the bubble-skin geometry, sniffing, and validation. */
import assert from 'node:assert/strict'
import {
  clampPadding, focusBackgroundPosition, layerBackgroundSize, paddingShorthand,
  spriteElementWidth, spriteFrames, spriteKeyframesName, videoObjectFit,
} from '../src/client/skins/geometry.ts'
import { naturalOrder, sniffAnimated } from '../src/client/skins/detect.ts'
import { skinStylePatch } from '../src/client/chat/bubbles/chrome.ts'
import {
  newSkinId, SKIN_ID_PATTERN, skinAssetUrl, validateSkinSave,
  type SkinSaveRequest, type SkinStyle,
} from '../src/skin-contract.ts'

/** Build a byte array from a mixed ascii/byte spec. */
const bytes = (...parts: (string | number | readonly number[])[]): Uint8Array => {
  const out: number[] = []
  for (const part of parts) {
    if (typeof part === 'number') out.push(part)
    else if (typeof part === 'string') for (const character of part) out.push(character.charCodeAt(0))
    else out.push(...part)
  }
  return new Uint8Array(out)
}

// ── TC-17/18: sprite stepping ────────────────────────────────────────────────
assert.equal(spriteFrames(1, 12), null, 'a single frame is static')
assert.equal(spriteFrames(0, 12), null, 'zero frames is static')
const four = spriteFrames(4, 8)
assert.ok(four !== null)
assert.equal(four.steps, 3, 'steps = frames - 1')
assert.equal(four.endPercent, -75, 'end = -(frames-1)/frames * 100')
assert.equal(four.durationSeconds, 0.5, 'duration = frames / fps')
assert.equal(spriteFrames(6, 0)?.durationSeconds, 0.5, 'non-positive fps falls back to 12')
assert.equal(spriteElementWidth(24), '2400%')
assert.equal(spriteElementWidth(0), '100%')
assert.equal(spriteKeyframesName('sabc-123', 9), 'cf-sprite-sabc-123-9')

// ── TC-06/07/08: container sniffing ──────────────────────────────────────────
assert.equal(sniffAnimated(bytes('GIF89a', 'NETSCAPE2.0', '...')), true, 'GIF loop extension marks animation')
assert.equal(sniffAnimated(bytes('GIF89a', 'only one frame')), false, 'a single-frame GIF is static')
assert.equal(sniffAnimated(bytes([0x89], 'PNG', [0x0d, 0x0a, 0x1a, 0x0a], 'acTL', '...')), true, 'PNG acTL marks APNG')
assert.equal(sniffAnimated(bytes([0x89], 'PNG', [0x0d, 0x0a, 0x1a, 0x0a], 'IHDR', '...')), false, 'plain PNG is static')
assert.equal(sniffAnimated(bytes('RIFF', [0, 0, 0, 0], 'WEBP', 'VP8X', 'ANIM')), true, 'WebP ANIM marks animation')
assert.equal(sniffAnimated(bytes('RIFF', [0, 0, 0, 0], 'WEBP', 'VP8X', 'ALPH')), false, 'static WebP is static')
assert.equal(sniffAnimated(bytes('GIF89a', [0x2c], 'x', [0x2c])), true, 'two GIF image descriptors mark animation')

// ── TC-19: asset URL + id shape ──────────────────────────────────────────────
assert.equal(skinAssetUrl('sabc', 1700000000000), '/api/chat-focus/skin-asset?id=sabc&v=1700000000000')
assert.ok(skinAssetUrl('a b', 1).includes('id=a%20b'), 'ids are URL-encoded')
assert.ok(SKIN_ID_PATTERN.test(newSkinId()), 'minted ids satisfy the wire pattern')
assert.ok(newSkinId() !== newSkinId(), 'ids are unique')

// ── TC-20: save validation ───────────────────────────────────────────────────
const valid: SkinSaveRequest = {
  name: '我的皮肤',
  kind: 'image',
  mime: 'image/png',
  width: 120,
  height: 120,
  frames: 1,
  fps: 0,
  slice: { left: 10, top: 10, right: 10, bottom: 10 },
  padding: { top: 8, right: 12, bottom: 8, left: 12 },
  radius: 0,
  fit: 'stretch',
  textColor: '',
  asset: 'aGVsbG8=',
}
assert.equal(validateSkinSave(valid).ok, true, 'a complete request passes')
assert.equal(validateSkinSave({ ...valid, name: '' }).ok, false, 'an empty name is refused')
assert.equal(validateSkinSave({ ...valid, name: 'x'.repeat(41) }).ok, false, 'an over-long name is refused')
assert.equal(validateSkinSave({ ...valid, kind: 'gif' }).ok, false, 'an unknown kind is refused')
assert.equal(validateSkinSave({ ...valid, mime: 'text/html' }).ok, false, 'a non-image mime is refused')
assert.equal(validateSkinSave({ ...valid, asset: '' }).ok, false, 'a missing asset is refused')
assert.equal(validateSkinSave({ ...valid, asset: 'A'.repeat(Math.ceil(8 * 1024 * 1024 * 4 / 3) + 2048) }).ok, false,
  'an over-limit asset is refused')

// ── TC-28: packaged style ────────────────────────────────────────────────────
const packaged: SkinStyle = {
  bg: '#eef2ff',
  gradientFrom: '',
  gradientTo: '',
  gradientAngle: '135',
  border: '#c7d2fe',
  overlay: '-35',
  backdropOpacity: 60,
  backdropBlur: '10px',
  textColor: '#1f2937',
  font: '',
  fontSize: '14px',
}
const styleResult = validateSkinSave({ ...valid, style: packaged })
assert.ok(styleResult.ok, 'a fully packaged style passes')
if (styleResult.ok) {
  assert.equal(styleResult.value.style.backdropOpacity, 60, 'opacity survives the round trip')
  assert.equal(styleResult.value.style.overlay, '-35', 'the overlay survives the round trip')
}
assert.equal(validateSkinSave({ ...valid, style: { ...valid.style, backdropBlur: 'blur(99px)' } }).ok, false,
  'an unlisted glass preset is refused')
assert.equal(validateSkinSave({ ...valid, style: { ...valid.style, backdropOpacity: '40' } }).ok, false,
  'a non-numeric opacity is refused')
const bare = validateSkinSave({ ...valid, style: undefined })
assert.ok(bare.ok, 'a missing style object is the empty package')
if (bare.ok) {
  assert.equal(bare.value.style.bg, '', 'the empty package owns no colour')
  assert.equal(bare.value.style.backdropOpacity, 100, 'the empty package stays fully opaque')
}
const angle = validateSkinSave({ ...valid, style: { ...valid.style, gradientAngle: 760 } })
assert.ok(angle.ok, 'a numeric angle normalizes')
if (angle.ok) assert.equal(angle.value.style.gradientAngle, '360', 'an out-of-range angle clamps to 360')

// ── TC-29: applying a package writes the side's fields ──────────────────────
const applied = skinStylePatch(packaged, 'assistant')
assert.equal(applied.focusBubbleBg, '#eef2ff', 'the packaged colour lands on the side field')
assert.equal(applied.focusBubbleBackdropOpacity, 60, 'the packaged opacity lands on the side field')
assert.equal(applied.focusBubbleTextColor, '#1f2937', 'the packaged text colour lands on the side field')
assert.equal(applied.focusBubbleGradientFrom, '', 'no packaged gradient leaves the field empty')
const gradientPatch = skinStylePatch({ ...packaged, gradientFrom: '#fff', bg: '#000' }, 'user')
assert.equal(gradientPatch.focusUserBubbleBgImage, '', 'a packaged gradient clears the background image')
assert.equal(gradientPatch.focusUserBubbleGradientFrom, '#fff', 'the gradient lands on the side field')
const legacyPatch = skinStylePatch(undefined, 'assistant')
assert.equal(legacyPatch.focusBubbleBg, '', 'a record without a package applies as the empty package')
assert.equal(legacyPatch.focusBubbleBackdropOpacity, 100, 'the empty package stays fully opaque')
assert.equal(validateSkinSave({ ...valid, id: 'BAD ID' }).ok, false, 'a malformed id is refused')
assert.equal(validateSkinSave({ ...valid, width: 0 }).ok, true, 'numeric fields are normalized, not rejected')
assert.equal(validateSkinSave({ ...valid, width: 0, height: Number.NaN }).ok, false, 'a non-numeric size is refused')
assert.equal(validateSkinSave(null).ok, false, 'a non-object payload is refused')
const normalized = validateSkinSave({ ...valid, name: '  皮肤  ', fit: 'weird', textColor: 42 })
assert.equal(normalized.ok, true)
if (normalized.ok) {
  assert.equal(normalized.value.name, '皮肤', 'names are trimmed')
  assert.equal(normalized.value.fit, 'cover', 'an unknown fit falls back to cover')
  assert.equal(normalized.value.style.textColor, '', 'a stray legacy field does not reach the package')
}

// ── TC-30: parameter-only skins + whole-layer alignment ─────────────────────
const styleOnly: SkinSaveRequest = {
  ...valid,
  kind: 'style',
  mime: '',
  width: 1,
  height: 1,
  asset: '',
}
assert.equal(validateSkinSave(styleOnly).ok, true, 'a parameter-only skin passes with no bytes')
assert.equal(validateSkinSave({ ...styleOnly, asset: 'aGVsbG8=' }).ok, false, 'a style skin must not carry an asset')
assert.equal(validateSkinSave({ ...styleOnly, mime: 'image/png' }).ok, false, 'a style skin must not declare a mime')
const aligned = validateSkinSave({ ...valid, fit: 'contain' })
assert.ok(aligned.ok, 'a whole-layer fit passes')
if (aligned.ok) assert.equal(aligned.value.fit, 'contain', 'contain survives the round trip')
const fallback = validateSkinSave({ ...valid, fit: 'weird' })
assert.ok(fallback.ok, 'an unknown fit is normalized')
if (fallback.ok) assert.equal(fallback.value.fit, 'cover', 'an unknown fit falls back to cover')
assert.equal(layerBackgroundSize('contain'), 'contain', 'contain maps through')
assert.equal(focusBackgroundPosition(25, 75), '25% 75%', 'the focal point maps to background-position')
assert.equal(focusBackgroundPosition(-5, 500), '0% 100%', 'a focal point is clamped into the source')
assert.equal(videoObjectFit('contain'), 'contain', 'video contain maps through')
// ── Frame ordering ───────────────────────────────────────────────────────────
const frames = ['frame10.png', 'frame2.png', 'frame1.png']
assert.deepEqual([...frames].sort(naturalOrder), ['frame1.png', 'frame2.png', 'frame10.png'],
  'frame names sort naturally')

// ── TC-23/24: video family ───────────────────────────────────────────────────
const video: SkinSaveRequest = { ...valid, kind: 'video', mime: 'video/mp4', width: 640, height: 360 }
assert.equal(validateSkinSave(video).ok, true, 'a video request passes')
assert.equal(validateSkinSave({ ...video, mime: 'video/webm' }).ok, true, 'WebM is accepted')
assert.equal(validateSkinSave({ ...video, mime: 'video/ogg' }).ok, false, 'an unlisted video mime is refused')
assert.equal(validateSkinSave({ ...valid, kind: 'video' }).ok, false, 'an image mime cannot back a video skin')
assert.equal(validateSkinSave({ ...video, mime: 'image/png' }).ok, false, 'a video kind needs a video mime')
const legacyNine = validateSkinSave({ ...valid, fit: 'nine' })
assert.ok(legacyNine.ok, 'a legacy nine-slice fit is normalized, not rejected')
if (legacyNine.ok) assert.equal(legacyNine.value.fit, 'cover', 'nine-slice normalizes to cover')
const focused = validateSkinSave({ ...valid, focusX: 20, focusY: 80 })
assert.ok(focused.ok, 'a focal point passes')
if (focused.ok) {
  assert.equal(focused.value.focusX, 20, 'focusX survives the round trip')
  assert.equal(focused.value.focusY, 80, 'focusY survives the round trip')
}
const clampedFocus = validateSkinSave({ ...valid, focusX: -20, focusY: 300 })
assert.ok(clampedFocus.ok)
if (clampedFocus.ok) {
  assert.equal(clampedFocus.value.focusX, 0, 'focusX clamps to 0')
  assert.equal(clampedFocus.value.focusY, 100, 'focusY clamps to 100')
}
assert.equal(videoObjectFit('cover'), 'cover', 'cover maps through to object-fit')
assert.equal(videoObjectFit('stretch'), 'fill', 'stretch maps to object-fit: fill')

console.log('skin checks: all passed')
