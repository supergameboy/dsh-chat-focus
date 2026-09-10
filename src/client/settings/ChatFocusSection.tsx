// ChatFocusSection: the '对话显示' settings page. A left tab rail (basics,
// folding, bubble look, skins, advanced) drives one form pane, with the live
// sample pinned beside it on wide layouts and collapsible above it on narrow
// ones. The assistant/user bubble editors share one panel behind a segmented
// switch, so the per-side rows exist once.

import { memo, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { ChatSettings } from '../../chat-settings.ts'
import { EMPTY_SKIN_STYLE, type SkinStyle } from '../../skin-contract.ts'
import type { SkinRecord } from '../../skin-contract.ts'
import type { SkinRegistry } from '../skins/registry.ts'
import type { ChatBubbleCustomStyle } from '../chat/bubbles/ChatBubble.tsx'
import { ChatBubble } from '../chat/bubbles/ChatBubble.tsx'
import { RuntimeFoldBox, type RuntimeFoldBoxProps } from '../chat/bubbles/RuntimeFoldBox.tsx'
import { bubbleCustom, skinStylePatch } from '../chat/bubbles/chrome.ts'
import type { FocusKey } from './focus-locale.ts'
import { AdvancedPanel } from './AdvancedPanel.tsx'
import { AppearancePanel, type BubbleSide } from './AppearancePanel.tsx'
import { BasicPanel } from './BasicPanel.tsx'
import { FoldPanel } from './FoldPanel.tsx'
import { SkinsPanel } from './SkinsPanel.tsx'
import { SkinMaker } from './SkinMaker.tsx'
import { toSkinRender } from '../chat/bubbles/skin-render.ts'
import css from './ChatFocusSection.module.css'

/** Settings tabs, in navigation order. */
const TABS = ['basic', 'fold', 'appearance', 'skins', 'advanced'] as const
type FocusTab = typeof TABS[number]

/** Layout width below which the rail turns horizontal and the preview folds. */
const NARROW_WIDTH = 860

/** Long preview copy so stretching is visible in every skin. */
const PREVIEW_LONG = '这是一段较长的回复示例文本，用来验证气泡在内容变长时的拉伸效果是否自然，两端是否变形。'

/** Injected share: the live settings snapshot (useFocusSettings) and field writes. */
export interface ChatFocusSectionInjected {
  hooks: {
    /** Durable ChatFocus section bound as useFocusSettings. */
    focusSettings: SnapshotStore<ChatSettings>
  }
  /** Write one scalar field of the Chat settings namespace. */
  setFocusField: (field: keyof ChatSettings, value: unknown) => void
  /** Write several fields as one atomic settings mutation. */
  setFocusFields: (patch: Partial<ChatSettings>) => void
  /** Bubble-skin library (state plus save/delete/rename). */
  skins: SkinRegistry
}

/** Full props of the ChatFocus settings section. */
export type ChatFocusSectionProps =
  PropsRuntime<'settings.section'> & InjectFace<ChatFocusSectionInjected> & PropsLocale<'chat-focus'>

/** Sample runtime run for the appearance preview (root scope has no session seat). */
const PREVIEW_RUN: Omit<RuntimeFoldBoxProps, 'renderItem' | 't' | 'defaultOpen' | 'summaryVisible' | 'strategySalt'> = {
  anchorKey: 'preview-run',
  insideItems: [
    { kind: 'node', nodeKey: 'preview-1' },
    { kind: 'node', nodeKey: 'preview-2' },
    { kind: 'reasoning', nodeKey: 'preview-reply', text: '让我先确认需求细节…', running: false },
  ],
  summary: { total: 5, toolCount: 2, thinkCount: 2, otherCount: 1, toolNames: ['read', 'glob'] },
}

/** Sample preview node bodies (frozen, non-interactive). */
function PreviewNode({ label }: { label: string }) {
  return (
    <div className={css.previewNode}>
      <span className={css.previewNodeDot} aria-hidden />
      <span>{label}</span>
    </div>
  )
}

/** Preview custom style for one side (gradient overrides the background image).
 *  Live slider drafts override the stored values so the preview follows the
 *  thumb while dragging, before the commit writes the setting. */
function previewCustom(
  focus: ChatSettings,
  side: BubbleSide,
  overlayDraft: number | null,
  opacityDraft: number | null,
  skins: SkinRegistry,
): ChatBubbleCustomStyle {
  const prefix = side === 'assistant' ? 'focusBubble' : 'focusUserBubble'
  const f = (suffix: string): string => focus[`${prefix}${suffix}` as keyof ChatSettings] as string
  const entry = skins.resolve(f('Skin'))
  return bubbleCustom({
    bg: f('Bg'),
    border: f('Border'),
    radius: f('Radius'),
    maxWidth: f('MaxWidth'),
    bgImage: f('BgImage'),
    bgSize: focus[`${prefix}BgSize` as keyof ChatSettings] as ChatSettings['focusBubbleBgSize'],
    bgPosition: focus[`${prefix}BgPosition` as keyof ChatSettings] as 'top' | 'center' | 'bottom',
    overlay: overlayDraft === null ? f('Overlay') : String(overlayDraft),
    backdropOpacity: opacityDraft ?? (focus[`${prefix}BackdropOpacity` as keyof ChatSettings] as number),
    backdropBlur: f('BackdropBlur'),
    gradientFrom: f('GradientFrom'),
    gradientTo: f('GradientTo'),
    gradientAngle: f('GradientAngle'),
    textColor: f('TextColor'),
    font: f('Font'),
    fontSize: f('FontSize'),
    padding: f('Padding'),
  }, entry === undefined ? undefined : toSkinRender(entry, skins.urlOf(entry)))
}

/** Read one side's current style as the packaged draft the maker starts from. */
function seedStyle(side: BubbleSide, focus: ChatSettings): SkinStyle {
  const prefix = side === 'assistant' ? 'focusBubble' : 'focusUserBubble'
  const text = (suffix: string): string => focus[`${prefix}${suffix}` as keyof ChatSettings] as string
  return {
    bg: text('Bg'),
    gradientFrom: text('GradientFrom'),
    gradientTo: text('GradientTo'),
    gradientAngle: text('GradientAngle') === '' ? EMPTY_SKIN_STYLE.gradientAngle : text('GradientAngle'),
    border: text('Border'),
    overlay: text('Overlay') === '' ? EMPTY_SKIN_STYLE.overlay : text('Overlay'),
    backdropOpacity: focus[`${prefix}BackdropOpacity` as keyof ChatSettings] as number,
    backdropBlur: text('BackdropBlur'),
    textColor: text('TextColor'),
    font: text('Font'),
    fontSize: text('FontSize'),
  }
}

/** The ChatFocus display settings page. */
export const ChatFocusSection = memo(function ChatFocusSection({
  close, useFocusSettings, setFocusField, setFocusFields, skins, t,
}: ChatFocusSectionProps) {
  const focus = useFocusSettings(value => value)
  const setField = (field: keyof ChatSettings, value: unknown): void => {
    setFocusField(field, value)
  }
  const [tab, setTab] = useState<FocusTab>('basic')
  const [appearanceSide, setAppearanceSide] = useState<BubbleSide>('assistant')
  const [makerOpen, setMakerOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(true)
  // Re-render when the skin library changes so the preview and skin pickers
  // reflect a just-saved or just-deleted skin.
  const skinsState = useSyncExternalStore(
    skins.state.subscribe,
    () => skins.state.getSnapshot(),
    () => skins.state.getSnapshot(),
  )
  // Live slider drafts per side: dragging updates these (and thus the preview)
  // locally; releasing commits the value through the settings scope.
  const [overlayDrafts, setOverlayDrafts] = useState<{ assistant: number | null; user: number | null }>({
    assistant: null,
    user: null,
  })
  const [opacityDrafts, setOpacityDrafts] = useState<{ assistant: number | null; user: number | null }>({
    assistant: null,
    user: null,
  })
  const overlayHandlers = (side: BubbleSide) => ({
    overlayDraft: overlayDrafts[side],
    onOverlayDraft: (next: number | null): void => {
      setOverlayDrafts(drafts => ({ ...drafts, [side]: next }))
    },
    opacityDraft: opacityDrafts[side],
    onOpacityDraft: (next: number | null): void => {
      setOpacityDrafts(drafts => ({ ...drafts, [side]: next }))
    },
  })
  const rootRef = useRef<HTMLDivElement | null>(null)
  // The settings slot renders inside a host scroll pane whose height chain has
  // no 100% contract, so measure the nearest scroll ancestor and pin the pane
  // height to it: the rail and preview stay put while the form scrolls.
  const [paneHeight, setPaneHeight] = useState<number | null>(null)
  // The rail collapses to a horizontal strip when the slot is narrow; measured
  // from the pane itself because the host gives no container-query context.
  const [narrow, setNarrow] = useState(false)
  useLayoutEffect(() => {
    const el = rootRef.current
    if (el === null) return
    const measureWidth = (): void => setNarrow(el.clientWidth > 0 && el.clientWidth < NARROW_WIDTH)
    measureWidth()
    const widthObserver = new ResizeObserver(measureWidth)
    widthObserver.observe(el)
    let scroller: HTMLElement | null = el.parentElement
    while (scroller !== null && scroller !== document.body) {
      const overflow = getComputedStyle(scroller).overflowY
      if (overflow === 'auto' || overflow === 'scroll') break
      scroller = scroller.parentElement
    }
    const measureHeight = (): void => setPaneHeight(scroller === null ? null : scroller.clientHeight)
    measureHeight()
    const heightObserver = scroller === null ? null : new ResizeObserver(measureHeight)
    if (scroller !== null) heightObserver?.observe(scroller)
    return () => {
      widthObserver.disconnect()
      heightObserver?.disconnect()
    }
  }, [])

  /** Apply a freshly saved skin to the sides the maker selected: the artwork
   *  id plus its packaged style, written as ONE atomic settings mutation per
   *  side (preset semantics — every field stays editable afterwards). */
  const onSkinSaved = (record: SkinRecord, target: 'assistant' | 'user' | 'both' | 'none'): void => {
    const patch: Partial<ChatSettings> = {}
    if (target === 'assistant' || target === 'both') {
      patch.focusBubbleSkin = record.id
      Object.assign(patch as Record<string, unknown>, skinStylePatch(record.style, 'assistant'))
    }
    if (target === 'user' || target === 'both') {
      patch.focusUserBubbleSkin = record.id
      Object.assign(patch as Record<string, unknown>, skinStylePatch(record.style, 'user'))
    }
    setFocusFields(patch)
    setTab('skins')
  }

  const assistantCustom = useMemo(
    () => previewCustom(focus, 'assistant', overlayDrafts.assistant, opacityDrafts.assistant, skins),
    [focus, overlayDrafts.assistant, opacityDrafts.assistant, skins, skinsState],
  )
  const userCustom = useMemo(
    () => previewCustom(focus, 'user', overlayDrafts.user, opacityDrafts.user, skins),
    [focus, overlayDrafts.user, opacityDrafts.user, skins, skinsState],
  )

  const showFold = tab === 'basic' || tab === 'fold' || tab === 'advanced'
  const showUser = tab === 'appearance' || tab === 'skins' || tab === 'advanced'

  /** Move the rail selection with the arrow keys (orientation-aware). */
  const onRailKey = (event: React.KeyboardEvent<HTMLElement>): void => {
    const at = TABS.indexOf(tab)
    const previous = narrow ? 'ArrowLeft' : 'ArrowUp'
    const next = narrow ? 'ArrowRight' : 'ArrowDown'
    if (event.key === next) setTab(TABS[(at + 1) % TABS.length]!)
    else if (event.key === previous) setTab(TABS[(at + TABS.length - 1) % TABS.length]!)
    else if (event.key === 'Home') setTab(TABS[0])
    else if (event.key === 'End') setTab(TABS[TABS.length - 1]!)
  }

  return (
    <div
      ref={rootRef}
      className={css.root}
      data-narrow={narrow || undefined}
      role="tabpanel"
      aria-label={t('focus.sectionLabel')}
      style={paneHeight === null ? undefined : { height: paneHeight }}
    >
      <div className={css.header}>
        <span className={css.headerTitle}>{t('focus.sectionLabel')}</span>
        <div className={css.headerActions}>
          {narrow && (
            <button type="button" className={css.close} onClick={() => setPreviewOpen(open => !open)}>
              {previewOpen ? t('focus.previewHide') : t('focus.previewShow')}
            </button>
          )}
          <button type="button" className={css.close} onClick={close}>{t('focus.close')}</button>
        </div>
      </div>

      <div className={css.layout}>
        <nav
          className={css.tabRail}
          role="tablist"
          aria-orientation={narrow ? 'horizontal' : 'vertical'}
          aria-label={t('focus.sectionLabel')}
          onKeyDown={onRailKey}
        >
          {TABS.map(candidate => (
            <button
              key={candidate}
              type="button"
              role="tab"
              aria-selected={candidate === tab}
              className={css.tabRailButton}
              data-active={candidate === tab || undefined}
              onClick={() => setTab(candidate)}
            >
              {t(`focus.tab.${candidate}` as FocusKey)}
            </button>
          ))}
        </nav>

        <div className={css.formPane}>
          {tab === 'basic' && <BasicPanel focus={focus} setField={setField} t={t} />}
          {tab === 'fold' && <FoldPanel focus={focus} setField={setField} t={t} />}
          {tab === 'appearance' && (
            <AppearancePanel
              side={appearanceSide}
              onSide={setAppearanceSide}
              focus={focus}
              setField={setField}
              setFields={setFocusFields}
              skins={skins}
              onOpenMaker={() => setMakerOpen(true)}
              t={t}
              {...overlayHandlers(appearanceSide)}
            />
          )}
          {tab === 'skins' && (
            <SkinsPanel
              skins={skins}
              focus={focus}
              setField={setField}
              setFields={setFocusFields}
              onOpenMaker={() => setMakerOpen(true)}
              t={t}
            />
          )}
          {tab === 'advanced' && (
            <AdvancedPanel focus={focus} setFields={setFocusFields} skins={skins} t={t} />
          )}
        </div>

        {(!narrow || previewOpen) && (
          <aside className={css.previewAside}>
            <span className={css.previewLabel}>
              {t('focus.preview')} · {t('focus.previewExample')}
            </span>
            {showFold && (
              <RuntimeFoldBox
                {...PREVIEW_RUN}
                defaultOpen={focus.focusDefaultOpen}
                summaryVisible={focus.focusSummary}
                t={t}
                renderItem={item => item.kind === 'reasoning'
                  ? <div className={css.previewThink}>{item.text}</div>
                  : <PreviewNode key={item.nodeKey} label={item.nodeKey === 'preview-1' ? 'read' : 'glob'} />}
              />
            )}
            <ChatBubble
              role="assistant"
              compact={focus.focusBubbleStyle === 'compact'}
              time={Date.now()}
              custom={assistantCustom}
            >
              <div className={css.previewReply}>{PREVIEW_LONG}</div>
            </ChatBubble>
            {showUser && (
              <div className={css.previewUserWrap}>
                <span className={css.previewLabel}>{t('focus.previewUser')}</span>
                <ChatBubble
                  role="user"
                  compact={focus.focusBubbleStyle === 'compact'}
                  custom={userCustom}
                >
                  {PREVIEW_LONG}
                </ChatBubble>
              </div>
            )}
          </aside>
        )}
      </div>

      <SkinMaker
        open={makerOpen}
        onClose={() => setMakerOpen(false)}
        skins={skins}
        onSaved={onSkinSaved}
        seed={seedStyle(appearanceSide, focus)}
        t={t}
      />
    </div>
  )
})
