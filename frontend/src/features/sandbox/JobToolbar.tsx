/**
 * Taking the report somewhere else, and running it again.
 *
 * The exports are fetched through the API client rather than opened in a new
 * tab: every sandbox route is behind a bearer token, and `window.open` would
 * send the browser to a 401 with no explanation. The bytes come back through
 * the same error handling as everything else, so a failed export says so.
 */

import { useState } from 'react'
import { FileJson, FileText, RotateCw, Share2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { SandboxJobDetail } from '../../domain/types'
import { api, ApiError } from '../../lib/api/client'
import { endpoints } from '../../lib/api/endpoints'
import { useSandboxReanalyze } from '../../lib/api/mutations'
import { Button, useToast } from '../../components/ui'
import { exportStem, saveBlob } from './shared'

export interface JobToolbarProps {
  job: SandboxJobDetail
}

type ExportKind = 'json' | 'stix' | 'pdf'

const EXPORTS: { kind: ExportKind; label: string; suffix: string; path: (id: string) => string }[] = [
  { kind: 'json', label: 'JSON report', suffix: '.json', path: endpoints.sandbox.exportJson },
  { kind: 'stix', label: 'STIX bundle', suffix: '.stix.json', path: endpoints.sandbox.exportStix },
  { kind: 'pdf', label: 'PDF report', suffix: '.pdf', path: endpoints.sandbox.exportPdf },
]

const ICONS: Record<ExportKind, LucideIcon> = {
  json: FileJson,
  stix: Share2,
  pdf: FileText,
}

export function JobToolbar({ job }: JobToolbarProps) {
  const toast = useToast()
  const [pending, setPending] = useState<ExportKind | null>(null)
  const reanalyze = useSandboxReanalyze({
    onSuccess: () =>
      toast.show({
        title: 'Re-analysis queued',
        description: 'The same quarantined bytes are being analysed again.',
        tone: 'success',
      }),
    onError: (error) =>
      toast.show({ title: 'Could not re-analyse', description: error.message, tone: 'error' }),
  })

  async function download(kind: ExportKind, path: string, suffix: string, label: string) {
    setPending(kind)
    try {
      const blob = await api.blob(path)
      saveBlob(blob, `${exportStem(job)}${suffix}`)
    } catch (error) {
      toast.show({
        title: `Could not export the ${label}`,
        description: error instanceof ApiError ? error.message : 'The download did not complete.',
        tone: 'error',
      })
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {EXPORTS.map(({ kind, label, suffix, path }) => {
        const Icon = ICONS[kind]
        return (
          <Button
            key={kind}
            variant="secondary"
            size="sm"
            icon={<Icon className="size-4" aria-hidden="true" strokeWidth={1.75} />}
            loading={pending === kind}
            disabled={pending !== null && pending !== kind}
            onClick={() => void download(kind, path(job.public_id), suffix, label)}
          >
            {label}
          </Button>
        )
      })}

      <Button
        variant="outline"
        size="sm"
        icon={<RotateCw className="size-4" aria-hidden="true" strokeWidth={1.75} />}
        loading={reanalyze.isPending}
        disabled={job.status === 'running'}
        onClick={() => reanalyze.mutate(job.public_id)}
      >
        Re-analyse
      </Button>

      <span aria-live="polite" className="sr-only">
        {pending ? 'Preparing the export' : ''}
      </span>
    </div>
  )
}
