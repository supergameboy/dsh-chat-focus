/** Chat display preferences stored in the Host user-settings document. */

import z from '@deepseek-ai/schemastery'

/** Settings namespace owned by the Chat target (fork replaces the host ui-chat row). */
export const CHAT_SETTINGS_NAMESPACE = 'ui-chat'

/** Field carrying the completed-Turn transcript presentation mode. */
export const TRANSCRIPT_VIEW_FIELD = 'transcriptView'

/** Transcript presentation modes accepted at settings boundaries. */
export const TRANSCRIPT_VIEW_MODES = ['normal', 'compact'] as const

/** Completed-Turn transcript presentation. */
export type TranscriptViewMode = typeof TRANSCRIPT_VIEW_MODES[number]

/** Default preserves the compact process disclosure introduced by Chat. */
export const DEFAULT_TRANSCRIPT_VIEW_MODE: TranscriptViewMode = 'compact'

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
/** Fold strategy modes. */
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
/** Background-image fit modes for bubbles. */
export const FOCUS_BUBBLE_BG_SIZES = ['cover', 'contain', 'stretch'] as const
export type FocusBubbleBgSize = typeof FOCUS_BUBBLE_BG_SIZES[number]
/** Background-image fit mode field name. */
export const FOCUS_BUBBLE_BG_SIZE_FIELD = 'focusBubbleBgSize'
/** Bubble template id ('' = none/custom); selecting one fills the custom fields. */
export const FOCUS_BUBBLE_PRESET_FIELD = 'focusBubblePreset'
/** Custom assistant-bubble text color (CSS color; empty = theme default). */
export const FOCUS_BUBBLE_TEXT_COLOR_FIELD = 'focusBubbleTextColor'
/** Custom assistant-bubble font family (CSS value; empty = theme default). */
export const FOCUS_BUBBLE_FONT_FIELD = 'focusBubbleFont'
/** Custom assistant-bubble font size (CSS length; empty = theme default). */
export const FOCUS_BUBBLE_FONT_SIZE_FIELD = 'focusBubbleFontSize'
/** Custom assistant-bubble padding (CSS shorthand; empty = theme default). */
export const FOCUS_BUBBLE_PADDING_FIELD = 'focusBubblePadding'
/** Assistant-bubble gradient start color (CSS color; empty = no gradient). */
export const FOCUS_BUBBLE_GRADIENT_FROM_FIELD = 'focusBubbleGradientFrom'
/** Assistant-bubble gradient end color (CSS color). */
export const FOCUS_BUBBLE_GRADIENT_TO_FIELD = 'focusBubbleGradientTo'
/** Assistant-bubble gradient angle in degrees (string number). */
export const FOCUS_BUBBLE_GRADIENT_ANGLE_FIELD = 'focusBubbleGradientAngle'
/** Background-image vertical alignment for cover/stretch fits. */
export const FOCUS_BUBBLE_BG_POSITION_FIELD = 'focusBubbleBgPosition'
/** Text-readability overlay on the assistant bubble background (CSS color). */
export const FOCUS_BUBBLE_OVERLAY_FIELD = 'focusBubbleOverlay'

/** Custom user-bubble background (CSS color; empty = theme default deepseek blue). */
export const FOCUS_USER_BUBBLE_BG_FIELD = 'focusUserBubbleBg'
/** Custom user-bubble border color (CSS color; empty = none). */
export const FOCUS_USER_BUBBLE_BORDER_FIELD = 'focusUserBubbleBorder'
/** Custom user-bubble corner radius (CSS length; empty = theme default 22px). */
export const FOCUS_USER_BUBBLE_RADIUS_FIELD = 'focusUserBubbleRadius'
/** Custom user-bubble max width (CSS length; empty = theme default). */
export const FOCUS_USER_BUBBLE_MAX_WIDTH_FIELD = 'focusUserBubbleMaxWidth'
/** Custom user-bubble background image (URL or data URI; empty = none). */
export const FOCUS_USER_BUBBLE_BG_IMAGE_FIELD = 'focusUserBubbleBgImage'
/** User-bubble background-image fit mode. */
export const FOCUS_USER_BUBBLE_BG_SIZE_FIELD = 'focusUserBubbleBgSize'
/** Custom user-bubble text color (CSS color; empty = theme default). */
export const FOCUS_USER_BUBBLE_TEXT_COLOR_FIELD = 'focusUserBubbleTextColor'
/** Custom user-bubble font family (CSS value; empty = theme default). */
export const FOCUS_USER_BUBBLE_FONT_FIELD = 'focusUserBubbleFont'
/** Custom user-bubble font size (CSS length; empty = theme default). */
export const FOCUS_USER_BUBBLE_FONT_SIZE_FIELD = 'focusUserBubbleFontSize'
/** Custom user-bubble padding (CSS shorthand; empty = theme default). */
export const FOCUS_USER_BUBBLE_PADDING_FIELD = 'focusUserBubblePadding'
/** User-bubble gradient start color (CSS color; empty = no gradient). */
export const FOCUS_USER_BUBBLE_GRADIENT_FROM_FIELD = 'focusUserBubbleGradientFrom'
/** User-bubble gradient end color (CSS color). */
export const FOCUS_USER_BUBBLE_GRADIENT_TO_FIELD = 'focusUserBubbleGradientTo'
/** User-bubble gradient angle in degrees (string number). */
export const FOCUS_USER_BUBBLE_GRADIENT_ANGLE_FIELD = 'focusUserBubbleGradientAngle'
/** User-bubble background-image vertical alignment. */
export const FOCUS_USER_BUBBLE_BG_POSITION_FIELD = 'focusUserBubbleBgPosition'
/** Text-readability overlay on the user bubble background (CSS color). */
export const FOCUS_USER_BUBBLE_OVERLAY_FIELD = 'focusUserBubbleOverlay'
/** User-bubble template id ('' = none/custom). */
export const FOCUS_USER_BUBBLE_PRESET_FIELD = 'focusUserBubblePreset'

/** Background-image vertical alignment modes. */
export const FOCUS_BG_POSITIONS = ['top', 'center', 'bottom'] as const
export type FocusBgPosition = typeof FOCUS_BG_POSITIONS[number]

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
export const DEFAULT_FOCUS_BUBBLE_BG_SIZE: FocusBubbleBgSize = 'cover'
export const DEFAULT_FOCUS_BUBBLE_PRESET = ''
export const DEFAULT_FOCUS_BUBBLE_TEXT_COLOR = ''
export const DEFAULT_FOCUS_BUBBLE_FONT = ''
export const DEFAULT_FOCUS_BUBBLE_FONT_SIZE = ''
export const DEFAULT_FOCUS_BUBBLE_PADDING = ''
export const DEFAULT_FOCUS_BUBBLE_GRADIENT_FROM = ''
export const DEFAULT_FOCUS_BUBBLE_GRADIENT_TO = ''
export const DEFAULT_FOCUS_BUBBLE_GRADIENT_ANGLE = '135'
export const DEFAULT_FOCUS_BUBBLE_BG_POSITION: FocusBgPosition = 'center'
export const DEFAULT_FOCUS_BUBBLE_OVERLAY = ''
export const DEFAULT_FOCUS_USER_BUBBLE_BG = ''
export const DEFAULT_FOCUS_USER_BUBBLE_BORDER = ''
export const DEFAULT_FOCUS_USER_BUBBLE_RADIUS = ''
export const DEFAULT_FOCUS_USER_BUBBLE_MAX_WIDTH = ''
export const DEFAULT_FOCUS_USER_BUBBLE_BG_IMAGE = ''
export const DEFAULT_FOCUS_USER_BUBBLE_BG_SIZE: FocusBubbleBgSize = 'cover'
export const DEFAULT_FOCUS_USER_BUBBLE_TEXT_COLOR = ''
export const DEFAULT_FOCUS_USER_BUBBLE_FONT = ''
export const DEFAULT_FOCUS_USER_BUBBLE_FONT_SIZE = ''
export const DEFAULT_FOCUS_USER_BUBBLE_PADDING = ''
export const DEFAULT_FOCUS_USER_BUBBLE_GRADIENT_FROM = ''
export const DEFAULT_FOCUS_USER_BUBBLE_GRADIENT_TO = ''
export const DEFAULT_FOCUS_USER_BUBBLE_GRADIENT_ANGLE = '135'
export const DEFAULT_FOCUS_USER_BUBBLE_BG_POSITION: FocusBgPosition = 'center'
export const DEFAULT_FOCUS_USER_BUBBLE_OVERLAY = ''
export const DEFAULT_FOCUS_USER_BUBBLE_PRESET = ''

/** Durable Chat section shared by the Host schema and browser scope. */
export interface ChatSettings {
  /** Presentation mode for completed Turn process content. */
  transcriptView: TranscriptViewMode
  /** Master switch for ChatFocus grouping + bubble chrome. */
  focusEnabled: boolean
  /** Chat bubble chrome for user/assistant text replies. */
  focusBubbles: boolean
  /** Most recent N replies whose runtime runs render expanded. */
  focusKeepVisible: number
  /** Fold boxes start expanded. */
  focusDefaultOpen: boolean
  /** Fold summary line visible. */
  focusSummary: boolean
  /** Fold strategy mode. */
  focusStrategy: FocusFoldStrategy
  /** Bubble style preset. */
  focusBubbleStyle: FocusBubbleStyle
  /** Text-less reasoning steps join the runtime run. */
  focusReasoning: boolean
  /** Custom assistant-bubble background (CSS color; empty = theme default). */
  focusBubbleBg: string
  /** Custom assistant-bubble border color (CSS color; empty = theme default). */
  focusBubbleBorder: string
  /** Custom assistant-bubble corner radius (CSS length; empty = theme default). */
  focusBubbleRadius: string
  /** Custom assistant-bubble max width (CSS length; empty = theme default). */
  focusBubbleMaxWidth: string
  /** Custom assistant-bubble background image (URL or data URI; empty = none). */
  focusBubbleBgImage: string
  /** Background-image fit mode for the assistant bubble. */
  focusBubbleBgSize: FocusBubbleBgSize
  /** Assistant-bubble template id ('' = none/custom). */
  focusBubblePreset: string
  /** Custom assistant-bubble text color (CSS color; empty = theme default). */
  focusBubbleTextColor: string
  /** Custom assistant-bubble font family (CSS value; empty = theme default). */
  focusBubbleFont: string
  /** Custom assistant-bubble font size (CSS length; empty = theme default). */
  focusBubbleFontSize: string
  /** Custom assistant-bubble padding (CSS shorthand; empty = theme default). */
  focusBubblePadding: string
  /** Assistant-bubble gradient start color (CSS color; empty = no gradient). */
  focusBubbleGradientFrom: string
  /** Assistant-bubble gradient end color (CSS color). */
  focusBubbleGradientTo: string
  /** Assistant-bubble gradient angle in degrees (string number). */
  focusBubbleGradientAngle: string
  /** Assistant-bubble background-image vertical alignment. */
  focusBubbleBgPosition: FocusBgPosition
  /** Text-readability overlay on the assistant bubble background. */
  focusBubbleOverlay: string
  /** Custom user-bubble background (CSS color; empty = theme default). */
  focusUserBubbleBg: string
  /** Custom user-bubble border color (CSS color; empty = none). */
  focusUserBubbleBorder: string
  /** Custom user-bubble corner radius (CSS length; empty = theme default). */
  focusUserBubbleRadius: string
  /** Custom user-bubble max width (CSS length; empty = theme default). */
  focusUserBubbleMaxWidth: string
  /** Custom user-bubble background image (URL or data URI; empty = none). */
  focusUserBubbleBgImage: string
  /** User-bubble background-image fit mode. */
  focusUserBubbleBgSize: FocusBubbleBgSize
  /** Custom user-bubble text color (CSS color; empty = theme default). */
  focusUserBubbleTextColor: string
  /** Custom user-bubble font family (CSS value; empty = theme default). */
  focusUserBubbleFont: string
  /** Custom user-bubble font size (CSS length; empty = theme default). */
  focusUserBubbleFontSize: string
  /** Custom user-bubble padding (CSS shorthand; empty = theme default). */
  focusUserBubblePadding: string
  /** User-bubble gradient start color (CSS color; empty = no gradient). */
  focusUserBubbleGradientFrom: string
  /** User-bubble gradient end color (CSS color). */
  focusUserBubbleGradientTo: string
  /** User-bubble gradient angle in degrees (string number). */
  focusUserBubbleGradientAngle: string
  /** User-bubble background-image vertical alignment. */
  focusUserBubbleBgPosition: FocusBgPosition
  /** Text-readability overlay on the user bubble background. */
  focusUserBubbleOverlay: string
  /** User-bubble template id ('' = none/custom). */
  focusUserBubblePreset: string
}

/** ChatFocus surface used by the grouping engine and the bubble chrome. */
export type ChatFocusSettings = ChatSettings


/** Static full defaults the client uses while the namespace is loading or unavailable. */
export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  transcriptView: DEFAULT_TRANSCRIPT_VIEW_MODE,
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
  focusBubbleBgSize: DEFAULT_FOCUS_BUBBLE_BG_SIZE,
  focusBubblePreset: DEFAULT_FOCUS_BUBBLE_PRESET,
  focusBubbleTextColor: DEFAULT_FOCUS_BUBBLE_TEXT_COLOR,
  focusBubbleFont: DEFAULT_FOCUS_BUBBLE_FONT,
  focusBubbleFontSize: DEFAULT_FOCUS_BUBBLE_FONT_SIZE,
  focusBubblePadding: DEFAULT_FOCUS_BUBBLE_PADDING,
  focusBubbleGradientFrom: DEFAULT_FOCUS_BUBBLE_GRADIENT_FROM,
  focusBubbleGradientTo: DEFAULT_FOCUS_BUBBLE_GRADIENT_TO,
  focusBubbleGradientAngle: DEFAULT_FOCUS_BUBBLE_GRADIENT_ANGLE,
  focusBubbleBgPosition: DEFAULT_FOCUS_BUBBLE_BG_POSITION,
  focusBubbleOverlay: DEFAULT_FOCUS_BUBBLE_OVERLAY,
  focusUserBubbleBg: DEFAULT_FOCUS_USER_BUBBLE_BG,
  focusUserBubbleBorder: DEFAULT_FOCUS_USER_BUBBLE_BORDER,
  focusUserBubbleRadius: DEFAULT_FOCUS_USER_BUBBLE_RADIUS,
  focusUserBubbleMaxWidth: DEFAULT_FOCUS_USER_BUBBLE_MAX_WIDTH,
  focusUserBubbleBgImage: DEFAULT_FOCUS_USER_BUBBLE_BG_IMAGE,
  focusUserBubbleBgSize: DEFAULT_FOCUS_USER_BUBBLE_BG_SIZE,
  focusUserBubbleTextColor: DEFAULT_FOCUS_USER_BUBBLE_TEXT_COLOR,
  focusUserBubbleFont: DEFAULT_FOCUS_USER_BUBBLE_FONT,
  focusUserBubbleFontSize: DEFAULT_FOCUS_USER_BUBBLE_FONT_SIZE,
  focusUserBubblePadding: DEFAULT_FOCUS_USER_BUBBLE_PADDING,
  focusUserBubbleGradientFrom: DEFAULT_FOCUS_USER_BUBBLE_GRADIENT_FROM,
  focusUserBubbleGradientTo: DEFAULT_FOCUS_USER_BUBBLE_GRADIENT_TO,
  focusUserBubbleGradientAngle: DEFAULT_FOCUS_USER_BUBBLE_GRADIENT_ANGLE,
  focusUserBubbleBgPosition: DEFAULT_FOCUS_USER_BUBBLE_BG_POSITION,
  focusUserBubbleOverlay: DEFAULT_FOCUS_USER_BUBBLE_OVERLAY,
  focusUserBubblePreset: DEFAULT_FOCUS_USER_BUBBLE_PRESET,
}

/** Durable Chat schema; also the wire envelope the browser scope validates against. */
export const ChatSettingsSchema: z<ChatSettings> = z.object({
  [TRANSCRIPT_VIEW_FIELD]: z.union([...TRANSCRIPT_VIEW_MODES]).default(DEFAULT_TRANSCRIPT_VIEW_MODE),
  [FOCUS_ENABLED_FIELD]: z.boolean().default(DEFAULT_FOCUS_ENABLED),
  [FOCUS_BUBBLES_FIELD]: z.boolean().default(DEFAULT_FOCUS_BUBBLES),
  [FOCUS_KEEP_VISIBLE_FIELD]: z.number().default(DEFAULT_FOCUS_KEEP_VISIBLE),
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
  [FOCUS_BUBBLE_BG_SIZE_FIELD]: z.union([...FOCUS_BUBBLE_BG_SIZES]).default(DEFAULT_FOCUS_BUBBLE_BG_SIZE),
  [FOCUS_BUBBLE_PRESET_FIELD]: z.string().default(DEFAULT_FOCUS_BUBBLE_PRESET),
  [FOCUS_BUBBLE_TEXT_COLOR_FIELD]: z.string().default(DEFAULT_FOCUS_BUBBLE_TEXT_COLOR),
  [FOCUS_BUBBLE_FONT_FIELD]: z.string().default(DEFAULT_FOCUS_BUBBLE_FONT),
  [FOCUS_BUBBLE_FONT_SIZE_FIELD]: z.string().default(DEFAULT_FOCUS_BUBBLE_FONT_SIZE),
  [FOCUS_BUBBLE_PADDING_FIELD]: z.string().default(DEFAULT_FOCUS_BUBBLE_PADDING),
  [FOCUS_BUBBLE_GRADIENT_FROM_FIELD]: z.string().default(DEFAULT_FOCUS_BUBBLE_GRADIENT_FROM),
  [FOCUS_BUBBLE_GRADIENT_TO_FIELD]: z.string().default(DEFAULT_FOCUS_BUBBLE_GRADIENT_TO),
  [FOCUS_BUBBLE_GRADIENT_ANGLE_FIELD]: z.string().default(DEFAULT_FOCUS_BUBBLE_GRADIENT_ANGLE),
  [FOCUS_BUBBLE_BG_POSITION_FIELD]: z.union([...FOCUS_BG_POSITIONS]).default(DEFAULT_FOCUS_BUBBLE_BG_POSITION),
  [FOCUS_BUBBLE_OVERLAY_FIELD]: z.string().default(DEFAULT_FOCUS_BUBBLE_OVERLAY),
  [FOCUS_USER_BUBBLE_BG_FIELD]: z.string().default(DEFAULT_FOCUS_USER_BUBBLE_BG),
  [FOCUS_USER_BUBBLE_BORDER_FIELD]: z.string().default(DEFAULT_FOCUS_USER_BUBBLE_BORDER),
  [FOCUS_USER_BUBBLE_RADIUS_FIELD]: z.string().default(DEFAULT_FOCUS_USER_BUBBLE_RADIUS),
  [FOCUS_USER_BUBBLE_MAX_WIDTH_FIELD]: z.string().default(DEFAULT_FOCUS_USER_BUBBLE_MAX_WIDTH),
  [FOCUS_USER_BUBBLE_BG_IMAGE_FIELD]: z.string().default(DEFAULT_FOCUS_USER_BUBBLE_BG_IMAGE),
  [FOCUS_USER_BUBBLE_BG_SIZE_FIELD]: z.union([...FOCUS_BUBBLE_BG_SIZES]).default(DEFAULT_FOCUS_USER_BUBBLE_BG_SIZE),
  [FOCUS_USER_BUBBLE_TEXT_COLOR_FIELD]: z.string().default(DEFAULT_FOCUS_USER_BUBBLE_TEXT_COLOR),
  [FOCUS_USER_BUBBLE_FONT_FIELD]: z.string().default(DEFAULT_FOCUS_USER_BUBBLE_FONT),
  [FOCUS_USER_BUBBLE_FONT_SIZE_FIELD]: z.string().default(DEFAULT_FOCUS_USER_BUBBLE_FONT_SIZE),
  [FOCUS_USER_BUBBLE_PADDING_FIELD]: z.string().default(DEFAULT_FOCUS_USER_BUBBLE_PADDING),
  [FOCUS_USER_BUBBLE_GRADIENT_FROM_FIELD]: z.string().default(DEFAULT_FOCUS_USER_BUBBLE_GRADIENT_FROM),
  [FOCUS_USER_BUBBLE_GRADIENT_TO_FIELD]: z.string().default(DEFAULT_FOCUS_USER_BUBBLE_GRADIENT_TO),
  [FOCUS_USER_BUBBLE_GRADIENT_ANGLE_FIELD]: z.string().default(DEFAULT_FOCUS_USER_BUBBLE_GRADIENT_ANGLE),
  [FOCUS_USER_BUBBLE_BG_POSITION_FIELD]: z.union([...FOCUS_BG_POSITIONS]).default(DEFAULT_FOCUS_USER_BUBBLE_BG_POSITION),
  [FOCUS_USER_BUBBLE_OVERLAY_FIELD]: z.string().default(DEFAULT_FOCUS_USER_BUBBLE_OVERLAY),
  [FOCUS_USER_BUBBLE_PRESET_FIELD]: z.string().default(DEFAULT_FOCUS_USER_BUBBLE_PRESET),
})
