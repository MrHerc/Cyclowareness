/**
 * Draws one frame of the hero sequence, chosen by how far the reader has
 * scrolled.
 *
 * Three things keep it smooth:
 *
 * * **The drawn index chases the target rather than snapping to it.** A scroll
 *   wheel arrives in coarse jumps; mapping those straight onto frame numbers
 *   makes the camera stutter. Easing toward the target on every animation frame
 *   turns a jump into a short glide, which is what makes it read as a camera
 *   move rather than a slideshow.
 * * **It redraws only when the integer frame changes.** Otherwise this repaints
 *   a 1280×720 image 60 times a second to show the same picture.
 * * **A missing frame is substituted, never skipped.** The sequence streams in
 *   behind the reader, so scrolling fast reaches frames that have not arrived.
 *   The nearest decoded neighbour is drawn instead — slightly stale, never blank.
 */

import { useCallback, useEffect, useRef } from 'react'
import type { HeroFramesState } from './useHeroFrames'

interface HeroCanvasProps {
  frames: HeroFramesState
  /** Scroll progress 0→1, written by the section on every scroll. */
  progressRef: React.RefObject<number>
  /** Reduced motion: draw frame one and never start the loop. */
  reduced: boolean
  label: string
}

/** How hard the drawn frame chases the scroll target, per animation frame. */
const CHASE = 0.16

export function HeroCanvas({ frames, progressRef, reduced, label }: HeroCanvasProps) {
  const { config, imagesRef, ready } = frames
  const total = config.totalFrames

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const currentFrame = useRef(0)
  const lastDrawn = useRef(-1)

  const pickImage = useCallback(
    (index: number): HTMLImageElement | undefined => {
      const arr = imagesRef.current
      if (!arr) return undefined
      if (arr[index]) return arr[index]
      for (let r = 1; r < arr.length; r += 1) {
        if (arr[index - r]) return arr[index - r]
        if (arr[index + r]) return arr[index + r]
      }
      return undefined
    },
    [imagesRef],
  )

  /** Cover-fit, drawn in device pixels so it stays crisp on a retina display. */
  const draw = useCallback(
    (index: number) => {
      const canvas = canvasRef.current
      const ctx = ctxRef.current
      if (!canvas || !ctx) return
      const img = pickImage(index)
      if (!img) return

      const cw = canvas.width
      const ch = canvas.height
      const iw = img.naturalWidth || config.width
      const ih = img.naturalHeight || config.height
      const scale = Math.max(cw / iw, ch / ih)
      const dw = iw * scale
      const dh = ih * scale
      ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh)
    },
    [pickImage, config.width, config.height],
  )

  const resize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!ctxRef.current) ctxRef.current = canvas.getContext('2d', { alpha: false })
    // Capped at 2: a 3× backing store on a phone is three times the fill rate
    // for a difference nobody can see at this size.
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.max(1, Math.round(rect.width * dpr))
    canvas.height = Math.max(1, Math.round(rect.height * dpr))
    const ctx = ctxRef.current
    if (ctx) {
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
    }
    lastDrawn.current = -1
    draw(Math.round(currentFrame.current))
  }, [draw])

  useEffect(() => {
    resize()
    let raf = 0
    const onResize = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        resize()
        raf = 0
      })
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(raf)
    }
  }, [resize])

  // The first frame, as soon as it exists — under both motion settings.
  useEffect(() => {
    if (!ready) return
    resize()
    draw(Math.round(currentFrame.current))
  }, [ready, resize, draw])

  useEffect(() => {
    if (reduced) return
    let raf = 0
    let running = true
    const loop = () => {
      if (!running) return
      const target = (progressRef.current ?? 0) * (total - 1)
      currentFrame.current += (target - currentFrame.current) * CHASE
      const index = Math.round(currentFrame.current)
      if (index !== lastDrawn.current) {
        draw(index)
        lastDrawn.current = index
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      running = false
      cancelAnimationFrame(raf)
    }
  }, [reduced, total, draw, progressRef])

  return (
    <canvas
      ref={canvasRef}
      className="block size-full"
      role="img"
      aria-label={label}
    />
  )
}
