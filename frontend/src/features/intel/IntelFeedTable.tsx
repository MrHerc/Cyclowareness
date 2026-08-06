/**
 * The advisory feed.
 *
 * The match count is the column that matters: an advisory only earns an
 * analyst's attention here if it touched something this organisation actually
 * runs or actually approved. It is therefore never fabricated — when the API
 * truncated the match list, the cell says the count is unknown instead of
 * printing a confident 0.
 *
 * The title is a real button rather than a click handler on the row, so the
 * feed is one tab stop per advisory and the target has an accessible name.
 */

import { useT } from '../../lib/i18n'
import { NoMeasurement } from '../../components/data'
import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui'
import type { IntelItem } from '../../domain/types'
import { formatDate, num, timeAgo } from '../../lib/format'
import { RELEVANCE_LABEL, SOURCE_LABEL, TYPE_LABEL } from './vocabulary'

export interface IntelFeedTableProps {
  items: IntelItem[]
  selectedId: number | null
  onSelect: (id: number) => void
  /**
   * Matches recorded against an advisory, or null when the API did not return
   * enough of the match list to be sure. Null is rendered as "not counted".
   */
  matchCountFor: (item: IntelItem) => number | null
}

export function IntelFeedTable({
  items,
  selectedId,
  onSelect,
  matchCountFor,
}: IntelFeedTableProps) {
  const t = useT()
  return (
    <Table containerClassName="max-h-[36rem]">
      <TableHeader>
        <TableRow>
          <TableHead>Advisory</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Published</TableHead>
          <TableHead>Severity</TableHead>
          <TableHead numeric>CVSS</TableHead>
          <TableHead numeric>Matches</TableHead>
          <TableHead>Assessment</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const matches = matchCountFor(item)
          const external = item.external_id?.trim()
          return (
            <TableRow key={item.id} selected={item.id === selectedId}>
              <TableCell className="max-w-[26rem]">
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className="group block w-full text-left"
                >
                  {external ? (
                    <span className="tech block text-brand">{external}</span>
                  ) : (
                    <span className="block text-xs text-fg-faint">No external id</span>
                  )}
                  <span className="mt-0.5 block truncate text-body text-fg group-hover:text-brand-fg">
                    {item.title}
                  </span>
                </button>
              </TableCell>

              <TableCell>
                <span className="block text-sm text-fg-muted">
                  {SOURCE_LABEL[item.source] ?? item.source}
                </span>
                <span className="block text-xs text-fg-faint">
                  {TYPE_LABEL[item.intel_type] ?? item.intel_type}
                </span>
              </TableCell>

              <TableCell>
                <span className="block text-sm text-fg-muted">{formatDate(item.published_at)}</span>
                <span className="block text-xs text-fg-faint">{timeAgo(item.published_at)}</span>
              </TableCell>

              <TableCell>
                <Badge status={item.severity} size="sm" dot />
              </TableCell>

              <TableCell numeric>
                {item.cvss_score === null || item.cvss_score === undefined ? (
                  <NoMeasurement
                    label="Not scored"
                    reason={t('p.the-publisher-did-not-attach-a')}
                    className="justify-end"
                  />
                ) : (
                  <span className="tech text-fg">{num(item.cvss_score, 1)}</span>
                )}
              </TableCell>

              <TableCell numeric>
                {matches === null ? (
                  <NoMeasurement
                    label="Not counted"
                    reason={t('p.the-api-returned-only-part-of-2')}
                    className="justify-end"
                  />
                ) : matches === 0 ? (
                  <span className="text-fg-faint">0</span>
                ) : (
                  <span className="text-brand">{num(matches)}</span>
                )}
              </TableCell>

              <TableCell>
                {item.dismissed_by ? (
                  <Badge status="dismissed" size="sm" />
                ) : (
                  <Badge status={item.relevance} size="sm">
                    {RELEVANCE_LABEL[item.relevance] ?? item.relevance}
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
