/**
 * The exports this deployment genuinely produces.
 *
 * Three real routes return real bytes: the full analysis as JSON, the same
 * findings as a STIX 2.1 bundle, and a rendered PDF. They are fetched through
 * the API client rather than opened in a tab — every sandbox route is behind a
 * bearer token, and `window.open` would send the browser to a 401 with no
 * explanation.
 *
 * Only settled jobs are offered. Exporting a run that is still queued would
 * produce a document asserting a verdict nothing had reached yet.
 */

import { useT } from '../../lib/i18n'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FileJson, FileText, Share2, type LucideIcon } from 'lucide-react'
import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, useToast } from '../../components/ui'
import type { SandboxJobSummary } from '../../domain/types'
import { api, ApiError } from '../../lib/api/client'
import { endpoints } from '../../lib/api/endpoints'
import { bytes, formatDateTime, truncate } from '../../lib/format'
import { exportStem, saveBlob } from '../sandbox/shared'

type ExportKind = 'json' | 'stix' | 'pdf'

const EXPORTS: {
  kind: ExportKind
  label: string
  suffix: string
  icon: LucideIcon
  path: (publicId: string) => string
}[] = [
  { kind: 'json', label: 'JSON', suffix: '.json', icon: FileJson, path: endpoints.sandbox.exportJson },
  { kind: 'stix', label: 'STIX', suffix: '.stix.json', icon: Share2, path: endpoints.sandbox.exportStix },
  { kind: 'pdf', label: 'PDF', suffix: '.pdf', icon: FileText, path: endpoints.sandbox.exportPdf },
]

export interface SandboxExportTableProps {
  jobs: SandboxJobSummary[]
}

export function SandboxExportTable({ jobs }: SandboxExportTableProps) {
  const t = useT()
  const toast = useToast()
  const [pending, setPending] = useState<string | null>(null)

  async function download(job: SandboxJobSummary, kind: ExportKind) {
    const spec = EXPORTS.find((candidate) => candidate.kind === kind)
    if (!spec) return
    const token = `${job.public_id}:${kind}`
    setPending(token)
    try {
      const blob = await api.blob(spec.path(job.public_id))
      saveBlob(blob, `${exportStem(job)}${spec.suffix}`)
    } catch (error) {
      toast.show({
        title: `Could not export the ${spec.label} report`,
        description:
          error instanceof ApiError ? error.message : t('p.the-download-did-not-complete'),
        tone: 'error',
      })
    } finally {
      setPending(null)
    }
  }

  return (
    <>
      <Table containerClassName="max-h-[32rem]">
        <TableHeader>
          <TableRow>
            <TableHead>Artifact</TableHead>
            <TableHead>Verdict</TableHead>
            <TableHead numeric>Size</TableHead>
            <TableHead>Analysed</TableHead>
            <TableHead>Export</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.public_id}>
              <TableCell>
                <Link
                  to={`/sandbox/${job.public_id}`}
                  className="text-fg underline-offset-4 hover:underline"
                >
                  {truncate(job.original_name || job.submitted_url || job.public_id, 48)}
                </Link>
                <span className="tech mt-0.5 block text-xs text-fg-faint">
                  {job.sha256 ? job.sha256.slice(0, 16) : job.public_id}
                </span>
              </TableCell>
              <TableCell>
                <Badge status={job.risk_level} size="sm" dot />
              </TableCell>
              <TableCell numeric>{bytes(job.size_bytes)}</TableCell>
              <TableCell className="whitespace-nowrap">
                {formatDateTime(job.completed_at ?? job.created_at)}
              </TableCell>
              <TableCell>
                <span className="flex flex-wrap gap-1.5">
                  {EXPORTS.map(({ kind, label, icon: Icon }) => (
                    <Button
                      key={kind}
                      variant="secondary"
                      size="sm"
                      icon={<Icon className="size-3.5" aria-hidden="true" strokeWidth={1.75} />}
                      loading={pending === `${job.public_id}:${kind}`}
                      disabled={pending !== null && pending !== `${job.public_id}:${kind}`}
                      onClick={() => void download(job, kind)}
                      aria-label={`Download the ${label} report for ${job.original_name || job.public_id}`}
                    >
                      {label}
                    </Button>
                  ))}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <span aria-live="polite" className="sr-only">
        {pending ? 'Preparing the export' : ''}
      </span>
    </>
  )
}
