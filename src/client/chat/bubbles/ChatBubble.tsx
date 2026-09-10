// ChatBubble: the ONE themeable chat-bubble chrome shared by both roles —
// assistant replies (DeepSeek fish logo + HH:MM header) and user messages
// (clock-only, right-aligned header). User-defined colors/border/radius/
// width/background image/opacity/blur and an applied bubble skin arrive via
// CSS variables and the backdrop layer. Default look mirrors the DeepSeek
// theme blue on both sides, so the two sides stay consistent.

import { memo } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import clsx from 'clsx'
import { FishLogo } from '@deepseek-ai/dsh-client-ui-primitives'
import { BubbleBackdrop } from './BubbleBackdrop.tsx'
import type { SkinRender } from './skin-render.ts'
import { paddingShorthand } from '../../skins/geometry.ts'
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
  /** Background image URL or data URI (also accepts gradient functions). */
  readonly bgImage?: string
  /** Background-image fit: cover | contain | stretch (100% 100%). */
  readonly bgSize?: 'cover' | 'contain' | 'stretch'
  /** Background-image vertical alignment for cover/stretch fits. */
  readonly bgPosition?: string
  /** Text-readability overlay: a signed percentage string (-100 = solid
   *  black, 0 = none, +100 = solid white); legacy CSS colors pass through. */
  readonly overlay?: string
  /** Whole-backdrop opacity percentage ('' or '100' = opaque). */
  readonly backdropOpacity?: string
  /** Frosted-glass blur length ('' = off). */
  readonly backdropBlur?: string
  /** Applied bubble skin; when present it owns the backdrop and padding. */
  readonly skin?: SkinRender | undefined
  /** CSS color for the bubble text. */
  readonly textColor?: string
  /** CSS font family for the bubble text. */
  readonly font?: string
  /** CSS length for the bubble font size. */
  readonly fontSize?: string
  /** CSS padding shorthand for the bubble content box. */
  readonly padding?: string
}

/** Build a valid CSS value for `background-image`: URLs and data URIs must be
 *  wrapped in url(); gradient functions are used as-is. */
export function bgImageCssValue(value: string): string {
  const trimmed = value.trim()
  if (trimmed.startsWith('url(')) return value
  if (trimmed.startsWith('data:') || trimmed.startsWith('http://')
    || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
    return `url("${value.replace(/"/g, '\\"')}")`
  }
  return value
}

/** Map a stored focal point (or a legacy alignment name) to CSS. */
export function bgPositionCss(position: string | undefined): string | undefined {
  if (position === undefined || position === '') return undefined
  if (position === 'top') return '50% 0%'
  if (position === 'bottom') return '50% 100%'
  if (position === 'center') return undefined // the CSS fallback 50% 50% applies
  return position
}

/** Map a signed overlay percentage (-100..+100) to a CSS overlay color:
 *  negative dims with black, positive lifts with white, 0 means none.
 *  Non-numeric strings (legacy CSS colors) pass through unchanged. */
export function overlayCss(value: string): string | undefined {
  if (value === '') return undefined
  const strength = Number(value)
  if (Number.isNaN(strength)) return value
  if (strength === 0) return undefined
  const alpha = Math.min(1, Math.abs(strength) / 100).toFixed(2)
  return strength < 0 ? `rgba(0, 0, 0, ${alpha})` : `rgba(255, 255, 255, ${alpha})`
}

/** Full props of one bubble row. */
export interface ChatBubbleProps {
  /** Which side the bubble belongs to (drives header chrome and alignment). */
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

/** Bubble chrome wrapper: role-aware header (fish logo + clock for the
 *  assistant, clock only for the user) and the themed container. */
export const ChatBubble = memo(function ChatBubble({
  role, compact, time, custom, children,
}: ChatBubbleProps) {
  const skin = custom?.skin
  const customVars: Record<string, string> = {}
  if (custom !== undefined) {
    // Colour, gradient, image, readability overlay, opacity, glass, and text
    // always flow from the user's settings — a skin only owns the artwork
    // geometry (radius + content inset), and its packaged style seeds these
    // fields when it is applied.
    if (custom.bg !== undefined && custom.bg !== '') customVars['--cf-bubble-bg'] = custom.bg
    if (custom.border !== undefined && custom.border !== '') customVars['--cf-bubble-border'] = custom.border
    if (custom.bgImage !== undefined && custom.bgImage !== '') {
      customVars['--cf-bubble-bg-image'] = bgImageCssValue(custom.bgImage)
    }
    if (custom.bgSize !== undefined) {
      customVars['--cf-bubble-bg-size'] = custom.bgSize === 'stretch' ? '100% 100%' : custom.bgSize
    }
    const bgPosition = bgPositionCss(custom.bgPosition)
    if (bgPosition !== undefined) customVars['--cf-bubble-bg-position'] = bgPosition
    if (custom.overlay !== undefined && custom.overlay !== '') {
      const overlay = overlayCss(custom.overlay)
      if (overlay !== undefined) customVars['--cf-bubble-overlay'] = overlay
    }
    if (skin === undefined) {
      if (custom.radius !== undefined && custom.radius !== '') customVars['--cf-bubble-radius'] = custom.radius
      if (custom.padding !== undefined && custom.padding !== '') customVars['--cf-bubble-padding'] = custom.padding
    } else {
      // The artwork defines the silhouette and the content inset it wants.
      const radius = skin.radius
      customVars['--cf-bubble-radius'] = `${String(radius)}px`
      customVars['--cf-bubble-padding'] = paddingShorthand(skin.padding)
    }
    if (custom.textColor !== undefined && custom.textColor !== '') {
      customVars['--cf-bubble-text-color'] = custom.textColor
      // The markdown body colors itself with the host label token; overriding
      // the token on this container propagates the custom color inside.
      customVars['--dsw-alias-label-primary'] = custom.textColor
    }
    if (custom.font !== undefined && custom.font !== '') customVars['--cf-bubble-font'] = custom.font
    if (custom.fontSize !== undefined && custom.fontSize !== '') customVars['--cf-bubble-font-size'] = custom.fontSize
  }
  const bubbleStyle: Record<string, string> = {}
  if (custom?.maxWidth !== undefined && custom.maxWidth !== '') {
    bubbleStyle['--cf-bubble-max-width'] = custom.maxWidth
  }
  const showHeader = role === 'assistant' || time !== undefined
  return (
    <div className={clsx(css.bubble, role === 'user' ? css.user : css.assistant, compact && css.compact)} style={bubbleStyle as CSSProperties}>
      {showHeader && (
        <div className={css.header}>
          {role === 'assistant' && (
            <span className={css.roleIcon} aria-hidden>
              <FishLogo size={14} />
            </span>
          )}
          {time !== undefined && (
            <span className={css.clock}>{bubbleTimeLabel(time, Date.now())}</span>
          )}
        </div>
      )}
      <div className={css.content} style={customVars as CSSProperties}>
        <BubbleBackdrop
          {...skin === undefined ? {} : { skin }}
          {...custom?.backdropOpacity === undefined ? {} : { opacity: custom.backdropOpacity }}
          {...custom?.backdropBlur === undefined ? {} : { blur: custom.backdropBlur }}
        />
        <div className={css.body}>{children}</div>
      </div>
    </div>
  )
})
