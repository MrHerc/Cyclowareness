/**
 * The eight beats of the loop, as a story a first-time viewer can follow.
 *
 * It is derived from `STAGES` and `APPROVAL_GATE_AFTER_STAGE` rather than
 * retyped: the sign-in screen is the one place a stale copy of the loop would
 * never be noticed, because nobody signed in is looking at it.
 *
 * The gate is an entry in this list, not an annotation on stage 3. On the
 * signature figure it has to occupy its own position on the ring — a gate drawn
 * as a label beside a stage reads as a property of that stage rather than as the
 * place the machine stops and waits for a person.
 *
 * `STAGE_ICONS` is imported from its module rather than the loop barrel on
 * purpose. The barrel pulls the whole interactive flow package in behind it, and
 * this is the first route a visitor downloads.
 */

import { BadgeCheck, type LucideIcon } from 'lucide-react'
import { STAGE_ICONS } from '../../components/loop/icons'
import { APPROVAL_GATE_AFTER_STAGE, STAGES } from '../../domain/types'

export interface LoopStoryNode {
  id: string
  kind: 'stage' | 'gate'
  /** 1–7 for a stage, `null` for the gate — a gate is not a stage. */
  stage: number | null
  label: string
  /** Who or what does the work here. */
  owner: string
  /** One sentence, present tense, describing what happens at this point. */
  narrative: string
  icon: LucideIcon
  /** Violet is machine reasoning, and only conversion is written by a model. */
  machine: boolean
}

const NARRATIVE: Record<string, string> = {
  ingest:
    'Someone forwards a message they did not trust. It enters as an artifact to be examined, not as a ticket to be closed.',
  analyze:
    'The sandbox opens it in isolation and returns a verdict, the indicators it extracted, and the behaviour it actually observed.',
  convert:
    'The analysed threat is rewritten as training about this artifact — the same lure, defanged, with the tell that gave it away.',
  target:
    'Only the people the artifact genuinely reached are selected, and each one carries the reason they were chosen.',
  train:
    'It is delivered in the channel the threat used, because that is where the behaviour being trained lives.',
  measure:
    'What is measured is what people do next. Attendance is not evidence of anything.',
  feedback:
    'The evidence moves each risk score, and the next cycle starts from what changed rather than from a calendar.',
}

const GATE_NARRATIVE =
  'A named analyst reads the generated training and decides. Nothing built from a real threat reaches an employee without a person here.'

/** The ring, in order, starting at intake. */
export const LOOP_STORY: LoopStoryNode[] = STAGES.flatMap((stage) => {
  const node: LoopStoryNode = {
    id: stage.key,
    kind: 'stage',
    stage: stage.n,
    label: stage.label,
    owner: stage.owner,
    narrative: NARRATIVE[stage.key] ?? stage.hint,
    icon: STAGE_ICONS[stage.key],
    machine: stage.key === 'convert',
  }
  if (stage.n !== APPROVAL_GATE_AFTER_STAGE) return [node]
  return [
    node,
    {
      id: 'gate',
      kind: 'gate',
      stage: null,
      label: 'Human approval gate',
      owner: 'Security analyst',
      narrative: GATE_NARRATIVE,
      icon: BadgeCheck,
      machine: false,
    },
  ]
})

/** How long each beat holds. The gate holds longer — that is the point of it. */
export function dwellMs(node: LoopStoryNode): number {
  return node.kind === 'gate' ? 3600 : 2300
}
