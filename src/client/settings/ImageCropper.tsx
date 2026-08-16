// ImageCropper: free-ratio crop overlay for the bubble background image.
// The image renders contain-fitted inside the modal body; a draggable,
// resizable frame selects the region; Confirm exports the region as a
// JPEG data URI (bounded output size).

import { useCallback, useEffect, useRef, useState } from 'react'
import css from './ImageCropper.module.css'

/** Crop frame in relative coordinates (0..1) over the fitted image. */
interface CropRect {
  x: number
  y: number
  w: number
  h: number
}

const MIN_FRAME = 0.05
const MAX_OUTPUT_WIDTH = 1200

/** Read the fitted display size of an image inside a container (contain-fit). */
function fitSize(naturalWidth: number, naturalHeight: number, maxWidth: number, maxHeight: number): { w: number; h: number } {
  const scale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight, 1)
  return { w: naturalWidth * scale, h: naturalHeight * scale }
}

/** Export one crop region as a bounded JPEG data URI. */
function cropToDataUrl(image: HTMLImageElement, crop: CropRect): string {
  const nw = image.naturalWidth
  const nh = image.naturalHeight
  const sx = crop.x * nw
  const sy = crop.y * nh
  const sw = crop.w * nw
  const sh = crop.h * nh
  const scale = Math.min(1, MAX_OUTPUT_WIDTH / sw)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(sw * scale))
  canvas.height = Math.max(1, Math.round(sh * scale))
  const ctx = canvas.getContext('2d')
  if (ctx === null) throw new Error('canvas 2d context unavailable')
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.85)
}

/** Full props of the cropper. */
export interface ImageCropperProps {
  /** Source image (URL or data URI). */
  readonly imageUrl: string
  /** Accept the current frame as a JPEG data URI. */
  readonly onConfirm: (dataUrl: string) => void
  /** Abandon cropping. */
  readonly onCancel: () => void
}

/** Free-ratio crop overlay with move/resize gestures. */
export function ImageCropper({ imageUrl, onConfirm, onCancel }: ImageCropperProps) {
  const imageRef = useRef<HTMLImageElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<{ w: number; h: number } | null>(null)
  const [crop, setCrop] = useState<CropRect>({ x: 0.08, y: 0.2, w: 0.84, h: 0.6 })
  const [gesture, setGesture] = useState<null | { mode: 'move' | 'resize'; startX: number; startY: number; crop: CropRect }>(null)

  useEffect(() => {
    const image = imageRef.current
    if (image === null) return
    const stage = stageRef.current
    if (stage === null) return
    const measure = (): void => {
      const rect = stage.getBoundingClientRect()
      setView(fitSize(image.naturalWidth, image.naturalHeight, rect.width, rect.height))
    }
    if (image.complete) measure()
    else image.addEventListener('load', measure)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(stage)
    return () => {
      image.removeEventListener('load', measure)
      observer?.disconnect()
    }
  }, [imageUrl])

  const onPointerDown = (mode: 'move' | 'resize') => (event: React.PointerEvent<HTMLDivElement>): void => {
    event.currentTarget.setPointerCapture(event.pointerId)
    setGesture({ mode, startX: event.clientX, startY: event.clientY, crop })
  }
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (gesture === null || view === null) return
    const dx = (event.clientX - gesture.startX) / view.w
    const dy = (event.clientY - gesture.startY) / view.h
    if (gesture.mode === 'move') {
      setCrop({
        x: clamp(gesture.crop.x + dx, 0, 1 - gesture.crop.w),
        y: clamp(gesture.crop.y + dy, 0, 1 - gesture.crop.h),
        w: gesture.crop.w,
        h: gesture.crop.h,
      })
    } else {
      const w = clamp(gesture.crop.w + dx, MIN_FRAME, 1 - gesture.crop.x)
      const h = clamp(gesture.crop.h + dy, MIN_FRAME, 1 - gesture.crop.y)
      setCrop({ x: gesture.crop.x, y: gesture.crop.y, w, h })
    }
  }
  const endGesture = (): void => { setGesture(null) }

  const confirm = useCallback(() => {
    const image = imageRef.current
    if (image === null) return
    try {
      onConfirm(cropToDataUrl(image, crop))
    } catch (error) {
      // Canvas export failure (rare): keep the editor open.
      console.error('chat-focus: crop export failed', error)
    }
  }, [crop, onConfirm])

  return (
    <div className={css.root}>
      <div ref={stageRef} className={css.stage}>
        <img ref={imageRef} src={imageUrl} alt="" className={css.image} draggable={false} />
        {view !== null && (
          <div
            className={css.frame}
            style={{
              left: `${crop.x * 100}%`,
              top: `${crop.y * 100}%`,
              width: `${crop.w * 100}%`,
              height: `${crop.h * 100}%`,
            }}
            onPointerDown={onPointerDown('move')}
            onPointerMove={onPointerMove}
            onPointerUp={endGesture}
            onPointerCancel={endGesture}
          >
            <div className={css.gridH} />
            <div className={css.gridH} />
            <div className={css.gridV} />
            <div className={css.gridV} />
            <div
              className={css.handle}
              onPointerDown={(event) => {
                // The handle sits inside the move frame; stop propagation so
                // the resize gesture is not overridden by the frame's move.
                event.stopPropagation()
                onPointerDown('resize')(event)
              }}
              onPointerMove={onPointerMove}
              onPointerUp={endGesture}
              onPointerCancel={endGesture}
            />
          </div>
        )}
      </div>
      <div className={css.actions}>
        <button type="button" className={css.cancel} onClick={onCancel}>取消</button>
        <button type="button" className={css.confirm} onClick={confirm}>确定</button>
      </div>
    </div>
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Downscale an image data URI before cropping: long side capped at 1200px,
 * JPEG 0.82. Keeps the exported settings value small enough for the settings
 * RPC/write to succeed reliably.
 * @param dataUrl - source image (any browser-decodable format).
 * @returns a compressed JPEG data URI.
 */
export function compressImageDataUrl(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const scale = Math.min(1, MAX_OUTPUT_WIDTH / image.naturalWidth)
      const width = Math.max(1, Math.round(image.naturalWidth * scale))
      const height = Math.max(1, Math.round(image.naturalHeight * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (ctx === null) {
        reject(new Error('canvas 2d context unavailable'))
        return
      }
      ctx.drawImage(image, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    image.onerror = () => { reject(new Error('image decode failed')) }
    image.src = dataUrl
  })
}
