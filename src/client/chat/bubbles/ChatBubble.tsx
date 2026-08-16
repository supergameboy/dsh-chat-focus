// ChatBubble: themeable chat-bubble chrome around user/assistant rows —
// role icon, HH:MM (calendar-aware) time, and the compact density variant.

import { memo } from 'react'
import type { ReactNode } from 'react'
import clsx from 'clsx'
import { IconThinkOutline16, IconUserOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
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

/** Full props of one bubble row. */
export interface ChatBubbleProps {
  /** Which side the bubble belongs to. */
  readonly role: 'user' | 'assistant'
  /** Compact density preset. */
  readonly compact: boolean
  /** Message timestamp (epoch ms); omitted hides the clock. */
  readonly time?: number
  /** Bubble content (the host row rendering). */
  readonly children: ReactNode
}

/** Bubble chrome wrapper: role icon + clock header and the themed container. */
export const ChatBubble = memo(function ChatBubble({
  role, compact, time, children,
}: ChatBubbleProps) {
  const RoleIcon = role === 'user' ? IconUserOutline16 : IconThinkOutline16
  return (
    <div className={clsx(css.bubble, role === 'user' ? css.user : css.assistant, compact && css.compact)}>
      <div className={css.header}>
        <span className={css.roleIcon} aria-hidden>
          <RoleIcon size={14} />
        </span>
        {time !== undefined && (
          <span className={css.clock}>{bubbleTimeLabel(time, Date.now())}</span>
        )}
      </div>
      <div className={css.content}>{children}</div>
    </div>
  )
})
