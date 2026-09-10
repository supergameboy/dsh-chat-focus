/** ChatFocus bubble-chrome builders: one settings section in, one role's
 *  custom style out. Shared by the Chat view rows and the settings preview. */

import type { ChatSettings } from '../../../chat-settings.ts'
import { EMPTY_SKIN_STYLE, type SkinStyle } from '../../../skin-contract.ts'
import type { ChatBubbleCustomStyle } from './ChatBubble.tsx'
import { toSkinRender, type SkinRender } from './skin-render.ts'
import type { SkinRegistry } from '../../skins/registry.ts'

/** One side's bubble chrome fields (assistant or user). */
interface BubbleSideFields {
  bg: string
  border: string
  radius: string
  maxWidth: string
  bgImage: string
  bgSize: ChatSettings['focusBubbleBgSize']
  bgPosition: string
  overlay: string
  backdropOpacity: number
  backdropBlur: string
  gradientFrom: string
  gradientTo: string
  gradientAngle: string
  textColor: string
  font: string
  fontSize: string
  padding: string
}

/** Build the custom-style object for one bubble side; a gradient overrides the
 *  background image (GUI-edited fields, no hand-written CSS needed). Both
 *  roles share this builder — the unified ChatBubble chrome consumes it. */
export function bubbleCustom(side: BubbleSideFields, skin?: SkinRender): ChatBubbleCustomStyle {
  const gradient = side.gradientFrom !== ''
  return {
    bg: gradient ? 'transparent' : side.bg,
    border: side.border,
    radius: side.radius,
    maxWidth: side.maxWidth,
    bgImage: gradient
      ? `linear-gradient(${side.gradientAngle}deg, ${side.gradientFrom}, ${side.gradientTo !== '' ? side.gradientTo : side.gradientFrom})`
      : side.bgImage,
    bgSize: side.bgSize,
    bgPosition: side.bgPosition,
    overlay: side.overlay,
    backdropOpacity: String(side.backdropOpacity),
    backdropBlur: side.backdropBlur,
    ...skin === undefined ? {} : { skin },
    textColor: side.textColor,
    font: side.font,
    fontSize: side.fontSize,
    padding: side.padding,
  }
}

/** Assistant-side custom chrome from one ChatFocus section. */
export function assistantBubbleCustom(focus: ChatSettings, skins: SkinRegistry): ChatBubbleCustomStyle {
  return bubbleCustom({
    bg: focus.focusBubbleBg,
    border: focus.focusBubbleBorder,
    radius: focus.focusBubbleRadius,
    maxWidth: focus.focusBubbleMaxWidth,
    bgImage: focus.focusBubbleBgImage,
    bgSize: focus.focusBubbleBgSize,
    bgPosition: focus.focusBubbleBgPosition,
    overlay: focus.focusBubbleOverlay,
    backdropOpacity: focus.focusBubbleBackdropOpacity,
    backdropBlur: focus.focusBubbleBackdropBlur,
    gradientFrom: focus.focusBubbleGradientFrom,
    gradientTo: focus.focusBubbleGradientTo,
    gradientAngle: focus.focusBubbleGradientAngle,
    textColor: focus.focusBubbleTextColor,
    font: focus.focusBubbleFont,
    fontSize: focus.focusBubbleFontSize,
    padding: focus.focusBubblePadding,
  }, resolveSkin(skins, focus.focusBubbleSkin))
}

/** User-side chrome for the unified bubble, from one ChatFocus section. */
export interface UserBubbleChrome {
  /** Compact density preset. */
  readonly compact: boolean
  /** Custom chrome overrides. */
  readonly custom: ChatBubbleCustomStyle
}

/** User-side chrome for the unified bubble, from one ChatFocus section. */
export function userBubbleChrome(focus: ChatSettings, skins: SkinRegistry): UserBubbleChrome {
  return {
    compact: focus.focusBubbleStyle === 'compact',
    custom: bubbleCustom({
      bg: focus.focusUserBubbleBg,
      border: focus.focusUserBubbleBorder,
      radius: focus.focusUserBubbleRadius,
      maxWidth: focus.focusUserBubbleMaxWidth,
      bgImage: focus.focusUserBubbleBgImage,
      bgSize: focus.focusUserBubbleBgSize,
      bgPosition: focus.focusUserBubbleBgPosition,
      overlay: focus.focusUserBubbleOverlay,
      backdropOpacity: focus.focusUserBubbleBackdropOpacity,
      backdropBlur: focus.focusUserBubbleBackdropBlur,
      gradientFrom: focus.focusUserBubbleGradientFrom,
      gradientTo: focus.focusUserBubbleGradientTo,
      gradientAngle: focus.focusUserBubbleGradientAngle,
      textColor: focus.focusUserBubbleTextColor,
      font: focus.focusUserBubbleFont,
      fontSize: focus.focusUserBubbleFontSize,
      padding: focus.focusUserBubblePadding,
    }, resolveSkin(skins, focus.focusUserBubbleSkin)),
  }
}

/**
 * Resolve one applied skin id into its render form.
 * @param skins - library registry.
 * @param id - applied skin id ('' = none).
 * @returns the render descriptor, or undefined when unset/unknown or when the
 *   skin carries no artwork (a parameter-only skin renders from its package).
 */
export function resolveSkin(skins: SkinRegistry, id: string): SkinRender | undefined {
  const entry = skins.resolve(id)
  if (entry === undefined || entry.record.kind === 'style') return undefined
  return toSkinRender(entry, skins.urlOf(entry))
}

/** Per-side field suffixes the packaged style writes (see chat-settings). */
const STYLE_FIELD_SUFFIXES = {
  bg: 'Bg',
  border: 'Border',
  gradientFrom: 'GradientFrom',
  gradientTo: 'GradientTo',
  gradientAngle: 'GradientAngle',
  overlay: 'Overlay',
  backdropOpacity: 'BackdropOpacity',
  backdropBlur: 'BackdropBlur',
  textColor: 'TextColor',
  font: 'Font',
  fontSize: 'FontSize',
} as const satisfies Record<keyof SkinStyle, string>

/**
 * Turn one skin's packaged style into a patch over the per-side ChatFocus
 * fields, so applying a skin is a preset-style write into the SAME fields the
 * settings page edits. Mutual exclusions match the editor's own rules: a
 * packaged gradient disables the background image, a plain background clears
 * the gradient. A record without a package (written by an older host build)
 * applies as the empty package instead of throwing.
 * @param style - the skin's packaged style, when present.
 * @param side - bubble side the skin lands on.
 * @returns the field patch to write together with the skin id.
 */
export function skinStylePatch(
  style: SkinStyle | undefined,
  side: 'assistant' | 'user',
): Partial<ChatSettings> {
  const packaged = style ?? EMPTY_SKIN_STYLE
  const prefix = side === 'assistant' ? 'focusBubble' : 'focusUserBubble'
  const patch: Record<string, unknown> = {}
  for (const [key, suffix] of Object.entries(STYLE_FIELD_SUFFIXES) as [keyof SkinStyle, string][]) {
    patch[`${prefix}${suffix}`] = packaged[key]
  }
  if (packaged.gradientFrom !== '') patch[`${prefix}BgImage`] = ''
  else if (packaged.bg !== '' || packaged.gradientFrom === '') patch[`${prefix}GradientFrom`] = ''
  return patch as Partial<ChatSettings>
}
