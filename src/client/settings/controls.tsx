// Shared settings controls for the ChatFocus page: one row shape, one set of
// inputs. Extracted from the original single-file section so the general,
// bubble-side, and skin panels stay pure layout.

import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { FocusKey } from './focus-locale.ts'
import { ImageCropper, compressImageDataUrl } from './ImageCropper.tsx'
import css from './ChatFocusSection.module.css'

/** Max uploaded background-image file size (keeps the settings file sane). */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024

/** Translator shape shared by every control. */
export type FocusTranslator = (key: FocusKey, params?: Record<string, string>) => string

/** One settings row: label/hint plus the control slot. */
export function Row({ title, hint, control, disabled = false }: {
  title: string
  hint: string
  control: ReactNode
  /** Dims the row when another feature owns the setting (skin takeover). */
  disabled?: boolean
}) {
  return (
    <div className={css.row} data-disabled={disabled || undefined}>
      <div className={css.rowCopy}>
        <span className={css.rowTitle}>{title}</span>
        <span className={css.rowHint}>{hint}</span>
      </div>
      <div className={css.rowControl}>{control}</div>
    </div>
  )
}

/** Checkbox with an inline label. */
export function Checkbox({ checked, onChange, label }: {
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

/** Hex color input plus free-form text input for one color field. */
export function ColorField({ value, onChange, placeholder }: {
  value: string
  onChange: (next: string) => void
  placeholder?: string
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
        placeholder={placeholder}
        onChange={event => onChange(event.target.value)}
      />
    </div>
  )
}

/** Preset dropdown that falls back to a custom option for free-form values. */
export function PresetSelect({ presets, value, emptyKey, customKey, onChange, t }: {
  presets: readonly string[]
  value: string
  emptyKey: string
  customKey: string
  onChange: (next: string) => void
  t: FocusTranslator
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
          {preset === '' ? t(emptyKey as FocusKey) : preset}
        </option>
      ))}
      {!matched && value !== '' && <option value="__custom__">{t(customKey as FocusKey)}</option>}
    </select>
  )
}

/** Labeled slider with a right-aligned value readout. */
export function SliderRow({ min, max, step, value, onChange, label, minWidth = 200 }: {
  min: number
  max: number
  step: number
  value: number
  onChange: (next: number) => void
  label: string
  minWidth?: number
}) {
  return (
    <div className={css.overlayControl} style={{ minWidth }}>
      <input
        type="range"
        className={css.overlaySlider}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={event => onChange(Number(event.target.value))}
      />
      <span className={css.overlayValue}>{label}</span>
    </div>
  )
}

/** Collapsible settings group. */
export function Group({ title, children, open = true }: {
  title: string
  children: ReactNode
  open?: boolean
}) {
  return (
    <details className={css.group} open={open}>
      <summary className={css.groupSummary}>{title}</summary>
      <div className={css.groupBody}>{children}</div>
    </details>
  )
}

/** Explanation banner (skin takeover, unavailable library, …). */
export function Notice({ tone = 'info', children }: {
  tone?: 'info' | 'error'
  children: ReactNode
}) {
  return <div className={css.notice} data-tone={tone}>{children}</div>
}

/** Background image field: upload + crop dialog, thumbnail, URL input, clear. */
export function BgImageField({ value, onChange, t }: {
  value: string
  onChange: (next: string) => void
  t: FocusTranslator
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
        closeLabel={t('focus.close')}
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


// ── Shared bubble-style controls ─────────────────────────────────────────────
// One implementation for the controls both the settings page and the skin
// maker use, so the maker edits the SAME fields with the SAME widgets instead
// of a parallel styling UI.

/** Available font presets (system stacks; '' follows the theme). */
export const FONT_PRESETS: readonly { id: string; value: string }[] = [
  { id: 'default', value: '' },
  { id: 'kaiti', value: "'KaiTi', 'STKaiti', serif" },
  { id: 'simsun', value: "'SimSun', 'Songti SC', serif" },
  { id: 'simhei', value: "'SimHei', 'Heiti SC', sans-serif" },
  { id: 'yahei', value: "'Microsoft YaHei', 'PingFang SC', sans-serif" },
  { id: 'serif', value: "Georgia, 'Times New Roman', serif" },
  { id: 'mono', value: "Consolas, 'Courier New', monospace" },
]

/** Font size presets (16px is the theme default). */
export const FONT_SIZE_PRESETS: readonly string[] = ['', '12px', '14px', '16px', '18px', '20px', '24px']

/** Text-readability overlay slider range. */
export const OVERLAY_MIN = -100
export const OVERLAY_MAX = 100

/** Slider position from a stored overlay value (legacy CSS colors map to 0). */
export function overlayStrength(value: string): number {
  const strength = Number(value)
  return Number.isNaN(strength) ? 0 : Math.max(OVERLAY_MIN, Math.min(OVERLAY_MAX, strength))
}

/** Readable label for the current overlay strength. */
export function overlayLabel(value: string, t: FocusTranslator): string {
  const strength = overlayStrength(value)
  if (strength === 0) return t('focus.overlay.none')
  return strength < 0
    ? t('focus.overlay.black', { value: String(-strength) })
    : t('focus.overlay.white', { value: String(strength) })
}

/** Bind one draft-aware range input. With a draft handler the drag only
 *  updates the draft (the preview follows instantly) and the write happens
 *  once on release; without one every step commits immediately. */
function sliderBinding(
  stored: number,
  draft: number | null | undefined,
  onDraft: ((next: number | null) => void) | undefined,
  commit: (next: number) => void,
): {
  value: number
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onPointerUp: () => void
  onKeyUp: () => void
  onBlur: () => void
} {
  const release = (): void => {
    if (onDraft === undefined || draft === null || draft === undefined) return
    commit(draft)
    onDraft(null)
  }
  return {
    value: draft ?? stored,
    onChange: event => {
      const next = Number(event.target.value)
      if (onDraft === undefined) commit(next)
      else onDraft(next)
    },
    onPointerUp: release,
    onKeyUp: release,
    onBlur: release,
  }
}

/** Frosted-glass/opacity slider (0..100). */
export function OpacitySlider({ value, onChange, t, draft, onDraft }: {
  value: number
  onChange: (next: number) => void
  t: FocusTranslator
  /** Live draft while dragging (preview only); omit to commit per step. */
  draft?: number | null
  onDraft?: (next: number | null) => void
}) {
  const slider = sliderBinding(value, draft, onDraft, onChange)
  return (
    <div className={css.overlayControl}>
      <input
        type="range"
        className={css.overlaySlider}
        min={0}
        max={100}
        step={5}
        {...slider}
      />
      <span className={css.overlayValue}>{t('focus.opacityValue', { value: String(draft ?? value) })}</span>
    </div>
  )
}

/** Text-readability slider (-100 black … +100 white). */
export function OverlaySlider({ value, onChange, t, draft, onDraft }: {
  value: string
  onChange: (next: string) => void
  t: FocusTranslator
  /** Live draft while dragging (preview only); omit to commit per step. */
  draft?: number | null
  onDraft?: (next: number | null) => void
}) {
  const commit = (next: number): void => { onChange(String(next)) }
  const slider = sliderBinding(overlayStrength(value), draft, onDraft, commit)
  return (
    <div className={css.overlayControl}>
      <input
        type="range"
        className={css.overlaySlider}
        min={OVERLAY_MIN}
        max={OVERLAY_MAX}
        step={5}
        {...slider}
      />
      <span className={css.overlayValue}>{overlayLabel(value, t)}</span>
    </div>
  )
}

/** Font family dropdown over the system-stack presets. */
export function FontSelect({ value, onChange, t }: {
  value: string
  onChange: (next: string) => void
  t: FocusTranslator
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
        <option key={preset.id} value={preset.id}>{t(`focus.font.${preset.id}` as FocusKey)}</option>
      ))}
      {matched === undefined && value !== '' && <option value="__custom__">{t('focus.font.custom')}</option>}
    </select>
  )
}

/** Gradient editor: enable + start/end colors (color wheels) + angle. */
export function GradientEditor({ from, to, angle, onChangeFrom, onChangeTo, onChangeAngle, t }: {
  from: string
  to: string
  angle: string
  onChangeFrom: (next: string) => void
  onChangeTo: (next: string) => void
  onChangeAngle: (next: string) => void
  t: FocusTranslator
}) {
  const enabled = from !== ''
  return (
    <div className={css.gradientBox}>
      <Checkbox
        checked={enabled}
        onChange={next => onChangeFrom(next ? '#eef2ff' : '')}
        label={t('focus.gradientEnable')}
      />
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

/**
 * Manual focal point, vertical only: a bubble is a wide box, so the artwork
 * is cropped top-to-bottom and the horizontal axis has no effect. The slider
 * is vertical to match that axis — its top end is the image's top edge.
 */
export function FocusPicker({ value, onChange, t }: {
  /** Focal Y in percent of the source (0 = top, 100 = bottom). */
  value: number
  onChange: (next: number) => void
  t: FocusTranslator
}) {
  const current = Math.max(0, Math.min(100, value))
  const label = current <= 15
    ? t('focus.focus.top')
    : current >= 85 ? t('focus.focus.bottom') : t('focus.focus.center')
  return (
    <div className={css.focusColumn}>
      <span className={css.focusEnd}>{t('focus.focus.top')}</span>
      <div className={css.focusTrack}>
        <input
          type="range"
          className={css.focusSlider}
          min={0}
          max={100}
          step={5}
          value={current}
          aria-label={t('focus.bgPosition')}
          onChange={event => onChange(Number(event.target.value))}
        />
      </div>
      <span className={css.focusEnd}>{t('focus.focus.bottom')}</span>
      <span className={css.focusValue}>{label}</span>
    </div>
  )
}
