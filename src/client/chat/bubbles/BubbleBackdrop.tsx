// BubbleBackdrop: the themed layer behind one bubble's content. Four skin
// families share it —
//   image    → whole-layer background (static bitmap)
//   animated → whole-layer background (GIF/APNG keep their native animation)
//   sprite   → horizontal sheet stepped with translateX
//   video    → muted looping <video>, played only while on screen
// — and without a skin it paints the user's color/image/gradient/overlay.
// Opacity and frosted glass apply to this layer alone, so text stays crisp.

import { memo, useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import clsx from 'clsx'
import type { SkinFit } from '../../../skin-contract.ts'
import type { SkinRender } from './skin-render.ts'
import {
  focusBackgroundPosition, layerBackgroundSize, spriteElementWidth,
  spriteFrames, spriteKeyframesName, videoObjectFit,
} from '../../skins/geometry.ts'
import css from './BubbleBackdrop.module.css'

/** Injected keyframes live in one shared style element. */
/** Surface opacity per glass preset: stronger blur implies a thinner surface. */
const GLASS_ALPHA: Record<string, number> = { '4px': 0.72, '10px': 0.55, '18px': 0.4 }

const KEYFRAME_STYLE_ID = 'dsh-chat-focus-sprite-keyframes'
/** Keyframe names already installed (per skin id + frame count). */
const installedKeyframes = new Set<string>()
/** Assets already reported as missing (one console warning per URL). */
const warnedAssets = new Set<string>()
/** Upper bound on installed keyframes before the style element is rebuilt. */
const KEYFRAME_LIMIT = 64

/** Report one broken skin asset exactly once. */
function warnAssetOnce(url: string): void {
  if (warnedAssets.has(url)) return
  warnedAssets.add(url)
  console.warn(`chat-focus: skin asset unavailable, falling back to the plain bubble: ${url}`)
}

/**
 * Install one sprite's keyframes once per document. The name carries the frame
 * count, so replacing a skin with a different frame count cannot reuse stale
 * arithmetic.
 */
function ensureSpriteKeyframes(name: string, endPercent: number): void {
  if (typeof document === 'undefined' || installedKeyframes.has(name)) return
  // The set has no per-skin lifetime, so rebuild the sheet rather than let it
  // grow without bound across a long editing session.
  if (installedKeyframes.size >= KEYFRAME_LIMIT) {
    installedKeyframes.clear()
    const existing = document.getElementById(KEYFRAME_STYLE_ID)
    if (existing !== null) existing.remove()
  }
  installedKeyframes.add(name)
  let style = document.getElementById(KEYFRAME_STYLE_ID) as HTMLStyleElement | null
  if (style === null) {
    style = document.createElement('style')
    style.id = KEYFRAME_STYLE_ID
    style.dataset.plugin = 'dsh-chat-focus'
    document.head.appendChild(style)
  }
  style.textContent += `@keyframes ${name}{to{transform:translateX(${String(endPercent)}%)}}`
}

/** Whether the user asked the browser to reduce motion. */
function reducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * One muted looping video backdrop. Video decoders are expensive, so playback
 * is scoped to the viewport: an off-screen bubble pauses its video and the
 * decode cost drops to zero. Reduced-motion users get the first frame only.
 */
const VideoLayer = memo(function VideoLayer({ src, fit, focusX, focusY, onError }: {
  src: string
  fit: SkinFit
  focusX: number
  focusY: number
  onError: () => void
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const still = reducedMotion()

  useEffect(() => {
    const element = ref.current
    if (element === null || still) return
    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) void element.play().catch(() => {})
        else element.pause()
      }
    }, { rootMargin: '120px' })
    observer.observe(element)
    return () => { observer.disconnect() }
  }, [src, still])

  return (
    <video
      ref={ref}
      className={css.video}
      style={{ objectFit: videoObjectFit(fit), objectPosition: focusBackgroundPosition(focusX, focusY) }}
      src={src}
      autoPlay={!still}
      loop
      muted
      playsInline
      preload="auto"
      disablePictureInPicture
      onError={onError}
      aria-hidden
    />
  )
})

/** Full props of the backdrop layer. */
export interface BubbleBackdropProps {
  /** Applied skin; absent renders the plain themed background. */
  readonly skin?: SkinRender | undefined
  /** Backdrop opacity percentage ('' or '100' = opaque). */
  readonly opacity?: string | undefined
  /** Frosted-glass blur length ('' = off). */
  readonly blur?: string | undefined
}

/** Quoted CSS url() value. */
function cssUrl(url: string): string {
  return `url("${url.replace(/"/g, '\\"')}")`
}

/** Inline style for one skin family: the asset paints as a whole layer. */
function skinStyle(skin: SkinRender): CSSProperties {
  if (skin.kind === 'animated' || skin.kind === 'image') {
    return {
      backgroundImage: cssUrl(skin.url),
      backgroundSize: layerBackgroundSize(skin.fit),
      backgroundPosition: focusBackgroundPosition(skin.focusX, skin.focusY),
      backgroundRepeat: 'no-repeat',
    }
  }
  return {}
}

/** The themed backdrop of one bubble. */
export const BubbleBackdrop = memo(function BubbleBackdrop({
  skin, opacity, blur,
}: BubbleBackdropProps) {
  const vars: Record<string, string> = {}
  // A glass preset implies a translucent surface: without it the blur sits
  // invisibly behind the bubble's own opaque background.
  const glassAlpha = blur === undefined || blur === '' ? null : GLASS_ALPHA[blur] ?? 0.55
  if (glassAlpha !== null) vars['--cf-bubble-glass-alpha'] = String(glassAlpha)
  if (opacity !== undefined && opacity !== '' && opacity !== '100') {
    const percent = Math.max(0, Math.min(100, Number(opacity) || 0))
    vars['--cf-bubble-backdrop-opacity'] = String(percent / 100)
  }
  if (blur !== undefined && blur !== '') {
    vars['--cf-bubble-backdrop-filter'] = `blur(${blur}) saturate(140%)`
  }
  const style = vars as CSSProperties

  if (skin === undefined) {
    return (
      <div className={css.backdrop} style={style} aria-hidden>
        <div className={css.imageLayer} />
        <div className={css.borderRing} />
      </div>
    )
  }
  return <SkinBackdrop skin={skin} style={style} />
})

/**
 * One applied skin's artwork. A missing or undecodable asset must never leave
 * the bubble blank: the layer falls back to the plain themed backdrop and logs
 * the failure once per URL.
 */
const SkinBackdrop = memo(function SkinBackdrop({ skin, style }: {
  skin: SkinRender
  style: CSSProperties
}) {
  const [failed, setFailed] = useState(false)
  const fail = useCallback(() => {
    setFailed(true)
    warnAssetOnce(skin.url)
  }, [skin.url])
  // A different skin version is a different asset: retry the probe.
  useEffect(() => { setFailed(false) }, [skin.url])
  // Bitmap families paint through CSS, which has no error event — probe with
  // an Image so the fallback fires before the user sees an empty bubble.
  useEffect(() => {
    if (skin.kind === 'video') return
    let cancelled = false
    const probe = new Image()
    probe.onerror = () => { if (!cancelled) fail() }
    probe.src = skin.url
    return () => { cancelled = true }
  }, [skin.url, skin.kind, fail])

  if (failed) return <div className={css.backdrop} style={style} aria-hidden />

  let content: ReactNode = null
  if (skin.kind === 'sprite') {
    const sprite = spriteFrames(skin.frames, skin.fps)
    if (sprite === null) {
      // A one-frame sprite is an ordinary image: stretch it over the layer.
      content = <div className={css.imageLayer} style={{ backgroundImage: cssUrl(skin.url), backgroundSize: '100% 100%' }} />
    } else {
      const name = spriteKeyframesName(skin.id, skin.frames)
      ensureSpriteKeyframes(name, sprite.endPercent)
      content = (
        <div
          className={css.sprite}
          style={{
            width: spriteElementWidth(skin.frames),
            backgroundImage: cssUrl(skin.url),
            animation: `${name} ${String(sprite.durationSeconds)}s steps(${String(sprite.steps)}) infinite`,
          }}
        />
      )
    }
  } else if (skin.kind === 'video') {
    content = <VideoLayer src={skin.url} fit={skin.fit} focusX={skin.focusX} focusY={skin.focusY} onError={fail} />
  }
  return (
    <div
      className={clsx(css.backdrop, css.skinLayer, css.clipped)}
      style={{ ...style, ...skinStyle(skin) }}
      aria-hidden
    >
      {content}
      <div className={css.borderRing} />
    </div>
  )
})
