/**
 * How a piece of content came to exist, said plainly.
 *
 * The defect this component exists to prevent: labelling template output as AI.
 * When no model is connected the backend answers `generation_source: 'mock'` and
 * a fixed template writes the module — calling that "AI generated" on stage is
 * the single claim that would sink the product's credibility fastest. Only
 * `ai_generated` and `ai_assisted` are allowed the violet machine-reasoning hue;
 * every other provenance is neutral, including template and imported content.
 */

import { useT, type MessageKey } from '../../lib/i18n'
import { CircleHelp, Import, LayoutTemplate, PenLine, ShieldCheck, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Provenance } from '../../domain/types'
import { cn } from '../../lib/format'
import { Tip } from './Tip'

export interface AIProvenanceBadgeProps {
  provenance: Provenance
  /**
   * The backend's raw `generation_source`: 'anthropic' | 'mock' | '' — never
   * inferred. Drives the model-status sentence in the tooltip.
   */
  generationSource?: string | null
  /**
   * `Capabilities.ai_provider === 'anthropic'`. Leave undefined when the
   * capabilities call has not answered; the badge then says nothing about the
   * model rather than guessing that there isn't one.
   */
  modelConnected?: boolean
  className?: string
}

const PROVENANCE: Record<Provenance, { label: string; icon: LucideIcon; tone: string; tip: MessageKey }> = {
  ai_generated: {
    label: 'AI generated',
    icon: Sparkles,
    tone: 'border-ai/40 bg-ai/10 text-ai',
    tip: 'p.written-by-a-language-model-no',
  },
  ai_assisted: {
    label: 'AI assisted',
    icon: Sparkles,
    tone: 'border-ai/30 bg-ai/5 text-ai',
    tip: 'p.drafted-by-a-language-model-and',
  },
  analyst_edited: {
    label: 'Analyst edited',
    icon: PenLine,
    tone: 'border-line text-fg-muted',
    tip: 'p.an-analyst-wrote-or-rewrote-this',
  },
  human_approved: {
    label: 'Human approved',
    icon: ShieldCheck,
    tone: 'border-line-strong text-fg',
    tip: 'p.a-named-person-approved-this-content',
  },
  template: {
    label: 'Template',
    icon: LayoutTemplate,
    tone: 'border-line text-fg-muted',
    tip: 'p.produced-by-a-fixed-template-no',
  },
  imported_lms: {
    label: 'Imported from LMS',
    icon: Import,
    tone: 'border-line text-fg-muted',
    tip: 'p.imported-from-a-connected-learning-system',
  },
  unknown: {
    label: 'Provenance unknown',
    icon: CircleHelp,
    tone: 'border-line-subtle text-fg-faint',
    tip: 'p.how-this-content-was-produced-was',
  },
}

/** Only content that could plausibly have come from a model earns a model note. */
const MODEL_RELEVANT: Provenance[] = ['ai_generated', 'ai_assisted', 'template']

function modelNote(
  provenance: Provenance,
  generationSource: string | null | undefined,
  modelConnected: boolean | undefined,
): MessageKey | null {
  if (!MODEL_RELEVANT.includes(provenance)) return null
  if (generationSource === 'mock' || modelConnected === false) {
    return 'p.no-model-connected-in-this-deployment'
  }
  if (generationSource === 'anthropic') return 'p.generated-by-the-configured-anthropic-model'
  return null
}

export function AIProvenanceBadge({
  provenance,
  generationSource,
  modelConnected,
  className,
}: AIProvenanceBadgeProps) {
  const t = useT()
  const spec = PROVENANCE[provenance] ?? PROVENANCE.unknown
  const Icon = spec.icon
  const note = modelNote(provenance, generationSource, modelConnected)

  return (
    <Tip
      content={
        <span>
          {t(spec.tip)}
          {note ? <span className="mt-1 block text-fg-subtle">{t(note)}</span> : null}
        </span>
      }
    >
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-chip border px-2 py-0.5 text-xs',
          spec.tone,
          className,
        )}
      >
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        {spec.label}
      </span>
    </Tip>
  )
}
