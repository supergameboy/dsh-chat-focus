/** Busy-Enter preference and ChatFocus display settings stored in the Host user-settings document. */

import z from '@deepseek-ai/schemastery'

/** Settings namespace owned by the conversation plugin (shared with the host ui-conversation row; the fork replaces that row and extends the schema). */
export const CONVERSATION_SETTINGS_NAMESPACE = 'ui-conversation'

/** Field carrying the delivery mode for plain Enter while an agent is busy. */
export const BUSY_ENTER_FIELD = 'busyEnter'

/** Busy-Enter behaviors accepted at settings and input boundaries. */
export const BUSY_ENTER_BEHAVIORS = ['queue', 'steer'] as const

/** Configurable meaning of plain Enter while the addressed agent is busy. */
export type BusyEnterBehavior = typeof BUSY_ENTER_BEHAVIORS[number]

/** Default preserves Enter-as-Queue for running conversations. */
export const DEFAULT_BUSY_ENTER_BEHAVIOR: BusyEnterBehavior = 'queue'

// ── ChatFocus display settings (fork extension) ─────────────────────────────

/** Master switch: when false the focus view passes nodes through in original order. */
export const FOCUS_ENABLED_FIELD = 'focusEnabled'
/** Chat bubble chrome for user/assistant text replies. */
export const FOCUS_BUBBLES_FIELD = 'focusBubbles'
/** Most recent N replies whose runtime runs render expanded (older runs fold). */
export const FOCUS_KEEP_VISIBLE_FIELD = 'focusKeepVisible'
/** Whether fold boxes start expanded. */
export const FOCUS_DEFAULT_OPEN_FIELD = 'focusDefaultOpen'
/** Whether the fold summary line (counts + tool names) renders. */
export const FOCUS_SUMMARY_FIELD = 'focusSummary'
/** Fold strategy modes; v0.1 implements keep-recent only. */
export const FOCUS_STRATEGIES = ['keep-recent', 'threshold', 'always'] as const
export type FocusFoldStrategy = typeof FOCUS_STRATEGIES[number]
/** Fold strategy field name. */
export const FOCUS_STRATEGY_FIELD = 'focusStrategy'
/** Bubble style presets. */
export const FOCUS_BUBBLE_STYLES = ['default', 'compact'] as const
export type FocusBubbleStyle = typeof FOCUS_BUBBLE_STYLES[number]
/** Bubble style field name. */
export const FOCUS_BUBBLE_STYLE_FIELD = 'focusBubbleStyle'
/** Whether text-less reasoning steps join the runtime run. */
export const FOCUS_REASONING_FIELD = 'focusReasoning'
/** Custom assistant-bubble background (CSS color; empty = theme default). */
export const FOCUS_BUBBLE_BG_FIELD = 'focusBubbleBg'
/** Custom assistant-bubble border color (CSS color; empty = theme default). */
export const FOCUS_BUBBLE_BORDER_FIELD = 'focusBubbleBorder'
/** Custom assistant-bubble corner radius (CSS length; empty = theme default). */
export const FOCUS_BUBBLE_RADIUS_FIELD = 'focusBubbleRadius'
/** Custom assistant-bubble max width (CSS length; empty = theme default). */
export const FOCUS_BUBBLE_MAX_WIDTH_FIELD = 'focusBubbleMaxWidth'
/** Custom assistant-bubble background image (URL or data URI; empty = none). */
export const FOCUS_BUBBLE_BG_IMAGE_FIELD = 'focusBubbleBgImage'
/** Bubble template id ('' = none/custom); selecting one fills the custom fields. */
export const FOCUS_BUBBLE_PRESET_FIELD = 'focusBubblePreset'
/** Custom user-bubble background (CSS color; empty = theme default deepseek blue). */
export const FOCUS_USER_BUBBLE_BG_FIELD = 'focusUserBubbleBg'
/** Custom assistant-bubble text color (CSS color; empty = theme default). */
export const FOCUS_BUBBLE_TEXT_COLOR_FIELD = 'focusBubbleTextColor'
/** Custom assistant-bubble font family (CSS value; empty = theme default). */
export const FOCUS_BUBBLE_FONT_FIELD = 'focusBubbleFont'
/** Custom assistant-bubble font size (CSS length; empty = theme default). */
export const FOCUS_BUBBLE_FONT_SIZE_FIELD = 'focusBubbleFontSize'
/** Custom assistant-bubble padding (CSS shorthand; empty = theme default). */
export const FOCUS_BUBBLE_PADDING_FIELD = 'focusBubblePadding'
/** Custom user-bubble text color (CSS color; empty = theme default). */
export const FOCUS_USER_BUBBLE_TEXT_COLOR_FIELD = 'focusUserBubbleTextColor'
/** Custom user-bubble font family (CSS value; empty = theme default). */
export const FOCUS_USER_BUBBLE_FONT_FIELD = 'focusUserBubbleFont'

/** Defaults shared by the schema, the client scope, and the grouping engine. */
export const DEFAULT_FOCUS_ENABLED = true
export const DEFAULT_FOCUS_BUBBLES = true
export const DEFAULT_FOCUS_KEEP_VISIBLE = 1
export const DEFAULT_FOCUS_DEFAULT_OPEN = false
export const DEFAULT_FOCUS_SUMMARY = true
export const DEFAULT_FOCUS_STRATEGY: FocusFoldStrategy = 'keep-recent'
export const DEFAULT_FOCUS_BUBBLE_STYLE: FocusBubbleStyle = 'default'
export const DEFAULT_FOCUS_REASONING = true
export const DEFAULT_FOCUS_BUBBLE_BG = ''
export const DEFAULT_FOCUS_BUBBLE_BORDER = ''
export const DEFAULT_FOCUS_BUBBLE_RADIUS = ''
export const DEFAULT_FOCUS_BUBBLE_MAX_WIDTH = ''
export const DEFAULT_FOCUS_BUBBLE_BG_IMAGE = ''
export const DEFAULT_FOCUS_BUBBLE_PRESET = ''
export const DEFAULT_FOCUS_USER_BUBBLE_BG = ''
export const DEFAULT_FOCUS_BUBBLE_TEXT_COLOR = ''
export const DEFAULT_FOCUS_BUBBLE_FONT = ''
export const DEFAULT_FOCUS_BUBBLE_FONT_SIZE = ''
export const DEFAULT_FOCUS_BUBBLE_PADDING = ''
export const DEFAULT_FOCUS_USER_BUBBLE_TEXT_COLOR = ''
export const DEFAULT_FOCUS_USER_BUBBLE_FONT = ''

/** Static defaults the client uses while the namespace is loading or unavailable. */
export const DEFAULT_CONVERSATION_SETTINGS: ConversationSettings = {
  busyEnter: DEFAULT_BUSY_ENTER_BEHAVIOR,
  focusEnabled: DEFAULT_FOCUS_ENABLED,
  focusBubbles: DEFAULT_FOCUS_BUBBLES,
  focusKeepVisible: DEFAULT_FOCUS_KEEP_VISIBLE,
  focusDefaultOpen: DEFAULT_FOCUS_DEFAULT_OPEN,
  focusSummary: DEFAULT_FOCUS_SUMMARY,
  focusStrategy: DEFAULT_FOCUS_STRATEGY,
  focusBubbleStyle: DEFAULT_FOCUS_BUBBLE_STYLE,
  focusReasoning: DEFAULT_FOCUS_REASONING,
  focusBubbleBg: DEFAULT_FOCUS_BUBBLE_BG,
  focusBubbleBorder: DEFAULT_FOCUS_BUBBLE_BORDER,
  focusBubbleRadius: DEFAULT_FOCUS_BUBBLE_RADIUS,
  focusBubbleMaxWidth: DEFAULT_FOCUS_BUBBLE_MAX_WIDTH,
  focusBubbleBgImage: DEFAULT_FOCUS_BUBBLE_BG_IMAGE,
  focusBubblePreset: DEFAULT_FOCUS_BUBBLE_PRESET,
  focusUserBubbleBg: DEFAULT_FOCUS_USER_BUBBLE_BG,
  focusBubbleTextColor: DEFAULT_FOCUS_BUBBLE_TEXT_COLOR,
  focusBubbleFont: DEFAULT_FOCUS_BUBBLE_FONT,
  focusBubbleFontSize: DEFAULT_FOCUS_BUBBLE_FONT_SIZE,
  focusBubblePadding: DEFAULT_FOCUS_BUBBLE_PADDING,
  focusUserBubbleTextColor: DEFAULT_FOCUS_USER_BUBBLE_TEXT_COLOR,
  focusUserBubbleFont: DEFAULT_FOCUS_USER_BUBBLE_FONT,
}

/** Durable ChatFocus display section. */
export interface ChatFocusSettings {
  /** Master switch (grouping + bubbles). */
  focusEnabled: boolean
  /** Chat bubble chrome. */
  focusBubbles: boolean
  /** Most recent N replies whose runtime runs render expanded. */
  focusKeepVisible: number
  /** Fold boxes start expanded. */
  focusDefaultOpen: boolean
  /** Fold summary line visible. */
  focusSummary: boolean
  /** Fold strategy mode (v0.1: keep-recent only). */
  focusStrategy: FocusFoldStrategy
  /** Bubble style preset. */
  focusBubbleStyle: FocusBubbleStyle
  /** Text-less reasoning steps join the runtime run. */
  focusReasoning: boolean
  /** Custom assistant-bubble background color (empty = theme default). */
  focusBubbleBg: string
  /** Custom assistant-bubble border color (empty = theme default). */
  focusBubbleBorder: string
  /** Custom assistant-bubble corner radius (empty = theme default). */
  focusBubbleRadius: string
  /** Custom assistant-bubble max width (empty = theme default). */
  focusBubbleMaxWidth: string
  /** Custom assistant-bubble background image (empty = none). */
  focusBubbleBgImage: string
  /** Bubble template id (empty = none/custom). */
  focusBubblePreset: string
  /** Custom user-bubble background color (empty = theme deepseek blue). */
  focusUserBubbleBg: string
  /** Custom assistant-bubble text color (empty = theme default). */
  focusBubbleTextColor: string
  /** Custom assistant-bubble font family (empty = theme default). */
  focusBubbleFont: string
  /** Custom assistant-bubble font size (empty = theme default). */
  focusBubbleFontSize: string
  /** Custom assistant-bubble padding (empty = theme default). */
  focusBubblePadding: string
  /** Custom user-bubble text color (empty = theme default). */
  focusUserBubbleTextColor: string
  /** Custom user-bubble font family (empty = theme default). */
  focusUserBubbleFont: string
}

/** Durable conversation section shared by the Host schema and the browser scope. */
export interface ConversationSettings extends ChatFocusSettings {
  /** Delivery mode for plain Enter while the addressed agent is busy. */
  busyEnter: BusyEnterBehavior
}

/** Durable conversation schema; also the wire envelope the browser scope validates against. */
export const ConversationSettingsSchema: z<ConversationSettings> = z.object({
  [BUSY_ENTER_FIELD]: z.union([...BUSY_ENTER_BEHAVIORS]).default(DEFAULT_BUSY_ENTER_BEHAVIOR),
  [FOCUS_ENABLED_FIELD]: z.boolean().default(DEFAULT_FOCUS_ENABLED),
  [FOCUS_BUBBLES_FIELD]: z.boolean().default(DEFAULT_FOCUS_BUBBLES),
  [FOCUS_KEEP_VISIBLE_FIELD]: z.number().step(1).min(0).max(10).default(DEFAULT_FOCUS_KEEP_VISIBLE),
  [FOCUS_DEFAULT_OPEN_FIELD]: z.boolean().default(DEFAULT_FOCUS_DEFAULT_OPEN),
  [FOCUS_SUMMARY_FIELD]: z.boolean().default(DEFAULT_FOCUS_SUMMARY),
  [FOCUS_STRATEGY_FIELD]: z.union([...FOCUS_STRATEGIES]).default(DEFAULT_FOCUS_STRATEGY),
  [FOCUS_BUBBLE_STYLE_FIELD]: z.union([...FOCUS_BUBBLE_STYLES]).default(DEFAULT_FOCUS_BUBBLE_STYLE),
  [FOCUS_REASONING_FIELD]: z.boolean().default(DEFAULT_FOCUS_REASONING),
  [FOCUS_BUBBLE_BG_FIELD]: z.string().default(DEFAULT_FOCUS_BUBBLE_BG),
  [FOCUS_BUBBLE_BORDER_FIELD]: z.string().default(DEFAULT_FOCUS_BUBBLE_BORDER),
  [FOCUS_BUBBLE_RADIUS_FIELD]: z.string().default(DEFAULT_FOCUS_BUBBLE_RADIUS),
  [FOCUS_BUBBLE_MAX_WIDTH_FIELD]: z.string().default(DEFAULT_FOCUS_BUBBLE_MAX_WIDTH),
  [FOCUS_BUBBLE_BG_IMAGE_FIELD]: z.string().default(DEFAULT_FOCUS_BUBBLE_BG_IMAGE),
  [FOCUS_BUBBLE_PRESET_FIELD]: z.string().default(DEFAULT_FOCUS_BUBBLE_PRESET),
  [FOCUS_USER_BUBBLE_BG_FIELD]: z.string().default(DEFAULT_FOCUS_USER_BUBBLE_BG),
  [FOCUS_BUBBLE_TEXT_COLOR_FIELD]: z.string().default(DEFAULT_FOCUS_BUBBLE_TEXT_COLOR),
  [FOCUS_BUBBLE_FONT_FIELD]: z.string().default(DEFAULT_FOCUS_BUBBLE_FONT),
  [FOCUS_BUBBLE_FONT_SIZE_FIELD]: z.string().default(DEFAULT_FOCUS_BUBBLE_FONT_SIZE),
  [FOCUS_BUBBLE_PADDING_FIELD]: z.string().default(DEFAULT_FOCUS_BUBBLE_PADDING),
  [FOCUS_USER_BUBBLE_TEXT_COLOR_FIELD]: z.string().default(DEFAULT_FOCUS_USER_BUBBLE_TEXT_COLOR),
  [FOCUS_USER_BUBBLE_FONT_FIELD]: z.string().default(DEFAULT_FOCUS_USER_BUBBLE_FONT),
})
