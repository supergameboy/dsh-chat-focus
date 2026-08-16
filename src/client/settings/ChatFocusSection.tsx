// ChatFocusSection: the '对话显示' settings page — three grouped panels over
// the shared conversation settings scope, with a live sample preview of the
// fold box and bubble chrome (frozen sample data; the section seat is
// root-scoped, so real session data needs a v0.2 inject channel).

import { memo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { ConversationSettings } from '../../submission-settings.ts'
import {
  FOCUS_BUBBLE_BG_SIZES, FOCUS_BUBBLE_STYLES, FOCUS_STRATEGIES,
  type FocusBubbleBgSize, type FocusBubbleStyle, type FocusFoldStrategy,
} from '../../submission-settings.ts'
import type { ChatBubbleCustomStyle } from '../chat/bubbles/ChatBubble.tsx'
import { RuntimeFoldBox, type RuntimeFoldBoxProps } from '../chat/bubbles/RuntimeFoldBox.tsx'
import { ChatBubble } from '../chat/bubbles/ChatBubble.tsx'
import { ImageCropper, compressImageDataUrl } from './ImageCropper.tsx'
import type { ConversationKey } from '../locales.ts'
import css from './ChatFocusSection.module.css'

/** Max uploaded background-image file size (keeps the settings file sane). */
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024

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

/** Preview custom style for one side (gradient overrides the background image). */
function previewCustom(focus: ConversationSettings, side: 'assistant' | 'user'): ChatBubbleCustomStyle {
  const f = (suffix: string): string => focus[`${side === 'assistant' ? 'focusBubble' : 'focusUserBubble'}${suffix}` as keyof ConversationSettings] as string
  const gradient = f('GradientFrom') !== ''
  return {
    bg: gradient ? 'transparent' : f('Bg'),
    border: f('Border'),
    radius: f('Radius'),
    maxWidth: f('MaxWidth'),
    bgImage: gradient
      ? `linear-gradient(${f('GradientAngle')}deg, ${f('GradientFrom')}, ${f('GradientTo') !== '' ? f('GradientTo') : f('GradientFrom')})`
      : f('BgImage'),
    bgSize: focus[`${side === 'assistant' ? 'focusBubble' : 'focusUserBubble'}BgSize` as keyof ConversationSettings] as FocusBubbleBgSize,
    textColor: f('TextColor'),
    font: f('Font'),
    fontSize: f('FontSize'),
    padding: f('Padding'),
  }
}

/** Preview style for the simulated user bubble (mirrors the host chrome). */
function previewUserStyle(focus: ConversationSettings): CSSProperties {
  const custom = previewCustom(focus, 'user')
  const style: Record<string, string> = {}
  const set = (name: string, value: string | undefined): void => {
    if (value !== undefined && value !== '') style[name] = value
  }
  set('background', custom.bg)
  set('border', custom.border !== '' ? `1px solid ${custom.border}` : '')
  set('borderRadius', custom.radius)
  set('maxWidth', custom.maxWidth)
  set('backgroundImage', custom.bgImage)
  set('backgroundSize', custom.bgSize === 'stretch' ? '100% 100%' : custom.bgSize)
  set('color', custom.textColor)
  set('fontFamily', custom.font)
  set('fontSize', custom.fontSize)
  set('padding', custom.padding)
  return style as CSSProperties
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

/** Available font presets (system stacks; '' follows the theme). */
const FONT_PRESETS: readonly { id: string; value: string }[] = [
  { id: 'default', value: '' },
  { id: 'pingfang', value: "'PingFang SC', 'Microsoft YaHei', sans-serif" },
  { id: 'yahei', value: "'Microsoft YaHei', 'PingFang SC', sans-serif" },
  { id: 'noto', value: "'Noto Sans SC', 'PingFang SC', sans-serif" },
  { id: 'helvetica', value: "'Helvetica Neue', Arial, sans-serif" },
  { id: 'serif', value: "Georgia, 'Times New Roman', serif" },
  { id: 'mono', value: "Consolas, 'Courier New', monospace" },
]

/** Font size presets. */
const FONT_SIZE_PRESETS = ['', '12px', '13px', '14px', '15px', '16px', '18px']
/** Padding presets. */
const PADDING_PRESETS = ['', '6px 10px', '10px 14px', '14px 18px']

/** Preset dropdown that falls back to a custom option for free-form values. */
function PresetSelect({ presets, value, emptyKey, customKey, onChange, t }: {
  presets: readonly string[]
  value: string
  emptyKey: string
  customKey: string
  onChange: (next: string) => void
  t: (key: ConversationKey) => string
}) {
  const matched = presets.includes(value)
  return (
    <select
      className={css.select}
      value={matched ? value : '__custom__'}
      onChange={event => {
        const next = event.target.value
        if (next !== '__custom__') onChange(next)
      }}
    >
      {presets.map(preset => (
        <option key={preset || 'default'} value={preset}>
          {preset === '' ? t(emptyKey as ConversationKey) : preset}
        </option>
      ))}
      {!matched && value !== '' && <option value="__custom__">{t(customKey as ConversationKey)}</option>}
    </select>
  )
}

/** Font family dropdown over the system-stack presets. */
function FontSelect({ value, onChange, t }: {
  value: string
  onChange: (next: string) => void
  t: (key: ConversationKey) => string
}) {
  const matched = FONT_PRESETS.find(preset => preset.value === value)
  return (
    <select
      className={css.select}
      value={matched !== undefined ? matched.id : '__custom__'}
      onChange={event => {
        const preset = FONT_PRESETS.find(candidate => candidate.id === event.target.value)
        if (preset !== undefined) onChange(preset.value)
      }}
    >
      {FONT_PRESETS.map(preset => (
        <option key={preset.id} value={preset.id}>{t(`focus.font.${preset.id}` as ConversationKey)}</option>
      ))}
      {matched === undefined && value !== '' && <option value="__custom__">{t('focus.font.custom')}</option>}
    </select>
  )
}

/** Gradient editor: enable + start/end colors (color wheels) + angle. */
function GradientEditor({ from, to, angle, onChangeFrom, onChangeTo, onChangeAngle, t }: {
  from: string
  to: string
  angle: string
  onChangeFrom: (next: string) => void
  onChangeTo: (next: string) => void
  onChangeAngle: (next: string) => void
  t: (key: ConversationKey) => string
}) {
  const enabled = from !== ''
  return (
    <div className={css.gradientBox}>
      <label className={css.checkbox}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={event => onChangeFrom(event.target.checked ? '#eef2ff' : '')}
        />
        <span>{t('focus.gradientEnable')}</span>
      </label>
      {enabled && (
        <div className={css.gradientRow}>
          <ColorField value={from} onChange={onChangeFrom} />
          <ColorField value={to !== '' ? to : from} onChange={onChangeTo} />
          <input
            type="number"
            className={css.number}
            min={0}
            max={360}
            step={15}
            value={angle}
            onChange={event => onChangeAngle(String(Number(event.target.value) || 0))}
          />
          <span className={css.gradientAngle}>°</span>
        </div>
      )}
    </div>
  )
}

/** Background image field: upload + crop dialog, thumbnail, URL input, clear. */
function BgImageField({ value, onChange, t }: {
  value: string
  onChange: (next: string) => void
  t: (key: ConversationKey) => string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [cropSource, setCropSource] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const onFilePicked = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file === undefined) return
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError(t('focus.uploadTooLarge'))
      return
    }
    setUploadError(null)
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') return
      // Downscale before cropping so the exported settings value stays small
      // enough for the settings write to succeed reliably.
      void compressImageDataUrl(reader.result).then(setCropSource, () => {
        setUploadError(t('focus.uploadTooLarge'))
      })
    }
    reader.readAsDataURL(file)
  }

  return (
    <>
      <div className={css.bgImageControl}>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFilePicked} />
        <button type="button" className={css.uploadButton} onClick={() => fileRef.current?.click()}>
          {t('focus.upload')}
        </button>
        {value !== '' && <img className={css.bgThumb} src={value} alt="" />}
        <input
          type="text"
          className={css.textInput}
          placeholder="https://… 或 data:image/…"
          value={value}
          onChange={event => onChange(event.target.value)}
        />
        {value !== '' && (
          <button type="button" className={css.clearButton} onClick={() => onChange('')}>
            {t('focus.clearImage')}
          </button>
        )}
      </div>
      {uploadError !== null && <span className={css.uploadError} role="status">{uploadError}</span>}
      <Modal
        open={cropSource !== null}
        onClose={() => setCropSource(null)}
        title={t('focus.cropTitle')}
        closeLabel={t('details.close')}
      >
        {cropSource !== null && (
          <ImageCropper
            imageUrl={cropSource}
            onConfirm={dataUrl => {
              onChange(dataUrl)
              setCropSource(null)
            }}
            onCancel={() => setCropSource(null)}
          />
        )}
      </Modal>
    </>
  )
}

/** Full per-side bubble editor (assistant or user) with the shared knobs. */
function BubbleSideEditor({ side, focus, setField, t }: {
  side: 'assistant' | 'user'
  focus: ConversationSettings
  setField: (field: keyof ConversationSettings, value: unknown) => void
  t: (key: ConversationKey) => string
}) {
  const prefix = side === 'assistant' ? 'focusBubble' : 'focusUserBubble'
  const field = (suffix: string): keyof ConversationSettings => `${prefix}${suffix}` as keyof ConversationSettings
  const value = (suffix: string): string => focus[field(suffix)] as string
  const set = (suffix: string, next: unknown): void => setField(field(suffix), next)

  return (
    <div className={css.sideBlock}>
      <span className={css.sideTitle}>
        {t(side === 'assistant' ? 'focus.sideAssistant' : 'focus.sideUser')}
      </span>
      <Row
        title={t('focus.preset')}
        hint={t('focus.presetHint')}
        control={(
          <select
            className={css.select}
            value={value('Preset')}
            onChange={event => {
              const id = event.target.value
              const preset = BUBBLE_PRESETS.find(candidate => candidate.id === id)
              if (preset === undefined) return
              set('Preset', id)
              set('Bg', preset.values.bg ?? '')
              set('Border', preset.values.border ?? '')
              set('Radius', preset.values.radius ?? '')
              set('MaxWidth', preset.values.maxWidth ?? '')
              set('BgImage', preset.values.bgImage ?? '')
              // Presets that carry a background image disable the gradient.
              if (preset.values.bgImage !== undefined && preset.values.bgImage !== '') set('GradientFrom', '')
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
        title={t('focus.gradient')}
        hint={t('focus.gradientHint')}
        control={(
          <GradientEditor
            from={value('GradientFrom')}
            to={value('GradientTo')}
            angle={value('GradientAngle')}
            onChangeFrom={next => {
              set('GradientFrom', next)
              // Gradient and background image are mutually exclusive.
              if (next !== '') set('BgImage', '')
            }}
            onChangeTo={next => set('GradientTo', next)}
            onChangeAngle={next => set('GradientAngle', next)}
            t={t}
          />
        )}
      />
      <Row
        title={t('focus.customBg')}
        hint={t('focus.customHint')}
        control={<ColorField value={value('Bg')} onChange={next => set('Bg', next)} />}
      />
      <Row
        title={t('focus.customBorder')}
        hint={t('focus.customHint')}
        control={<ColorField value={value('Border')} onChange={next => set('Border', next)} />}
      />
      <Row
        title={t('focus.customRadius')}
        hint={t('focus.customHint')}
        control={(
          <PresetSelect
            presets={['', '10px', '14px', '18px', '22px']}
            value={value('Radius')}
            emptyKey="focus.radiusDefault"
            customKey="focus.customValue"
            onChange={next => set('Radius', next)}
            t={t}
          />
        )}
      />
      <Row
        title={t('focus.customMaxWidth')}
        hint={t('focus.customHint')}
        control={(
          <PresetSelect
            presets={['', '480px', '600px', '720px', '840px']}
            value={value('MaxWidth')}
            emptyKey="focus.widthDefault"
            customKey="focus.customValue"
            onChange={next => set('MaxWidth', next)}
            t={t}
          />
        )}
      />
      <Row
        title={t('focus.customBgImage')}
        hint={t('focus.customBgImageHint')}
        control={(
          <BgImageField
            value={value('BgImage')}
            onChange={next => {
              set('BgImage', next)
              // A background image and a gradient are mutually exclusive:
              // setting an image disables the gradient so it cannot silently
              // override the picture.
              if (next !== '') set('GradientFrom', '')
            }}
            t={t}
          />
        )}
      />
      <Row
        title={t('focus.bgSize')}
        hint={t('focus.bgSizeHint')}
        control={(
          <select
            className={css.select}
            value={value('BgSize')}
            onChange={event => set('BgSize', event.target.value as FocusBubbleBgSize)}
          >
            {FOCUS_BUBBLE_BG_SIZES.map(size => (
              <option key={size} value={size}>{t(`focus.bgSize.${size}`)}</option>
            ))}
          </select>
        )}
      />
      <Row
        title={t('focus.customTextColor')}
        hint={t('focus.customHint')}
        control={<ColorField value={value('TextColor')} onChange={next => set('TextColor', next)} />}
      />
      <Row
        title={t('focus.customFont')}
        hint={t('focus.customHint')}
        control={<FontSelect value={value('Font')} onChange={next => set('Font', next)} t={t} />}
      />
      <Row
        title={t('focus.customFontSize')}
        hint={t('focus.customHint')}
        control={(
          <PresetSelect
            presets={FONT_SIZE_PRESETS}
            value={value('FontSize')}
            emptyKey="focus.fontSizeDefault"
            customKey="focus.customValue"
            onChange={next => set('FontSize', next)}
            t={t}
          />
        )}
      />
      <Row
        title={t('focus.customPadding')}
        hint={t('focus.customHint')}
        control={(
          <PresetSelect
            presets={PADDING_PRESETS}
            value={value('Padding')}
            emptyKey="focus.paddingDefault"
            customKey="focus.customValue"
            onChange={next => set('Padding', next)}
            t={t}
          />
        )}
      />
      <button
        type="button"
        className={css.resetButton}
        onClick={() => {
          set('Preset', '')
          set('Bg', '')
          set('Border', '')
          set('Radius', '')
          set('MaxWidth', '')
          set('BgImage', '')
          set('BgSize', 'cover')
          set('GradientFrom', '')
          set('GradientTo', '')
          set('GradientAngle', '135')
          set('TextColor', '')
          set('Font', '')
          set('FontSize', '')
          set('Padding', '')
        }}
      >
        {t('focus.customReset')}
      </button>
    </div>
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
          <BubbleSideEditor side="assistant" focus={focus} setField={setField} t={t} />
          <BubbleSideEditor side="user" focus={focus} setField={setField} t={t} />
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
              custom={previewCustom(focus, 'assistant')}
            >
              <div className={css.previewReply}>这是正式回复示例文本。</div>
            </ChatBubble>
            <div className={css.previewUserWrap}>
              <span className={css.previewLabel}>{t('focus.previewUser')}</span>
              <div className={css.previewUserBubble} style={previewUserStyle(focus)}>
                这是用户消息示例。
              </div>
            </div>
          </div>
        </div>
      </details>
    </div>
  )
})
