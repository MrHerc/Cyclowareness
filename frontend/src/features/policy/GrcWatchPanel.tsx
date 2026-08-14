/**
 * The GRC watcher's pulse: what the background scan watches, when it last
 * ran, and the news it surfaced.
 *
 * "Has not run yet" is a real state and renders as one — `last_scan` is null
 * until the first pass completes, and this panel says so instead of showing
 * zeroes that would read as a clean bill of health. Matches link to the
 * intel screen, where escalating one into a finding remains the analyst's
 * click: this panel reports, it does not decide.
 */

import { RefreshCw, Radar } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Button, Panel } from '../../components/ui'
import { useT } from '../../lib/i18n'
import { timeAgo } from '../../lib/format'
import { useGrcWatch, useRunGrcWatch } from '../pipeline/api'

export function GrcWatchPanel() {
  const t = useT()
  const watch = useGrcWatch()
  const run = useRunGrcWatch()

  const status = watch.data

  return (
    <Panel
      tone="feature"
      title={t('pl.grc-watch')}
      subtitle={t('pl.grc-watch-subtitle')}
      headingLevel={3}
      actions={
        <Button
          size="sm"
          variant="outline"
          icon={<RefreshCw className="size-4" />}
          loading={run.isPending}
          onClick={() => run.mutate()}
        >
          {t('pl.scan-now')}
        </Button>
      }
    >
      {watch.isPending ? (
        <p className="text-sm text-fg-subtle">{t('pl.reading-watch-status')}</p>
      ) : watch.isError ? (
        <p className="text-sm text-critical">{watch.error.message}</p>
      ) : status ? (
        <div className="space-y-3">
          <p className="flex flex-wrap items-center gap-2 text-sm text-fg-muted">
            <Radar className="size-4 shrink-0 text-brand" aria-hidden="true" />
            {status.last_scan
              ? t('pl.last-scan-summary', {
                  when: timeAgo(status.last_scan.ran_at),
                  rules: status.last_scan.rules_watched,
                  items: status.last_scan.items_scanned,
                })
              : status.enabled
                ? t('pl.watch-has-not-run-yet')
                : t('pl.watch-disabled')}
          </p>

          {status.recent_matches.length === 0 ? (
            <p className="text-sm text-fg-subtle">{t('pl.no-watch-matches-yet')}</p>
          ) : (
            <ul className="space-y-2">
              {status.recent_matches.slice(0, 6).map((match) => (
                <li
                  key={match.match_id}
                  className="rounded-control border border-line-subtle bg-base px-3 py-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={match.escalated_finding_id ? 'safe' : 'medium'} size="sm">
                      {match.escalated_finding_id
                        ? t('pl.escalated')
                        : t('pl.awaiting-review')}
                    </Badge>
                    <span className="min-w-0 flex-1 truncate text-sm text-fg">
                      {match.intel_title}
                    </span>
                    <span className="text-xs text-fg-faint">{timeAgo(match.created_at)}</span>
                  </div>
                  <p className="mt-1 text-xs text-fg-subtle">{match.explanation}</p>
                </li>
              ))}
            </ul>
          )}

          <p className="text-xs text-fg-faint">
            {t('pl.watch-footer')}{' '}
            <Link
              to="/threat-intelligence"
              className="text-brand-fg underline-offset-4 hover:underline"
            >
              {t('pl.open-threat-intelligence')}
            </Link>
          </p>
        </div>
      ) : null}
    </Panel>
  )
}
