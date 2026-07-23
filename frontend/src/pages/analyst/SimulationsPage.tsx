import { useEffect, useState } from 'react'
import { CircleSlash, Inbox, MousePointerClick, Plus, Rocket, ShieldCheck, Wand2 } from 'lucide-react'
import { api } from '../../lib/api'
import { usePoll } from '../../lib/usePoll'
import { useCapabilities } from '../../lib/useCapabilities'
import type { DepartmentRisk, SimTemplate, Simulation, SimulationDetail, Threat } from '../../lib/types'
import {
  Button,
  Callout,
  Chip,
  ChoiceRow,
  CodeBlock,
  Drawer,
  Empty,
  GroupLabel,
  Input,
  LoadState,
  Metric,
  Modal,
  PageHeader,
  Panel,
  RiskMeter,
  Select,
  Status,
  TD,
  TH,
  Table,
  Tabs,
  channelLabel,
  cx,
  pct,
  timeAgo,
} from '../../components/ui'

export function SimulationsPage() {
  const { data: sims, error, refresh } = usePoll<Simulation[]>(() => api.get('/api/simulations'), 4000)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div className="rise space-y-6">
      <PageHeader
        title="Simulations"
        lede={
          <>
            Drills built from <span className="text-c1">real analyzed threats</span>, not canned templates. Every
            outcome feeds the risk engine.
          </>
        }
        actions={
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            <Plus size={15} aria-hidden /> New campaign
          </Button>
        }
      />

      {!sims ? (
        <LoadState error={error} label="Loading campaigns" onRetry={refresh} />
      ) : (
        <Panel title="Campaigns" actions={<span className="text-sm text-c3">{sims.length}</span>}>
          {sims.length === 0 ? (
            <Empty icon={<Inbox size={20} aria-hidden />}>
              No campaigns yet. Create one from a real analyzed threat.
            </Empty>
          ) : (
            <ul className="divide-hair">
              {sims.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    className="-mx-2 flex w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-control px-2 py-2.5 text-left transition-colors hover:bg-raised"
                  >
                    <span className="text-xs w-9 shrink-0 font-mono text-c3">#{s.id}</span>
                    <span className="text-body min-w-48 flex-1 truncate font-medium">{s.name}</span>
                    <Chip>{channelLabel(s.channel)}</Chip>
                    {s.template_threat_id !== null && (
                      <Chip tone="brand">From real threat #{s.template_threat_id}</Chip>
                    )}
                    <Status value={s.status} />
                    <span className="text-xs w-28 shrink-0 text-right text-c3">
                      {s.launched_at ? `launched ${timeAgo(s.launched_at)}` : `created ${timeAgo(s.created_at)}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {selectedId !== null && (
        <SimDrawer id={selectedId} onClose={() => setSelectedId(null)} onChanged={refresh} />
      )}
      {showCreate && (
        <CreateSimModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            setShowCreate(false)
            void refresh()
            setSelectedId(id)
          }}
        />
      )}
    </div>
  )
}

/* --- one campaign ---------------------------------------------------------- */

function SimDrawer({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: () => Promise<void> }) {
  const { data: sim, error: loadError, refresh } = usePoll<SimulationDetail>(
    () => api.get(`/api/simulations/${id}`),
    3000,
    [id],
  )
  const caps = useCapabilities()
  const [busy, setBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const act = async (action: string) => {
    setBusy(action)
    setActionError(null)
    try {
      await api.post(`/api/simulations/${id}/${action}`)
      await refresh()
      await onChanged()
    } catch (e) {
      // Without this the failure was a silent no-op plus an unhandled rejection:
      // the drawer just sat there and the analyst assumed the click worked.
      setActionError(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Drawer title={sim?.name ?? 'Simulation'} width="max-w-2xl" onClose={onClose}>
      {!sim ? (
        <LoadState error={loadError} label="Loading campaign" onRetry={refresh} />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Status value={sim.status} />
            <Chip>{channelLabel(sim.channel)}</Chip>
            {sim.template_threat_id !== null && (
              <Chip tone="brand">Built from real threat #{sim.template_threat_id}</Chip>
            )}
            {sim.lure_template_id && <Chip>Prebuilt lure</Chip>}
          </div>

          {sim.lure_preview && (
            <div>
              <span className="label mb-1.5 block text-c3">Lure</span>
              <CodeBlock maxHeight={140}>{sim.lure_preview}</CodeBlock>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric size="sm" label="Targets" value={sim.stats.targets} />
            <Metric size="sm" label="Resolved" value={sim.stats.resolved} />
            <Metric
              size="sm"
              label="Click rate"
              value={pct(sim.stats.click_rate)}
              tone={sim.stats.click_rate !== null && sim.stats.click_rate > 0.3 ? 'danger' : 'neutral'}
            />
            <Metric
              size="sm"
              label="Report rate"
              value={pct(sim.stats.report_rate)}
              tone={sim.stats.report_rate !== null ? 'success' : 'neutral'}
            />
          </div>

          {(sim.status === 'draft' || sim.status === 'active') && (
            <div className="flex flex-wrap gap-2">
              {sim.status === 'draft' && (
                <Button variant="primary" busy={busy === 'launch'} onClick={() => void act('launch')}>
                  <Rocket size={14} aria-hidden /> Launch campaign
                </Button>
              )}
              {sim.status === 'active' && (
                <>
                  {/* Synthetic outcomes exist only in the exhibition build —
                      in production the route is not registered at all. */}
                  {caps.demo_mode && (
                    <Button busy={busy === 'auto-outcomes'} onClick={() => void act('auto-outcomes')}>
                      <Wand2 size={14} aria-hidden /> Simulate outcomes (demo)
                    </Button>
                  )}
                  <Button variant="ghost" busy={busy === 'complete'} onClick={() => void act('complete')}>
                    Close campaign
                  </Button>
                </>
              )}
            </div>
          )}

          <div aria-live="polite">{actionError && <Callout tone="danger">{actionError}</Callout>}</div>

          <div>
            <GroupLabel right={<span className="text-xs text-c3">outcomes feed the risk engine</span>}>
              Per-target outcomes
            </GroupLabel>
            {sim.targets.length === 0 ? (
              <Empty>No one has been targeted by this campaign yet.</Empty>
            ) : (
              <Table minWidth={520}>
                <thead>
                  <tr>
                    <TH>Person</TH>
                    <TH>Department</TH>
                    <TH>Risk</TH>
                    <TH numeric>Outcome</TH>
                  </tr>
                </thead>
                <tbody>
                  {sim.targets.map((t) => (
                    <tr key={t.id}>
                      <TD>
                        <span className="text-sm block truncate font-medium">{t.employee_name}</span>
                      </TD>
                      <TD muted>
                        <span className="text-sm block truncate">{t.department}</span>
                      </TD>
                      <TD>
                        {t.risk_score !== null ? (
                          <RiskMeter score={t.risk_score} />
                        ) : (
                          <span className="text-sm text-c3">not scored</span>
                        )}
                      </TD>
                      <TD numeric>
                        {sim.status === 'active' && t.outcome === 'pending' ? (
                          <OutcomeRecorder
                            simId={sim.id}
                            targetId={t.id}
                            employeeName={t.employee_name}
                            refresh={refresh}
                          />
                        ) : (
                          <Status value={t.outcome} />
                        )}
                      </TD>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        </div>
      )}
    </Drawer>
  )
}

/**
 * The only way an analyst records what a target actually did.
 *
 * Three identical grey pills made "clicked" and "reported" — opposite outcomes,
 * one of which raises a risk score and one of which lowers it — indistinguishable
 * until after the click. Each option now carries its own word, icon and tone, and
 * the trio is named so a screen reader knows whose outcome it is recording.
 */
const OUTCOMES = [
  { value: 'clicked', label: 'Clicked', icon: MousePointerClick, cls: 'border-danger/45 text-danger hover:bg-danger/10' },
  { value: 'reported', label: 'Reported', icon: ShieldCheck, cls: 'border-success/40 text-success hover:bg-success/10' },
  { value: 'ignored', label: 'Ignored', icon: CircleSlash, cls: 'border-line text-c2 hover:bg-raised hover:text-c1' },
] as const

function OutcomeRecorder({
  simId,
  targetId,
  employeeName,
  refresh,
}: {
  simId: number
  targetId: number
  employeeName: string
  refresh: () => Promise<void>
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const record = async (outcome: string) => {
    setBusy(outcome)
    setError(null)
    try {
      await api.post(`/api/simulations/${simId}/targets/${targetId}/outcome`, { outcome })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not record that outcome')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div role="group" aria-label={`Record outcome for ${employeeName}`} className="flex justify-end gap-1">
        {OUTCOMES.map((o) => {
          const Icon = o.icon
          return (
            <button
              key={o.value}
              type="button"
              disabled={busy !== null}
              aria-busy={busy === o.value || undefined}
              onClick={() => void record(o.value)}
              className={cx(
                'text-xs inline-flex items-center gap-1 whitespace-nowrap rounded-chip border px-1.5 py-0.5 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                o.cls,
              )}
            >
              <Icon size={12} aria-hidden /> {o.label}
            </button>
          )
        })}
      </div>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  )
}

/* --- creating a campaign --------------------------------------------------- */

const LURE_SOURCES = [
  { key: 'prebuilt' as const, label: 'Prebuilt lure' },
  { key: 'real' as const, label: 'Real threat' },
  { key: 'generic' as const, label: 'Generic' },
]

const GENERIC_CHANNELS = ['email', 'sms', 'qr', 'chat']

function CreateSimModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) {
  const [name, setName] = useState('')
  const [channel, setChannel] = useState('email')
  const [source, setSource] = useState<'prebuilt' | 'real' | 'generic'>('prebuilt')
  const [lureTemplateId, setLureTemplateId] = useState<string>('')
  const [threatId, setThreatId] = useState<number | ''>('')
  const [deptIds, setDeptIds] = useState<number[]>([])
  const [threats, setThreats] = useState<Threat[]>([])
  const [templates, setTemplates] = useState<SimTemplate[]>([])
  const [departments, setDepartments] = useState<DepartmentRisk[]>([])
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Without a catch these three failed silently and the pickers just stayed
    // empty, which reads as "there is nothing to choose" rather than "the API
    // is down".
    const fail = (e: unknown) => setOptionsError(e instanceof Error ? e.message : 'Could not load the lure sources')
    void api
      .get<Threat[]>('/api/threats')
      .then((list) => setThreats(list.filter((t) => t.verdict && t.verdict !== 'benign')))
      .catch(fail)
    void api.get<SimTemplate[]>('/api/simulations/templates').then(setTemplates).catch(fail)
    void api.get<DepartmentRisk[]>('/api/departments').then(setDepartments).catch(fail)
  }, [])

  const toggleDept = (id: number) =>
    setDeptIds((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]))

  const selectedTemplate = templates.find((t) => t.id === lureTemplateId)
  const selectedThreat = threats.find((t) => t.id === threatId)
  const previewLure =
    source === 'prebuilt'
      ? selectedTemplate?.sample_lure
      : source === 'real'
        ? selectedThreat?.artifact_ref
        : null

  const create = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await api.post<{ id: number }>('/api/simulations', {
        name,
        channel,
        lure_template_id: source === 'prebuilt' && lureTemplateId ? lureTemplateId : null,
        template_threat_id: source === 'real' && threatId !== '' ? threatId : null,
        target_department_ids: deptIds,
        target_employee_ids: [],
      })
      onCreated(res.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create')
      setBusy(false)
    }
  }

  const canCreate =
    name.trim() &&
    deptIds.length > 0 &&
    (source === 'generic' ||
      (source === 'prebuilt' && lureTemplateId) ||
      (source === 'real' && threatId !== ''))

  return (
    <Modal title="New simulation campaign" size="lg" onClose={onClose}>
      <div className="space-y-4">
        <Input
          label="Campaign name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Q3 invoice lure — Finance"
        />

        <div>
          <span className="label mb-1.5 block text-c3">Lure source</span>
          <Tabs label="Lure source" tabs={LURE_SOURCES} value={source} onChange={setSource} fill />
        </div>

        <div aria-live="polite">
          {optionsError && <Callout tone="warning">{optionsError}</Callout>}
        </div>

        {source === 'prebuilt' && (
          <div role="group" aria-label="Choose a lure">
            <span className="label mb-1.5 block text-c3">Choose a lure</span>
            <div className="space-y-1.5">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={lureTemplateId === t.id}
                  onClick={() => {
                    setLureTemplateId(t.id)
                    setChannel(t.channel)
                  }}
                  className={cx(
                    'block w-full rounded-control border p-2.5 text-left transition-colors',
                    lureTemplateId === t.id
                      ? 'border-brand bg-brand/8'
                      : 'border-hair bg-raised hover:border-line-strong',
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{t.name}</span>
                    <Chip>{channelLabel(t.channel)}</Chip>
                    <Chip>{t.difficulty} difficulty</Chip>
                  </div>
                  <p className="text-xs mt-1 text-c2">{t.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {source === 'real' && (
          <Select
            label="Real analyzed threat"
            hint="Only threats the sandbox judged suspicious or malicious. The drill trains on the attack that actually arrived."
            value={threatId}
            onChange={(e) => {
              const v = e.target.value === '' ? '' : Number(e.target.value)
              setThreatId(v)
              const th = threats.find((t) => t.id === v)
              if (th) setChannel(th.artifact_type)
            }}
          >
            <option value="">Select a threat</option>
            {threats.map((t) => (
              <option key={t.id} value={t.id}>
                #{t.id} {t.title} ({t.threat_type ?? 'unclassified'})
              </option>
            ))}
          </Select>
        )}

        {source === 'generic' && (
          <Select label="Channel" value={channel} onChange={(e) => setChannel(e.target.value)}>
            {GENERIC_CHANNELS.map((c) => (
              <option key={c} value={c}>
                {channelLabel(c)}
              </option>
            ))}
          </Select>
        )}

        {previewLure && (
          <div>
            <span className="label mb-1.5 block text-c3">Lure preview · {channelLabel(channel)}</span>
            <CodeBlock maxHeight={120}>{previewLure}</CodeBlock>
          </div>
        )}

        <ChoiceRow
          label="Target departments"
          multiple
          options={departments.map((d) => ({ value: d.id, label: d.name }))}
          value={deptIds}
          onChange={toggleDept}
        />

        <div aria-live="polite">{error && <Callout tone="danger">{error}</Callout>}</div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void create()} busy={busy} disabled={!canCreate}>
            Create campaign
          </Button>
        </div>
      </div>
    </Modal>
  )
}
