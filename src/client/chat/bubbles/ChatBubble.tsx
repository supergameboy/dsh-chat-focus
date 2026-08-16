// ChatBubble: themeable chat-bubble chrome for assistant text replies —
// DeepSeek fish logo, HH:MM (calendar-aware) time, the compact density
// variant, and user-defined colors/border/radius/width/background image via
// CSS variables. The default look mirrors the host user bubble (deepseek
// theme blue), so the two sides stay consistent out of the box.

import { memo } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import clsx from 'clsx'
import { FishLogo } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './ChatBubble.module.css'

/** Clock label for one message timestamp (HH:MM; calendar date when older than today). */
export function bubbleTimeLabel(time: number, now: number): string {
  const date = new Date(time)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const clock = `${hours}:${minutes}`
  const today = new Date(now)
  if (date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate()) {
    return clock
  }
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${clock}`
}

/** User-defined bubble chrome overrides (empty string = theme default). */
export interface ChatBubbleCustomStyle {
  /** CSS color for the bubble background. */
  readonly bg?: string
  /** CSS color for the bubble border. */
  readonly border?: string
  /** CSS length for the bubble corner radius. */
  readonly radius?: string
  /** CSS length for the bubble max width. */
  readonly maxWidth?: string
  /** Background image URL or data URI. */
  readonly bgImage?: string
  /** Background-image fit: cover | contain | stretch (100% 100%). */
  readonly bgSize?: 'cover' | 'contain' | 'stretch'
  /** CSS color for the bubble text. */
  readonly textColor?: string
  /** CSS font family for the bubble text. */
  readonly font?: string
  /** CSS length for the bubble font size. */
  readonly fontSize?: string
  /** CSS padding shorthand for the bubble content box. */
  readonly padding?: string
}

/** Full props of one bubble row. */
export interface ChatBubbleProps {
  /** Which side the bubble belongs to. */
  readonly role: 'user' | 'assistant'
  /** Compact density preset. */
  readonly compact: boolean
  /** Message timestamp (epoch ms); omitted hides the clock. */
  readonly time?: number
  /** Custom chrome overrides. */
  readonly custom?: ChatBubbleCustomStyle
  /** Bubble content (the host row rendering). */
  readonly children: ReactNode
}

/** Bubble chrome wrapper: role icon + clock header and the themed container. */
export const ChatBubble = memo(function ChatBubble({
  role, compact, time, custom, children,
}: ChatBubbleProps) {
  const customVars: Record<string, string> = {}
  if (custom !== undefined) {
    if (custom.bg !== undefined && custom.bg !== '') customVars['--cf-bubble-bg'] = custom.bg
    if (custom.border !== undefined && custom.border !== '') customVars['--cf-bubble-border'] = custom.border
    if (custom.radius !== undefined && custom.radius !== '') {
      customVars['--cf-bubble-radius'] = custom.radius
      customVars['--cf-bubble-corner'] = custom.radius
    }
    if (custom.bgImage !== undefined && custom.bgImage !== '') customVars['--cf-bubble-bg-image'] = custom.bgImage
    if (custom.bgSize !== undefined) {
      customVars['--cf-bubble-bg-size'] = custom.bgSize === 'stretch' ? '100% 100%' : custom.bgSize
    }
    if (custom.textColor !== undefined && custom.textColor !== '') {
      customVars['--cf-bubble-text-color'] = custom.textColor
      // The markdown body colors itself with the host label token; overriding
      // the token on this container propagates the custom color inside.
      customVars['--dsw-alias-label-primary'] = custom.textColor
    }
    if (custom.font !== undefined && custom.font !== '') customVars['--cf-bubble-font'] = custom.font
    if (custom.fontSize !== undefined && custom.fontSize !== '') customVars['--cf-bubble-font-size'] = custom.fontSize
    if (custom.padding !== undefined && custom.padding !== '') customVars['--cf-bubble-padding'] = custom.padding
  }
  const bubbleStyle: Record<string, string> = {}
  if (custom?.maxWidth !== undefined && custom.maxWidth !== '') {
    bubbleStyle['--cf-bubble-max-width'] = custom.maxWidth
  }
  return (
    <div className={clsx(css.bubble, role === 'user' ? css.user : css.assistant, compact && css.compact)} style={bubbleStyle as CSSProperties}>
      <div className={css.header}>
        <span className={css.roleIcon} aria-hidden>
          <FishLogo size={14} />
        </span>
        {time !== undefined && (
          <span className={css.clock}>{bubbleTimeLabel(time, Date.now())}</span>
        )}
      </div>
      <div className={css.content} style={customVars as CSSProperties}>{children}</div>
    </div>
  )
})
