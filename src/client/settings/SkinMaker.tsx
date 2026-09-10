// SkinMaker: the five-step wizard that turns a user's own media into a bubble
// skin. Static images paint as one layer; GIF/APNG stay animated
// whole-layer; a video or a PNG sequence is baked into a sprite sheet. The
// style step edits the SAME packaged fields the bubble editor owns (color,
// gradient, opacity, glass, overlay, text) through the shared controls, seeded
// from the side the maker was opened for — a skin is a packaged bundle of the
// existing editing features plus media, never a parallel styling system. The
// live three-length bubble preview beside every step renders the real chrome.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import {
  SKIN_BLUR_PRESETS, SKIN_FIT_MODES, SKIN_MAX_ASSET_BYTES, SKIN_MAX_FRAMES,
  type SkinFit, type SkinPadding, type SkinRecord, type SkinSaveRequest, type SkinStyle,
} from '../../skin-contract.ts'
import type { SkinKind } from '../../skin-contract.ts'
import type { SkinRegistry } from '../skins/registry.ts'
import { blobToBase64 } from '../skins/registry.ts'
import { detectMedia, inspectVideo, naturalOrder, type MediaKind } from '../skins/detect.ts'
import { buildSpriteFromSequence, buildSpriteFromVideo, normalizeArtwork, type SpriteOptions, type SpriteResult } from '../skins/sprite.ts'
import { clampPadding } from '../skins/geometry.ts'

import { SliderRow } from './controls.tsx'
import type { SkinRender } from '../chat/bubbles/skin-render.ts'
import type { ChatBubbleCustomStyle } from '../chat/bubbles/ChatBubble.tsx'
import { ChatBubble } from '../chat/bubbles/ChatBubble.tsx'
import { ImageCropper } from './ImageCropper.tsx'
import { FocusPicker } from './controls.tsx'
import {
  ColorField, FontSelect, GradientEditor, Notice, OpacitySlider, OverlaySlider, PresetSelect, Row,
  FONT_SIZE_PRESETS, type FocusTranslator,
} from './controls.tsx'
import css from './SkinMaker.module.css'

/** Wizard steps in order. */
const STEPS = ['source', 'prepare', 'geometry', 'style', 'save'] as const
type MakerStep = typeof STEPS[number]

/** Where a saved skin is applied. */
type ApplyTarget = 'assistant' | 'user' | 'both' | 'none'

/** One prepared asset ready to be stored. */
interface DraftAsset {
  readonly blob: Blob
  readonly url: string
  readonly mime: string
  readonly width: number
  readonly height: number
  readonly frames: number
  readonly fps: number
}

/** Everything the wizard accumulates before saving. */
interface Draft {
  readonly media: MediaKind
  readonly sourceFiles: readonly File[]
  /** Video only: bake frames into a sprite sheet, or play the file directly. */
  readonly videoMode: 'sprite' | 'direct'
  asset: DraftAsset | null
  padding: SkinPadding
  radius: number
  fit: SkinFit
  focusX: number
  focusY: number
  /** Packaged bubble-editor styling, seeded from the side being edited. */
  style: SkinStyle
}

/** Preview copy at three lengths (short / medium / long). */
const PREVIEW_TEXTS = [
  'focus.maker.previewTextShort',
  'focus.maker.previewTextMedium',
  'focus.maker.previewTextLong',
] as const

/** Skin family for one draft (a video is either baked into frames or played as-is). */
function skinKindOf(draft: Draft): SkinKind {
  if (draft.media === 'image') return 'image'
  if (draft.media === 'animated') return 'animated'
  if (draft.media === 'video' && draft.videoMode === 'direct') return 'video'
  if (draft.media === 'style') return 'style'
  return 'sprite'
}

/** Default frame width for a freshly detected source. */
function defaultFrameWidth(media: MediaKind): number {
  return media === 'video' ? 320 : 240
}

/** Default name for a new skin. */
function defaultName(now: number): string {
  const date = new Date(now)
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `皮肤 ${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Full props of the skin maker. */
export interface SkinMakerProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly skins: SkinRegistry
  /** Apply the freshly saved skin to the chosen sides. */
  readonly onSaved: (record: SkinRecord, target: ApplyTarget) => void
  /** The side's current style, which seeds the packaged draft. */
  readonly seed: SkinStyle
  readonly t: FocusTranslator
}

/** The bubble-skin creation wizard. */
export function SkinMaker({ open, onClose, skins, onSaved, seed, t }: SkinMakerProps) {
  const [step, setStep] = useState<MakerStep>('source')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [frameCount, setFrameCount] = useState(24)
  const [frameWidth, setFrameWidth] = useState(320)
  const [fps, setFps] = useState(12)
  /** Video only: first sampled second (0 = from the start). */
  const [startSeconds, setStartSeconds] = useState(0)
  /** Video only: sampled span in seconds (0 = the whole clip). */
  const [durationSeconds, setDurationSeconds] = useState(0)
  /** Sequence frames that could not be decoded and were skipped. */
  const [skipped, setSkipped] = useState<string[]>([])
  const [name, setName] = useState(() => defaultName(Date.now()))
  const [applyTo, setApplyTo] = useState<ApplyTarget>('assistant')
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  /** Release the current draft's object URL. */
  const releaseUrl = (): void => {
    if (objectUrlRef.current !== null) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }

  // Closing the wizard (or unmounting) always releases the draft asset.
  useEffect(() => () => { releaseUrl() }, [])

  const reset = (): void => {
    abortRef.current?.abort()
    releaseUrl()
    setStep('source')
    setDraft(null)
    setFiles([])
    setProgress(null)
    setError(null)
    setSaving(false)
    setSkipped([])
    setStartSeconds(0)
    setDurationSeconds(0)
    setName(defaultName(Date.now()))
    setApplyTo('assistant')
  }

  const close = (): void => {
    reset()
    onClose()
  }

  /** Adopt one freshly detected file selection. */
  const adoptFiles = async (selected: File[]): Promise<void> => {
    setError(null)
    try {
      const detected = await detectMedia(selected)
      releaseUrl()
      const ordered = detected.kind === 'sequence'
        ? [...detected.files].sort((a, b) => naturalOrder(a.name, b.name))
        : detected.files
      setFiles(ordered)
      setFrameWidth(defaultFrameWidth(detected.kind))
      setFps(detected.kind === 'video' ? 24 : 12)
      setFrameCount(detected.kind === 'video' ? 24 : ordered.length)
      if (detected.kind === 'image' || detected.kind === 'animated') {
        const info = detected.info
        if (info === undefined) throw new Error('cannot read image dimensions')
        // Static artwork is normalized so the asset stays small
        // (see normalizeArtwork); animated images must keep their original
        // bytes or the animation would be lost.
        const normalized = detected.kind === 'image'
          ? await normalizeArtwork(ordered[0]!)
          : { blob: ordered[0]!, mime: ordered[0]!.type || 'image/png', width: info.width, height: info.height }
        const url = URL.createObjectURL(normalized.blob)
        objectUrlRef.current = url
        setDraft({
          media: detected.kind,
          sourceFiles: ordered,
          videoMode: 'sprite',
          asset: {
            blob: normalized.blob,
            url,
            mime: normalized.mime,
            width: normalized.width,
            height: normalized.height,
            frames: 1,
            fps: 0,
          },
          padding: { top: 8, right: 12, bottom: 8, left: 12 },
          radius: 16,
          fit: 'cover',
          focusX: 50,
          focusY: 50,
          style: seed,
        })
      } else {
        setDraft({
          media: detected.kind,
          sourceFiles: ordered,
          videoMode: 'sprite',
          asset: null,
          padding: { top: 8, right: 12, bottom: 8, left: 12 },
          radius: 16,
          fit: 'cover',
          focusX: 50,
          focusY: 50,
          style: seed,
        })
      }
      setStep('prepare')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  /** Replace the artwork with the region the user cropped (the crop dialog's
   *  output is a bounded JPEG data URI, so it doubles as the asset URL). */
  const adoptCropped = async (dataUrl: string): Promise<void> => {
    try {
      const info = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const image = new Image()
        image.onload = () => { resolve({ width: image.naturalWidth, height: image.naturalHeight }) }
        image.onerror = () => { reject(new Error('cropped image decode failed')) }
        image.src = dataUrl
      })
      const blob = await (await fetch(dataUrl)).blob()
      releaseUrl()
      setDraft(current => current === null ? null : {
        ...current,
        asset: { blob, url: dataUrl, mime: 'image/png', width: info.width, height: info.height, frames: 1, fps: 0 },
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }
  /** Start a parameter-only skin: no asset at all, straight to the package. */
  const adoptStyleOnly = (): void => {
    releaseUrl()
    setFiles([])
    setError(null)
    setDraft({
      media: 'style',
      sourceFiles: [],
      videoMode: 'sprite',
      asset: null,
      padding: { top: 8, right: 12, bottom: 8, left: 12 },
      radius: 16,
      fit: 'cover',
      focusX: 50,
      focusY: 50,
      style: seed,
    })
    setStep('style')
  }

  /** Run the sprite builder for the current video/sequence source. */
  const buildSprite = async (): Promise<void> => {
    if (draft === null) return
    const controller = new AbortController()
    abortRef.current?.abort()
    abortRef.current = controller
    setError(null)
    setSkipped([])
    setProgress({ done: 0, total: frameCount })
    try {
      const options: SpriteOptions = {
        frameWidth,
        frameCount,
        fps,
        ...draft.media === 'video' && startSeconds > 0 ? { startSeconds } : {},
        ...draft.media === 'video' && durationSeconds > 0 ? { durationSeconds } : {},
      }
      const result: SpriteResult = draft.media === 'video'
        ? await buildSpriteFromVideo(draft.sourceFiles[0]!, options, report => { setProgress(report) }, controller.signal)
        : await buildSpriteFromSequence([...draft.sourceFiles], options, report => { setProgress(report) }, controller.signal)
      releaseUrl()
      const url = URL.createObjectURL(result.blob)
      objectUrlRef.current = url
      setDraft(current => current === null ? null : {
        ...current,
        asset: {
          blob: result.blob,
          url,
          mime: result.mime,
          width: result.width,
          height: result.height,
          frames: result.frames,
          fps: result.fps,
        },
      })
      setSkipped([...result.skipped])
      setProgress(null)
    } catch (cause) {
      setProgress(null)
      if (controller.signal.aborted) return
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  /**
   * Switch a video source between the baked-sprite and play-as-is routes.
   * The direct route stores the file untouched, so it keeps the original
   * quality and length at the cost of one video decoder per visible bubble.
   */
  const setVideoMode = async (mode: 'sprite' | 'direct'): Promise<void> => {
    if (draft === null || draft.media !== 'video') return
    setError(null)
    if (mode === 'sprite') {
      patch({ videoMode: 'sprite', asset: null })
      return
    }
    const file = draft.sourceFiles[0]
    if (file === undefined) return
    // The direct route stores the file untouched, so it must fit the asset cap
    // the host enforces; the sprite route has no such limit.
    if (file.size > SKIN_MAX_ASSET_BYTES) {
      setError(t('focus.maker.videoTooLarge', { mb: String(Math.round(SKIN_MAX_ASSET_BYTES / (1024 * 1024))) }))
      return
    }
    try {
      const info = await inspectVideo(file)
      releaseUrl()
      const url = URL.createObjectURL(file)
      objectUrlRef.current = url
      patch({
        videoMode: 'direct',
        fit: 'cover',
        asset: {
          blob: file,
          url,
          mime: file.type === 'video/webm' ? 'video/webm' : 'video/mp4',
          width: info.width,
          height: info.height,
          frames: 1,
          fps: 0,
        },
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  const kind = draft === null ? 'image' : skinKindOf(draft)
  const asset = draft?.asset ?? null

  /** Preview render descriptor (also the source of truth for the saved record). */
  const previewSkin = useMemo<SkinRender | undefined>(() => {
    if (draft === null || asset === null) return undefined
    return {
      id: 'draft',
      url: asset.url,
      kind,
      padding: clampPadding(draft.padding),
      radius: draft.radius,
      fit: draft.fit,
      focusX: draft.focusX,
      focusY: draft.focusY,
      frames: asset.frames,
      fps: asset.fps,
      width: asset.width,
      height: asset.height,
    }
  }, [asset, draft, kind])

  /** Full bubble chrome the preview renders: the packaged style plus artwork. */
  const previewCustom = useMemo<ChatBubbleCustomStyle | undefined>(() => {
    if (draft === null) return undefined
    const styleOnly = draft.media === 'style'
    if (!styleOnly && previewSkin === undefined) return undefined
    const style = draft.style
    const gradient = style.gradientFrom !== ''
    return {
      bg: gradient ? 'transparent' : style.bg,
      border: style.border,
      radius: '',
      maxWidth: '',
      bgImage: gradient
        ? `linear-gradient(${style.gradientAngle}deg, ${style.gradientFrom}, ${style.gradientTo !== '' ? style.gradientTo : style.gradientFrom})`
        : '',
      bgSize: 'cover',
      bgPosition: 'center',
      overlay: style.overlay,
      backdropOpacity: String(style.backdropOpacity),
      backdropBlur: style.backdropBlur,
      textColor: style.textColor,
      font: style.font,
      fontSize: style.fontSize,
      padding: '',
      skin: previewSkin,
    }
  }, [draft, previewSkin])

  /** Persist the draft and hand the record back to the settings page. */
  const save = async (): Promise<void> => {
    if (draft === null) return
    const styleOnly = draft.media === 'style'
    if (!styleOnly && (asset === null || previewSkin === undefined)) return
    setSaving(true)
    setError(null)
    try {
      const shared = {
        name: name.trim() === '' ? defaultName(Date.now()) : name.trim(),
        padding: clampPadding(draft.padding),
        radius: draft.radius,
        fit: draft.fit,
        focusX: draft.focusX,
        focusY: draft.focusY,
        style: draft.style,
      }
      const request: SkinSaveRequest = styleOnly
        // A parameter-only skin carries the package and no bytes at all.
        ? {
          ...shared,
          kind: 'style',
          mime: '',
          width: 1,
          height: 1,
          frames: 1,
          fps: 0,
          asset: '',
        }
        : {
          ...shared,
          kind,
          mime: asset!.mime,
          width: asset!.width,
          height: asset!.height,
          frames: asset!.frames,
          fps: asset!.fps,
            asset: await blobToBase64(asset!.blob),
        }
      const record = await skins.save(request)
      onSaved(record, applyTo)
      reset()
      onClose()
    } catch (cause) {
      setSaving(false)
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  /** The wizard's steps for this draft: a parameter-only skin skips the
   *  media preparation and geometry stages entirely. */
  const steps: readonly MakerStep[] = draft?.media === 'style'
    ? ['source', 'style', 'save']
    : STEPS
  const stepIndex = steps.indexOf(step)
  const canAdvance = (): boolean => {
    if (draft === null) return false
    if (step === 'prepare' && asset === null) return false
    if (step === 'source') return false
    return true
  }

  const patch = (next: Partial<Draft>): void => {
    setDraft(current => current === null ? null : { ...current, ...next })
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={t('focus.maker.title')}
      closeLabel={t('focus.close')}
      {...css.makerDialog === undefined ? {} : { className: css.makerDialog }}
    >
      <div className={css.root}>
        <div className={css.main}>
          <ol className={css.steps}>
            {steps.map((candidate, index) => (
              <li key={candidate}>
                <button
                  type="button"
                  className={css.stepChip}
                  data-active={candidate === step || undefined}
                  data-done={index < stepIndex || undefined}
                  disabled={index > stepIndex && !canAdvance()}
                  onClick={() => { if (index <= stepIndex || canAdvance()) setStep(candidate) }}
                >
                  <span className={css.stepIndex}>{index + 1}</span>
                  {t(`focus.maker.step.${candidate}` as Parameters<FocusTranslator>[0])}
                </button>
              </li>
            ))}
          </ol>

          <div className={css.body}>
            {step === 'source' && (
              <SourceStep
                files={files}
                media={draft?.media}
                error={error}
                onPick={next => { void adoptFiles(next) }}
                onStyleOnly={adoptStyleOnly}
                onRemove={index => {
                  const next = files.filter((_, at) => at !== index)
                  if (next.length === 0) { setFiles([]); setDraft(null); return }
                  void adoptFiles(next)
                }}
                t={t}
              />
            )}

            {step === 'prepare' && draft !== null && (
              <PrepareStep
                draft={draft}
                frameCount={frameCount}
                frameWidth={frameWidth}
                fps={fps}
                startSeconds={startSeconds}
                durationSeconds={durationSeconds}
                skipped={skipped}
                progress={progress}
                error={error}
                onFrameCount={setFrameCount}
                onFrameWidth={setFrameWidth}
                onFps={setFps}
                onStartSeconds={setStartSeconds}
                onDurationSeconds={setDurationSeconds}
                onBuild={() => { void buildSprite() }}
                onCancelBuild={() => { abortRef.current?.abort(); setProgress(null) }}
                onVideoMode={next => { void setVideoMode(next) }}
                t={t}
              />
            )}

            {step === 'geometry' && draft !== null && asset !== null && (
              <GeometryStep
                draft={draft}
                onPadding={next => patch({ padding: next })}
                onRadius={next => patch({ radius: next })}
                onFit={next => patch({ fit: next })}
                onFocus={focusY => patch({ focusY })}
                onCrop={dataUrl => { void adoptCropped(dataUrl) }}
                t={t}
              />
            )}

            {step === 'style' && draft !== null && (
              <StyleStep
                style={draft.style}
                kind={kind}
                onStyle={next => patch({ style: next })}
                t={t}
              />
            )}

            {step === 'save' && (
              <div className={css.stepBody}>
                <Row
                  title={t('focus.maker.name')}
                  hint={t('focus.maker.nameHint')}
                  control={(
                    <input
                      type="text"
                      className={css.textInput}
                      value={name}
                      maxLength={40}
                      onChange={event => setName(event.target.value)}
                    />
                  )}
                />
                <Row
                  title={t('focus.maker.applyTo')}
                  hint={t('focus.maker.applyToHint')}
                  control={(
                    <select
                      className={css.select}
                      value={applyTo}
                      onChange={event => setApplyTo(event.target.value as ApplyTarget)}
                    >
                      <option value="assistant">{t('focus.maker.applyTo.assistant')}</option>
                      <option value="user">{t('focus.maker.applyTo.user')}</option>
                      <option value="both">{t('focus.maker.applyTo.both')}</option>
                      <option value="none">{t('focus.maker.applyTo.none')}</option>
                    </select>
                  )}
                />
                {!skins.available && <Notice tone="error">{t('focus.skins.unavailable')}</Notice>}
                {error !== null && <Notice tone="error">{t('focus.maker.error', { message: error })}</Notice>}
              </div>
            )}
          </div>

          <div className={css.actions}>
            <button type="button" className={css.clearButton} onClick={close}>{t('focus.maker.cancel')}</button>
            <div className={css.spacer} />
            {stepIndex > 0 && (
              <button type="button" className={css.clearButton} onClick={() => { setStep(steps[stepIndex - 1]!) }}>
                {t('focus.maker.prev')}
              </button>
            )}
            {step !== 'save' && (
              <button
                type="button"
                className={css.uploadButton}
                disabled={!canAdvance() || step === 'source'}
                onClick={() => { setStep(steps[stepIndex + 1]!) }}
              >
                {t('focus.maker.next')}
              </button>
            )}
            {step === 'save' && (
              <button
                type="button"
                className={css.uploadButton}
                disabled={saving || (asset === null && draft?.media !== 'style') || !skins.available}
                onClick={() => { void save() }}
              >
                {saving ? t('focus.maker.saving') : t('focus.maker.save')}
              </button>
            )}
          </div>
        </div>

        <div className={css.preview}>
          <span className={css.previewTitle}>{t('focus.preview')}</span>
          {previewCustom === undefined
            ? <span className={css.previewEmpty}>{t('focus.maker.needAsset')}</span>
            : PREVIEW_TEXTS.map(key => (
              <ChatBubble key={key} role="assistant" compact={false} custom={previewCustom}>
                <div className={css.previewText}>{t(key)}</div>
              </ChatBubble>
            ))}
        </div>
      </div>
    </Modal>
  )
}

/** Step 1: pick files and see what they were detected as. */
function SourceStep({ files, media, error, onPick, onRemove, onStyleOnly, t }: {
  files: File[]
  media: MediaKind | undefined
  error: string | null
  onPick: (files: File[]) => void
  onRemove: (index: number) => void
  /** Skip media entirely: package the current style as a skin. */
  onStyleOnly: () => void
  t: FocusTranslator
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [hover, setHover] = useState(false)
  return (
    <div className={css.stepBody}>
      <div
        className={css.dropZone}
        data-hover={hover || undefined}
        onDragOver={event => { event.preventDefault(); setHover(true) }}
        onDragLeave={() => { setHover(false) }}
        onDrop={event => {
          event.preventDefault()
          setHover(false)
          const dropped = [...event.dataTransfer.files]
          if (dropped.length > 0) onPick(dropped)
        }}
      >
        <span>{t('focus.maker.drop')}</span>
        <input
          ref={inputRef}
          type="file"
          hidden
          multiple
          accept="image/*,video/mp4,video/webm"
          onChange={event => {
            const picked = [...event.target.files ?? []]
            event.target.value = ''
            if (picked.length > 0) onPick(picked)
          }}
        />
        <button type="button" className={css.uploadButton} onClick={() => inputRef.current?.click()}>
          {t('focus.maker.choose')}
        </button>
        <button type="button" className={css.clearButton} onClick={onStyleOnly}>
          {t('focus.maker.styleOnly')}
        </button>
        <span className={css.dropHint}>{t('focus.maker.acceptHint')}</span>
      </div>
      {error !== null && <Notice tone="error">{t('focus.maker.error', { message: error })}</Notice>}
      {media !== undefined && (
        <div className={css.detected}>
          <span className={css.badge}>{t(`focus.maker.detected.${media}` as Parameters<FocusTranslator>[0], { count: String(files.length) })}</span>
          <span className={css.dropHint}>{t('focus.maker.fileCount', { count: String(files.length) })}</span>
        </div>
      )}
      {files.length > 1 && (
        <ul className={css.frameList}>
          {files.map((file, index) => (
            <li key={`${file.name}-${String(index)}`} className={css.frameRow}>
              <span className={css.frameName}>{file.name}</span>
              <button type="button" className={css.clearButton} onClick={() => onRemove(index)}>
                {t('focus.maker.remove')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Step 2: bake frames into a sprite sheet, or keep a video as-is (images pass through). */
function PrepareStep({ draft, frameCount, frameWidth, fps, startSeconds, durationSeconds, skipped, progress, error, onFrameCount, onFrameWidth, onFps, onStartSeconds, onDurationSeconds, onBuild, onCancelBuild, onVideoMode, t }: {
  draft: Draft
  frameCount: number
  frameWidth: number
  fps: number
  startSeconds: number
  durationSeconds: number
  skipped: readonly string[]
  progress: { done: number; total: number } | null
  error: string | null
  onFrameCount: (next: number) => void
  onFrameWidth: (next: number) => void
  onFps: (next: number) => void
  onStartSeconds: (next: number) => void
  onDurationSeconds: (next: number) => void
  onBuild: () => void
  onCancelBuild: () => void
  onVideoMode: (next: 'sprite' | 'direct') => void
  t: FocusTranslator
}) {
  const animated = draft.media === 'animated'
  if (draft.media === 'image' || animated) {
    return (
      <div className={css.stepBody}>
        <Notice>{animated ? t('focus.maker.animatedPassthrough') : t('focus.maker.imagePassthrough')}</Notice>
        {draft.asset !== null && <img className={css.assetPreview} src={draft.asset.url} alt="" />}
      </div>
    )
  }
  if (draft.media === 'video') {
    return (
      <div className={css.stepBody}>
        <Row
          title={t('focus.maker.videoRoute')}
          hint={t('focus.maker.videoRouteHint')}
          control={(
            <select
              className={css.select}
              value={draft.videoMode}
              onChange={event => onVideoMode(event.target.value === 'direct' ? 'direct' : 'sprite')}
            >
              <option value="sprite">{t('focus.maker.videoRoute.sprite')}</option>
              <option value="direct">{t('focus.maker.videoRoute.direct')}</option>
            </select>
          )}
        />
        {draft.videoMode === 'direct' ? (
          <>
            <Notice>{t('focus.maker.videoDirectHint')}</Notice>
            {draft.asset !== null && <video className={css.assetPreview} src={draft.asset.url} muted loop autoPlay playsInline />}
          </>
        ) : (
          <>
            <Row
              title={t('focus.maker.frameWidth')}
              hint={t('focus.maker.frameWidthHint')}
              control={(
                <SliderRow
                  min={120}
                  max={480}
                  step={20}
                  value={frameWidth}
                  onChange={onFrameWidth}
                  label={`${String(frameWidth)}px`}
                />
              )}
            />
            <Row
              title={t('focus.maker.fps')}
              hint={t('focus.maker.fpsHint')}
              control={(
                <SliderRow
                  min={1}
                  max={30}
                  step={1}
                  value={fps}
                  onChange={onFps}
                  label={`${String(fps)} fps`}
                />
              )}
            />
            <Row
              title={t('focus.maker.frameCount')}
              hint={t('focus.maker.frameCountHint', { max: String(SKIN_MAX_FRAMES) })}
              control={(
                <SliderRow
                  min={4}
                  max={SKIN_MAX_FRAMES}
                  step={1}
                  value={frameCount}
                  onChange={onFrameCount}
                  label={String(frameCount)}
                />
              )}
            />
            <Row
              title={t('focus.maker.start')}
              hint={t('focus.maker.startHint')}
              control={(
                <input
                  type="number"
                  className={css.number}
                  min={0}
                  step={0.5}
                  value={String(startSeconds)}
                  onChange={event => onStartSeconds(Math.max(0, Number(event.target.value) || 0))}
                />
              )}
            />
            <Row
              title={t('focus.maker.duration')}
              hint={t('focus.maker.durationHint')}
              control={(
                <input
                  type="number"
                  className={css.number}
                  min={0}
                  step={0.5}
                  value={String(durationSeconds)}
                  onChange={event => onDurationSeconds(Math.max(0, Number(event.target.value) || 0))}
                />
              )}
            />
          </>
        )}
        {draft.videoMode === 'sprite' && (
          <>
            <div className={css.buildRow}>
              <button
                type="button"
                className={css.uploadButton}
                disabled={progress !== null}
                onClick={onBuild}
              >
                {t('focus.maker.extract')}
              </button>
              {progress !== null && (
                <>
                  <div className={css.progress}>
                    <div
                      className={css.progressFill}
                      style={{ width: `${String(progress.total === 0 ? 0 : (progress.done / progress.total) * 100)}%` }}
                    />
                  </div>
                  <span className={css.dropHint}>{t('focus.maker.progress', { done: String(progress.done), total: String(progress.total) })}</span>
                  <button type="button" className={css.clearButton} onClick={onCancelBuild}>
                    {t('focus.maker.cancelBuild')}
                  </button>
                </>
              )}
            </div>
            {draft.asset !== null && draft.asset.frames > 1 && (
              <div className={css.spritePreview}>
                <img className={css.assetPreview} src={draft.asset.url} alt="" />
                <span className={css.dropHint}>
                  {t('focus.maker.ready', { count: String(draft.asset.frames), fps: String(draft.asset.fps) })}
                </span>
              </div>
            )}
          </>
        )}
      {skipped.length > 0 && (
        <Notice tone="error">{t('focus.maker.skipped', { names: skipped.join('、') })}</Notice>
      )}
      {error !== null && <Notice tone="error">{t('focus.maker.error', { message: error })}</Notice>}
    </div>
  )
  }
  return (
    <div className={css.stepBody}>
      <Row
        title={t('focus.maker.frameWidth')}
        hint={t('focus.maker.frameWidthHint')}
        control={(
          <SliderRow
            min={120}
            max={480}
            step={20}
            value={frameWidth}
            onChange={onFrameWidth}
            label={`${String(frameWidth)}px`}
          />
        )}
      />
      <Row
        title={t('focus.maker.fps')}
        hint={t('focus.maker.fpsHint')}
        control={(
          <SliderRow
            min={1}
            max={30}
            step={1}
            value={fps}
            onChange={onFps}
            label={`${String(fps)} fps`}
          />
        )}
      />
      <div className={css.buildRow}>
        <button
          type="button"
          className={css.uploadButton}
          disabled={progress !== null}
          onClick={onBuild}
        >
          {t('focus.maker.compose')}
        </button>
        {progress !== null && (
          <>
            <div className={css.progress}>
              <div
                className={css.progressFill}
                style={{ width: `${String(progress.total === 0 ? 0 : (progress.done / progress.total) * 100)}%` }}
              />
            </div>
            <span className={css.dropHint}>{t('focus.maker.progress', { done: String(progress.done), total: String(progress.total) })}</span>
            <button type="button" className={css.clearButton} onClick={onCancelBuild}>
              {t('focus.maker.cancelBuild')}
            </button>
          </>
        )}
      </div>
      {draft.asset !== null && draft.asset.frames > 1 && (
        <div className={css.spritePreview}>
          <img className={css.assetPreview} src={draft.asset.url} alt="" />
          <span className={css.dropHint}>
            {t('focus.maker.ready', { count: String(draft.asset.frames), fps: String(draft.asset.fps) })}
          </span>
        </div>
      )}
      {error !== null && <Notice tone="error">{t('focus.maker.error', { message: error })}</Notice>}
    </div>
  )
}

/** Step 3: how the artwork fills the bubble — fit, focal point, radius, inset. */
function GeometryStep({ draft, onPadding, onRadius, onFit, onFocus, onCrop, t }: {
  draft: Draft
  onPadding: (next: SkinPadding) => void
  onRadius: (next: number) => void
  onFit: (next: SkinFit) => void
  /** Focal point Y in percent of the source. */
  onFocus: (y: number) => void
  /** Replace the artwork with the cropped region. */
  onCrop: (dataUrl: string) => void
  t: FocusTranslator
}) {
  const asset = draft.asset
  if (asset === null) return null
  const covering = draft.fit === 'cover'
  return (
    <div className={css.stepBody}>
      <Row
        title={t('focus.bgSize')}
        hint={t('focus.bgSizeHint')}
        control={(
          <select
            className={css.select}
            value={draft.fit}
            onChange={event => onFit(SKIN_FIT_MODES.includes(event.target.value as SkinFit) ? event.target.value as SkinFit : 'cover')}
          >
            {SKIN_FIT_MODES.map(mode => (
              <option key={mode} value={mode}>{t(`focus.bgSize.${mode}` as Parameters<FocusTranslator>[0])}</option>
            ))}
          </select>
        )}
      />
      {covering && (
        <Row
          title={t('focus.bgPosition')}
          hint={t('focus.bgPositionHint')}
          control={<FocusPicker value={draft.focusY} onChange={onFocus} t={t} />}
        />
      )}
      <Row
        title={t('focus.maker.crop')}
        hint={t('focus.maker.cropHint')}
        control={<span />}
      />
      <ImageCropper imageUrl={asset.url} format="png" onConfirm={onCrop} onCancel={() => {}} />
      <Row
        title={t('focus.maker.radius')}
        hint={t('focus.maker.radiusHint')}
        control={(
          <SliderRow min={0} max={64} step={2} value={draft.radius} onChange={onRadius} label={`${String(draft.radius)}px`} />
        )}
      />
      <div className={css.paddingRow}>
        {(['top', 'right', 'bottom', 'left'] as const).map(side => (
          <label key={side} className={css.sliceField}>
            <span>{t(`focus.maker.padding.${side}` as Parameters<FocusTranslator>[0])}</span>
            <input
              type="number"
              className={css.number}
              min={0}
              max={512}
              value={String(draft.padding[side])}
              onChange={event => onPadding({ ...draft.padding, [side]: Math.max(0, Math.min(512, Number(event.target.value) || 0)) })}
            />
          </label>
        ))}
      </div>
    </div>
  )
}

/** Step 4: the packaged style — the SAME fields the bubble editor owns,
 *  edited with the SAME shared controls, seeded from the side being edited.
 *  The controls adapt to the fit: a contain fit leaves the backdrop visible
 *  around the artwork, while cover/stretch fill the bubble, so
 *  colour/gradient/border/glass would have nothing to paint on. */
function StyleStep({ style, kind, onStyle, t }: {
  style: SkinStyle
  kind: SkinKind
  onStyle: (next: SkinStyle) => void
  t: FocusTranslator
}) {
  const patch = (next: Partial<SkinStyle>): void => { onStyle({ ...style, ...next }) }
  const gradient = style.gradientFrom !== ''
  // Whole-layer artwork (GIF/APNG, sprite sheet, video) covers the bubble, so
  // colour/gradient/border/glass would sit invisibly underneath; only static
  // bitmaps keep them.
  const backdropVisible = kind === 'image'
  return (
    <div className={css.stepBody}>
      {backdropVisible && (
        <>
          <Row
            title={t('focus.customBg')}
            hint={t('focus.maker.styleBgHint')}
            control={<ColorField value={style.bg} onChange={next => patch({ bg: next })} />}
          />
          <Row
            title={t('focus.gradient')}
            hint={t('focus.gradientHint')}
            control={(
              <GradientEditor
                from={style.gradientFrom}
                to={style.gradientTo}
                angle={style.gradientAngle}
                onChangeFrom={next => patch({ gradientFrom: next })}
                onChangeTo={next => patch({ gradientTo: next })}
                onChangeAngle={next => patch({ gradientAngle: next })}
                t={t}
              />
            )}
          />
          <Row
            title={t('focus.customBorder')}
            hint={t('focus.customHint')}
            control={<ColorField value={style.border} onChange={next => patch({ border: next })} />}
          />
        </>
      )}
      <Row
        title={t('focus.backdropOpacity')}
        hint={t('focus.backdropOpacityHint')}
        control={(
          <OpacitySlider
            value={style.backdropOpacity}
            onChange={next => patch({ backdropOpacity: next })}
            t={t}
          />
        )}
      />
      {backdropVisible && (
        <Row
          title={t('focus.backdropBlur')}
          hint={t('focus.backdropBlurHint')}
          control={(
            <select
              className={css.select}
              value={style.backdropBlur}
              onChange={event => patch({ backdropBlur: event.target.value })}
            >
              {SKIN_BLUR_PRESETS.map(preset => (
                <option key={preset || 'none'} value={preset}>
                  {t((preset === '' ? 'focus.blur.none' : `focus.blur.${preset}`) as Parameters<FocusTranslator>[0])}
                </option>
              ))}
            </select>
          )}
        />
      )}
      <Row
        title={t('focus.overlay')}
        hint={t('focus.overlayHint')}
        control={(
          <OverlaySlider
            value={style.overlay}
            onChange={next => patch({ overlay: next })}
            t={t}
          />
        )}
      />
      <Row
        title={t('focus.maker.styleTextColor')}
        hint={t('focus.maker.styleTextColorHint')}
        control={<ColorField value={style.textColor} onChange={next => patch({ textColor: next })} />}
      />
      <Row
        title={t('focus.customFont')}
        hint={t('focus.customHint')}
        control={<FontSelect value={style.font} onChange={next => patch({ font: next })} t={t} />}
      />
      <Row
        title={t('focus.customFontSize')}
        hint={t('focus.customHint')}
        control={(
          <PresetSelect
            presets={FONT_SIZE_PRESETS}
            value={style.fontSize}
            emptyKey="focus.fontSizeDefault"
            customKey="focus.customValue"
            onChange={next => patch({ fontSize: next })}
            t={t}
          />
        )}
      />
      <Notice>
        {!backdropVisible
          ? t('focus.maker.styleWholeLayerNote')
          : t(gradient ? 'focus.maker.styleGradientNote' : 'focus.maker.styleHint')}
      </Notice>
    </div>
  )
}
