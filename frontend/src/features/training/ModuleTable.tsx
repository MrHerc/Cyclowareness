/**
 * The module list.
 *
 * Provenance sits on every row rather than on the detail page alone. An analyst
 * scanning a review queue is deciding what to open, and "written by a model"
 * versus "produced by a fixed template" changes that decision — a template
 * module needs its wording checked against the threat, a generated one needs
 * its claims checked at all.
 */

import { Link } from 'react-router-dom'
import { AIProvenanceBadge } from '../../components/data'
import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui'
import { provenanceOf, type Threat, type TrainingModule } from '../../domain/types'
import { channelLabel, formatDate, num, truncate } from '../../lib/format'

export interface ModuleTableProps {
  modules: TrainingModule[]
  /** Threats by id, so a row can name the artifact it came from. */
  threats: Map<number, Threat>
  /** `Capabilities.ai_provider === 'anthropic'`, or undefined while unknown. */
  modelConnected: boolean | undefined
}

export function ModuleTable({ modules, threats, modelConnected }: ModuleTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Module</TableHead>
          <TableHead>Generated from</TableHead>
          <TableHead>Provenance</TableHead>
          <TableHead>Channel</TableHead>
          <TableHead numeric>Questions</TableHead>
          <TableHead numeric>Minutes</TableHead>
          <TableHead>Review state</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {modules.map((module) => {
          const threat = module.threat_id === null ? null : threats.get(module.threat_id) ?? null
          return (
            <TableRow key={module.id}>
              <TableCell className="max-w-xs">
                <Link
                  to={`/training/${module.id}`}
                  className="text-fg hover:text-brand hover:underline"
                >
                  {module.title}
                </Link>
                <p className="mt-0.5 text-xs text-fg-faint">
                  {truncate(module.description, 90)}
                </p>
              </TableCell>
              <TableCell>
                {module.threat_id === null ? (
                  <span className="text-fg-faint">Not from a threat</span>
                ) : (
                  <Link
                    to={`/threats/${module.threat_id}`}
                    className="text-brand hover:underline"
                  >
                    {threat ? truncate(threat.title, 46) : `Threat #${module.threat_id}`}
                  </Link>
                )}
              </TableCell>
              <TableCell>
                <AIProvenanceBadge
                  provenance={provenanceOf(module.generation_source, {
                    approved: module.status === 'approved',
                  })}
                  generationSource={module.generation_source}
                  modelConnected={modelConnected}
                />
              </TableCell>
              <TableCell>{channelLabel(module.channel)}</TableCell>
              <TableCell numeric>{num(module.quiz?.length ?? 0)}</TableCell>
              <TableCell numeric>
                {module.est_minutes > 0 ? num(module.est_minutes) : '—'}
              </TableCell>
              <TableCell>
                <Badge status={module.status} size="sm" dot />
              </TableCell>
              <TableCell>{formatDate(module.created_at)}</TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
