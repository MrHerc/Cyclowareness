/**
 * Artifacts that are already in the platform — triaged, analysed, or waiting.
 *
 * There is no severity column, and that is deliberate. A `Threat` record carries
 * a verdict and a confidence and nothing else; the approval queue derives a
 * severity from those two and states its own derivation in words. Printing a
 * severity here would put a label on the screen that no analyzer asserted, which
 * is exactly the class of quiet fiction this product refuses.
 *
 * "Analysis" is derived, but only from a fact: a verdict is either recorded or
 * it is not. An empty verdict is rendered as "no verdict yet", never as clean.
 */

import { useT } from '../../lib/i18n'
import { ListFilter, Radar } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { ConfidenceBadge, NoMeasurement } from '../../components/data'
import { AsyncBoundary, EmptyState, SkeletonTable } from '../../components/states'
import {
  Badge,
  Panel,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui'
import type { Threat } from '../../domain/types'
import { useThreats } from '../../lib/api/queries'
import { formatDateTime, humanise, timeAgo } from '../../lib/format'
import {
  ALL,
  matchesQuery,
  matchesValue,
  metaText,
  reachOf,
  SOURCE_OPTIONS,
  useUrlParam,
  VERDICT_OPTIONS,
} from './filters'
import { ArtifactTypeTag, SourceTag } from './IntakeAtoms'

export interface ThreatListProps {
  query: string
  artifactType: string
}

function matchesVerdict(selected: string, threat: Threat): boolean {
  if (selected === ALL) return true
  if (selected === 'none') return threat.verdict === null
  return threat.verdict === selected
}

export function ThreatList({ query, artifactType }: ThreatListProps) {
  const t = useT()
  const navigate = useNavigate()
  const [source, setSource] = useUrlParam('src', ALL)
  const [verdict, setVerdict] = useUrlParam('verdict', ALL)

  const threats = useThreats()
  const all = threats.data ?? []

  const visible = all.filter(
    (threat) =>
      matchesValue(source, threat.source) &&
      matchesValue(artifactType, threat.artifact_type) &&
      matchesVerdict(verdict, threat) &&
      matchesQuery(query, [
        threat.title,
        threat.artifact_ref,
        threat.threat_type,
        metaText(threat.artifact_meta, 'sender'),
        metaText(threat.artifact_meta, 'subject'),
      ]),
  )

  return (
    <Panel
      title={t('x.artifacts-in-the-platform')}
      subtitle={t('x.every-threat-record-whatever-route')}
      flush
      footer={
        <>
          Showing {visible.length} of {all.length}. A threat record holds a verdict and a confidence,
          not a severity — the approval gate derives severity from those two and says so there.
        </>
      }
    >
      {/* The panel is flush so the table's sticky header can reach its edges,
          which means this row carries its own padding. */}
      <div className="flex flex-wrap items-end gap-2 border-b border-line-subtle px-5 py-3">
        <Select
          label="Source"
          labelHidden
          options={SOURCE_OPTIONS}
          value={source}
          onValueChange={setSource}
          className="w-full sm:w-44"
        />
        <Select
          label="Verdict"
          labelHidden
          options={VERDICT_OPTIONS}
          value={verdict}
          onValueChange={setVerdict}
          className="w-full sm:w-48"
        />
      </div>

      <AsyncBoundary
        isLoading={threats.isLoading}
        error={threats.data ? null : threats.error}
        onRetry={() => void threats.refetch()}
        loadingLabel={t('x.loading-threat-records')}
        skeleton={<SkeletonTable rows={6} cols={6} className="rounded-none border-0" />}
        isEmpty={visible.length === 0}
        empty={
          <div className="p-5">
            {all.length === 0 ? (
              <EmptyState
                compact
                icon={Radar}
                headline="No artifact has entered the platform yet"
                description={t('x.a-threat-record-is-written')}
              />
            ) : (
              <EmptyState
                compact
                icon={ListFilter}
                headline="No artifact matches these filters"
                description={`${all.length} threat record${all.length === 1 ? ' exists' : 's exist'}. Clear the source, verdict, type or search filter to see them.`}
              />
            )}
          </div>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Artifact</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Analysis</TableHead>
              <TableHead>Threat type</TableHead>
              <TableHead>Reach</TableHead>
              <TableHead>Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((threat) => {
              const reach = reachOf(threat.artifact_meta)
              return (
                <TableRow
                  key={threat.id}
                  interactive
                  onClick={(event) => {
                    // The title cell holds the real link; this is the mouse
                    // convenience on top of it, and must not fire twice.
                    if (event.defaultPrevented) return
                    navigate(`/threats/${threat.id}`)
                  }}
                >
                  <TableCell className="max-w-xs">
                    <Link
                      to={`/threats/${threat.id}`}
                      className="text-body font-medium text-fg hover:text-brand-fg"
                    >
                      {threat.title || `Artifact ${threat.id}`}
                    </Link>
                    <span className="mt-1 flex items-center gap-2">
                      <ArtifactTypeTag type={threat.artifact_type} />
                      <span className="tech text-fg-faint">#{threat.id}</span>
                    </span>
                  </TableCell>

                  <TableCell>
                    <SourceTag source={threat.source} />
                  </TableCell>

                  <TableCell>
                    {threat.verdict ? (
                      <span className="flex flex-col items-start gap-1">
                        <Badge status={threat.verdict} size="sm" />
                        <ConfidenceBadge value={threat.confidence} />
                      </span>
                    ) : (
                      <NoMeasurement
                        label="No verdict yet"
                        reason="The ANALYZE stage has not recorded a verdict for this artifact. That is not a clean result — nothing has been concluded about it."
                      />
                    )}
                  </TableCell>

                  <TableCell>
                    {threat.threat_type ? (
                      humanise(threat.threat_type)
                    ) : (
                      <span className="text-fg-faint">—</span>
                    )}
                  </TableCell>

                  <TableCell className="max-w-[14rem]">
                    {reach ? (
                      <span className="block truncate" title={reach}>
                        {reach}
                      </span>
                    ) : (
                      <NoMeasurement
                        label="Not recorded"
                        reason="This artifact carries no recipient or department metadata, so how far it reached is unknown."
                      />
                    )}
                  </TableCell>

                  <TableCell>
                    <time
                      dateTime={threat.created_at}
                      title={formatDateTime(threat.created_at)}
                      className="whitespace-nowrap"
                    >
                      {timeAgo(threat.created_at)}
                    </time>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </AsyncBoundary>
    </Panel>
  )
}
