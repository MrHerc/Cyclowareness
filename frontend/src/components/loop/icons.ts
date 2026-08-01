/**
 * One icon per stage, in one place.
 *
 * Kept out of the components so the flow node, the timeline row and any future
 * stage picker cannot drift into using three different icons for Targeting.
 */

import {
  Activity,
  Crosshair,
  GraduationCap,
  Inbox,
  Microscope,
  RefreshCw,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import type { LoopStageKey } from './types'

export const STAGE_ICONS: Record<LoopStageKey, LucideIcon> = {
  ingest: Inbox,
  analyze: Microscope,
  // Violet is reserved for machine reasoning; the sparkle marks the one stage a
  // model actually writes, so the icon carries the same meaning as the hue.
  convert: Sparkles,
  target: Crosshair,
  train: GraduationCap,
  measure: Activity,
  feedback: RefreshCw,
}
