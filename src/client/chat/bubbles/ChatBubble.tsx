// ChatBubble: themeable chat-bubble chrome for assistant text replies —
// role icon, HH:MM (calendar-aware) time, the compact density variant, and
// user-defined colors/border/radius/width/background image via CSS variables.

import { memo } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import clsx from 'clsx'
import { IconThinkOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
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
  }
  const bubbleStyle: Record<string, string> = {}
  if (custom?.maxWidth !== undefined && custom.maxWidth !== '') {
    bubbleStyle['--cf-bubble-max-width'] = custom.maxWidth
  }
  return (
    <div className={clsx(css.bubble, role === 'user' ? css.user : css.assistant, compact && css.compact)} style={bubbleStyle as CSSProperties}>
      <div className={css.header}>
        <span className={css.roleIcon} aria-hidden>
          <IconThinkOutline16 size={14} />
        </span>
        {time !== undefined && (
          <span className={css.clock}>{bubbleTimeLabel(time, Date.now())}</span>
        )}
      </div>
      <div className={css.content} style={customVars as CSSProperties}>{children}</div>
    </div>
  )
})
