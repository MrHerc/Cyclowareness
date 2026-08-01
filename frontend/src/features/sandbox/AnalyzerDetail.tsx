/**
 * What each analyzer produced — including the ones that produced nothing.
 *
 * An analyzer that did not run is listed with its reason rather than omitted.
 * A report that quietly drops the parsers it does not have reads identically to
 * a report where every parser found the sample clean, and those are the two
 * claims this engine is built never to confuse.
 *
 * Facts are shown as raw JSON on purpose: they are structured observations with
 * a different shape per analyzer, and inventing a pretty layout for each one is
 * how a field ends up silently dropped.
 */

import type { AnalyzerResultView } from '../../domain/types'
import { Accordion, AccordionItem, Badge, CodeBlock, Panel } from '../../components/ui'
import { duration } from '../../lib/format'
import { analyzerLabel } from './shared'

export interface AnalyzerDetailProps {
  analysis: Record<string, AnalyzerResultView>
}

function iocCount(result: AnalyzerResultView): number {
  return Object.values(result.iocs ?? {}).reduce((sum, list) => sum + (list?.length ?? 0), 0)
}

export function AnalyzerDetail({ analysis }: AnalyzerDetailProps) {
  const entries = Object.entries(analysis ?? {})
  const ran = entries.filter(([, result]) => result.ran).length

  return (
    <Panel
      title="Per-analyzer detail"
      subtitle={`${ran} of ${entries.length} analyzers produced a result on this sample.`}
      flush
      bodyClassName="px-5"
    >
      {entries.length === 0 ? (
        <p className="py-5 text-body text-fg-muted">
          No analyzer result was recorded for this job. That is a gap in the record, not a clean
          result.
        </p>
      ) : (
        <Accordion type="multiple">
          {entries.map(([name, result]) => {
            const facts = result.facts ?? {}
            const factCount = Object.keys(facts).length
            const indicators = iocCount(result)

            return (
              <AccordionItem
                key={name}
                value={name}
                heading={analyzerLabel(name)}
                meta={
                  result.ran ? (
                    <span className="inline-flex items-center gap-2">
                      <span>
                        {result.signals?.length ?? 0}{' '}
                        {(result.signals?.length ?? 0) === 1 ? 'signal' : 'signals'}
                      </span>
                      <span className="text-fg-faint">{duration(result.duration_ms)}</span>
                    </span>
                  ) : (
                    <Badge tone="neutral" size="sm">
                      Did not run
                    </Badge>
                  )
                }
              >
                {!result.ran ? (
                  <p className="text-body text-fg-muted">
                    {result.unavailable_reason ??
                      'This analyzer did not run and did not record a reason.'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-fg-subtle">
                      {result.signals?.length ?? 0}{' '}
                      {(result.signals?.length ?? 0) === 1 ? 'signal' : 'signals'} · {indicators}{' '}
                      {indicators === 1 ? 'indicator' : 'indicators'} · {factCount}{' '}
                      {factCount === 1 ? 'observation' : 'observations'}
                    </p>

                    {factCount > 0 ? (
                      <CodeBlock
                        value={JSON.stringify(facts, null, 2)}
                        label="Structured observations"
                        copyable
                        wrap
                      />
                    ) : (
                      <p className="text-sm text-fg-faint">
                        This analyzer recorded no structured observations for this sample.
                      </p>
                    )}
                  </div>
                )}
              </AccordionItem>
            )
          })}
        </Accordion>
      )}
    </Panel>
  )
}
