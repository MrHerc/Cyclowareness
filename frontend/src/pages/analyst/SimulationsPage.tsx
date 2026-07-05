import { useEffect, useState } from 'react'
import { Plus, Rocket, Wand2, X } from 'lucide-react'
import { api } from '../../lib/api'
import { usePoll } from '../../lib/usePoll'
import type { DepartmentRisk, SimTemplate, Simulation, SimulationDetail, Threat } from '../../lib/types'
import { Badge, Button, Card, EmptyState, SectionTitle, Spinner, channelLabel, cx, pct, timeAgo } from '../../components/ui'

export function SimulationsPage() {
  const { data: sims, refresh } = usePoll<Simulation[]>(() => api.get('/api/simulations'), 4000)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div className="fade-in space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Phishing Simulations</h1>
          <p className="text-sm text-muted">
            Drills built from <span className="text-accent">real analyzed threats</span> — not canned templates. Outcomes feed the risk engine.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={15} /> New campaign
        </Button>
      </div>

      {!sims ? (
        <Spinner />
      ) : sims.length === 0 ? (
        <EmptyState>No campaigns yet — create one from a real analyzed threat.</EmptyState>
      ) : (
        <div className="space-y-2">
          {sims.map((s) => (
            <Card
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className="flex flex-wrap items-center gap-3 px-4 py-3"
            >
              <span className="font-mono text-[11px] text-faint">#{s.id}</span>
              <span className="min-w-40 flex-1 truncate text-sm font-medium">{s.name}</span>
              <Badge value={s.channel} />
              {s.template_threat_id && (
                <span className="rounded-md border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] text-accent">
                  from real threat #{s.template_threat_id}
                </span>
              )}
              <Badge value={s.status} />
              <span className="text-[11px] text-faint">
                {s.launched_at ? `launched ${timeAgo(s.launched_at)}` : `created ${timeAgo(s.created_at)}`}
              </span>
            </Card>
          ))}
        </div>
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

function SimDrawer({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: () => Promise<void> }) {
  const { data: sim, refresh } = usePoll<SimulationDetail>(() => api.get(`/api/simulations/${id}`), 3000, [id])
  const [busy, setBusy] = useState<string | null>(null)

  const act = async (action: string) => {
    setBusy(action)
    try {
      await api.post(`/api/simulations/${id}/${action}`)
      await refresh()
      await onChanged()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div
        className="h-full w-full max-w-2xl overflow-y-auto border-l border-border bg-surface p-6 shadow-2xl fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {!sim ? (
          <Spinner />
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">{sim.name}</h2>
                <div className="mt-1 flex items-center gap-2">
                  <Badge value={sim.status} />
                  <Badge value={sim.channel} label={channelLabel(sim.channel)} />
                  {sim.template_threat_id && (
                    <span className="text-xs text-accent">built from real threat #{sim.template_threat_id}</span>
                  )}
                  {sim.lure_template_id && <span className="text-xs text-accent">prebuilt lure</span>}
                </div>
              </div>
              <button onClick={onClose} className="text-muted hover:text-ink">
                <X size={18} />
              </button>
            </div>

            {sim.lure_preview && (
              <pre className="mt-3 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-bg p-2.5 font-mono text-[11px] leading-relaxed text-muted">
                {sim.lure_preview}
              </pre>
            )}

            <div className="mt-4 grid grid-cols-4 gap-2">
              <MiniStat label="Targets" value={String(sim.stats.targets)} />
              <MiniStat label="Resolved" value={String(sim.stats.resolved)} />
              <MiniStat label="Click rate" value={pct(sim.stats.click_rate)} tone={sim.stats.click_rate && sim.stats.click_rate > 0.3 ? 'bad' : undefined} />
              <MiniStat label="Report rate" value={pct(sim.stats.report_rate)} tone="good" />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {sim.status === 'draft' && (
                <Button busy={busy === 'launch'} onClick={() => void act('launch')}>
                  <Rocket size={14} /> Launch campaign
                </Button>
              )}
              {sim.status === 'active' && (
                <>
                  <Button variant="subtle" busy={busy === 'auto-outcomes'} onClick={() => void act('auto-outcomes')}>
                    <Wand2 size={14} /> Simulate outcomes (demo)
                  </Button>
                  <Button variant="ghost" busy={busy === 'complete'} onClick={() => void act('complete')}>
                    Close campaign
                  </Button>
                </>
              )}
            </div>

            <div className="mt-5">
              <SectionTitle>Per-target outcomes → risk engine</SectionTitle>
              <div className="space-y-1.5">
                {sim.targets.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs">
                    <span className="w-36 truncate font-medium">{t.employee_name}</span>
                    <span className="w-24 truncate text-faint">{t.department}</span>
                    {t.risk_score !== null && (
                      <span className="tabular-nums text-muted">risk {t.risk_score.toFixed(0)}</span>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                      {sim.status === 'active' && t.outcome === 'pending' ? (
                        <OutcomeButtons simId={sim.id} targetId={t.id} refresh={refresh} />
                      ) : (
                        <Badge value={t.outcome} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function OutcomeButtons({ simId, targetId, refresh }: { simId: number; targetId: number; refresh: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const record = async (outcome: string) => {
    setBusy(true)
    try {
      await api.post(`/api/simulations/${simId}/targets/${targetId}/outcome`, { outcome })
      await refresh()
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="flex gap-1">
      {(['clicked', 'reported', 'ignored'] as const).map((o) => (
        <button
          key={o}
          disabled={busy}
          onClick={() => void record(o)}
          className={cx(
            'rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-40',
            o === 'clicked' && 'border-bad/40 text-bad hover:bg-bad/10',
            o === 'reported' && 'border-good/40 text-good hover:bg-good/10',
            o === 'ignored' && 'border-border-2 text-muted hover:bg-surface-3',
          )}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-3">
      <div className="text-[10px] uppercase tracking-wide text-faint">{label}</div>
      <div className={cx('mt-1 text-lg font-bold tabular-nums', tone === 'good' && 'text-good', tone === 'bad' && 'text-bad')}>
        {value}
      </div>
    </div>
  )
}

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
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void api.get<Threat[]>('/api/threats').then((list) => setThreats(list.filter((t) => t.verdict && t.verdict !== 'benign')))
    void api.get<SimTemplate[]>('/api/simulations/templates').then(setTemplates)
    void api.get<DepartmentRisk[]>('/api/departments').then(setDepartments)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-surface p-5 shadow-2xl fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">New simulation campaign</h3>
          <button onClick={onClose} className="text-muted hover:text-ink">
            <X size={17} />
          </button>
        </div>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Campaign name"
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-accent/60"
          />

          {/* Lure source */}
          <div>
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted">Lure source</span>
            <div className="flex gap-1 rounded-lg border border-border bg-surface-2 p-1">
              {([
                ['prebuilt', 'Prebuilt lure'],
                ['real', 'Real threat'],
                ['generic', 'Generic'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSource(key)}
                  className={cx(
                    'flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                    source === key ? 'bg-accent/15 text-accent' : 'text-muted hover:text-ink',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {source === 'prebuilt' && (
            <div className="space-y-1.5">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setLureTemplateId(t.id)
                    setChannel(t.channel)
                  }}
                  className={cx(
                    'block w-full rounded-lg border p-2.5 text-left transition-colors',
                    lureTemplateId === t.id
                      ? 'border-accent/60 bg-accent/5'
                      : 'border-border bg-surface-2 hover:border-border-2',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium">{t.name}</span>
                    <Badge value={t.channel} label={channelLabel(t.channel)} />
                    <Badge value={t.difficulty} label={t.difficulty} />
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted">{t.description}</p>
                </button>
              ))}
            </div>
          )}

          {source === 'real' && (
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">
                Real analyzed threat <span className="text-accent">(train on a real attack)</span>
              </span>
              <select
                value={threatId}
                onChange={(e) => {
                  const v = e.target.value === '' ? '' : Number(e.target.value)
                  setThreatId(v)
                  const th = threats.find((t) => t.id === v)
                  if (th) setChannel(th.artifact_type)
                }}
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent/60"
              >
                <option value="">— select a threat —</option>
                {threats.map((t) => (
                  <option key={t.id} value={t.id}>
                    #{t.id} {t.title} ({t.threat_type})
                  </option>
                ))}
              </select>
            </label>
          )}

          {source === 'generic' && (
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">Channel</span>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent/60"
              >
                {['email', 'sms', 'qr', 'chat'].map((c) => (
                  <option key={c} value={c}>
                    {channelLabel(c)}
                  </option>
                ))}
              </select>
            </label>
          )}

          {previewLure && (
            <div>
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-faint">
                Lure preview · {channelLabel(channel)}
              </span>
              <pre className="max-h-28 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-bg p-2.5 font-mono text-[11px] leading-relaxed text-muted">
                {previewLure}
              </pre>
            </div>
          )}

          <div>
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted">
              Target departments
            </span>
            <div className="flex flex-wrap gap-1.5">
              {departments.map((d) => (
                <button
                  key={d.id}
                  onClick={() => toggleDept(d.id)}
                  className={cx(
                    'rounded-lg border px-2.5 py-1 text-xs transition-colors',
                    deptIds.includes(d.id)
                      ? 'border-accent/60 bg-accent/10 text-accent'
                      : 'border-border bg-surface-2 text-muted hover:border-border-2',
                  )}
                >
                  {d.name}
                </button>
              ))}
            </div>
          </div>
          {error && <div className="text-xs text-bad">{error}</div>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => void create()} busy={busy} disabled={!canCreate}>
              Create campaign
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
