/**
 * Every person the campaign was aimed at, and what they actually did.
 *
 * The outcome control is the honest part. The API accepts an outcome only while
 * the campaign is active and only for a target that is still pending, so the
 * menu is offered under exactly those conditions and the reason is stated the
 * rest of the time. A control that is always visible and 409s half the time
 * teaches an analyst to distrust the screen.
 *
 * "Pending" is never rendered as a neutral blank: an unresolved target is a
 * measurement that has not happened, and the denominator on this page depends
 * on the difference.
 */

import { ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from '../../components/ui'
import type { SimOutcome, SimulationDetail } from '../../domain/types'
import { useRecordOutcome } from '../../lib/api/mutations'
import { formatDateTime, num, riskBandLabel, timeAgo } from '../../lib/format'

/** The three outcomes the API accepts. `pending` is a starting state, not a choice. */
const RECORDABLE: { value: Exclude<SimOutcome, 'pending'>; label: string; note: string }[] = [
  { value: 'clicked', label: 'Clicked the lure', note: 'Raises the risk score' },
  { value: 'reported', label: 'Reported the lure', note: 'Lowers the risk score' },
  { value: 'ignored', label: 'Ignored it', note: 'No risk movement' },
]

export interface TargetTableProps {
  simulation: SimulationDetail
  /** Whether the signed-in role may write outcomes. */
  canRecord: boolean
}

export function TargetTable({ simulation, canRecord }: TargetTableProps) {
  const toast = useToast()
  const record = useRecordOutcome({
    // A rejected outcome is usually a race: someone else recorded it, or the
    // campaign closed while this table was open. Say which.
    onError: (error) =>
      toast.show({ title: 'Outcome not recorded', description: error.message, tone: 'error' }),
  })
  const active = simulation.status === 'active'
  const pendingTargetId = record.isPending ? record.variables?.targetId : undefined

  return (
    <Table containerClassName="max-h-[32rem]">
      <TableHeader>
        <TableRow>
          <TableHead>Person</TableHead>
          <TableHead>Department</TableHead>
          <TableHead numeric>Risk score</TableHead>
          <TableHead>Outcome</TableHead>
          <TableHead>Recorded</TableHead>
          {canRecord ? <TableHead>Record</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {simulation.targets.map((target) => (
          <TableRow key={target.id}>
            <TableCell>
              <Link
                to={`/employees/${target.employee_id}`}
                className="text-fg hover:text-brand hover:underline"
              >
                {target.employee_name}
              </Link>
            </TableCell>
            <TableCell>{target.department || '—'}</TableCell>
            <TableCell numeric>
              {target.risk_score === null ? (
                <span className="text-fg-faint">—</span>
              ) : (
                <span title={riskBandLabel(target.risk_score)}>{num(target.risk_score)}</span>
              )}
            </TableCell>
            <TableCell>
              <Badge status={target.outcome} size="sm" dot />
            </TableCell>
            <TableCell>
              {target.outcome_at ? (
                <span title={formatDateTime(target.outcome_at)}>{timeAgo(target.outcome_at)}</span>
              ) : (
                <span className="text-fg-faint">Not yet</span>
              )}
            </TableCell>
            {canRecord ? (
              <TableCell>
                {target.outcome !== 'pending' ? (
                  <span className="text-xs text-fg-faint">Already recorded</span>
                ) : !active ? (
                  <span className="text-xs text-fg-faint">
                    {simulation.status === 'draft' ? 'Launch first' : 'Campaign closed'}
                  </span>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        loading={pendingTargetId === target.id}
                        icon={<ChevronDown className="size-3.5" aria-hidden="true" />}
                      >
                        Outcome
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{target.employee_name}</DropdownMenuLabel>
                      {RECORDABLE.map((option) => (
                        <DropdownMenuItem
                          key={option.value}
                          onSelect={() =>
                            record.mutate({
                              simId: simulation.id,
                              targetId: target.id,
                              outcome: option.value,
                            })
                          }
                        >
                          <span className="flex flex-col">
                            <span>{option.label}</span>
                            <span className="text-xs text-fg-faint">{option.note}</span>
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
