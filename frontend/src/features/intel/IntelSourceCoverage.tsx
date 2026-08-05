/**
 * "Check sources now" — and the truthful account of what that did.
 *
 * No intel source is wired into this build. The endpoint says so in fields a
 * client can branch on, and this panel renders those fields rather than a
 * spinner followed by a green tick. Three rules it will not break:
 *
 * 1. **No item is invented.** The list behind this panel is unchanged after a
 *    check, and the panel says the list is unchanged.
 * 2. **No success affordance.** There is no tick, no count-up, no toast that
 *    reads as "up to date". "Nothing was fetched" is the result, and it is
 *    reported in the same neutral type as everything else.
 * 3. **Silence is not evidence.** An unchanged advisory list from a feed that is
 *    not running says nothing about what has been published in the world, and
 *    the copy says exactly that.
 */

import { useT } from '../../lib/i18n'
import { RefreshCw, SatelliteDish } from 'lucide-react'
import { useState } from 'react'
import { ErrorState } from '../../components/states'
import { Button, Panel, Separator } from '../../components/ui'
import { useRefreshIntel } from '../../lib/api/mutations'
import { formatDateTime, num } from '../../lib/format'
import { readRefresh, type RefreshView } from './vocabulary'

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm text-fg-subtle">{label}</span>
      <span className="text-sm text-fg">{value}</span>
    </div>
  )
}

function count(value: number | null): string {
  return value === null ? 'Not reported' : num(value)
}

function Result({ view }: { view: RefreshView }) {
  const none = view.configuredSources.length === 0

  return (
    <div role="status" aria-live="polite" className="rise space-y-4">
      <div className="space-y-2">
        <p className="label text-fg-faint">Configured sources</p>
        {none ? (
          <p className="text-body text-fg">
            None. This deployment has no threat-intelligence source to contact.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {view.configuredSources.map((source) => (
              <li
                key={source}
                className="tech rounded-chip border border-line bg-raised px-2 py-0.5 text-fg-muted"
              >
                {source}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Separator />

      <div className="space-y-1.5">
        <Fact label="Sources contacted" value={count(view.sourcesChecked)} />
        <Fact label="New advisories" value={count(view.itemsAdded)} />
        <Fact label="Advisories updated" value={count(view.itemsUpdated)} />
        {view.requestedAt ? (
          <Fact label="Requested" value={formatDateTime(view.requestedAt)} />
        ) : null}
      </div>

      {view.detail ? (
        <p className="text-sm leading-relaxed text-fg-muted">{view.detail}</p>
      ) : (
        <p className="text-sm leading-relaxed text-fg-muted">
          The server returned no description of what it did. Treat the advisory list as
          unchanged rather than as up to date.
        </p>
      )}

      {view.nextStep ? (
        <div className="rounded-control border border-line-subtle bg-base p-3">
          <p className="label text-fg-faint">What configuring a source would do</p>
          <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{view.nextStep}</p>
        </div>
      ) : null}
    </div>
  )
}

export interface IntelSourceCoverageProps {
  /** Publication date of the newest advisory stored here, or null when none is. */
  latestPublishedAt: string | null
  canRefresh: boolean
}

export function IntelSourceCoverage({ latestPublishedAt, canRefresh }: IntelSourceCoverageProps) {
  const t = useT()
  const refresh = useRefreshIntel()
  const [view, setView] = useState<RefreshView | null>(null)

  return (
    <Panel
      tone="feature"
      title={t('x.source-coverage')}
      subtitle={t('x.what-this-deployment-can-fetch')}
      headingLevel={2}
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-fg-muted">
          The advisories on this screen are the records stored in this deployment. Nothing on
          it was fetched from an external source while you have been looking at it.
        </p>

        <div className="space-y-1.5">
          <Fact
            label="Newest advisory in view"
            value={latestPublishedAt ? formatDateTime(latestPublishedAt) : 'None'}
          />
        </div>

        {canRefresh ? (
          <Button
            variant="secondary"
            block
            icon={<RefreshCw className="size-4" aria-hidden="true" />}
            loading={refresh.isPending}
            onClick={() =>
              refresh.mutate(undefined, {
                onSuccess: (result) => setView(readRefresh(result)),
                onError: () => setView(null),
              })
            }
          >
            Check sources now
          </Button>
        ) : (
          <p className="text-sm text-fg-subtle">
            Your role can read intelligence but not ask the platform to check its sources.
          </p>
        )}

        {refresh.isError ? (
          // No retry control here: the button above is the retry, and a second
          // one inside the failure would be two ways to do the same thing.
          <ErrorState
            compact
            error={refresh.error}
            title={t('x.the-source-check-could-not')}
          />
        ) : null}

        {view ? (
          <Result view={view} />
        ) : refresh.isPending ? null : (
          <div className="flex items-start gap-2.5 rounded-control border border-line-subtle bg-base p-3">
            <SatelliteDish
              className="mt-0.5 size-4 shrink-0 text-fg-faint"
              aria-hidden="true"
              strokeWidth={1.5}
            />
            <p className="text-sm leading-relaxed text-fg-subtle">
              No source check has been requested in this session. An unchanged list is not
              evidence that no new advisory exists — it is evidence that nobody looked.
            </p>
          </div>
        )}
      </div>
    </Panel>
  )
}
