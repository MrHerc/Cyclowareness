/**
 * Everything already done, and what it scored.
 *
 * Deliberately below the current assignment: a completed module is a record,
 * not a task. Scores render through `NoMeasurement` rather than as `0` — an
 * assignment that expired before anyone took it has no score, and a zero in
 * that cell would accuse someone of failing a quiz they never saw.
 */

import { useT } from '../../lib/i18n'
import { GraduationCap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { NoMeasurement } from '../../components/data'
import { EmptyState } from '../../components/states'
import {
  Badge,
  Panel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui'
import type { AssignmentDetail } from '../../domain/types'
import { duration, formatDate, num } from '../../lib/format'

export interface TrainingHistoryProps {
  /** Assignments that are no longer open — completed or expired. */
  assignments: AssignmentDetail[]
}

export function TrainingHistory({ assignments }: TrainingHistoryProps) {
  const t = useT()
  return (
    <Panel
      title={t('x.training-you-have-finished')}
      subtitle={t('x.your-record-scores-are-the')}
      flush={assignments.length > 0}
      bodyClassName={assignments.length > 0 ? undefined : 'p-5'}
    >
      {assignments.length === 0 ? (
        <EmptyState
          compact
          icon={GraduationCap}
          headline="You have not finished any training yet"
          description={t('x.modules-appear-here-once-you')}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Module</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Finished</TableHead>
              <TableHead numeric>Score</TableHead>
              <TableHead numeric>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((assignment) => (
              <TableRow key={assignment.id}>
                <TableCell className="text-fg">
                  {assignment.status === 'completed' ? (
                    <Link
                      to={`/portal/training/${assignment.id}`}
                      className="text-fg hover:text-brand hover:underline"
                    >
                      {assignment.module.title}
                    </Link>
                  ) : (
                    assignment.module.title
                  )}
                </TableCell>
                <TableCell>
                  <Badge status={assignment.status} size="sm" />
                </TableCell>
                <TableCell>
                  {assignment.completed_at ? (
                    formatDate(assignment.completed_at)
                  ) : (
                    <span className="text-fg-faint">—</span>
                  )}
                </TableCell>
                <TableCell numeric>
                  {assignment.score === null ? (
                    <NoMeasurement
                      reason="This assignment was never completed, so no quiz was graded."
                      className="justify-end"
                    />
                  ) : (
                    `${num(assignment.score, 0)}%`
                  )}
                </TableCell>
                <TableCell numeric>
                  {assignment.time_spent_seconds === null ? (
                    <span className="text-fg-faint">—</span>
                  ) : (
                    duration(assignment.time_spent_seconds * 1000)
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  )
}
