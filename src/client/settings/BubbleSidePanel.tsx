// BubbleSidePanel: every per-side bubble control in one panel — style source
// (skin or template), backdrop (color/opacity/glass/image/gradient/overlay),
// text, and geometry. Assistant and user sides share this component; only the
// artwork geometry (radius/padding) is owned by an applied skin and shown
// disabled with an explanation — every style field stays editable.

import type { ChatSettings } from '../../chat-settings.ts'
import {
  FOCUS_BACKDROP_BLUR_PRESETS, FOCUS_BUBBLE_BG_SIZES,
  type FocusBackdropBlur, type FocusBubbleBgSize,
} from '../../chat-settings.ts'
import type { SkinRegistry } from '../skins/registry.ts'
import { BgImageField, ColorField, FocusPicker, FontSelect, Group, Notice, OpacitySlider, OverlaySlider, PresetSelect, Row, FONT_SIZE_PRESETS, type FocusTranslator } from './controls.tsx'

/** Padding presets (only the bubble editor offers these). */
const PADDING_PRESETS = ['', '6px 10px', '10px 14px', '14px 18px']
import css from './ChatFocusSection.module.css'

/** One built-in bubble template: fills the custom fields with one pick. */
interface BubblePreset {
  readonly id: string
  readonly values: Record<string, string>
}

/** Inline dotted texture for the texture template (no external assets). */const TEXTURE_DATA_URI = 'data:image/svg+xml,'
  + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28">'
    + '<rect width="28" height="28" fill="#f6f8fb"/>'
    + '<circle cx="7" cy="7" r="2.5" fill="#dde5f0"/>'
    + '<circle cx="21" cy="21" r="3" fill="#dde5f0"/></svg>')

/** Built-in bubble templates ('' = theme default). */
const BUBBLE_PRESETS: readonly BubblePreset[] = [  { id: '', values: {} },
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

/** Full props of one side's bubble panel. */
export interface BubbleSidePanelProps {
  readonly side: 'assistant' | 'user'
  readonly focus: ChatSettings
  readonly setField: (field: keyof ChatSettings, value: unknown) => void
  /** Live slider value while dragging (preview only, not yet persisted). */
  readonly overlayDraft: number | null
  /** Update the live slider draft (no settings write). */
  readonly onOverlayDraft: (next: number | null) => void
  /** Live backdrop-opacity draft while dragging (preview only). */
  readonly opacityDraft: number | null
  /** Update the live backdrop-opacity draft (no settings write). */
  readonly onOpacityDraft: (next: number | null) => void
  readonly skins: SkinRegistry
  /** Switch to the skins tab and open the maker. */
  readonly onOpenMaker: () => void
  readonly t: FocusTranslator
}

/** Read the stored focal point's vertical percentage (legacy names included). */
function bgFocusY(value: string): number {
  if (value === 'top') return 0
  if (value === 'bottom') return 100
  if (value === 'center' || value === '') return 50
  const match = /^d+(?:.d+)?%s+(d+(?:.d+)?)%$/.exec(value.trim())
  return match === null ? 50 : Number(match[1])
}

/** One side's complete bubble editor. */
export function BubbleSidePanel({
  side, focus, setField, overlayDraft, onOverlayDraft, opacityDraft, onOpacityDraft, skins, onOpenMaker, t,
}: BubbleSidePanelProps) {
  const prefix = side === 'assistant' ? 'focusBubble' : 'focusUserBubble'
  const field = (suffix: string): keyof ChatSettings => `${prefix}${suffix}` as keyof ChatSettings
  const value = (suffix: string): string => focus[field(suffix)] as string
  const set = (suffix: string, next: unknown): void => setField(field(suffix), next)
  const storedOpacity = focus[field('BackdropOpacity')] as number

  const skinId = value('Skin')
  const applied = skins.resolve(skinId)
  // Only the artwork geometry is owned by a skin; a parameter-only skin has
  // no artwork at all, so nothing is taken over. Every colour, gradient, and
  // text field stays user-editable after a skin is applied.
  const shapeOwned = applied !== undefined && applied.record.kind !== 'style'
  const skinActive = applied !== undefined
  const skinLabel = (): string => {
    if (skinId === '') return t('focus.skinNone')
    if (applied === undefined) return t('focus.skinMissing')
    return applied.record.name
  }

  return (
    <>
      <Group title={t('focus.groupSource')}>
        <Row
          title={t('focus.skin')}
          hint={t('focus.skinHint')}
          control={(
            <div className={css.skinPickRow}>
              <select
                className={css.select}
                value={applied === undefined ? '' : skinId}
                onChange={event => set('Skin', event.target.value)}
              >
                <option value="">{skinLabel()}</option>
                {skins.list().map(entry => (
                  <option key={entry.record.id} value={entry.record.id}>
                    {entry.record.name}{entry.builtin ? ` · ${t('focus.skins.builtin')}` : ''}
                  </option>
                ))}
              </select>
              <button type="button" className={css.clearButton} onClick={onOpenMaker}>
                {t('focus.skinGoMake')}
              </button>
            </div>
          )}
        />
        {skinActive && (
          <Notice>{t('focus.skinTakeover', { name: applied.record.name })}</Notice>
        )}
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
                  {t((preset.id === '' ? 'focus.preset.default' : `focus.preset.${preset.id}`) as Parameters<FocusTranslator>[0])}
                </option>
              ))}
              <option value="__custom__">{t('focus.preset.custom')}</option>
            </select>
          )}
        />
      </Group>

      <Group title={t('focus.groupBackdrop')}>
        <Row
          title={t('focus.customBg')}
          hint={t('focus.customHint')}
          control={<ColorField value={value('Bg')} onChange={next => set('Bg', next)} />}
        />
        <Row
          title={t('focus.backdropOpacity')}
          hint={t('focus.backdropOpacityHint')}
          control={(
            <OpacitySlider
              value={storedOpacity}
              draft={opacityDraft}
              onDraft={onOpacityDraft}
              onChange={next => set('BackdropOpacity', next)}
              t={t}
            />
          )}
        />
        <Row
          title={t('focus.backdropBlur')}
          hint={t('focus.backdropBlurHint')}
          control={(
            <select
              className={css.select}
              value={value('BackdropBlur')}
              onChange={event => set('BackdropBlur', event.target.value as FocusBackdropBlur)}
            >
              {FOCUS_BACKDROP_BLUR_PRESETS.map(preset => (
                <option key={preset || 'none'} value={preset}>
                  {t((preset === '' ? 'focus.blur.none' : `focus.blur.${preset}`) as Parameters<FocusTranslator>[0])}
                </option>
              ))}
            </select>
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
          title={t('focus.bgPosition')}
          hint={t('focus.bgPositionHint')}
          control={(
            <FocusPicker
              value={bgFocusY(value('BgPosition'))}
              onChange={next => set('BgPosition', `50% ${String(next)}%`)}
              t={t}
            />
          )}
        />
        <Row
          title={t('focus.overlay')}
          hint={t('focus.overlayHint')}
          control={(
            <OverlaySlider
              value={value('Overlay')}
              draft={overlayDraft}
              onDraft={onOverlayDraft}
              onChange={next => set('Overlay', next)}
              t={t}
            />
          )}
        />
      </Group>

      <Group title={t('focus.groupText')}>
        <Row
          title={t('focus.customTextColor')}
          hint={t('focus.customHint')}
          control={(
            <ColorField
              value={value('TextColor')}
              onChange={next => set('TextColor', next)}
            />
          )}
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
          hint={shapeOwned ? t('focus.skinPaddingOwned') : t('focus.customHint')}
          disabled={shapeOwned}
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
      </Group>

      <Group title={t('focus.groupGeometry')}>
        <Row
          title={t('focus.customRadius')}
          hint={shapeOwned ? t('focus.skinRadiusOwned') : t('focus.customHint')}
          disabled={shapeOwned}
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
          title={t('focus.customBorder')}
          hint={t('focus.customHint')}
          control={<ColorField value={value('Border')} onChange={next => set('Border', next)} />}
        />
        <button
          type="button"
          className={css.resetButton}
          onClick={() => {
            set('Preset', '')
            set('Skin', '')
            set('Bg', '')
            set('Border', '')
            set('Radius', '')
            set('MaxWidth', '')
            set('BgImage', '')
            set('BgSize', 'cover')
            set('BgPosition', 'center')
            set('Overlay', '')
            set('BackdropOpacity', 100)
            set('BackdropBlur', '')
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
      </Group>
    </>
  )
}
