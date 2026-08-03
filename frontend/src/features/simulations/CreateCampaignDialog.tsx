/**
 * Building a campaign.
 *
 * Two things this dialog refuses to do.
 *
 * - **It will not create a campaign whose lure nobody looked at.** A lure
 *   source is required and its text is rendered before the create button is
 *   reachable. The differentiator of this product is that the lure can be a
 *   *real analyzed threat*, which is also exactly why it must be read first.
 *
 * - **It does not offer a channel the server would ignore.** The API derives
 *   the channel from the chosen lure (template channel, or the threat's
 *   artifact type). Offering an editable channel here would let an analyst pick
 *   "SMS" and get an email campaign, so the field states what will be stored
 *   and says where the value comes from.
 */

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
import {
  Button,
  Dialog,
  Input,
  Select,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
} from '../../components/ui'
import type { RiskBand, SimTemplate, Threat } from '../../domain/types'
import { useCreateSimulation } from '../../lib/api/mutations'
import {
  useDepartments,
  useEmployees,
  useSimTemplates,
  useThreats,
} from '../../lib/api/queries'
import { channelLabel, humanise, truncate } from '../../lib/format'
import { AudienceSelector } from './AudienceSelector'
import { resolveAudience } from './audience'
import { LurePreview } from './LurePreview'

type SourceKind = 'template' | 'threat'

export interface CreateCampaignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** The API truncates a threat artifact to 600 characters when it stores a lure. */
const THREAT_LURE_LIMIT = 600

function templateOf(templates: SimTemplate[] | undefined, id: string): SimTemplate | null {
  return templates?.find((template) => template.id === id) ?? null
}

function threatOf(threats: Threat[] | undefined, id: string): Threat | null {
  return threats?.find((threat) => String(threat.id) === id) ?? null
}

export function CreateCampaignDialog({ open, onOpenChange }: CreateCampaignDialogProps) {
  const navigate = useNavigate()
  const toast = useToast()

  const templates = useSimTemplates()
  const threats = useThreats()
  const departments = useDepartments()
  const employees = useEmployees()
  const create = useCreateSimulation()

  const [name, setName] = useState('')
  const [sourceKind, setSourceKind] = useState<SourceKind>('template')
  const [templateId, setTemplateId] = useState('')
  const [threatId, setThreatId] = useState('')
  const [departmentIds, setDepartmentIds] = useState<number[]>([])
  const [bands, setBands] = useState<RiskBand[]>([])
  const [submitted, setSubmitted] = useState(false)

  // Only an analyzed threat can be a lure: without a verdict there is nothing
  // to say the artifact is safe to reuse, or what it teaches.
  const analyzedThreats = useMemo(
    () => (threats.data ?? []).filter((threat) => threat.verdict !== null),
    [threats.data],
  )

  const template = templateOf(templates.data, templateId)
  const threat = threatOf(analyzedThreats, threatId)

  const lure =
    sourceKind === 'template'
      ? { text: template?.sample_lure ?? '', channel: template?.channel ?? null, label: template?.name ?? '' }
      : {
          text: threat ? threat.artifact_ref.slice(0, THREAT_LURE_LIMIT) : '',
          channel: threat?.artifact_type ?? null,
          label: threat?.title ?? '',
        }

  const audience = useMemo(
    () => resolveAudience(employees.data ?? [], departmentIds, bands),
    [employees.data, departmentIds, bands],
  )

  const nameError = submitted && !name.trim() ? 'Give the campaign a name.' : null
  const lureError = submitted && !lure.text ? 'Choose a lure source.' : null
  const audienceError = submitted && audience.all.length === 0 ? 'Select at least one person.' : null

  function reset() {
    setName('')
    setSourceKind('template')
    setTemplateId('')
    setThreatId('')
    setDepartmentIds([])
    setBands([])
    setSubmitted(false)
    create.reset()
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  function handleSubmit() {
    setSubmitted(true)
    if (!name.trim() || !lure.text || audience.all.length === 0) return

    create.mutate(
      {
        name: name.trim(),
        lure_template_id: sourceKind === 'template' ? templateId : null,
        template_threat_id: sourceKind === 'threat' && threat ? threat.id : null,
        // Sent for completeness; the server overrides it from the lure source.
        channel: lure.channel ?? 'email',
        target_department_ids: departmentIds,
        // Band-selected people are sent as explicit ids — the API has no
        // concept of a risk band, and inventing one client-side that the server
        // could not reproduce would make the campaign unauditable.
        target_employee_ids: audience.fromBands,
      },
      {
        onSuccess: (simulation) => {
          toast.show({
            title: 'Campaign created as a draft',
            description: 'Nothing is delivered until you launch it.',
            tone: 'success',
          })
          handleOpenChange(false)
          navigate(`/simulations/${simulation.id}`)
        },
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      size="lg"
      title="New simulation campaign"
      description="Pick a lure, name the campaign, and choose who receives it. It is created as a draft."
      footer={
        <>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" loading={create.isPending} onClick={handleSubmit}>
            Create draft
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <Input
          label="Campaign name"
          required
          value={name}
          error={nameError}
          onChange={(event) => setName(event.target.value)}
          hint="How this campaign appears in the programme list and in the audit trail."
        />

        <div>
          <p className="text-sm font-medium text-fg-muted">Lure source</p>
          <Tabs
            value={sourceKind}
            onValueChange={(value) => setSourceKind(value as SourceKind)}
            className="mt-2"
          >
            <TabsList>
              <TabsTrigger value="template">Prebuilt template</TabsTrigger>
              <TabsTrigger value="threat">Real analyzed threat</TabsTrigger>
            </TabsList>

            <TabsContent value="template">
              <Select
                label="Template"
                labelHidden
                placeholder={templates.isLoading ? 'Loading templates…' : 'Choose a template'}
                value={templateId}
                onValueChange={setTemplateId}
                disabled={templates.isLoading || (templates.data?.length ?? 0) === 0}
                options={(templates.data ?? []).map((item) => ({
                  value: item.id,
                  label: `${item.name} · ${channelLabel(item.channel)} · ${humanise(item.difficulty)}`,
                }))}
              />
              {template ? (
                <p className="mt-2 text-sm text-fg-subtle">{template.description}</p>
              ) : null}
            </TabsContent>

            <TabsContent value="threat">
              <Select
                label="Analyzed threat"
                labelHidden
                placeholder={
                  threats.isLoading
                    ? 'Loading threats…'
                    : analyzedThreats.length === 0
                      ? 'No analyzed threat is available'
                      : 'Choose a threat'
                }
                value={threatId}
                onValueChange={setThreatId}
                disabled={threats.isLoading || analyzedThreats.length === 0}
                options={analyzedThreats.map((item) => ({
                  value: String(item.id),
                  label: `${truncate(item.title, 60)} · ${humanise(item.verdict)}`,
                }))}
              />
              <p className="mt-2 text-xs text-fg-faint">
                Only threats the sandbox has returned a verdict on can be reused as a lure. The
                stored preview is the first {THREAT_LURE_LIMIT} characters of the artifact.
              </p>
            </TabsContent>
          </Tabs>
        </div>

        <div>
          <Select
            label="Channel"
            options={[
              {
                value: lure.channel ?? 'unset',
                label: lure.channel ? channelLabel(lure.channel) : 'Set by the lure source',
              },
            ]}
            value={lure.channel ?? 'unset'}
            disabled
            hint="Derived by the server from the lure source. It cannot be set independently."
          />
        </div>

        <div>
          <p className="text-sm font-medium text-fg-muted">Lure preview</p>
          <div className="mt-2">
            <LurePreview
              value={lure.text}
              channel={lure.channel}
              sourceLabel={lure.label || 'Nothing selected'}
              sourceHref={sourceKind === 'threat' && threat ? `/threats/${threat.id}` : undefined}
              emptyMessage="Choose a lure source above to see exactly what will be stored on this campaign."
            />
          </div>
          {lureError ? (
            <p role="alert" className="mt-2 text-xs text-critical">
              {lureError}
            </p>
          ) : null}
        </div>

        <AudienceSelector
          departments={departments.data ?? []}
          employees={employees.data ?? []}
          departmentIds={departmentIds}
          onDepartmentIdsChange={setDepartmentIds}
          bands={bands}
          onBandsChange={setBands}
          selectedCount={audience.all.length}
          loading={employees.isLoading || departments.isLoading}
          error={audienceError}
        />

        <p className="text-xs text-fg-faint">
          Creating a campaign records it and its targets. This deployment has no mail or SMS
          gateway wired in, so nothing is actually sent — outcomes are recorded against targets by
          an analyst.
        </p>

        {create.error ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-control border border-critical/35 bg-critical/10 px-3 py-2 text-sm text-critical"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>The campaign was not created. {create.error.message}</span>
          </p>
        ) : null}
      </div>
    </Dialog>
  )
}
