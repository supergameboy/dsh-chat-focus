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
/** Runtime-run rows kept visible outside the fold box (most recent N). */
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

/** Defaults shared by the schema, the client scope, and the grouping engine. */
export const DEFAULT_FOCUS_ENABLED = true
export const DEFAULT_FOCUS_BUBBLES = true
export const DEFAULT_FOCUS_KEEP_VISIBLE = 1
export const DEFAULT_FOCUS_DEFAULT_OPEN = false
export const DEFAULT_FOCUS_SUMMARY = true
export const DEFAULT_FOCUS_STRATEGY: FocusFoldStrategy = 'keep-recent'
export const DEFAULT_FOCUS_BUBBLE_STYLE: FocusBubbleStyle = 'default'
export const DEFAULT_FOCUS_REASONING = true

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
}

/** Durable ChatFocus display section. */
export interface ChatFocusSettings {
  /** Master switch (grouping + bubbles). */
  focusEnabled: boolean
  /** Chat bubble chrome. */
  focusBubbles: boolean
  /** Runtime rows kept visible outside the fold box. */
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
})
