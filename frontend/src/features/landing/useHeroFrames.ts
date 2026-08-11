/**
 * Streams the hero's frame sequence into memory, in the order the page needs it.
 *
 * The whole desktop set is ~11 MB. Waiting for it before showing anything would
 * put a blank screen in front of every first-time visitor for several seconds,
 * so the load is split: a small priority batch is decoded first and the hero is
 * declared ready the moment it lands, then the remainder streams in behind the
 * reader while they are still looking at the opening frame. Scrolling faster
 * than the download is handled by the canvas, which falls back to the nearest
 * frame it already holds rather than going blank.
 *
 * Decoded images are written into a ref, NOT into state. Storing 192 image
 * objects in state would re-render the tree 192 times during the load; the
 * canvas reads them imperatively on its own animation frame.
 */

import { useEffect, useRef, useState } from 'react'
import manifest from './heroManifest.json'

export interface FrameConfig {
  totalFrames: number
  basePath: string
  prefix: string
  ext: string
  pad: number
  width: number
  height: number
}

export interface HeroFramesState {
  config: FrameConfig
  /** Sparse, indexed 0-based. Read imperatively from the render loop. */
  imagesRef: React.RefObject<(HTMLImageElement | undefined)[]>
  /** True once the priority batch is decoded — safe to reveal and scrub. */
  ready: boolean
  /** 0→1 across the priority batch only; drives the loading bar. */
  progress: number
}

/** Decoded before the hero is shown. Two seconds of scroll at the top. */
const PRIORITY = 18
/** Parallel requests for the rest. Enough to saturate, few enough to stay polite. */
const CONCURRENCY = 6
/** Below this width the lighter set is used. */
const MOBILE_BREAKPOINT = 768

const HERO_MANIFEST = manifest as { desktop: FrameConfig; mobile: FrameConfig }

function pickConfig(): FrameConfig {
  if (typeof window === 'undefined') return HERO_MANIFEST.desktop
  return window.innerWidth < MOBILE_BREAKPOINT ? HERO_MANIFEST.mobile : HERO_MANIFEST.desktop
}

export function frameSrc(cfg: FrameConfig, oneBased: number): string {
  return `${cfg.basePath}/${cfg.prefix}${String(oneBased).padStart(cfg.pad, '0')}.${cfg.ext}`
}

/**
 * @param active `false` under reduced motion — only the first frame is fetched,
 *   because nothing will ever scrub through the rest.
 */
export function useHeroFrames(active: boolean): HeroFramesState {
  // Chosen once, on mount. Re-picking on resize would swap every URL mid-scroll
  // and throw away a load that is already half done.
  const [config] = useState<FrameConfig>(pickConfig)
  const total = config.totalFrames

  const imagesRef = useRef<(HTMLImageElement | undefined)[]>(new Array(total).fill(undefined))
  const [ready, setReady] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let cancelled = false
    const images = imagesRef.current

    const load = (index: number) =>
      new Promise<void>((resolve) => {
        if (images[index]) return resolve()
        const img = new Image()
        img.decoding = 'async'
        // A frame that 404s or times out must not stall the queue behind it —
        // the canvas already knows how to substitute a neighbour.
        img.onload = () => {
          if (!cancelled) images[index] = img
          resolve()
        }
        img.onerror = () => resolve()
        img.src = frameSrc(config, index + 1)
      })

    async function run() {
      if (!active) {
        await load(0)
        if (!cancelled) {
          setProgress(1)
          setReady(true)
        }
        return
      }

      let done = 0
      const priority = Math.min(PRIORITY, total)
      await Promise.all(
        Array.from({ length: priority }, (_, i) =>
          load(i).then(() => {
            done += 1
            if (!cancelled) setProgress(done / priority)
          }),
        ),
      )
      if (cancelled) return
      setReady(true)

      // The rest, with a bounded number of requests in flight.
      let next = priority
      const worker = async () => {
        while (!cancelled && next < total) {
          const i = next
          next += 1
          await load(i)
        }
      }
      await Promise.all(Array.from({ length: CONCURRENCY }, worker))
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [active, config, total])

  return { config, imagesRef, ready, progress }
}
