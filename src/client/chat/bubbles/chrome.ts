/** ChatFocus bubble-chrome builders: one settings section in, one role's
 *  custom style out. Shared by the Chat view rows and the settings preview. */

import type { ChatSettings } from '../../../chat-settings.ts'
import type { ChatBubbleCustomStyle } from './ChatBubble.tsx'

/** One side's bubble chrome fields (assistant or user). */
interface BubbleSideFields {
  bg: string
  border: string
  radius: string
  maxWidth: string
  bgImage: string
  bgSize: ChatSettings['focusBubbleBgSize']
  bgPosition: 'top' | 'center' | 'bottom'
  overlay: string
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
export function bubbleCustom(side: BubbleSideFields): ChatBubbleCustomStyle {
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
    textColor: side.textColor,
    font: side.font,
    fontSize: side.fontSize,
    padding: side.padding,
  }
}

/** Assistant-side custom chrome from one ChatFocus section. */
export function assistantBubbleCustom(focus: ChatSettings): ChatBubbleCustomStyle {
  return bubbleCustom({
    bg: focus.focusBubbleBg,
    border: focus.focusBubbleBorder,
    radius: focus.focusBubbleRadius,
    maxWidth: focus.focusBubbleMaxWidth,
    bgImage: focus.focusBubbleBgImage,
    bgSize: focus.focusBubbleBgSize,
    bgPosition: focus.focusBubbleBgPosition,
    overlay: focus.focusBubbleOverlay,
    gradientFrom: focus.focusBubbleGradientFrom,
    gradientTo: focus.focusBubbleGradientTo,
    gradientAngle: focus.focusBubbleGradientAngle,
    textColor: focus.focusBubbleTextColor,
    font: focus.focusBubbleFont,
    fontSize: focus.focusBubbleFontSize,
    padding: focus.focusBubblePadding,
  })
}

/** User-side chrome for the unified bubble, from one ChatFocus section. */
export interface UserBubbleChrome {
  /** Compact density preset. */
  readonly compact: boolean
  /** Custom chrome overrides. */
  readonly custom: ChatBubbleCustomStyle
}

/** User-side chrome for the unified bubble, from one ChatFocus section. */
export function userBubbleChrome(focus: ChatSettings): UserBubbleChrome {
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
      gradientFrom: focus.focusUserBubbleGradientFrom,
      gradientTo: focus.focusUserBubbleGradientTo,
      gradientAngle: focus.focusUserBubbleGradientAngle,
      textColor: focus.focusUserBubbleTextColor,
      font: focus.focusUserBubbleFont,
      fontSize: focus.focusUserBubbleFontSize,
      padding: focus.focusUserBubblePadding,
    }),
  }
}
