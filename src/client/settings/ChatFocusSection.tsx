// ChatFocusSection: the '对话显示' settings page — three grouped panels over
// the shared conversation settings scope, with a live sample preview of the
// fold box and bubble chrome (frozen sample data; the section seat is
// root-scoped, so real session data needs a v0.2 inject channel).

import { memo } from 'react'
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { ConversationSettings } from '../../submission-settings.ts'
import {
  FOCUS_BUBBLE_STYLES, FOCUS_STRATEGIES, type FocusBubbleStyle, type FocusFoldStrategy,
} from '../../submission-settings.ts'
import type { ChatBubbleCustomStyle } from '../chat/bubbles/ChatBubble.tsx'
import { RuntimeFoldBox, type RuntimeFoldBoxProps } from '../chat/bubbles/RuntimeFoldBox.tsx'
import { ChatBubble } from '../chat/bubbles/ChatBubble.tsx'
import type { ConversationKey } from '../locales.ts'
import css from './ChatFocusSection.module.css'

/** One built-in bubble template: fills the custom fields with one pick. */
interface BubblePreset {
  readonly id: string
  readonly values: ChatBubbleCustomStyle
}

/** Inline dotted texture for the texture template (no external assets). */
const TEXTURE_DATA_URI = 'data:image/svg+xml,'
  + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28">'
    + '<rect width="28" height="28" fill="#f6f8fb"/>'
    + '<circle cx="7" cy="7" r="2.5" fill="#dde5f0"/>'
    + '<circle cx="21" cy="21" r="3" fill="#dde5f0"/></svg>')

/** Built-in bubble templates ('' = theme default). */
const BUBBLE_PRESETS: readonly BubblePreset[] = [
  { id: '', values: {} },
  { id: 'sky', values: { bg: '#e8f1ff', border: '#c9dcff', radius: '14px' } },
  { id: 'mint', values: { bg: '#e6f7ec', border: '#bfe6cd', radius: '14px' } },
  {
    id: 'gradient',
    values: {
      bg: 'transparent',
      bgImage: 'linear-gradient(135deg, #eef2ff 0%, #fdf2f8 100%)',
      border: '#e0e7ff',
      radius: '16px',
    },
  },
  { id: 'dark', values: { bg: '#1f2937', border: '#374151', radius: '12px' } },
  { id: 'texture', values: { bg: 'transparent', bgImage: TEXTURE_DATA_URI, border: '#e5e7eb', radius: '12px' } },
]

/** Which preset the current custom fields match, or '__custom__'. */
function activePreset(focus: ConversationSettings): string {
  const match = BUBBLE_PRESETS.find(preset =>
    preset.values.bg === focus.focusBubbleBg
    && (preset.values.border ?? '') === focus.focusBubbleBorder
    && (preset.values.radius ?? '') === focus.focusBubbleRadius
    && (preset.values.maxWidth ?? '') === focus.focusBubbleMaxWidth
    && (preset.values.bgImage ?? '') === focus.focusBubbleBgImage)
  return match?.id ?? '__custom__'
}

/** Hex color input plus free-form text input for one color field. */
function ColorField({ value, onChange }: {
  value: string
  onChange: (next: string) => void
}) {
  return (
    <div className={css.colorRow}>
      <input
        type="color"
        className={css.colorPicker}
        value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#dbeafe'}
        onChange={event => onChange(event.target.value)}
      />
      <input
        type="text"
        className={css.textInput}
        value={value}
        onChange={event => onChange(event.target.value)}
      />
    </div>
  )
}

/** Injected share: the live settings snapshot (useFocusSettings) and one field write. */
export interface ChatFocusSectionInjected {
  hooks: {
    /** Durable ChatFocus section bound as useFocusSettings. */
    focusSettings: ObservableSnapshot<ConversationSettings>
  }
  /** Write one scalar field of the conversation settings namespace. */
  setFocusField: (field: string, value: unknown) => void
}

/** Full props of the ChatFocus settings section. */
export type ChatFocusSectionProps =
  PropsRuntime<'settings.section'> & InjectFace<ChatFocusSectionInjected> & PropsLocale<'conversation'>

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

/** One settings row: label/hint plus the control slot. */
function Row({ title, hint, control }: {
  title: string
  hint: string
  control: React.ReactNode
}) {
  return (
    <div className={css.row}>
      <div className={css.rowCopy}>
        <span className={css.rowTitle}>{title}</span>
        <span className={css.rowHint}>{hint}</span>
      </div>
      <div className={css.rowControl}>{control}</div>
    </div>
  )
}

function Checkbox({ checked, onChange, label }: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
}) {
  return (
    <label className={css.checkbox}>
      <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

/** The ChatFocus display settings page. */
export const ChatFocusSection = memo(function ChatFocusSection({
  close, useFocusSettings, setFocusField, t,
}: ChatFocusSectionProps) {
  const focus = useFocusSettings(value => value)
  const setField = (field: keyof ConversationSettings, value: unknown): void => {
    setFocusField(field, value)
  }
  return (
    <div className={css.root} role="tabpanel" aria-label={t('focus.sectionLabel')}>
      <div className={css.header}>
        <span className={css.headerTitle}>{t('focus.sectionLabel')}</span>
        <button type="button" className={css.close} onClick={close}>{t('details.close')}</button>
      </div>

      <details className={css.group} open>
        <summary className={css.groupSummary}>{t('focus.basicGroup')}</summary>
        <div className={css.groupBody}>
          <Row
            title={t('focus.enabled')}
            hint={t('focus.enabledHint')}
            control={(
              <Checkbox
                checked={focus.focusEnabled}
                onChange={next => setField('focusEnabled', next)}
                label={focus.focusEnabled ? '开' : '关'}
              />
            )}
          />
          <Row
            title={t('focus.bubbles')}
            hint={t('focus.bubblesHint')}
            control={(
              <Checkbox
                checked={focus.focusBubbles}
                onChange={next => setField('focusBubbles', next)}
                label={focus.focusBubbles ? '开' : '关'}
              />
            )}
          />
        </div>
      </details>

      <details className={css.group} open>
        <summary className={css.groupSummary}>{t('focus.foldGroup')}</summary>
        <div className={css.groupBody}>
          <Row
            title={t('focus.keepVisible')}
            hint={t('focus.keepVisibleHint')}
            control={(
              <input
                type="number"
                min={0}
                max={10}
                step={1}
                value={String(focus.focusKeepVisible)}
                onChange={event => setField('focusKeepVisible', Number(event.target.value))}
                className={css.number}
              />
            )}
          />
          <Row
            title={t('focus.defaultOpen')}
            hint={t('focus.defaultOpenHint')}
            control={(
              <Checkbox
                checked={focus.focusDefaultOpen}
                onChange={next => setField('focusDefaultOpen', next)}
                label={focus.focusDefaultOpen ? '开' : '关'}
              />
            )}
          />
          <Row
            title={t('focus.strategy')}
            hint={t('focus.strategy.keep-recent')}
            control={(
              <select
                className={css.select}
                value={focus.focusStrategy}
                onChange={event => setField('focusStrategy', event.target.value as FocusFoldStrategy)}
              >
                {FOCUS_STRATEGIES.map(strategy => (
                  <option key={strategy} value={strategy} disabled={strategy !== 'keep-recent'}>
                    {t(`focus.strategy.${strategy}`)}
                  </option>
                ))}
              </select>
            )}
          />
          <Row
            title={t('focus.reasoning')}
            hint={t('focus.reasoningHint')}
            control={(
              <Checkbox
                checked={focus.focusReasoning}
                onChange={next => setField('focusReasoning', next)}
                label={focus.focusReasoning ? '开' : '关'}
              />
            )}
          />
        </div>
      </details>

      <details className={css.group} open>
        <summary className={css.groupSummary}>{t('focus.appearanceGroup')}</summary>
        <div className={css.groupBody}>
          <Row
            title={t('focus.bubbleStyle')}
            hint={t('focus.bubbleStyle.default')}
            control={(
              <select
                className={css.select}
                value={focus.focusBubbleStyle}
                onChange={event => setField('focusBubbleStyle', event.target.value as FocusBubbleStyle)}
              >
                {FOCUS_BUBBLE_STYLES.map(style => (
                  <option key={style} value={style}>{t(`focus.bubbleStyle.${style}`)}</option>
                ))}
              </select>
            )}
          />
          <Row
            title={t('focus.summary')}
            hint={t('focus.summaryHint')}
            control={(
              <Checkbox
                checked={focus.focusSummary}
                onChange={next => setField('focusSummary', next)}
                label={focus.focusSummary ? '开' : '关'}
              />
            )}
          />
          <div className={css.customBlock}>
            <span className={css.customTitle}>{t('focus.customGroup')}</span>
            <Row
              title={t('focus.preset')}
              hint={t('focus.presetHint')}
              control={(
                <select
                  className={css.select}
                  value={activePreset(focus)}
                  onChange={event => {
                    const id = event.target.value
                    if (id === '__custom__') {
                      setField('focusBubblePreset', '')
                      return
                    }
                    const preset = BUBBLE_PRESETS.find(candidate => candidate.id === id)
                    if (preset === undefined) return
                    setField('focusBubblePreset', id)
                    setField('focusBubbleBg', preset.values.bg ?? '')
                    setField('focusBubbleBorder', preset.values.border ?? '')
                    setField('focusBubbleRadius', preset.values.radius ?? '')
                    setField('focusBubbleMaxWidth', preset.values.maxWidth ?? '')
                    setField('focusBubbleBgImage', preset.values.bgImage ?? '')
                  }}
                >
                  {BUBBLE_PRESETS.map(preset => (
                    <option key={preset.id || 'default'} value={preset.id}>
                      {t((preset.id === '' ? 'focus.preset.default' : `focus.preset.${preset.id}`) as ConversationKey)}
                    </option>
                  ))}
                  <option value="__custom__">{t('focus.preset.custom')}</option>
                </select>
              )}
            />
            <Row
              title={t('focus.customBg')}
              hint={t('focus.customHint')}
              control={(
                <ColorField
                  value={focus.focusBubbleBg}
                  onChange={next => setField('focusBubbleBg', next)}
                />
              )}
            />
            <Row
              title={t('focus.customBorder')}
              hint={t('focus.customHint')}
              control={(
                <ColorField
                  value={focus.focusBubbleBorder}
                  onChange={next => setField('focusBubbleBorder', next)}
                />
              )}
            />
            <Row
              title={t('focus.customRadius')}
              hint={t('focus.customHint')}
              control={(
                <input
                  type="text"
                  className={css.textInput}
                  placeholder="12px"
                  value={focus.focusBubbleRadius}
                  onChange={event => setField('focusBubbleRadius', event.target.value)}
                />
              )}
            />
            <Row
              title={t('focus.customMaxWidth')}
              hint={t('focus.customHint')}
              control={(
                <input
                  type="text"
                  className={css.textInput}
                  placeholder="720px"
                  value={focus.focusBubbleMaxWidth}
                  onChange={event => setField('focusBubbleMaxWidth', event.target.value)}
                />
              )}
            />
            <Row
              title={t('focus.customBgImage')}
              hint={t('focus.customBgImageHint')}
              control={(
                <input
                  type="text"
                  className={css.textInput}
                  placeholder="https://… 或 data:image/…"
                  value={focus.focusBubbleBgImage}
                  onChange={event => setField('focusBubbleBgImage', event.target.value)}
                />
              )}
            />
            <button
              type="button"
              className={css.resetButton}
              onClick={() => {
                setField('focusBubblePreset', '')
                setField('focusBubbleBg', '')
                setField('focusBubbleBorder', '')
                setField('focusBubbleRadius', '')
                setField('focusBubbleMaxWidth', '')
                setField('focusBubbleBgImage', '')
              }}
            >
              {t('focus.customReset')}
            </button>
            <Row
              title={t('focus.userBubble')}
              hint={t('focus.userBubbleHint')}
              control={(
                <ColorField
                  value={focus.focusUserBubbleBg}
                  onChange={next => setField('focusUserBubbleBg', next)}
                />
              )}
            />
          </div>
          <div className={css.previewWrap}>
            <span className={css.previewLabel}>{t('focus.preview')} · {t('focus.previewExample')}</span>
            <RuntimeFoldBox
              {...PREVIEW_RUN}
              defaultOpen={focus.focusDefaultOpen}
              summaryVisible={focus.focusSummary}
              t={t}
              renderItem={item => item.kind === 'reasoning'
                ? <div className={css.previewThink}>{item.text}</div>
                : <PreviewNode key={item.nodeKey} label={item.nodeKey === 'preview-1' ? 'read' : 'glob'} />}
            />
            <ChatBubble
              role="assistant"
              compact={focus.focusBubbleStyle === 'compact'}
              time={Date.now()}
              custom={{
                bg: focus.focusBubbleBg,
                border: focus.focusBubbleBorder,
                radius: focus.focusBubbleRadius,
                maxWidth: focus.focusBubbleMaxWidth,
                bgImage: focus.focusBubbleBgImage,
              }}
            >
              <div className={css.previewReply}>这是正式回复示例文本。</div>
            </ChatBubble>
          </div>
        </div>
      </details>
    </div>
  )
})
