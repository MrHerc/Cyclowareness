/**
 * The human sensor, as one dialog.
 *
 * Reporting has to be the easiest thing on this page: the whole loop starts
 * here, and an employee who is unsure whether something is phishing will not
 * fill in a six-field form to find out. Three fields, one of them optional.
 *
 * The verdict that comes back is shown immediately, with the engine that wrote
 * it named. In a deployment with no model connected the server triages with a
 * keyword and IOC extractor — genuinely useful, and not a model's judgement.
 * Presenting the two identically is the exact claim this product cannot make.
 */

import { useState } from 'react'
import { Send, ShieldQuestion } from 'lucide-react'
import { AIProvenanceBadge } from '../../components/data'
import { ErrorState } from '../../components/states'
import { Badge, Button, Dialog, Select, Textarea } from '../../components/ui'
import { provenanceOf, type Report } from '../../domain/types'
import { useSubmitReport } from '../../lib/api/mutations'
import { defang, humanise } from '../../lib/format'

export interface ReportSuspiciousDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `capabilities.ai_provider === 'anthropic'`. Undefined until it answers. */
  modelConnected?: boolean
}

const ARTIFACT_TYPES = [
  { value: 'email', label: 'An email' },
  { value: 'url', label: 'A link or website' },
  { value: 'sms', label: 'A text message' },
  { value: 'chat', label: 'A chat or messaging app' },
  { value: 'file', label: 'A file or attachment' },
]

const SUSPICION_TONE: Record<string, 'critical' | 'medium' | 'safe'> = {
  high: 'critical',
  medium: 'medium',
  low: 'safe',
}

function TriageResult({ report, modelConnected }: { report: Report; modelConnected?: boolean }) {
  const triage = report.triage_summary
  const iocs = triage?.likely_iocs ?? {}
  const iocEntries = Object.entries(iocs).filter(
    (entry): entry is [string, string[]] => Array.isArray(entry[1]) && entry[1].length > 0,
  )

  return (
    <div className="space-y-4" aria-live="polite">
      <div className="rounded-control border border-safe/30 bg-safe/10 px-4 py-3">
        <p className="text-body text-fg">
          Report received. Your security team can now see it
          {report.risk_credited === false ? '.' : ', and the report itself lowered your risk score.'}
        </p>
        {/* Score credit is capped so it cannot be farmed. Saying "your score went
            down" on the fourth report of a day, when no risk event was written,
            is a falsehood aimed at the one behaviour the product most wants. */}
        {report.risk_credited === false && report.risk_credit_note ? (
          <p className="mt-1.5 text-sm text-fg-muted">{report.risk_credit_note}</p>
        ) : null}
      </div>

      {triage === null ? (
        <p className="text-body text-fg-subtle">
          No automated triage was recorded for this report. An analyst will read it.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="label text-fg-subtle">First-pass verdict</span>
            <Badge tone={SUSPICION_TONE[triage.suspicion_level] ?? 'neutral'} size="sm">
              {humanise(triage.suspicion_level)} suspicion
            </Badge>
            <AIProvenanceBadge
              provenance={provenanceOf(triage.source)}
              generationSource={triage.source}
              modelConnected={modelConnected}
            />
          </div>

          {triage.source === 'mock' ? (
            <p className="text-xs text-fg-faint">
              This verdict came from a keyword and indicator extractor running on this deployment,
              not from a language model. It is a first pass, not a decision.
            </p>
          ) : (
            <p className="text-xs text-fg-faint">
              This is an automated first pass. An analyst decides what happens next.
            </p>
          )}

          <p className="text-body text-fg-muted">{triage.summary}</p>

          {triage.indicators.length > 0 ? (
            <div>
              <span className="label text-fg-subtle">What it noticed</span>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-body text-fg-muted">
                {triage.indicators.map((indicator) => (
                  <li key={indicator}>{indicator}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {iocEntries.length > 0 ? (
            <div>
              <span className="label text-fg-subtle">Indicators extracted</span>
              <ul className="mt-1.5 space-y-1">
                {iocEntries.map(([kind, values]) => (
                  <li key={kind} className="text-sm text-fg-muted">
                    <span className="text-fg-subtle">{humanise(kind)}: </span>
                    <span className="tech break-all text-fg">
                      {values.map((value) => defang(value)).join(', ')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {triage.recommended_action ? (
            <div>
              <span className="label text-fg-subtle">What you should do</span>
              <p className="mt-1 text-body text-fg">{triage.recommended_action}</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

export function ReportSuspiciousDialog({
  open,
  onOpenChange,
  modelConnected,
}: ReportSuspiciousDialogProps) {
  const [artifactType, setArtifactType] = useState('email')
  const [artifactRef, setArtifactRef] = useState('')
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState(false)
  const submit = useSubmitReport()

  const trimmed = artifactRef.trim()
  const invalid = trimmed.length === 0

  function reset() {
    setArtifactType('email')
    setArtifactRef('')
    setNote('')
    setTouched(false)
    submit.reset()
  }

  function handleClose(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  function handleSubmit() {
    setTouched(true)
    if (invalid) return
    submit.mutate({ artifact_type: artifactType, artifact_ref: trimmed, note: note.trim() })
  }

  const result = submit.data ?? null

  return (
    <Dialog
      open={open}
      onOpenChange={handleClose}
      title="Report something suspicious"
      description="If it looks wrong, send it. Reporting is never the wrong call."
      size="md"
      footer={
        result ? (
          <>
            <Button variant="ghost" onClick={reset}>
              Report something else
            </Button>
            <Button variant="primary" onClick={() => handleClose(false)}>
              Done
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => handleClose(false)} disabled={submit.isPending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={submit.isPending}
              icon={<Send className="size-4" aria-hidden="true" />}
            >
              Send report
            </Button>
          </>
        )
      }
    >
      {result ? (
        <TriageResult report={result} modelConnected={modelConnected} />
      ) : (
        <div className="space-y-4">
          <Select
            label="What is it"
            options={ARTIFACT_TYPES}
            value={artifactType}
            onValueChange={setArtifactType}
          />

          <Textarea
            label="Paste it here"
            hint="The sender address, the subject line, the link — whatever you have. Do not open it first."
            value={artifactRef}
            onChange={(event) => setArtifactRef(event.target.value)}
            onBlur={() => setTouched(true)}
            error={touched && invalid ? 'Paste at least part of what you saw.' : null}
            required
            rows={4}
          />

          <Textarea
            label="Anything else worth knowing (optional)"
            hint="What made you suspicious, or what you already did."
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
          />

          {submit.error ? (
            <ErrorState
              compact
              error={submit.error}
              title="Your report was not sent"
              onRetry={handleSubmit}
            />
          ) : (
            <p className="flex items-start gap-2 text-xs text-fg-faint">
              <ShieldQuestion className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Nothing you paste here is executed or opened. It is stored as text for an analyst to
              read.
            </p>
          )}
        </div>
      )}
    </Dialog>
  )
}
