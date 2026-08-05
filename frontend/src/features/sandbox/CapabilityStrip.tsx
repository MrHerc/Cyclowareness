/**
 * What this deployment can actually do to a sample.
 *
 * The load-bearing sentence is the second one: **nothing submitted here is
 * executed**. A product that shows a "sandbox" and lets a viewer assume
 * detonation has taken place is making a claim it cannot support, so the
 * server's own `dynamic_worker` flag is repeated here in words, in the position
 * of most attention, rather than inferred or quietly omitted.
 */

import { useT } from '../../lib/i18n'
import { Boxes, FileCode2, ShieldAlert, ShieldCheck } from 'lucide-react'
import type { SandboxCapabilities } from '../../domain/types'
import { Panel, Tooltip } from '../../components/ui'
import { analyzerLabel } from './shared'

export interface CapabilityStripProps {
  capabilities: SandboxCapabilities
}

function Chip({ children }: { children: string }) {
  return (
    <span className="tech rounded-chip border border-line-subtle bg-base px-1.5 py-0.5 text-fg-subtle">
      {children}
    </span>
  )
}

export function CapabilityStrip({ capabilities }: CapabilityStripProps) {
  const t = useT()
  const analyzers = capabilities.static_analyzers ?? []
  const gaps = Object.entries(capabilities.unavailable_analyzers ?? {})
  const yaraLoaded = capabilities.yara?.loaded ?? 0
  const yaraError = capabilities.yara?.error
  const yaraFailed = Object.entries(capabilities.yara?.failed ?? {})
  const extensions = capabilities.supported_extensions ?? []
  const dynamic = capabilities.dynamic_worker

  return (
    <Panel
      title={t('x.analysis-capability-on-this-host')}
      subtitle={t('x.read-from-the-engine-at')}
      headingLevel={2}
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <FileCode2 className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" strokeWidth={1.75} />
              <span className="text-body text-fg">
                {analyzers.length} static {analyzers.length === 1 ? 'analyzer' : 'analyzers'} loaded
              </span>
            </div>
            <p className="mt-1.5 flex flex-wrap gap-1.5">
              {analyzers.map((name) => (
                <Chip key={name}>{analyzerLabel(name)}</Chip>
              ))}
            </p>
            {gaps.length > 0 && (
              <ul className="mt-2 space-y-1">
                {gaps.map(([name, reason]) => (
                  <li key={name} className="text-xs text-fg-faint">
                    {analyzerLabel(name)} is not available — {reason}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <Boxes className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" strokeWidth={1.75} />
              <span className="text-body text-fg">
                {yaraLoaded} YARA {yaraLoaded === 1 ? 'rule' : 'rules'} loaded
              </span>
            </div>
            {yaraError ? (
              <p className="mt-1 text-xs text-high">
                The YARA tier did not initialise ({yaraError}). Rule matches will be absent from
                every report on this host.
              </p>
            ) : null}
            {yaraFailed.length > 0 ? (
              <p className="mt-1 text-xs text-fg-faint">
                {yaraFailed.length} rule {yaraFailed.length === 1 ? 'file' : 'files'} failed to
                compile and {yaraFailed.length === 1 ? 'is' : 'are'} not in use.
              </p>
            ) : null}
          </div>

          <div>
            <p className="text-body text-fg">Accepted file types</p>
            <p className="mt-1.5 flex flex-wrap gap-1.5">
              {extensions.map((extension) => (
                <Chip key={extension}>{extension}</Chip>
              ))}
            </p>
            <p className="mt-1.5 text-xs text-fg-faint">
              Anything else is still accepted and identified by content — the list is what the
              engine has a dedicated parser for.
            </p>
          </div>
        </div>

        {/* The capability statement, given its own frame so it cannot be
            skimmed past. Amber rather than red: static-only is a limit, not a
            fault. */}
        <div
          className={
            dynamic
              ? 'rounded-panel border border-safe/30 bg-safe/5 p-4'
              : 'rounded-panel border border-medium/35 bg-medium/5 p-4'
          }
        >
          <div className="flex items-start gap-3">
            {dynamic ? (
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-safe" aria-hidden="true" strokeWidth={1.75} />
            ) : (
              <ShieldAlert className="mt-0.5 size-5 shrink-0 text-medium" aria-hidden="true" strokeWidth={1.75} />
            )}
            <div className="min-w-0 space-y-2">
              <h3 className="text-h text-fg">
                {dynamic ? 'Static and dynamic analysis' : 'Static analysis only'}
              </h3>
              {dynamic ? (
                <p className="text-body text-fg-muted">
                  An isolated detonation worker is attached to this deployment. Samples are parsed
                  and also executed under supervision, and both sets of findings appear in the
                  report.
                </p>
              ) : (
                <>
                  <p className="text-body text-fg-muted">
                    Dynamic detonation is not available on this host. Nothing submitted here is
                    executed — samples are parsed, scanned and scored, never run.
                  </p>
                  <p className="text-body text-fg-muted">
                    Every report states this as a blind spot rather than reporting a clean
                    behavioural result that was never observed.
                  </p>
                  {/* The engine's own reason, not a guess. "Not available" and
                      "not available because no worker token is configured" send
                      an operator to different places. */}
                  {capabilities.dynamic_unavailable_reason ? (
                    <p className="text-xs text-fg-faint">
                      {capabilities.dynamic_unavailable_reason}
                    </p>
                  ) : null}
                </>
              )}
              <Tooltip content="Detonation needs a disposable, network-isolated machine with kernel-level control. A managed web host does not provide one, and executing hostile code on shared infrastructure is the thing this design exists to avoid.">
                <span className="text-xs text-fg-faint underline decoration-dotted underline-offset-4">
                  Why detonation runs off-host
                </span>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  )
}
