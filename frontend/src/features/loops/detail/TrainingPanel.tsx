/**
 * Stage 5 — delivery, per assignee.
 *
 * The force-measure control lives here because this is the stage it acts on. Its
 * warning is not softened: expiring an open assignment is recorded as ignored
 * training and RAISES those people's risk scores, which is a consequence a
 * confirmation dialog has to state before, not after.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FastForward } from 'lucide-react'
import type { LoopRunDetail, LoopStatus, StageEntry } from '../../../domain/types'
import { STAGES } from '../../../domain/types'
import { formatDateTime, num } from '../../../lib/format'
import { NoMeasurement } from '../../../components/data'
import { ConfirmationDialog } from '../../../components/states'
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from '../../../components/ui'
import { useForceMeasure } from '../../../lib/api/mutations'
import { StageSection } from './StageSection'

const STAGE = STAGES[4]

export interface TrainingPanelProps {
  entry: StageEntry | undefined
  runId: number
  status: LoopStatus
  assignments: LoopRunDetail['assignments']
  /** Force-measure is an analyst override; a read-only role is not offered it. */
  canForce: boolean
}

const OPEN_STATUSES = new Set(['assigned', 'in_progress'])

export function TrainingPanel({ entry, runId, status, assignments, canForce }: TrainingPanelProps) {
  const [confirming, setConfirming] = useState(false)
  const toast = useToast()
  // Per-call callbacks: options passed to the hook would replace the cache
  // invalidation it performs after the run moves.
  const forceMeasure = useForceMeasure()

  const open = assignments.filter((assignment) => OPEN_STATUSES.has(assignment.status))
  const awaitingTraining = status === 'awaiting_training'

  const run = () => {
    forceMeasure.mutate(runId, {
      onSuccess: () => {
        setConfirming(false)
        toast.show({
          title: `Run ${runId} measured`,
          description: `${open.length} open assignment${
            open.length === 1 ? ' was' : 's were'
          } expired and the run moved to measurement.`,
          tone: 'warning',
        })
      },
      onError: (error) => {
        setConfirming(false)
        toast.show({
          title: 'Force-measure did not run',
          description: error.message,
          tone: 'error',
        })
      },
    })
  }

  return (
    <StageSection
      stage={STAGE}
      entry={entry}
      source="live"
      sourceDetail="Training assignment records"
      actions={
        awaitingTraining && canForce ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setConfirming(true)}
            disabled={forceMeasure.isPending}
            icon={<FastForward className="size-4" aria-hidden="true" />}
          >
            Force measurement now
          </Button>
        ) : undefined
      }
    >
      {assignments.length === 0 ? (
        <p className="text-body text-fg-muted">
          Nothing was assigned on this run. Either it has not passed the gate yet, or targeting
          selected no one.
        </p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assignee</TableHead>
                <TableHead>Delivery status</TableHead>
                <TableHead numeric>Quiz score</TableHead>
                <TableHead>Completed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell>
                    <Link
                      to={`/employees/${assignment.employee_id}`}
                      className="text-fg hover:text-brand"
                    >
                      {assignment.employee_name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge status={assignment.status} size="sm" />
                  </TableCell>
                  <TableCell numeric>
                    {assignment.score === null ? (
                      <NoMeasurement reason="This assignment has not been completed, so there is no score." />
                    ) : (
                      `${num(assignment.score, 0)}%`
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {assignment.completed_at ? formatDateTime(assignment.completed_at) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <p className="mt-3 text-xs text-fg-subtle">
            An assignment is delivered by appearing in the assignee&apos;s portal. No mail gateway
            is connected in this deployment, so nothing was emailed and no send or open event is
            recorded.
          </p>
        </>
      )}

      {awaitingTraining && !canForce ? (
        <p className="mt-3 text-sm text-fg-subtle">
          {open.length} assignment{open.length === 1 ? ' is' : 's are'} still open. Only an analyst
          can force this run to measurement early.
        </p>
      ) : null}

      <ConfirmationDialog
        open={confirming}
        onOpenChange={setConfirming}
        tone="danger"
        title={`Force run ${runId} to measurement`}
        description={`This expires ${open.length} open assignment${
          open.length === 1 ? '' : 's'
        } without them being completed. Each expiry is recorded against that person as ignored training, which RAISES their risk score, and the effect cannot be undone from this screen. Measurement then runs on whatever has been completed so far.`}
        confirmLabel="Expire and measure"
        busy={forceMeasure.isPending}
        onConfirm={run}
      />
    </StageSection>
  )
}
