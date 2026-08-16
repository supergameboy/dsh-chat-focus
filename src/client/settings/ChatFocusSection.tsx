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
import { RuntimeFoldBox, type RuntimeFoldBoxProps } from '../chat/bubbles/RuntimeFoldBox.tsx'
import { ChatBubble } from '../chat/bubbles/ChatBubble.tsx'
import css from './ChatFocusSection.module.css'

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
const PREVIEW_RUN: Omit<RuntimeFoldBoxProps, 'renderNode' | 't' | 'defaultOpen' | 'summaryVisible' | 'keepVisible'> = {
  anchorKey: 'preview-run',
  insideKeys: ['preview-1', 'preview-2', 'preview-3'],
  summary: { total: 5, toolCount: 3, thinkCount: 1, otherCount: 1, toolNames: ['read', 'glob'] },
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
              title={t('focus.customBg')}
              hint={t('focus.customHint')}
              control={(
                <input
                  type="text"
                  className={css.textInput}
                  placeholder="#eef4ff"
                  value={focus.focusBubbleBg}
                  onChange={event => setField('focusBubbleBg', event.target.value)}
                />
              )}
            />
            <Row
              title={t('focus.customBorder')}
              hint={t('focus.customHint')}
              control={(
                <input
                  type="text"
                  className={css.textInput}
                  placeholder="#d0d7de"
                  value={focus.focusBubbleBorder}
                  onChange={event => setField('focusBubbleBorder', event.target.value)}
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
                setField('focusBubbleBg', '')
                setField('focusBubbleBorder', '')
                setField('focusBubbleRadius', '')
                setField('focusBubbleMaxWidth', '')
                setField('focusBubbleBgImage', '')
              }}
            >
              {t('focus.customReset')}
            </button>
          </div>
          <div className={css.previewWrap}>
            <span className={css.previewLabel}>{t('focus.preview')} · {t('focus.previewExample')}</span>
            <RuntimeFoldBox
              {...PREVIEW_RUN}
              defaultOpen={focus.focusDefaultOpen}
              summaryVisible={focus.focusSummary}
              t={t}
              renderNode={key => (
                <PreviewNode key={key} label={key === 'preview-1' ? 'read' : key === 'preview-2' ? 'glob' : '思考'} />
              )}
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
