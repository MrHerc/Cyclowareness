/**
 * What was inside the archive.
 *
 * Each member was analysed as a job in its own right, so each one gets a link to
 * its own report rather than a summary line that cannot be interrogated. The
 * ordering is the server's: worst-scoring member first, because an archive is
 * exactly as dangerous as the worst thing it carries.
 */

import { useT } from '../../lib/i18n'
import { Link } from 'react-router-dom'
import type { SandboxJobSummary } from '../../domain/types'
import { NoMeasurement } from '../../components/data'
import {
  Badge,
  Panel,
  StatusDot,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui'
import { bytes, humanise, num } from '../../lib/format'
import { isScored } from './shared'

export interface ArchiveChildrenProps {
  /** Not named `children`: this is data the panel renders, not slotted content. */
  members: SandboxJobSummary[]
}

export function ArchiveChildren({ members }: ArchiveChildrenProps) {
  const t = useT()
  return (
    <Panel
      title={t('x.files-inside-this-archive')}
      subtitle={`${members.length} ${members.length === 1 ? 'member was' : 'members were'} extracted and analysed separately.`}
      flush
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Risk</TableHead>
            <TableHead numeric>Score</TableHead>
            <TableHead numeric>Size</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((child) => {
            const scored = isScored(child)
            return (
              <TableRow key={child.public_id}>
                <TableCell className="max-w-[20rem]">
                  <Link
                    to={`/sandbox/${child.public_id}`}
                    className="block truncate text-fg hover:text-brand"
                  >
                    {child.original_name || 'Unnamed member'}
                  </Link>
                </TableCell>
                <TableCell>{humanise(child.family)}</TableCell>
                <TableCell>
                  <StatusDot status={child.status} />
                </TableCell>
                <TableCell>
                  {scored ? (
                    <Badge status={child.risk_level} size="sm" />
                  ) : (
                    <NoMeasurement
                      label={t('u.not-scored')}
                      reason={t('p.this-member-has-not-finished-analysis')}
                    />
                  )}
                </TableCell>
                <TableCell numeric>
                  {scored ? num(child.final_score, 0) : <span className="text-fg-faint">—</span>}
                </TableCell>
                <TableCell numeric>{bytes(child.size_bytes)}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Panel>
  )
}
